import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;

async function run() {
  const sql = postgres(DATABASE_URL);
  try {
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE risk_flag_severity AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Created risk_flag_severity enum');
    
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE risk_flag_status AS ENUM('FLAGGED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Created risk_flag_status enum');
    
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS risk_flags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id uuid,
        entity_type varchar(100) NOT NULL,
        entity_id uuid NOT NULL,
        severity risk_flag_severity DEFAULT 'LOW' NOT NULL,
        reason varchar(500) NOT NULL,
        status risk_flag_status DEFAULT 'FLAGGED' NOT NULL,
        reviewer_id uuid,
        notes text,
        resolved_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    console.log('Created risk_flags table');

    await sql.unsafe(`ALTER TABLE risk_flags ADD CONSTRAINT risk_flags_community_id_communities_id_fk FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL`);
    console.log('Added FK to communities');

    await sql.unsafe(`ALTER TABLE risk_flags ADD CONSTRAINT risk_flags_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL`);
    console.log('Added FK to users');

    await sql.unsafe(`CREATE INDEX IF NOT EXISTS risk_flags_community_id_idx ON risk_flags(community_id)`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS risk_flags_status_idx ON risk_flags(status)`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS risk_flags_entity_idx ON risk_flags(entity_type, entity_id)`);
    console.log('Created indexes');

    console.log('Migration complete!');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await sql.end();
  }
}

run();
