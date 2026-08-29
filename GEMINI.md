# IT Repair System - Rules & Context

## Project Overview
- **Name:** IT Repair System (ระบบแจ้งซ่อมอุปกรณ์ไอที)
- **Tech Stack:** React, TypeScript, Tailwind CSS, Vite, Node.js / PHP API
- **Main State/APIs:** `usersApi`, `repairApi`, `mockUsers`, `mockRepairs`

## Strict Coding Rules
1. **Language:** ตอบ สรุป และเขียน Comment ในโค้ดเป็นภาษาไทยทั้งหมด
2. **Preserve Existing Code:** ห้ามลบหรือเขียนทับ Logic เดิมที่ไม่เกี่ยวข้องเด็ดขาด โดยเฉพาะส่วนการดึงข้อมูล การจัดการสิทธิ์ผู้ใช้ และ Component UI หลัก
3. **Safe Modifications:** เมื่อแก้ไขไฟล์ ให้เน้นต่อเติม (Extend) แทนการเขียนใหม่ทั้งหมด (Rewrite) เพื่อป้องกันโค้ดอื่นพัง
4. **Data Consistency:** 
   - เมื่อเพิ่ม field ใหม่ (เช่น `student_id`) ต้องอัปเดตให้รองรับทั้ง TypeScript Type, Form Validation, API call และ Mock Data
   - ฟิลด์ `student_id` ต้องเป็น Unique Identifier
5. **UI & UX Standards:**
   - ใช้ Lucide React สำหรับไอคอน
   - คงธีมสีเดิม (Sky/Blue/Indigo) และใช้ UI Component จาก `@/components/ui/`
   - ใช้ `toast` จาก `sonner` สำหรับแสดงข้อความแจ้งเตือนผลลัพธ์