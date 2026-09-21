-- Demo data for PharmaPlus. Run after schema.sql.
-- Demo login: admin@pharmaplus.local / admin123

INSERT INTO medicines (id,name,category,manufacturer,price,reorder_level) VALUES
('MED001','Paracetamol 500mg','Tablets','CureLife Pharma',2.50,100),
('MED002','Amoxicillin 250mg','Capsules','MediCore Labs',8.00,80),
('MED003','Omeprazole 20mg','Capsules','ZenPharm',5.50,100),
('MED004','Amlodipine 5mg','Tablets','CureLife Pharma',3.00,70),
('MED005','Ciprofloxacin 500mg','Tablets','NovaMed',12.00,60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO suppliers (id,name,contact,phone,email) VALUES
('SUP001','MedSource Distributors','Ravi Kumar','9876543210','sales@medsource.example'),
('SUP002','HealthLine Pharma','Priya Shah','9988776655','orders@healthline.example')
ON CONFLICT (id) DO NOTHING;

INSERT INTO batches (id,medicine_id,expiry_date,quantity,buy_price,location) VALUES
('BATCH001','MED001','2027-02-10',1000,1.70,'A-01'),
('BATCH002','MED002','2026-10-05',200,5.50,'A-02'),
('BATCH003','MED003','2026-11-20',8,3.80,'A-03'),
('BATCH004','MED004','2026-09-28',5,2.10,'A-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchases (invoice,supplier_id,medicine_id,purchase_date,quantity,total) VALUES
('PO-10021','SUP001','MED001','2026-09-10',1000,1700.00)
ON CONFLICT (invoice) DO NOTHING;

INSERT INTO sales (invoice,medicine_id,sale_date,quantity,price,total) VALUES
('INV-5021','MED002','2026-09-10',40,8.00,320.00)
ON CONFLICT (invoice) DO NOTHING;
