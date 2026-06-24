const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// ── CUSTOM ENV PARSER ────────────────────────────────────────────────
// Parses the .env file without external dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.log("⚠️ No .env file found at " + envPath);
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in your .env file.");
  console.error("Please add them to .env before running this script.");
  process.exit(1);
}

// ── INITIALIZE CLIENTS ──────────────────────────────────────────────
console.log("Connecting to Supabase...");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log("Connecting to Firebase Admin SDK...");
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: firebase-service-account.json not found in the project root.");
  console.error("Please download your service account JSON file from Firebase Console:");
  console.error("Project Settings -> Service Accounts -> Generate new private key");
  console.error("And save it as 'firebase-service-account.json' in the project root.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// List of all database tables to migrate
const TABLES = [
  'profiles',
  'user_roles',
  'emissions_data',
  'clients',
  'netzero_targets',
  'carbon_budgets',
  'sustainability_credentials',
  'credential_type_logos',
  'business_units',
  'sites',
  'carbon_calc_entries',
  'scope3_config',
  'suppliers_master',
  'supplier_data_pg',
  'supplier_data_cg',
  'carbon_audit_log',
  'carbon_entry_documents',
  'audit_report_config',
  'emission_reduction_projects',
  'organizations',
  'organization_members',
  'industry_benchmarks'
];

async function migrateAuthUsers() {
  console.log("\n🔑 Phase 1: Migrating Authentication Users...");
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log(`Found ${users.length} users in Supabase Auth.`);

    for (const user of users) {
      try {
        // Create user in Firebase Auth with the exact same UID
        await auth.createUser({
          uid: user.id,
          email: user.email,
          emailVerified: user.email_confirmed_at ? true : false,
        });
        console.log(`✅ Migrated auth user: ${user.email} (${user.id})`);
      } catch (err) {
        if (err.code === 'auth/email-already-exists' || err.code === 'auth/uid-already-exists') {
          console.log(`ℹ️ Auth user already exists in Firebase, skipping: ${user.email}`);
        } else {
          console.error(`❌ Error migrating auth user ${user.email}:`, err.message);
        }
      }
    }
    console.log("🎉 Auth user migration complete.");
  } catch (err) {
    console.error("❌ Failed to migrate auth users:", err.message);
  }
}

async function migrateFirestoreData() {
  console.log("\n📦 Phase 2: Migrating Database Tables to Firestore...");

  for (const table of TABLES) {
    console.log(`\nMigrating table: ${table}...`);
    try {
      let allRows = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Paginate to fetch all records from Supabase
      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + pageSize - 1);

        if (error) throw error;

        allRows.push(...(data || []));
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      }

      console.log(`Found ${allRows.length} records in Supabase table '${table}'.`);

      if (allRows.length === 0) {
        console.log(`Skipping empty table '${table}'.`);
        continue;
      }

      // Write in batches to Firestore (max 500 writes per batch)
      let batch = db.batch();
      let writeCount = 0;
      let totalMigrated = 0;

      for (const row of allRows) {
        // Determine the document ID in Firestore:
        // - For profiles and user_roles, use user_id
        // - For others, use the UUID 'id' column if it exists, otherwise auto-generate
        let docId = row.id;
        if ((table === 'profiles' || table === 'user_roles') && row.user_id) {
          docId = row.user_id;
        }

        const collRef = db.collection(table);
        const docRef = docId ? collRef.doc(String(docId)) : collRef.doc();
        
        batch.set(docRef, row);
        writeCount++;
        totalMigrated++;

        if (writeCount >= 400) {
          await batch.commit();
          console.log(`   Written ${totalMigrated} / ${allRows.length} records...`);
          batch = db.batch();
          writeCount = 0;
        }
      }

      if (writeCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Successfully migrated ${totalMigrated} records to collection '${table}'.`);
    } catch (err) {
      console.error(`❌ Error migrating table '${table}':`, err.message);
    }
  }
  console.log("\n🎉 Database migration complete.");
}

async function main() {
  console.log("=================================================");
  console.log("   SUPABASE TO FIREBASE DATA MIGRATION SCRIPT    ");
  console.log("=================================================");
  
  await migrateAuthUsers();
  await migrateFirestoreData();
  
  console.log("\n=================================================");
  console.log("🎉 MIGRATION PROCESS COMPLETED!");
  console.log("Note: Migrated users do not have passwords set.");
  console.log("They will need to use the 'Forgot Password' link");
  console.log("on the login page to set their passwords.");
  console.log("=================================================");
}

main().catch(err => {
  console.error("❌ Migration failed with unhandled error:", err);
  process.exit(1);
});
