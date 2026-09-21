# PharmaPlus Full Stack — React + Express + Neon PostgreSQL

This project combines the PharmaPlus React/Vite frontend with a Node.js/Express backend and Neon PostgreSQL database.

## Stack
- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: Neon PostgreSQL
- Database driver: @neondatabase/serverless
- Authentication: Express API + bcrypt password hashing

## Folder structure
```text
PharmaPlus_FullStack_Neon/
├── src/                 # React frontend
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── server/              # Express backend
│   ├── db.js
│   ├── init-db.js
│   └── index.js
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## 1. Create the Neon database
1. Open Neon Console.
2. Create a project/database.
3. Open the **Connect** dialog and copy the PostgreSQL connection string.
4. In this project, copy `.env.example` to `.env`.
5. Paste your connection string into `DATABASE_URL`.

Example:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
PORT=5000
```

Never commit `.env` to GitHub.

## 2. Install dependencies
Open the project in VS Code terminal:
```bash
npm install
```

## 3. Create tables and demo data
```bash
npm run db:init
```

This creates:
- users
- medicines
- suppliers
- batches
- purchases
- sales
- app_settings

It also inserts demo records and creates the admin account.

## 4. Start backend
Terminal 1:
```bash
npm run server
```

Backend:
```text
http://localhost:5000
```

Health check:
```text
http://localhost:5000/api/health
```

## 5. Start React frontend
Terminal 2:
```bash
npm run dev
```

Open:
```text
http://localhost:5173
```

## Demo login
Email: `admin@pharmaplus.local`
Password: `admin123`

## Neon SQL Editor alternative
You can also open Neon SQL Editor and run:
1. `sql/schema.sql`
2. `sql/seed.sql`

The `npm run db:init` command is easier because it also creates the hashed admin password.

## API endpoints
- GET `/api/health`
- POST `/api/auth/login`
- GET `/api/data`
- GET/POST/PUT/DELETE `/api/medicines`
- GET/POST/DELETE `/api/batches`
- GET/POST/DELETE `/api/suppliers`
- GET/POST/DELETE `/api/purchases`
- GET/POST/DELETE `/api/sales`
- GET/POST `/api/users`
- GET `/api/reports/summary`

## Production note
The included authentication is suitable for a DBMS academic project/demo. For a production deployment, add sessions/JWT, authorization middleware, validation, rate limiting, and secure cookie handling.
