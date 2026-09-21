# PharmaPlus — Exact Setup Steps

## A. Install prerequisites
- Node.js 18+ (20+ recommended)
- VS Code
- A Neon account/project

Check Node:
```bash
node -v
npm -v
```

## B. Neon Console
1. Sign in to Neon.
2. Create a new project.
3. Open **Connect**.
4. Select the PostgreSQL connection details and copy the connection string.
5. Keep the Neon tab open; you will use the SQL Editor later to verify the tables.

## C. VS Code
1. Extract the ZIP.
2. Open the extracted `PharmaPlus_FullStack_Neon` folder in VS Code.
3. Open Terminal → New Terminal.

Run:
```bash
npm install
```

## D. Create .env
In VS Code, create a file named `.env` in the project root.
Copy from `.env.example` and replace the placeholder:
```env
DATABASE_URL=YOUR_NEON_CONNECTION_STRING
PORT=5000
```

Do not put `.env` on GitHub.

## E. Create database tables
Run:
```bash
npm run db:init
```

Expected message:
```text
Database schema created and demo admin ensured.
Login: admin@pharmaplus.local / admin123
```

## F. Verify Neon
In Neon SQL Editor run:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see the PharmaPlus tables.

Then:
```sql
SELECT * FROM medicines;
SELECT * FROM suppliers;
SELECT * FROM batches;
SELECT * FROM purchases;
SELECT * FROM sales;
SELECT name, email, role, status FROM users;
```

## G. Start backend
Keep Terminal 1 running:
```bash
npm run server
```

Expected:
```text
PharmaPlus API running on http://localhost:5000/api
```

Open this in the browser:
```text
http://localhost:5000/api/health
```

You should get JSON showing `database: connected`.

## H. Start frontend
Open a second VS Code terminal:
```bash
npm run dev
```

Open the Vite URL, normally:
```text
http://localhost:5173
```

## I. Login
```text
Email: admin@pharmaplus.local
Password: admin123
```

## J. Test DBMS functionality
1. Open Medicines.
2. Add a medicine.
3. Refresh the browser.
4. Confirm the medicine remains.
5. Open Neon SQL Editor and run:
```sql
SELECT * FROM medicines ORDER BY created_at DESC;
```
6. Edit/delete a record from the website and verify the database changes.

Repeat the same test for Batches, Suppliers, Purchases, and Sales.

## If frontend says Backend disconnected
Make sure Terminal 1 is still running:
```bash
npm run server
```

Then open:
```text
http://localhost:5000/api/health
```

If health check works, refresh the React page.

## If `npm run db:init` fails
Check that `.env` exists in the project root and that `DATABASE_URL` is the full Neon connection string.

## If port 5000 is already used
Change `.env`:
```env
PORT=5001
```
Then update the frontend API URL in the Settings page to:
```text
http://localhost:5001/api
```
