import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DEMO = {
  medicines: [
    { id:"MED001", name:"Paracetamol 500mg", category:"Tablets", manufacturer:"CureLife Pharma", price:2.5, reorder:100 },
    { id:"MED002", name:"Amoxicillin 250mg", category:"Capsules", manufacturer:"MediCore Labs", price:8, reorder:80 },
    { id:"MED003", name:"Omeprazole 20mg", category:"Capsules", manufacturer:"ZenPharm", price:5.5, reorder:100 },
    { id:"MED004", name:"Amlodipine 5mg", category:"Tablets", manufacturer:"CureLife Pharma", price:3, reorder:70 },
    { id:"MED005", name:"Ciprofloxacin 500mg", category:"Tablets", manufacturer:"NovaMed", price:12, reorder:60 }
  ],
  batches: [
    { id:"BATCH001", medicine:"MED001", expiry:"2027-02-10", quantity:1000, buyPrice:1.7, location:"A-01" },
    { id:"BATCH002", medicine:"MED002", expiry:"2026-10-05", quantity:200, buyPrice:5.5, location:"A-02" },
    { id:"BATCH003", medicine:"MED003", expiry:"2026-11-20", quantity:8, buyPrice:3.8, location:"A-03" },
    { id:"BATCH004", medicine:"MED004", expiry:"2026-09-28", quantity:5, buyPrice:2.1, location:"A-04" }
  ],
  suppliers: [
    { id:"SUP001", name:"MedSource Distributors", contact:"Ravi Kumar", phone:"9876543210", email:"sales@medsource.example" },
    { id:"SUP002", name:"HealthLine Pharma", contact:"Priya Shah", phone:"9988776655", email:"orders@healthline.example" }
  ],
  purchases: [{ date:"2026-09-10", invoice:"PO-10021", supplier:"SUP001", medicine:"MED001", quantity:1000, total:1700 }],
  sales: [{ date:"2026-09-10", invoice:"INV-5021", medicine:"MED002", quantity:40, price:8, total:320 }],
  users: [{ name:"Administrator", email:"admin@pharmaplus.local", role:"Administrator", status:"Active" }]
};

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function daysLeft(date) {
  return Math.ceil((new Date(`${date}T00:00:00`) - new Date()) / 86400000);
}

async function apiRequest(path, options = {}) {
  const base = localStorage.getItem("pp_api_url") || DEFAULT_API;
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload.data;
}

function App() {
  const [loggedIn, setLoggedIn] = useState(sessionStorage.getItem("pp_login") === "1");
  const [user, setUser] = useState(() => { try { return JSON.parse(sessionStorage.getItem("pp_user") || "null"); } catch { return null; } });
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(DEMO);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  const notify = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const refresh = async (silent = false) => {
    try {
      setLoading(true);
      const next = await apiRequest("/data");
      setData(next);
      setApiOnline(true);
    } catch (error) {
      setApiOnline(false);
      if (!silent) notify(`Backend error: ${error.message}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (loggedIn) refresh(); }, [loggedIn]);

  const login = async (email, password, remember) => {
    try {
      const result = await apiRequest("/auth/login", { method:"POST", body:JSON.stringify({email,password}) });
      sessionStorage.setItem("pp_login", "1");
      sessionStorage.setItem("pp_user", JSON.stringify(result));
      if (remember) localStorage.setItem("pp_remember", "1");
      setUser(result);
      setLoggedIn(true);
    } catch (error) { throw error; }
  };

  const logout = () => {
    sessionStorage.removeItem("pp_login");
    sessionStorage.removeItem("pp_user");
    setLoggedIn(false);
    setUser(null);
  };

  const medicines = data.medicines || [];
  const batches = data.batches || [];
  const suppliers = data.suppliers || [];
  const purchases = data.purchases || [];
  const sales = data.sales || [];
  const users = data.users || [];

  const stock = id => batches.filter(b => b.medicine === id).reduce((sum,b) => sum + Number(b.quantity || 0), 0);
  const lowStock = medicines.filter(m => stock(m.id) < Number(m.reorder));
  const expiring = batches.filter(b => { const d = daysLeft(b.expiry); return d >= 0 && d <= 90; });

  const saveRecord = async (type, record, edit = false) => {
    const endpoint = {medicine:"medicines",batch:"batches",supplier:"suppliers",purchase:"purchases",sale:"sales",user:"users"}[type];
    const id = type === "medicine" && edit ? `/${encodeURIComponent(record.id)}` : "";
    try {
      await apiRequest(`/${endpoint}${id}`, { method: edit ? "PUT" : "POST", body: JSON.stringify(record) });
      setModal(null);
      await refresh(true);
      notify(edit ? "Record updated successfully" : "Record saved successfully");
    } catch (error) { notify(`Save failed: ${error.message}`); }
  };

  const deleteRecord = async (endpoint, id, label) => {
    if (!window.confirm(`Delete this ${label}?`)) return;
    try { await apiRequest(`/${endpoint}/${encodeURIComponent(id)}`, {method:"DELETE"}); await refresh(true); notify(`${label} deleted`); }
    catch (error) { notify(`Delete failed: ${error.message}`); }
  };

  const exportCSV = type => {
    const rows = data[type] || [];
    if (!rows.length) return notify("No records to export");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(row => headers.map(h => `"${String(row[h] ?? "").replaceAll('"','""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    link.download = `${type}_report.csv`;
    link.click();
    notify("Report downloaded");
  };

  const backup = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:"application/json"}));
    link.download = "pharmaplus_neon_backup.json";
    link.click();
    notify("Backup downloaded");
  };

  const resetLocal = () => { localStorage.removeItem("pp_api_url"); notify("Local API setting reset"); };

  if (!loggedIn) return <Login onLogin={login} />;

  const names = {
    dashboard:["OVERVIEW","Welcome, Admin 👋","Pharmaceutical inventory overview."],
    medicines:["CATALOG","Medicines","Manage pharmaceutical product master data."],
    batches:["INVENTORY","Batches & Stock","Track batch-level quantities and expiry."],
    suppliers:["PARTNERS","Suppliers","Maintain supplier contacts."],
    purchases:["STOCK IN","Purchases","Record incoming stock."],
    sales:["STOCK OUT","Sales","Record outgoing inventory."],
    expiry:["SAFETY & COMPLIANCE","Expiry Management","Expired and soon-to-expire batches."],
    reports:["ANALYTICS","Reports","Export inventory reports."],
    users:["ACCESS CONTROL","Users","Manage system users and roles."],
    settings:["CONFIGURATION","Settings","Neon PostgreSQL backend configuration."]
  };
  const buttons = {medicines:["medicine","＋ Add Medicine"],batches:["batch","＋ Add Batch"],suppliers:["supplier","＋ Add Supplier"],purchases:["purchase","＋ Record Purchase"],sales:["sale","＋ Record Sale"],users:["user","＋ Add User"]};

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="logo">✚</div><b>PharmaPlus</b></div>
      <nav>{[["dashboard","⌂ Dashboard"],["medicines","▱ Medicines"],["batches","▣ Batches & Stock"],["suppliers","♧ Suppliers"],["purchases","⇩ Purchases"],["sales","⇧ Sales"],["expiry","◷ Expiry Management"],["reports","▥ Reports"],["users","♙ Users"],["settings","⚙ Settings"]].map(([id,label]) => <button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}>{label}</button>)}</nav>
    </aside>
    <main>
      <header>
        <div className="searchBox">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicines, batches, suppliers..."/></div>
        <div className="profile"><div className="avatar">A</div><span>{user?.name || "Admin"}<br/><small>{user?.role || "Administrator"}</small></span><span className={`statusDot ${apiOnline?"online":"offline"}`} title={apiOnline?"Neon API connected":"Backend disconnected"}></span><button onClick={logout}>⇥</button></div>
      </header>
      <div className="content">
        <div className="heading"><div><div className="eyebrow">{names[page][0]}</div><h1>{names[page][1]}</h1><p>{names[page][2]}</p></div>{buttons[page] && <button className="primary" onClick={()=>setModal({type:buttons[page][0]})}>{buttons[page][1]}</button>}</div>
        {loading && <div className="alert">Connecting to Neon backend…</div>}
        {page==="dashboard" && <Dashboard medicines={medicines} batches={batches} purchases={purchases} sales={sales} lowStock={lowStock} expiring={expiring} stock={stock} money={money}/>} 
        {page==="medicines" && <Medicines medicines={medicines.filter(m=>`${m.id} ${m.name} ${m.category} ${m.manufacturer}`.toLowerCase().includes(search.toLowerCase()))} stock={stock} money={money} onEdit={m=>setModal({type:"medicine",edit:m})} onDelete={id=>deleteRecord("medicines",id,"medicine")}/>} 
        {page==="batches" && <Batches batches={batches} medicines={medicines} money={money} onDelete={id=>deleteRecord("batches",id,"batch")}/>} 
        {page==="suppliers" && <Suppliers suppliers={suppliers} onDelete={id=>deleteRecord("suppliers",id,"supplier")}/>} 
        {page==="purchases" && <Purchases purchases={purchases} suppliers={suppliers} medicines={medicines} money={money} onDelete={invoice=>deleteRecord("purchases",invoice,"purchase")}/>} 
        {page==="sales" && <Sales sales={sales} medicines={medicines} money={money} onDelete={invoice=>deleteRecord("sales",invoice,"sale")}/>} 
        {page==="expiry" && <Expiry batches={batches} medicines={medicines}/>} 
        {page==="reports" && <Reports exportCSV={exportCSV}/>} 
        {page==="users" && <Users users={users}/>} 
        {page==="settings" && <Settings apiOnline={apiOnline} backup={backup} resetLocal={resetLocal} notify={notify}/>} 
      </div>
    </main>
    {modal && <Modal modal={modal} medicines={medicines} suppliers={suppliers} onClose={()=>setModal(null)} onSave={saveRecord}/>} 
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function Login({onLogin}) {
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();setError("");setBusy(true);try{await onLogin(e.currentTarget.email.value,e.currentTarget.password.value,e.currentTarget.remember.checked);}catch(err){setError(err.message || "Unable to sign in");}finally{setBusy(false);}};
  return <div className="login"><div className="login-card"><div className="logo">✚</div><div className="eyebrow">SECURE ACCESS</div><h1>Welcome back</h1><p>Sign in to PharmaPlus Inventory Management.</p><form onSubmit={submit}><label>Email<input name="email" type="email" defaultValue="admin@pharmaplus.local" required/></label><label>Password<input name="password" type="password" defaultValue="admin123" required/></label><label className="remember"><input name="remember" type="checkbox" defaultChecked/>Remember me</label><button className="loginButton" disabled={busy}>{busy?"Signing in…":"Sign In →"}</button><div className="demo">Demo credentials<br/><b>admin@pharmaplus.local</b> / <b>admin123</b></div><div className="error">{error}</div></form></div><small>PharmaPlus v2.0 • React + Express + Neon PostgreSQL</small></div>;
}

function Dashboard({medicines,batches,purchases,sales,lowStock,expiring,stock,money}) {
  const max=Math.max(...medicines.map(m=>stock(m.id)),1); const recent=[...purchases.map(x=>({...x,type:"Purchase"})),...sales.map(x=>({...x,type:"Sale"}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5); const medicineName=id=>medicines.find(m=>m.id===id)?.name||id;
  return <><div className="stats"><Stat title="Total Medicines" value={medicines.length}/><Stat title="Stock Value" value={money(batches.reduce((a,b)=>a+Number(b.quantity)*Number(b.buyPrice),0))}/><Stat title="Low Stock" value={lowStock.length}/><Stat title="Expiring Soon" value={expiring.length}/></div><div className="grid"><div className="card"><h2>Stock Overview</h2><div className="bars">{medicines.slice(0,6).map(m=><div key={m.id} className="bar" style={{height:`${Math.max(8,stock(m.id)/max*100)}%`}}><span>{m.category}</span></div>)}</div></div><div className="card"><h2>Expiry Status</h2><div className="donut"><b>{expiring.length}</b><small>within 90 days</small></div></div></div><div className="grid"><div className="card"><h2>Recent Transactions</h2><Table><thead><tr><th>Date</th><th>Type</th><th>Medicine</th><th>Qty</th></tr></thead><tbody>{recent.map((x,i)=><tr key={i}><td>{x.date}</td><td>{x.type}</td><td>{medicineName(x.medicine)}</td><td>{x.quantity}</td></tr>)}</tbody></Table></div><div className="card"><h2>Low Stock Alerts</h2>{lowStock.length?lowStock.map(m=><div className="alert" key={m.id}>⚠ <b>{m.name}</b> — {stock(m.id)} units left</div>):<div className="alert">No low-stock items.</div>}</div></div></>;
}
function Stat({title,value}){return <div className="stat"><span>{title}</span><b>{value}</b></div>}
function Medicines({medicines,stock,money,onEdit,onDelete}){return <div className="card"><Table><thead><tr><th>Code</th><th>Medicine</th><th>Category</th><th>Manufacturer</th><th>Price</th><th>Reorder</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{medicines.map(m=><tr key={m.id}><td>{m.id}</td><td><b>{m.name}</b></td><td>{m.category}</td><td>{m.manufacturer}</td><td>{money(m.price)}</td><td>{m.reorder}</td><td>{stock(m.id)}</td><td className="actions"><button onClick={()=>onEdit(m)}>✎</button><button onClick={()=>onDelete(m.id)}>×</button></td></tr>)}</tbody></Table></div>}
function Batches({batches,medicines,money,onDelete}){const name=id=>medicines.find(m=>m.id===id)?.name||id;return <div className="card"><Table><thead><tr><th>Batch</th><th>Medicine</th><th>Expiry</th><th>Quantity</th><th>Buy Price</th><th>Location</th><th>Status</th><th>Action</th></tr></thead><tbody>{batches.map(b=>{const d=daysLeft(b.expiry);return <tr key={b.id}><td>{b.id}</td><td>{name(b.medicine)}</td><td>{b.expiry}</td><td>{b.quantity}</td><td>{money(b.buyPrice)}</td><td>{b.location}</td><td><Badge days={d}/></td><td className="actions"><button onClick={()=>onDelete(b.id)}>×</button></td></tr>})}</tbody></Table></div>}
function Suppliers({suppliers,onDelete}){return <div className="card"><Table><thead><tr><th>ID</th><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th>Action</th></tr></thead><tbody>{suppliers.map(s=><tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.contact}</td><td>{s.phone}</td><td>{s.email}</td><td className="actions"><button onClick={()=>onDelete(s.id)}>×</button></td></tr>)}</tbody></Table></div>}
function Purchases({purchases,suppliers,medicines,money,onDelete}){const sn=id=>suppliers.find(s=>s.id===id)?.name||id;const mn=id=>medicines.find(m=>m.id===id)?.name||id;return <div className="card"><Table><thead><tr><th>Date</th><th>Invoice</th><th>Supplier</th><th>Medicine</th><th>Qty</th><th>Total</th><th>Action</th></tr></thead><tbody>{purchases.map((p,i)=><tr key={i}><td>{p.date}</td><td>{p.invoice}</td><td>{sn(p.supplier)}</td><td>{mn(p.medicine)}</td><td>{p.quantity}</td><td>{money(p.total)}</td><td className="actions"><button onClick={()=>onDelete(p.invoice)}>×</button></td></tr>)}</tbody></Table></div>}
function Sales({sales,medicines,money,onDelete}){const mn=id=>medicines.find(m=>m.id===id)?.name||id;return <div className="card"><Table><thead><tr><th>Date</th><th>Invoice</th><th>Medicine</th><th>Qty</th><th>Price</th><th>Total</th><th>Action</th></tr></thead><tbody>{sales.map((s,i)=><tr key={i}><td>{s.date}</td><td>{s.invoice}</td><td>{mn(s.medicine)}</td><td>{s.quantity}</td><td>{money(s.price)}</td><td>{money(s.total)}</td><td className="actions"><button onClick={()=>onDelete(s.invoice)}>×</button></td></tr>)}</tbody></Table></div>}
function Expiry({batches,medicines}){const mn=id=>medicines.find(m=>m.id===id)?.name||id;return <div className="card"><Table><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Days Left</th><th>Qty</th><th>Status</th></tr></thead><tbody>{batches.map(b=>{const d=daysLeft(b.expiry);return <tr key={b.id}><td>{mn(b.medicine)}</td><td>{b.id}</td><td>{b.expiry}</td><td>{d}</td><td>{b.quantity}</td><td><Badge days={d}/></td></tr>})}</tbody></Table></div>}
function Badge({days}){return <span className={`badge ${days<0?"red":""}`}>{days<0?"Expired":days<=90?"Expiring":"Good"}</span>}
function Reports({exportCSV}){return <div className="report-grid"><button onClick={()=>exportCSV("medicines")}>Current Stock Report</button><button onClick={()=>exportCSV("purchases")}>Purchase Report</button><button onClick={()=>exportCSV("sales")}>Sales Report</button><button onClick={()=>exportCSV("batches")}>Expiry Report</button></div>}
function Users({users}){return <div className="card"><Table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((u,i)=><tr key={i}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.status}</td></tr>)}</tbody></Table></div>}
function Settings({apiOnline,backup,resetLocal,notify}){const [url,setUrl]=useState(()=>localStorage.getItem("pp_api_url")||DEFAULT_API);const [health,setHealth]=useState("");const test=async()=>{try{localStorage.setItem("pp_api_url",url.replace(/\/$/,""));const r=await apiRequest("/health");setHealth(`Connected • ${new Date(r.time).toLocaleString()}`);notify("Neon connection successful");}catch(e){setHealth(`Connection failed: ${e.message}`);}};return <div className="card settings"><label>API Base URL<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://localhost:5000/api"/></label><button className="primary" onClick={test}>Test Neon Connection</button><button onClick={backup}>Download JSON Backup</button><button onClick={resetLocal}>Reset Local API Setting</button><p><b>Status:</b> {apiOnline?"Connected to Express + Neon PostgreSQL":"Backend not connected"}</p>{health&&<p>{health}</p>}</div>}

function Modal({modal,medicines,suppliers,onClose,onSave}){
  const type=modal.type, edit=modal.edit; const [form,setForm]=useState(edit||{date:new Date().toISOString().slice(0,10)}); const update=e=>setForm({...form,[e.target.name]:e.target.value});
  const definitions={medicine:[["id","Medicine Code"],["name","Medicine Name"],["category","Category"],["manufacturer","Manufacturer"],["price","Unit Price","number"],["reorder","Reorder Level","number"]],batch:[["id","Batch Number"],["medicine","Medicine","select",medicines.map(x=>x.id)],["expiry","Expiry Date","date"],["quantity","Quantity","number"],["buyPrice","Purchase Price","number"],["location","Storage Location"]],supplier:[["id","Supplier ID"],["name","Supplier Name"],["contact","Contact Person"],["phone","Phone"],["email","Email","email"]],purchase:[["invoice","Invoice"],["supplier","Supplier","select",suppliers.map(x=>x.id)],["medicine","Medicine","select",medicines.map(x=>x.id)],["date","Date","date"],["quantity","Quantity","number"],["total","Total","number"]],sale:[["invoice","Invoice"],["medicine","Medicine","select",medicines.map(x=>x.id)],["date","Date","date"],["quantity","Quantity","number"],["price","Unit Price","number"],["total","Total","number"]],user:[["name","Name"],["email","Email","email"],["password","Temporary Password","password"],["role","Role"],["status","Status"]]}[type];
  const submit=e=>{e.preventDefault();const output={...form};["price","reorder","quantity","buyPrice","total"].forEach(k=>{if(output[k]!==undefined&&output[k]!=="")output[k]=Number(output[k]);});if(type==="user"&&!output.password)output.password="admin123";onSave(type,output,Boolean(edit));};
  return <div className="modal"><div className="modal-box"><button className="close" onClick={onClose}>×</button><h2>{edit?"Edit Medicine":({medicine:"Add Medicine",batch:"Add Batch",supplier:"Add Supplier",purchase:"Record Purchase",sale:"Record Sale",user:"Add User"})[type]}</h2><form onSubmit={submit}><div className="form-grid">{definitions.map(([name,label,inputType,options])=><label key={name}>{label}{inputType==="select"?<select name={name} value={form[name]||""} onChange={update} required><option value="">Select</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>:<input name={name} type={inputType||"text"} value={form[name]??""} onChange={update} required={!edit}/>}</label>)}<div className="form-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary">{edit?"Update Record":"Save Record"}</button></div></div></form></div></div>;
}
function Table({children}){return <table>{children}</table>}

export default App;
