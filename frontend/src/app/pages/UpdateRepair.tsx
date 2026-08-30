import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { User, MapPin, Wrench, Calendar, X, Image as ImageIcon, Eye, Settings, CheckCircle2, Laptop, Camera, History } from 'lucide-react';
import { toast } from 'sonner';
import { repairApi, BASE_URL } from '../utils/api';
import { User as UserType } from '../types';

export default function UpdateRepair() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [updateData, setUpdateData] = useState({ status: '', technicianNotes: '' });
  const [repairImages, setRepairImages] = useState<{file: File, preview: string}[]>([]);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const faculties = [
    "คณะวิทยาศาสตร์และเทคโนโลยี", "คณะมนุษยศาสตร์และสังคมศาสตร์", "คณะวิศวกรรมศาสตร์",
    "คณะวิทยาการจัดการ", "คณะเทคโนโลยีการเกษตร", "คณะนิติศาสตร์",
    "คณะรัฐศาสตร์และรัฐประศาสนศาสตร์", "คณะครุศาสตร์"
  ];

  const quickActionTags = ['เปลี่ยนแรม', 'เปลี่ยนจอ', 'ทำความสะอาดเครื่อง', 'ลงระบบปฏิบัติการใหม่', 'เปลี่ยนฮาร์ดดิสก์'];

  // ฟังก์ชัน Helper สำหรับยิง LINE OA
  const sendLineUpdateNotification = async (requestData: any, newStatus: string, note: string, afterImages: string[] = []) => {
    let beforeImages: string[] = [];
    const rawBefore = requestData?.images || requestData?.before_images;
    if (rawBefore) {
      try {
        beforeImages = typeof rawBefore === 'string' ? JSON.parse(rawBefore) : (Array.isArray(rawBefore) ? rawBefore : []);
      } catch (e) {
        beforeImages = [];
      }
    }

    const cleanBefore = beforeImages.filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')));
    const cleanAfter = afterImages.filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')));

    const payload = {
      action: 'update_status',
      type: 'update_status',
      request_id: requestData?.id || requestData?.request_no,
      ticket_id: requestData?.request_no || requestData?.id,
      old_status: requestData?.status || 'pending',
      new_status: newStatus,
      changed_by: currentUser?.id || currentUser?.name || 'ช่างเทคนิค',
      technician_notes: note || '-',
      before_images: cleanBefore,
      after_images: cleanAfter
    };

    console.log("DEBUG: Sending LINE Update Payload:", JSON.stringify(payload));

    try {
      const response = await fetch(`${BASE_URL}/line_notify.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log("LINE Notify Success:", result);
    } catch (error) {
      console.error("DEBUG: Failed to send LINE notification:", error);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await repairApi.getAll();
      const data = res.data || [];
      setRequests(data);
      try {
        localStorage.setItem('repair_requests_data', JSON.stringify(data.slice(0, 15)));
      } catch (e) {}
    } catch (err) {
      console.warn("API load error, fallback to local:", err);
      const localData = localStorage.getItem('repair_requests_data');
      if (localData) {
        try { setRequests(JSON.parse(localData)); } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      if (!selectedRequest) return;
      
      let finalAfterImages = repairImages.map(img => img.preview);
      const technicianName = currentUser?.name || 'ช่างเทคนิค 1';
      const now = new Date().toISOString();

      // 1. ส่งข้อมูลอัปเดตไปยัง Backend API (จะอัปโหลดขึ้น Cloudinary และส่ง LINE ให้อัตโนมัติ)
      try {
        const apiRes: any = await repairApi.update({
          id: selectedRequest.id || selectedRequest.request_no,
          status: updateData.status,
          technician_notes: updateData.technicianNotes,
          after_images: finalAfterImages,
          after_repair_images: finalAfterImages,
          changed_by: currentUser?.id || currentUser?.name || 'ช่างเทคนิค',
          technician_name: technicianName
        });

        if (apiRes?.data?.after_images && Array.isArray(apiRes.data.after_images)) {
          finalAfterImages = apiRes.data.after_images;
        }
      } catch (apiErr) {
        console.warn("Backend API update fallback to local:", apiErr);
      }
      
      // 2. อัปเดตข้อมูลใน localStorage อย่างปลอดภัย (ป้องกัน QuotaExceededError)
      try {
        const localData = localStorage.getItem('repair_requests_data');
        let currentRequests = localData ? JSON.parse(localData) : [];

        const updated = currentRequests.map((req: any) => {
          if (String(req.id) === String(selectedRequest.id) || String(req.request_no) === String(selectedRequest.request_no)) {
            const history = req.status_history ? (typeof req.status_history === 'string' ? JSON.parse(req.status_history) : req.status_history) : [];
            history.push({
              status: updateData.status,
              note: updateData.technicianNotes,
              updated_at: now,
              updated_by: technicianName
            });

            return {
              ...req,
              status: updateData.status,
              technician_notes: updateData.technicianNotes,
              technician: technicianName,
              after_images: JSON.stringify(finalAfterImages.slice(0, 2)),
              after_repair_images: JSON.stringify(finalAfterImages.slice(0, 2)),
              status_history: JSON.stringify(history),
              updated_at: now
            };
          }
          return req;
        });

        localStorage.setItem('repair_requests_data', JSON.stringify(updated.slice(0, 20)));
      } catch (storageErr) {
        console.warn("LocalStorage quota error in UpdateRepair:", storageErr);
      }

      toast.success('อัปเดตสถานะและบันทึกข้อมูลเรียบร้อยแล้ว');
      setDialogOpen(false);
      
      // 3. โหลดข้อมูลสดใหม่ล่าสุดจากเซิร์ฟเวอร์ทันที
      await loadRequests();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setFacultyFilter('all');
    setUrgencyFilter('all');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'in_progress': return 'กำลังดำเนินการซ่อม';
      case 'waiting_parts': return 'รออะไหล่';
      case 'completed': return 'ซ่อมเสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก/ซ่อมไม่ได้';
      default: return status || 'รอดำเนินการ';
    }
  };

  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-800">⏳ {getStatusLabel(status)}</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-blue-50 text-blue-800">⚙️ {getStatusLabel(status)}</Badge>;
      case 'waiting_parts': return <Badge variant="outline" className="bg-purple-50 text-purple-800">📦 {getStatusLabel(status)}</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-800">✅ {getStatusLabel(status)}</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-rose-50 text-rose-800">❌ {getStatusLabel(status)}</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-orange-500 text-white">สูง</Badge>;
      case 'urgent': return <Badge variant="destructive" className="bg-rose-600 text-white">เร่งด่วนมาก</Badge>;
      default: return <Badge variant="secondary" className="bg-slate-100 text-slate-700">ปานกลาง</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-2 shadow-md bg-white p-6">
        <h2 className="text-2xl font-black mb-4">อัปเดตการซ่อม</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="สถานะงานซ่อม" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                    <SelectItem value="waiting_parts">รออะไหล่</SelectItem>
                    <SelectItem value="completed">ซ่อมเสร็จสิ้น</SelectItem>
                    <SelectItem value="cancelled">ซ่อมไม่ได้/ยกเลิก</SelectItem>
                </SelectContent>
            </Select>
            <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger><SelectValue placeholder="คณะ" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">ทุกคณะ</SelectItem>
                    {faculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger><SelectValue placeholder="ความเร่งด่วน" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">ทุกความเร่งด่วน</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="high">เร่งด่วน</SelectItem>
                    <SelectItem value="urgent">เร่งด่วนมาก</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="rounded-2xl">ล้างตัวกรอง</Button>
        </div>
      </Card>

      {loading ? <p>กำลังโหลด...</p> : [...requests].filter(req => {
          const matchStatus = statusFilter === 'all' || req.status === statusFilter;
          const matchFaculty = facultyFilter === 'all' || req.department === facultyFilter;
          const matchUrgency = urgencyFilter === 'all' || req.priority === urgencyFilter;
          return matchStatus && matchFaculty && matchUrgency;
      }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((request) => (
        <Card key={request.id} className="rounded-3xl border-2 shadow-md p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-black">#{request.request_no}</CardTitle>
                <CardDescription className="text-lg font-bold"><Laptop className="inline mr-2 h-4 w-4"/> {request.equipment_type_name} — {request.equipment_model}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-2xl" onClick={() => { setSelectedRequest(request); setDetailDialogOpen(true); }}><Eye className="mr-2 h-4 w-4" /> ดูรายละเอียด</Button>
                <Button className="rounded-2xl" onClick={() => { 
                  setSelectedRequest(request); 
                  setUpdateData({status: request.status, technicianNotes: request.technician_notes || ''}); 
                  
                  // ดึงรูปภาพหลังซ่อมเดิม (ถ้ามี) ขึ้นมาแสดงให้แก้ไข
                  let existingAfterImages: string[] = [];
                  const rawAfter = request.after_images || request.after_repair_images || request.afterImages;
                  if (rawAfter) {
                    try {
                      existingAfterImages = typeof rawAfter === 'string' ? JSON.parse(rawAfter) : (Array.isArray(rawAfter) ? rawAfter : []);
                    } catch (e) {
                      existingAfterImages = [];
                    }
                  }
                  setRepairImages(existingAfterImages.map((url: string) => ({ file: null, preview: url })));
                  setDialogOpen(true); 
                }}><Settings className="mr-2 h-4 w-4" /> อัปเดตสถานะ</Button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">{getStatusBadge(request.status)} {getPriorityBadge(request.priority)}</div>
          </CardHeader>
          <CardContent className="p-0 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-semibold text-slate-700">
            <p><MapPin className="inline mr-2 h-4 w-4 text-blue-600"/>สถานที่: {request.location_description}</p>
            <p><Calendar className="inline mr-2 h-4 w-4 text-indigo-600"/>วันที่แจ้ง: {formatThaiDate(request.created_at)}</p>
            <p><Calendar className="inline mr-2 h-4 w-4 text-indigo-600"/>วันที่อัปเดต: {formatThaiDate(request.updated_at)}</p>
            <p className="col-span-2"><User className="inline mr-2 h-4 w-4 text-emerald-600"/>ผู้แจ้ง: {request.user_name} ({request.department})</p>
          </CardContent>
        </Card>
      ))}

      {/* อัปเดต Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>อัปเดตสถานะงานซ่อม</DialogTitle>
            <DialogDescription className="sr-only">กรอกข้อมูลรายละเอียดการอัปเดตสถานะงานซ่อมสำหรับช่าง</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
            <div className="space-y-4">
                <div className="p-4 bg-slate-100 rounded-xl"><Label>ช่างผู้ดูแล (คุณ)</Label><Input value={currentUser?.name || ''} disabled className="bg-slate-100 font-bold" /></div>
                <Select value={updateData.status} onValueChange={(v) => setUpdateData({...updateData, status: v})}>
                    <SelectTrigger><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">⏳ รอดำเนินการ</SelectItem>
                        <SelectItem value="in_progress">⚙️ กำลังดำเนินการ</SelectItem>
                        <SelectItem value="waiting_parts">📦 รออะไหล่</SelectItem>
                        <SelectItem value="completed">✅ ซ่อมเสร็จ</SelectItem>
                        <SelectItem value="cancelled">❌ ซ่อมไม่ได้</SelectItem>
                    </SelectContent>
                </Select>
                <div className="space-y-2">
                    <Label>หมายเหตุจากช่าง</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {quickActionTags.map(tag => <Button key={tag} variant="outline" size="sm" onClick={() => setUpdateData(prev => ({...prev, technicianNotes: prev.technicianNotes + (prev.technicianNotes ? ' | ' : '') + tag}))} className="text-xs">{tag}</Button>)}
                    </div>
                    <Textarea value={updateData.technicianNotes} onChange={(e) => setUpdateData({...updateData, technicianNotes: e.target.value})} />
                </div>
                <Button onClick={handleSaveStatus} className="w-full rounded-2xl">บันทึกการเปลี่ยนแปลง</Button>
            </div>
            <div>
                <Label>รูปผลงานหลังซ่อมเสร็จ ({repairImages.length}/5)</Label>
                <Button variant="outline" className="w-full h-20 rounded-xl border-dashed" onClick={() => document.getElementById('repair_img')?.click()}>
                    <Camera className="mr-2"/> คลิกเพื่ออัปโหลดรูปผลงาน
                </Button>
                <input type="file" id="repair_img" className="hidden" multiple accept="image/*" onChange={async (e) => {
                    if (e.target.files) {
                        const files = Array.from(e.target.files);
                        for (const file of files) {
                            try {
                                const base64Url = await new Promise<string>((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const img = new Image();
                                        img.onload = () => {
                                            const canvas = document.createElement('canvas');
                                            const MAX_DIM = 800;
                                            let width = img.width;
                                            let height = img.height;
                                            if (width > height) {
                                                if (width > MAX_DIM) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
                                            } else {
                                                if (height > MAX_DIM) { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
                                            }
                                            canvas.width = width; canvas.height = height;
                                            const ctx = canvas.getContext('2d');
                                            if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.6)); }
                                            else { resolve(ev.target?.result as string); }
                                        };
                                        img.onerror = () => resolve(ev.target?.result as string);
                                        img.src = ev.target?.result as string;
                                    };
                                    reader.readAsDataURL(file);
                                });

                                setRepairImages(prev => {
                                    if (prev.length >= 5) {
                                        toast.error('สามารถอัปโหลดรูปภาพได้สูงสุด 5 รูป');
                                        return prev;
                                    }
                                    return [...prev, { file, preview: base64Url }];
                                });
                            } catch {
                                // fallback
                            }
                        }
                    }
                }} />
                <div className="grid grid-cols-5 gap-2 mt-2">
                    {repairImages.map((img, i) => (
                        <div key={i} className="relative">
                            <img src={img.preview} alt={`ผลงานที่ ${i+1}`} className="w-full h-16 object-cover rounded-lg border shadow-sm"/>
                            <button onClick={() => setRepairImages(repairImages.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors">
                                <X size={10}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedRequest(null); }}>
        <DialogContent className="w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl bg-white shadow-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex justify-between items-center text-xl">
              <span>รายละเอียดงานซ่อม #{selectedRequest?.request_no}</span>
              <div className="flex gap-2">{selectedRequest && getStatusBadge(selectedRequest.status)} {selectedRequest && getPriorityBadge(selectedRequest.priority)}</div>
            </DialogTitle>
            <DialogDescription className="sr-only">แสดงข้อมูลรายละเอียดงานซ่อม ประวัติการดำเนินงาน และรูปภาพประกอบ</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-2.5 p-4 bg-slate-50 rounded-2xl border">
                        <h3 className="font-black text-lg flex items-center gap-2"><User size={18}/> ข้อมูลผู้แจ้ง</h3>
                        <p><strong>ชื่อผู้แจ้ง:</strong> {selectedRequest.user_name || selectedRequest.userName || 'ไม่ระบุ'}</p>
                        <p><strong>รหัสนักศึกษา/รหัสประจำตัว:</strong> {selectedRequest.student_id || selectedRequest.studentId || '-'}</p>
                        <p><strong>คณะ/หน่วยงาน:</strong> {selectedRequest.department || selectedRequest.faculty || '-'}</p>
                        <p><strong>เบอร์โทรศัพท์:</strong> {selectedRequest.user_phone || selectedRequest.userPhone || '-'}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-black text-lg flex items-center gap-2"><Wrench/> ข้อมูลการแจ้งซ่อม</h3>
                        <p><strong>อุปกรณ์:</strong> {selectedRequest.equipment_type_name || selectedRequest.equipmentType} ({selectedRequest.equipment_model || selectedRequest.equipmentModel || '-'})</p>
                        <p className="flex items-center gap-2"><MapPin size={16}/> {selectedRequest.location_description || selectedRequest.location}</p>
                        <p className="flex items-center gap-2"><Calendar size={16}/> {formatThaiDate(selectedRequest.created_at)}</p>
                        <p><strong>ปัญหา:</strong> {selectedRequest.problem_description || selectedRequest.problemDescription}</p>
                    </div>
                    <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <h3 className="font-black text-lg flex items-center gap-2"><Settings/> ข้อมูลช่างผู้ดูแล</h3>
                        <p><strong>ชื่อช่างผู้ดูแล:</strong> {selectedRequest.technician_name || selectedRequest.technician || currentUser?.name || 'ยังไม่ระบุ'}</p>
                        <p><strong>เบอร์โทรช่าง:</strong> {selectedRequest.technician_phone || selectedRequest.technicianPhone || '-'}</p>
                        <p><strong>หมายเหตุจากช่าง:</strong> {selectedRequest.technician_notes || selectedRequest.technicianNotes || 'ไม่มีหมายเหตุ'}</p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-black text-lg flex items-center gap-2"><History size={18}/> ประวัติการดำเนินงาน</h3>
                      <div className="space-y-4 border-l-2 border-slate-200 ml-2 pl-4">
                        {(() => {
                          const rawH = selectedRequest.status_history;
                          let histArr: any[] = [];
                          try {
                            histArr = typeof rawH === 'string' ? JSON.parse(rawH) : (Array.isArray(rawH) ? rawH : []);
                          } catch (e) {
                            histArr = [];
                          }
                          return histArr.sort((a:any, b:any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((h:any, i:number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-0 p-1 bg-white border rounded-full"><CheckCircle2 size={12} className="text-emerald-500"/></div>
                              <p className="font-bold text-sm text-blue-700">{getStatusLabel(h.status)}</p>
                              <p className="text-xs text-slate-500">{formatThaiDate(h.updated_at)} โดย {h.updated_by}</p>
                              {h.note && <p className="text-sm bg-slate-50 p-2 rounded mt-1">หมายเหตุ: {h.note}</p>}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                      <h4 className="font-bold flex items-center gap-2"><ImageIcon size={18}/> รูปก่อนซ่อม</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {(() => {
                          const rawI = selectedRequest.images;
                          let imgArr: string[] = [];
                          try {
                            imgArr = typeof rawI === 'string' ? JSON.parse(rawI) : (Array.isArray(rawI) ? rawI : []);
                          } catch(e) {
                            imgArr = [];
                          }
                          return imgArr.map((img:string, i:number) => <img key={i} src={img} className="w-full h-32 object-cover rounded-lg border"/>);
                        })()}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold flex items-center gap-2"><Camera size={18}/> รูปหลังซ่อม</h4>
                      {(() => {
                        const raw = selectedRequest?.after_images;
                        let images: string[] = [];
                        
                        try {
                          // ถ้าเป็น string ให้ parse ถ้าเป็น array ให้ใช้เลย
                          images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
                        } catch (e) {
                          console.error("Error parsing images:", e);
                          images = [];
                        }
                        
                        return images.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {images.map((img:string, i:number) => <img key={i} src={img} className="w-full h-32 object-cover rounded-lg border"/>)}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">ยังไม่มีรูปภาพหลังซ่อม</p>
                        );
                      })()}
                    </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
