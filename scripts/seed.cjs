const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

console.log("Connecting to Firebase Admin SDK for Seeding...");
const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: firebase-service-account.json not found in the project root.");
  console.error("Please ensure your service account JSON file is placed in the project root to seed the database.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(firebaseApp);
const MASTER_ACCOUNT_ID = '8fcfb509-05cc-4635-879b-85b06ebb5951';

// ── DEFAULT SEED DATA ────────────────────────────────────────────────
const SEED_DATA = {
  // 1. Carbon Budgets
  carbon_budgets: [
    {
      id: 'default-budget-1',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      scope_1_carbon_cost: 95.0,
      scope_2_carbon_cost: 95.0,
      scope_3_carbon_cost: 95.0,
      discount_rate: 3.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  // 2. Net Zero Targets
  netzero_targets: [
    {
      id: 'default-target-1',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      base_year: 2022,
      near_term_target_year: 2030,
      netzero_target_year: 2040,
      scope_1_2_reduction_percent: 50.0,
      scope_3_reduction_percent: 30.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  // 3. Emissions Data
  emissions_data: [
    {
      id: 'default-emissions-2022',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      reporting_year: 2022,
      revenue: 8500000,
      scope_1_emissions: 150.25,
      scope_2_emissions: 110.80,
      scope_3_emissions: 580.40,
      scope_2_location_based: 115.30,
      cdp_score: 'C',
      ecovadis_score: 52,
      sbti_target_status: 'committed',
      scope3_breakdown: {
        purchased_goods: 250.2,
        capital_goods: 80.5,
        fuel_energy: 45.1,
        upstream_transport: 90.3,
        waste: 15.2,
        business_travel: 65.1,
        employee_commuting: 34.0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-emissions-2023',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      reporting_year: 2023,
      revenue: 9200000,
      scope_1_emissions: 135.40,
      scope_2_emissions: 95.10,
      scope_3_emissions: 510.60,
      scope_2_location_based: 98.40,
      cdp_score: 'B',
      ecovadis_score: 58,
      sbti_target_status: 'committed',
      scope3_breakdown: {
        purchased_goods: 220.4,
        capital_goods: 72.1,
        fuel_energy: 38.4,
        upstream_transport: 80.2,
        waste: 12.8,
        business_travel: 56.4,
        employee_commuting: 30.3
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-emissions-2024',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      reporting_year: 2024,
      revenue: 10500000,
      scope_1_emissions: 118.50,
      scope_2_emissions: 78.20,
      scope_3_emissions: 435.15,
      scope_2_location_based: 82.10,
      cdp_score: 'B',
      ecovadis_score: 65,
      sbti_target_status: 'targets_set',
      scope3_breakdown: {
        purchased_goods: 185.3,
        capital_goods: 55.4,
        fuel_energy: 31.2,
        upstream_transport: 68.1,
        waste: 9.5,
        business_travel: 48.3,
        employee_commuting: 26.4
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  // 4. Clients
  clients: [
    {
      id: 'default-client-1',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      company_name: 'Astra Biotech Ltd',
      country: 'United Kingdom',
      reporting_year: 2024,
      revenue: 2500000,
      apportioned_emissions: 34.50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-client-2',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      company_name: 'Vanguard Pharma Corp',
      country: 'United States',
      reporting_year: 2024,
      revenue: 4100000,
      apportioned_emissions: 58.20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-client-3',
      user_id: MASTER_ACCOUNT_ID,
      organization_id: null,
      company_name: 'Novis Health Gmbh',
      country: 'Germany',
      reporting_year: 2024,
      revenue: 1800000,
      apportioned_emissions: 22.80,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  // 5. Sustainability Credentials
  sustainability_credentials: [
    {
      id: 'default-cred-1',
      user_id: MASTER_ACCOUNT_ID,
      credential_type: 'cdp',
      credential_name: 'CDP Climate Change 2024',
      status: 'submitted',
      score_or_level: 'B',
      valid_until: '2025-12-31',
      attachment_url: null,
      certificate_url: null,
      display_order: 0,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-cred-2',
      user_id: MASTER_ACCOUNT_ID,
      credential_type: 'ecovadis',
      credential_name: 'EcoVadis Sustainability Rating',
      status: 'active',
      score_or_level: '65/100 (Silver Medal)',
      valid_until: '2025-08-15',
      attachment_url: null,
      certificate_url: null,
      display_order: 1,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'default-cred-3',
      user_id: MASTER_ACCOUNT_ID,
      credential_type: 'sbti',
      credential_name: 'SBTi Approved Science-Based Targets',
      status: 'active',
      score_or_level: '1.5°C Aligned',
      valid_until: '2030-12-31',
      attachment_url: null,
      certificate_url: null,
      display_order: 2,
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  // 6. Industry Benchmarks (Public Table)
  industry_benchmarks: [
    {
      id: 'benchmark-1',
      industry: 'CDMO / Pharma Services',
      company_name: 'Benchmark Leader Avg',
      year: 2024,
      avg_scope_1_intensity: 4.2,
      avg_scope_2_intensity: 2.8,
      avg_scope_3_intensity: 15.5,
      avg_cdp_score: 'A-',
      avg_ecovadis_score: 72,
      sbti_adoption_rate: 0.85,
      is_leader: true
    },
    {
      id: 'benchmark-2',
      industry: 'CDMO / Pharma Services',
      company_name: 'Industry Median Avg',
      year: 2024,
      avg_scope_1_intensity: 8.5,
      avg_scope_2_intensity: 6.2,
      avg_scope_3_intensity: 34.0,
      avg_cdp_score: 'B-',
      avg_ecovadis_score: 55,
      sbti_adoption_rate: 0.45,
      is_leader: false
    }
  ]
};

async function seedDatabase() {
  console.log("\n🌱 Seeding Firestore Database Collections...");

  for (const [colName, records] of Object.entries(SEED_DATA)) {
    console.log(`Seeding collection: ${colName}...`);
    try {
      const batch = db.batch();
      let count = 0;

      for (const record of records) {
        const docRef = db.collection(colName).doc(record.id);
        batch.set(docRef, record);
        count++;
      }

      await batch.commit();
      console.log(`✅ Successfully seeded ${count} default records in collection '${colName}'.`);
    } catch (err) {
      console.error(`❌ Error seeding collection '${colName}':`, err.message);
    }
  }
}

async function main() {
  console.log("=================================================");
  console.log("     FIREBASE FIRESTORE DATABASE SEED SCRIPT     ");
  console.log("=================================================");
  
  await seedDatabase();
  
  console.log("\n=================================================");
  console.log("🎉 SEEDING PROCESS COMPLETED!");
  console.log(`Master demo account data has been successfully`);
  console.log(`written under UID: ${MASTER_ACCOUNT_ID}`);
  console.log(`New signups will now automatically copy this data.`);
  console.log("=================================================");
}

main().catch(err => {
  console.error("❌ Seeding failed with unhandled error:", err);
  process.exit(1);
});
