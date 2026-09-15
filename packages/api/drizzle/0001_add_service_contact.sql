import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE service_listings ADD COLUMN contact_name varchar(255);
    ALTER TABLE service_listings ADD COLUMN contact_phone varchar(20);
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE service_listings DROP COLUMN IF EXISTS contact_name;
    ALTER TABLE service_listings DROP COLUMN IF EXISTS contact_phone;
  `);
}
