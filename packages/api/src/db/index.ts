import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;

  const connectionString = (globalThis as any).DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const rawSql = neon(connectionString);
  const sql = (query: string, params?: any[], options?: any) => rawSql.query(query, params, options);
  (sql as any).query = rawSql.query.bind(rawSql);
  (sql as any).transaction = (rawSql as any).transaction?.bind(rawSql);

  _db = drizzle(sql as any, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const database = getDb();
    const value = Reflect.get(database, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});

export { schema };
