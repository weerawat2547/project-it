
  # IT Equipment Repair System

  ระบบแจ้งซ่อมอุปกรณ์ IT สำหรับมหาวิทยาลัย

  ## โครงสร้างโปรเจกต์

  ```
  ├── frontend/    # React + Vite + Tailwind (UI)
  ├── backend/     # PHP REST API (XAMPP/Apache)
  └── README.md
  ```

  ## Running the Frontend

  ```bash
  cd frontend
  npm install
  npm run dev
  ```

  ## Running the Backend

  1. ตั้ง Apache Alias ใน XAMPP ให้ `/it_repair_api` ชี้ไปที่โฟลเดอร์ `backend/`
     หรือ copy โฟลเดอร์ `backend/` ไปไว้ที่ `C:/xampp/htdocs/it_repair_api`
  2. เปิด Apache + MySQL ใน XAMPP
  3. สร้างฐานข้อมูล `it_repair_system` ใน MySQL

  ## Environment Variables (Frontend)

  สร้างไฟล์ `frontend/.env`:
  ```
  VITE_API_URL=http://localhost/it_repair_api
  ```