import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lcjimtxqjgnbuagseixn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjamltdHhxamduYnVhZ3NlaXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjAyODIsImV4cCI6MjA4NjEzNjI4Mn0.jLlgE9iKqPFrekImrl2XjYkODGftQ5ktGYH5X_ypAwc";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const tables = [
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

async function checkTables() {
  console.log("Checking tables with Anon Key...");
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table}: Success! Count = ${count}, Sample size = ${data ? data.length : 0}`);
        if (data && data.length > 0) {
          console.log(`   Sample:`, JSON.stringify(data[0]).substring(0, 100) + "...");
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: Exception - ${err.message}`);
    }
  }
}

checkTables();
