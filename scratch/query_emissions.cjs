const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

loadEnv();

const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: firebase-service-account.json not found.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(firebaseApp);

async function inspectUserRoles() {
  console.log("Querying user_roles from Firestore...");
  const snapshot = await db.collection('user_roles').get();
  console.log(`Found ${snapshot.size} documents in 'user_roles'.`);
  
  const roles = [];
  snapshot.forEach(doc => {
    roles.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(JSON.stringify(roles, null, 2));
}

inspectUserRoles().catch(err => {
  console.error("Error inspecting user_roles:", err);
});
