import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const r1 = await sqlUPDATE community_memberships SET role = 'CUSTOMER' WHERE user_id = '8cc0afb2-fe95-4b49-8404-33395105056e' AND community_id = '7c4f1f25-d762-473f-a9b3-f37a7c01b23f';
console.log('Update:', JSON.stringify(r1));
const r2 = await sqlDELETE FROM merchants WHERE user_id = '8cc0afb2-fe95-4b49-8404-33395105056e';
console.log('Delete:', JSON.stringify(r2));
