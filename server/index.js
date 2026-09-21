import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const tableMap = {
  medicines: 'medicines',
  batches: 'batches',
  suppliers: 'suppliers',
  purchases: 'purchases',
  sales: 'sales',
  users: 'users'
};

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, error, status = 500) => {
  console.error(error);
  res.status(status).json({ success: false, message: error.message || String(error) });
};

app.get('/api/health', async (_req, res) => {
  try {
    const result = await sql`SELECT NOW() AS now`;
    ok(res, { status: 'ok', database: 'connected', time: result[0].now });
  } catch (error) { fail(res, error); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return fail(res, new Error('Email and password are required.'), 400);

    const rows = await sql`
      SELECT id, name, email, password_hash, role, status
      FROM users WHERE LOWER(email) = ${email} LIMIT 1
    `;
    const user = rows[0];
    if (!user || user.status !== 'Active' || !(await bcrypt.compare(password, user.password_hash))) {
      return fail(res, new Error('Invalid credentials.'), 401);
    }
    delete user.password_hash;
    ok(res, user);
  } catch (error) { fail(res, error); }
});

app.get('/api/data', async (_req, res) => {
  try {
    const [medicines, batches, suppliers, purchases, sales, users] = await Promise.all([
      sql`SELECT id,name,category,manufacturer,price,reorder_level AS reorder FROM medicines ORDER BY created_at DESC`,
      sql`SELECT id,medicine_id AS medicine,expiry_date::text AS expiry,quantity,buy_price AS "buyPrice",location FROM batches ORDER BY expiry_date ASC`,
      sql`SELECT id,name,contact,phone,email FROM suppliers ORDER BY created_at DESC`,
      sql`SELECT purchase_date::text AS date,invoice,supplier_id AS supplier,medicine_id AS medicine,quantity,total FROM purchases ORDER BY purchase_date DESC,id DESC`,
      sql`SELECT sale_date::text AS date,invoice,medicine_id AS medicine,quantity,price,total FROM sales ORDER BY sale_date DESC,id DESC`,
      sql`SELECT name,email,role,status FROM users ORDER BY created_at DESC`
    ]);
    ok(res, { medicines, batches, suppliers, purchases, sales, users });
  } catch (error) { fail(res, error); }
});

app.get('/api/medicines', async (_req, res) => { try { ok(res, await sql`SELECT id,name,category,manufacturer,price,reorder_level AS reorder FROM medicines ORDER BY created_at DESC`); } catch(e){fail(res,e);} });
app.get('/api/batches', async (_req, res) => { try { ok(res, await sql`SELECT id,medicine_id AS medicine,expiry_date::text AS expiry,quantity,buy_price AS "buyPrice",location FROM batches ORDER BY expiry_date ASC`); } catch(e){fail(res,e);} });
app.get('/api/suppliers', async (_req, res) => { try { ok(res, await sql`SELECT id,name,contact,phone,email FROM suppliers ORDER BY created_at DESC`); } catch(e){fail(res,e);} });
app.get('/api/purchases', async (_req, res) => { try { ok(res, await sql`SELECT purchase_date::text AS date,invoice,supplier_id AS supplier,medicine_id AS medicine,quantity,total FROM purchases ORDER BY purchase_date DESC,id DESC`); } catch(e){fail(res,e);} });
app.get('/api/sales', async (_req, res) => { try { ok(res, await sql`SELECT sale_date::text AS date,invoice,medicine_id AS medicine,quantity,price,total FROM sales ORDER BY sale_date DESC,id DESC`); } catch(e){fail(res,e);} });
app.get('/api/users', async (_req, res) => { try { ok(res, await sql`SELECT name,email,role,status FROM users ORDER BY created_at DESC`); } catch(e){fail(res,e);} });

app.post('/api/medicines', async (req,res)=>{
  try { const {id,name,category,manufacturer,price,reorder}=req.body; const r=await sql`INSERT INTO medicines(id,name,category,manufacturer,price,reorder_level) VALUES(${id},${name},${category},${manufacturer},${Number(price)},${Number(reorder)}) RETURNING id,name,category,manufacturer,price,reorder_level AS reorder`; ok(res,r[0]); } catch(e){fail(res,e,400);}
});
app.put('/api/medicines/:id', async (req,res)=>{
  try { const {name,category,manufacturer,price,reorder}=req.body; const r=await sql`UPDATE medicines SET name=${name},category=${category},manufacturer=${manufacturer},price=${Number(price)},reorder_level=${Number(reorder)} WHERE id=${req.params.id} RETURNING id,name,category,manufacturer,price,reorder_level AS reorder`; if(!r[0]) return fail(res,new Error('Medicine not found.'),404); ok(res,r[0]); } catch(e){fail(res,e,400);}
});
app.delete('/api/medicines/:id', async (req,res)=>{ try { const r=await sql`DELETE FROM medicines WHERE id=${req.params.id} RETURNING id`; if(!r[0]) return fail(res,new Error('Medicine not found.'),404); ok(res,r[0]); } catch(e){fail(res,e,400);} });

app.post('/api/batches', async (req,res)=>{ try { const {id,medicine,expiry,quantity,buyPrice,location}=req.body; const r=await sql`INSERT INTO batches(id,medicine_id,expiry_date,quantity,buy_price,location) VALUES(${id},${medicine},${expiry},${Number(quantity)},${Number(buyPrice)},${location||null}) RETURNING id,medicine_id AS medicine,expiry_date::text AS expiry,quantity,buy_price AS "buyPrice",location`; ok(res,r[0]); } catch(e){fail(res,e,400);} });
app.delete('/api/batches/:id', async(req,res)=>{try{const r=await sql`DELETE FROM batches WHERE id=${req.params.id} RETURNING id`;if(!r[0])return fail(res,new Error('Batch not found.'),404);ok(res,r[0]);}catch(e){fail(res,e,400);}});

app.post('/api/suppliers', async(req,res)=>{try{const {id,name,contact,phone,email}=req.body;const r=await sql`INSERT INTO suppliers(id,name,contact,phone,email) VALUES(${id},${name},${contact||null},${phone||null},${email||null}) RETURNING id,name,contact,phone,email`;ok(res,r[0]);}catch(e){fail(res,e,400);}});
app.delete('/api/suppliers/:id', async(req,res)=>{try{const r=await sql`DELETE FROM suppliers WHERE id=${req.params.id} RETURNING id`;if(!r[0])return fail(res,new Error('Supplier not found.'),404);ok(res,r[0]);}catch(e){fail(res,e,400);}});

app.post('/api/purchases', async(req,res)=>{try{const {invoice,supplier,medicine,date,quantity,total}=req.body;const r=await sql`INSERT INTO purchases(invoice,supplier_id,medicine_id,purchase_date,quantity,total) VALUES(${invoice},${supplier},${medicine},${date},${Number(quantity)},${Number(total)}) RETURNING id,purchase_date::text AS date,invoice,supplier_id AS supplier,medicine_id AS medicine,quantity,total`;ok(res,r[0]);}catch(e){fail(res,e,400);}});
app.delete('/api/purchases/:invoice', async(req,res)=>{try{const r=await sql`DELETE FROM purchases WHERE invoice=${req.params.invoice} RETURNING invoice`;if(!r[0])return fail(res,new Error('Purchase not found.'),404);ok(res,r[0]);}catch(e){fail(res,e,400);}});

app.post('/api/sales', async(req,res)=>{try{const {invoice,medicine,date,quantity,price,total}=req.body;const r=await sql`INSERT INTO sales(invoice,medicine_id,sale_date,quantity,price,total) VALUES(${invoice},${medicine},${date},${Number(quantity)},${Number(price)},${Number(total)}) RETURNING id,sale_date::text AS date,invoice,medicine_id AS medicine,quantity,price,total`;ok(res,r[0]);}catch(e){fail(res,e,400);}});
app.delete('/api/sales/:invoice', async(req,res)=>{try{const r=await sql`DELETE FROM sales WHERE invoice=${req.params.invoice} RETURNING invoice`;if(!r[0])return fail(res,new Error('Sale not found.'),404);ok(res,r[0]);}catch(e){fail(res,e,400);}});

app.post('/api/users', async(req,res)=>{try{const {name,email,password='admin123',role='Staff',status='Active'}=req.body;const hash=await bcrypt.hash(password,10);const r=await sql`INSERT INTO users(name,email,password_hash,role,status) VALUES(${name},${email},${hash},${role},${status}) RETURNING name,email,role,status`;ok(res,r[0]);}catch(e){fail(res,e,400);}});

app.get('/api/reports/summary', async(_req,res)=>{
  try {
    const [medicineCount,stockValue,lowStock,expiring,salesTotal,purchaseTotal] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM medicines`,
      sql`SELECT COALESCE(SUM(quantity * buy_price),0) AS value FROM batches`,
      sql`SELECT COUNT(*)::int AS count FROM (SELECT m.id FROM medicines m LEFT JOIN batches b ON b.medicine_id=m.id GROUP BY m.id,m.reorder_level HAVING COALESCE(SUM(b.quantity),0) < m.reorder_level) x`,
      sql`SELECT COUNT(*)::int AS count FROM batches WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'`,
      sql`SELECT COALESCE(SUM(total),0) AS total FROM sales`,
      sql`SELECT COALESCE(SUM(total),0) AS total FROM purchases`
    ]);
    ok(res,{medicineCount:medicineCount[0].count,stockValue:stockValue[0].value,lowStock:lowStock[0].count,expiring:expiring[0].count,salesTotal:salesTotal[0].total,purchaseTotal:purchaseTotal[0].total});
  } catch(e){fail(res,e);}
});

app.use((err,_req,res,_next)=>fail(res,err));

app.listen(PORT, () => console.log(`PharmaPlus API running on http://localhost:${PORT}/api`));
