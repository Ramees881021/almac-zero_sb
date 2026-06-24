// This file acts as a Firebase-backed drop-in replacement for the Supabase client.
import { auth, db, storage } from '../firebase/firebase';
import { edgeFunctions } from '../firebase/edge-functions-compat';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy as firebaseOrderBy, 
  limit as firebaseLimit, 
  getDocs, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  documentId,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

// Helper to recursively sanitize objects for Firestore (resolving NaN and undefined issues)
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number') {
    return isNaN(obj) ? null : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeForFirestore(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

// ── FIRESTORE QUERY BUILDER ───────────────────────────────────────────
class FirestoreQueryBuilder {
  private collectionName: string;
  private filters: Array<{ field: string, op: any, value: any }> = [];
  private orders: Array<{ field: string, dir: 'asc' | 'desc' }> = [];
  private limitValue: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private insertData: any = null;
  private updateData: any = null;
  private isDelete = false;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  select(fields?: string) {
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: '!=', value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ field, op: '>', value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: '>=', value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ field, op: '<', value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, op: '<=', value });
    return this;
  }

  in(field: string, values: any[]) {
    if (values && values.length > 0) {
      this.filters.push({ field, op: 'in', value: values });
    } else {
      // Dummy filter that returns empty to match Supabase empty-in behavior
      this.filters.push({ field, op: '==', value: '__empty_array_trigger__' });
    }
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, dir: options?.ascending !== false ? 'asc' : 'desc' });
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Thenable implementation to support await and .then()
  async then(onfulfilled?: any, onrejected?: any) {
    try {
      const result = await this.execute();
      return onfulfilled ? onfulfilled(result) : result;
    } catch (error) {
      if (onrejected) return onrejected(error);
      throw error;
    }
  }

  private async execute() {
    try {
      // 1. INSERT
      if (this.insertData) {
        const isArray = Array.isArray(this.insertData);
        const rows = isArray ? this.insertData : [this.insertData];
        const results = [];

        for (const row of rows) {
          let docId = row.id;
          
          // Profiles and user_roles collections use user_id as the document ID
          if (this.collectionName === 'profiles' && row.user_id) {
            docId = row.user_id;
          }
          if (this.collectionName === 'user_roles' && row.user_id) {
            docId = row.user_id;
          }

          const docData = sanitizeForFirestore({
            ...row,
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || new Date().toISOString(),
          });

          if (docId) {
            const docRef = doc(db, this.collectionName, docId);
            await setDoc(docRef, docData);
            results.push({ id: docId, ...docData });
          } else {
            const collRef = collection(db, this.collectionName);
            const docRef = await addDoc(collRef, docData);
            results.push({ id: docRef.id, ...docData });
          }
        }

        return { data: isArray ? results : results[0], error: null };
      }

      // Helper to query matching documents
      const getMatchingDocs = async () => {
        const collRef = collection(db, this.collectionName);
        let q = query(collRef);

        // Apply filters
        for (const f of this.filters) {
          const fieldSelector = f.field === 'id' ? documentId() : f.field;
          q = query(q, where(fieldSelector, f.op, f.value));
        }

        // We DO NOT apply orders or limit to the Firestore query to bypass the composite index requirement.
        // Instead, we will fetch all matching documents, sort them, and apply the limit in memory.

        const snapshot = await getDocs(q);
        let docsList: any[] = [];
        snapshot.forEach((docSnap) => {
          docsList.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Apply orders in memory
        if (this.orders.length > 0) {
          docsList.sort((a, b) => {
            for (const o of this.orders) {
              const valA = a[o.field];
              const valB = b[o.field];
              
              if (valA === valB) continue;
              
              // Handle null/undefined values
              if (valA === undefined || valA === null) return o.dir === 'asc' ? 1 : -1;
              if (valB === undefined || valB === null) return o.dir === 'asc' ? -1 : 1;
              
              if (typeof valA === 'string' && typeof valB === 'string') {
                const cmp = valA.localeCompare(valB);
                if (cmp !== 0) {
                  return o.dir === 'asc' ? cmp : -cmp;
                }
              } else {
                if (valA < valB) return o.dir === 'asc' ? -1 : 1;
                if (valA > valB) return o.dir === 'asc' ? 1 : -1;
              }
            }
            return 0;
          });
        }

        // Apply limit in memory
        if (this.limitValue !== null) {
          docsList = docsList.slice(0, this.limitValue);
        }

        return docsList;
      };

      // 2. UPDATE
      if (this.updateData !== null) {
        const matchingDocs = await getMatchingDocs();
        const results = [];

        for (const d of matchingDocs) {
          const docRef = doc(db, this.collectionName, d.id);
          const updatePayload = sanitizeForFirestore({
            ...this.updateData,
            updated_at: new Date().toISOString(),
          });
          await updateDoc(docRef, updatePayload);
          results.push({ ...d, ...updatePayload });
        }

        return { data: results, error: null };
      }

      // 3. DELETE
      if (this.isDelete) {
        const matchingDocs = await getMatchingDocs();
        for (const d of matchingDocs) {
          const docRef = doc(db, this.collectionName, d.id);
          await deleteDoc(docRef);
        }
        return { data: matchingDocs, error: null };
      }

      // 4. SELECT
      const docs = await getMatchingDocs();

      if (this.isSingle) {
        if (docs.length === 0) {
          return { data: null, error: { message: "No rows found" } };
        }
        return { data: docs[0], error: null };
      }

      if (this.isMaybeSingle) {
        if (docs.length === 0) {
          return { data: null, error: null };
        }
        return { data: docs[0], error: null };
      }

      return { data: docs, error: null };
    } catch (err: any) {
      console.error(`Error in Firestore query builder for ${this.collectionName}:`, err);
      return { data: null, error: { message: err.message || "Unknown error" } };
    }
  }
}

// ── STORAGE WRAPPER ──────────────────────────────────────────────────
class FirebaseStorageBucketWrapper {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(path: string, file: File, options?: any) {
    try {
      const storageRef = ref(storage, `${this.bucketName}/${path}`);
      await uploadBytes(storageRef, file);
      return { data: { path }, error: null };
    } catch (error: any) {
      console.error("Storage upload error:", error);
      return { data: null, error };
    }
  }

  getPublicUrl(path: string) {
    const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com';
    const encodedPath = encodeURIComponent(path);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    return { data: { publicUrl } };
  }

  async remove(paths: string[]) {
    try {
      for (const path of paths) {
        let storagePath = path;
        if (path.startsWith('http')) {
          const parts = path.split('/o/');
          if (parts.length > 1) {
            storagePath = decodeURIComponent(parts[1].split('?')[0]);
          }
        }
        const storageRef = ref(storage, storagePath.startsWith(this.bucketName) ? storagePath : `${this.bucketName}/${storagePath}`);
        await deleteObject(storageRef);
      }
      return { data: {}, error: null };
    } catch (error: any) {
      console.error("Storage delete error:", error);
      return { data: null, error };
    }
  }

  async createSignedUrl(path: string, expirySeconds: number) {
    try {
      const storageRef = ref(storage, `${this.bucketName}/${path}`);
      const signedUrl = await getDownloadURL(storageRef);
      return { data: { signedUrl }, error: null };
    } catch (error: any) {
      console.error("Storage createSignedUrl error:", error);
      return { data: null, error };
    }
  }
}

// ── COMPATIBILITY CLIENT OBJECT ──────────────────────────────────────
export const supabase = {
  // Database API
  from(collectionName: string) {
    return new FirestoreQueryBuilder(collectionName);
  },

  // Storage API
  storage: {
    from(bucketName: string) {
      return new FirebaseStorageBucketWrapper(bucketName);
    }
  },

  // Auth API
  auth: {
    async getSession() {
      const fbUser = auth.currentUser;
      if (!fbUser) return { data: { session: null }, error: null };
      const session = {
        access_token: await fbUser.getIdToken(),
        user: {
          id: fbUser.uid,
          email: fbUser.email,
        }
      };
      return { data: { session }, error: null };
    },

    async getUser() {
      const fbUser = auth.currentUser;
      if (!fbUser) return { data: { user: null }, error: null };
      const user = {
        id: fbUser.uid,
        email: fbUser.email,
      };
      return { data: { user }, error: null };
    },

    async signUp(options: any) {
      const { email, password } = options;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        return {
          data: {
            user: {
              id: fbUser.uid,
              email: fbUser.email,
            }
          },
          error: null
        };
      } catch (err: any) {
        console.error("Auth signUp error:", err);
        return { data: { user: null }, error: err };
      }
    },

    async signInWithPassword(options: any) {
      const { email, password } = options;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const session = {
          access_token: await fbUser.getIdToken(),
          user: {
            id: fbUser.uid,
            email: fbUser.email,
          }
        };
        return {
          data: {
            user: {
              id: fbUser.uid,
              email: fbUser.email,
            },
            session
          },
          error: null
        };
      } catch (err: any) {
        console.error("Auth signIn error:", err);
        return { data: { user: null, session: null }, error: err };
      }
    },

    async signOut() {
      try {
        await fbSignOut(auth);
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },

    async resetPasswordForEmail(email: string, options?: any) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { error: null };
      } catch (err: any) {
        return { error: err };
      }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const session = {
            access_token: await fbUser.getIdToken(),
            user: {
              id: fbUser.uid,
              email: fbUser.email,
            }
          };
          callback('SIGNED_IN', session);
        } else {
          callback('SIGNED_OUT', null);
        }
      });
      return {
        data: {
          subscription: {
            unsubscribe
          }
        }
      };
    }
  },

  // Functions (Edge Functions) API
  functions: {
    async invoke(functionName: string, options?: any) {
      const func = (edgeFunctions as any)[functionName];
      if (func) {
        try {
          const body = options?.body || {};
          const result = await func(body);
          return { data: result.data, error: result.error };
        } catch (err: any) {
          console.error(`Edge function ${functionName} failed:`, err);
          return { data: null, error: { message: err.message || "Unknown error" } };
        }
      } else {
        console.error(`Edge function ${functionName} is not implemented.`);
        return { data: null, error: { message: `Function ${functionName} not implemented` } };
      }
    }
  }
} as any;