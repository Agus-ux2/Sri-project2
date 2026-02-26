// Seed script to populate test data in the database
const { Pool } = require('pg');

// Disable SSL certificate validation for RDS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  host: 'sri2026db.clcsiaesie50.us-east-2.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'sri_admin',
  password: 'Stich2009!',
  ssl: true,
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seed...');

    // First check if data already exists
    const existingSettlements = await client.query('SELECT COUNT(*) as count FROM settlements');
    if (parseInt(existingSettlements.rows[0].count) > 0) {
      console.log(`📊 Found ${existingSettlements.rows[0].count} existing settlements`);
      console.log('Data already seeded. Skipping...');
      return;
    }

    // Create test companies
    console.log('Creating companies...');
    await client.query(`
      INSERT INTO companies (id, name, legal_name, tax_id, company_type, active, created_at, updated_at)
      VALUES 
        ('comp-cargill-001', 'Cargill S.A.', 'Cargill S.A.C.I.', '30-50000000-1', 'buyer', true, NOW(), NOW()),
        ('comp-ldc-001', 'Louis Dreyfus', 'Louis Dreyfus Company Argentina S.A.', '30-60000000-5', 'buyer', true, NOW(), NOW()),
        ('comp-bunge-001', 'Bunge Argentina', 'Bunge Argentina S.A.', '30-70000000-8', 'buyer', true, NOW(), NOW())
      ON CONFLICT (tax_id) DO NOTHING;
    `);
    console.log('✅ Companies created');

    // Create test settlements (with all required fields)
    console.log('Creating settlements...');
    await client.query(`
      INSERT INTO settlements (
        id, settlement_number, company_id, settlement_date, grain_type,
        base_price_per_ton, total_gross_kg, total_net_kg, total_waste_kg, 
        gross_amount, net_amount, status, created_at, updated_at
      )
      VALUES 
        (
          'settle-001', 'LIQ-2026-0001', 'comp-cargill-001', '2026-02-01', 'SOJA',
          300.00, 155000.00, 150000.00, 5000.00, 46500000.00, 45000000.00,
          'validated', NOW(), NOW()
        ),
        (
          'settle-002', 'LIQ-2026-0002', 'comp-ldc-001', '2026-02-03', 'MAIZ',
          180.00, 210000.00, 200000.00, 10000.00, 38000000.00, 36000000.00,
          'pending_processing', NOW(), NOW()
        ),
        (
          'settle-003', 'LIQ-2026-0003', 'comp-bunge-001', '2026-02-04', 'TRIGO',
          290.00, 185000.00, 180000.00, 5000.00, 54000000.00, 52500000.00,
          'draft', NOW(), NOW()
        ),
        (
          'settle-004', 'LIQ-2026-0004', 'comp-cargill-001', '2026-02-05', 'GIRASOL',
          340.00, 95000.00, 92000.00, 3000.00, 32200000.00, 31000000.00,
          'validated', NOW(), NOW()
        )
      ON CONFLICT (settlement_number) DO NOTHING;
    `);
    console.log('✅ Settlements created');

    // Create CTG entries (simplified - only use existing columns)
    console.log('Creating CTG entries...');
    await client.query(`
      INSERT INTO ctg_entries (
        id, settlement_id, ctg_number, cp_number, gross_kg, net_kg, waste_kg,
        factor, base_price_per_ton, line_number, created_at, updated_at
      )
      VALUES 
        ('ctg-001', 'settle-001', 'CTG-2026-001001', 'CP-001', 31000.00, 30000.00, 1000.00, 100.00, 300.00, 1, NOW(), NOW()),
        ('ctg-002', 'settle-001', 'CTG-2026-001002', 'CP-002', 31000.00, 30000.00, 1000.00, 99.50, 300.00, 2, NOW(), NOW()),
        ('ctg-003', 'settle-001', 'CTG-2026-001003', 'CP-003', 31000.00, 30000.00, 1000.00, 99.80, 300.00, 3, NOW(), NOW()),
        ('ctg-004', 'settle-001', 'CTG-2026-001004', 'CP-004', 31000.00, 30000.00, 1000.00, 99.60, 300.00, 4, NOW(), NOW()),
        ('ctg-005', 'settle-001', 'CTG-2026-001005', 'CP-005', 31000.00, 30000.00, 1000.00, 100.00, 300.00, 5, NOW(), NOW()),
        ('ctg-006', 'settle-002', 'CTG-2026-002001', 'CP-006', 70000.00, 66667.00, 3333.00, 98.50, 180.00, 1, NOW(), NOW()),
        ('ctg-007', 'settle-002', 'CTG-2026-002002', 'CP-007', 70000.00, 66667.00, 3333.00, 98.80, 180.00, 2, NOW(), NOW()),
        ('ctg-008', 'settle-002', 'CTG-2026-002003', 'CP-008', 70000.00, 66666.00, 3334.00, 99.00, 180.00, 3, NOW(), NOW()),
        ('ctg-009', 'settle-003', 'CTG-2026-003001', 'CP-009', 92500.00, 90000.00, 2500.00, 100.00, 290.00, 1, NOW(), NOW()),
        ('ctg-010', 'settle-003', 'CTG-2026-003002', 'CP-010', 92500.00, 90000.00, 2500.00, 99.90, 290.00, 2, NOW(), NOW())
      ON CONFLICT (settlement_id, ctg_number) DO NOTHING;
    `);
    console.log('✅ CTG entries created');

    // Verify the data
    const result = await client.query('SELECT COUNT(*) as total FROM settlements');
    console.log(`\n📊 Total settlements in database: ${result.rows[0].total}`);

    const ctgResult = await client.query('SELECT COUNT(*) as total FROM ctg_entries');
    console.log(`📊 Total CTG entries in database: ${ctgResult.rows[0].total}`);

    console.log('\n✅ Database seeding complete!');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
