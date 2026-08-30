import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, Calendar, User, MapPin, Wrench, RefreshCw, Eye, Image as ImageIcon, Camera, History, Settings, CheckCircle2 } from 'lucide-react';
import { User as UserType } from '../types';
import { repairApi } from '../utils/api';
import { mockRepairRequests } from '../utils/mockData';

interface StatusConfig {
  label: string; bg: string; text: string; border: string; icon: React.ReactNode;
}

const STATUS: Record<string, StatusConfig> = {
  pending:     { label: 'รอดำเนินการ',    bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-300', icon: <Clock className="size-4" /> },
  in_progress: { label: 'กำลังดำเนินการ', bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-300',  icon: <Wrench className="size-4" /> },
  'in-progress':{ label: 'กำลังดำเนินการ', bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-300',  icon: <Wrench className="size-4" /> },
  completed:   { label: 'เสร็จสิ้น',       bg: 'bg-emerald-50',text: 'text-emerald-800 border-emerald-300', border: 'border-emerald-300', icon: <CheckCircle className="size-4" /> },
  cancelled:   { label: 'ยกเลิก',          bg: 'bg-rose-50',   text: 'text-rose-800',    border: 'border-rose-300',  icon: <XCircle className="size-4" /> },
};

const PRIORITY: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  urgent: { label: 'เร่งด่วนมาก', dot: 'bg-rose-500',   bg: 'bg-rose-50',   text: 'text-rose-800',   border: 'border-rose-200' },
  high:   { label: 'เร่งด่วน',     dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  medium: { label: 'ปานกลาง',     dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  low:    { label: 'ปานกลาง',     dot: 'bg-slate-400',  bg: 'bg-slate-100', text: 'text-slate-700',  border: 'border-slate-200' },
};

export default function CheckStatus() {
  const [searchTerm, setSearchTerm]   = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [requests, setRequests]       = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user) setCurrentUser(user);
    
    loadRequests(user);
  }, []);

  const loadRequests = async (user: UserType | null) => {
    setLoading(true);
    try {
      const res = await repairApi.getAll(user?.id, user?.role);
      const allRequests = res.data || [];
      const userRequests = user?.role === 'student' 
          ? allRequests.filter((r: any) => 
              r.userId === user.id || 
              r.user_name === user.name ||
              !r.userId
            ) 
          : allRequests;
      setRequests(userRequests);
    } catch (error) {
      console.error("Failed to load requests", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchTerm.toLowerCase();
    
    const matchesSearch = !term.trim() ||
      (req.request_no || req.id || '').toLowerCase().includes(term) ||
      (req.equipment_type_name || '').toLowerCase().includes(term) ||
      (req.location_description || '').toLowerCase().includes(term) ||
      (req.problem_description || '').toLowerCase().includes(term);
      
    const matchesFaculty = !facultyFilter || facultyFilter === 'ทุกคณะ' || req.department === facultyFilter;
    
    return matchesSearch && matchesFaculty;
  });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

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

  const faculties = [
    "คณะวิทยาศาสตร์และเทคโนโลยี",
    "คณะมนุษยศาสตร์และสังคมศาสตร์",
    "คณะวิศวกรรมศาสตร์",
    "คณะวิทยาการจัดการ",
    "คณะเทคโนโลยีการเกษตร",
    "คณะนิติศาสตร์",
    "คณะรัฐศาสตร์และรัฐประศาสนศาสตร์",
    "คณะครุศาสตร์"
  ];

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 shadow-md">
        <div className="flex items-center gap-4 mb-5">
          <div className="bg-blue-100 p-3 rounded-2xl shrink-0 shadow-sm">
            <Search className="size-7 text-blue-600" />
          </div>
          <div>
            <h2 className="text-slate-900 font-extrabold text-2xl tracking-tight">ตรวจสอบสถานะการซ่อม</h2>
            <p className="text-slate-600 font-medium text-base mt-0.5">ค้นหาและติดตามรายการคำขอซ่อมของคุณ</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="ค้นหาด้วยเลขที่คำขอ, ประเภทอุปกรณ์, หรือสถานที่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-50/80 border-2 border-slate-200 rounded-2xl h-13 px-4 text-base font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="bg-slate-50/80 border-2 border-slate-200 rounded-2xl h-13 px-4 text-base font-medium focus:ring-2 focus:ring-blue-500 shadow-inner"
          >
            <option value="">ทุกคณะ</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <Button
            onClick={() => currentUser && loadRequests(currentUser)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-13 shrink-0 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <RefreshCw className="size-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-slate-200/90 shadow-md">
          <RefreshCw className="size-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-bold">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-slate-200/90 shadow-md">
          <AlertCircle className="size-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-xl font-bold">ไม่พบข้อมูลคำขอซ่อม</p>
          <p className="text-slate-400 text-base mt-1">ลองเปลี่ยนคำค้นหาหรือลองใหม่อีกครั้ง</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map((request) => {
            const st = STATUS[request.status];
            const pr = PRIORITY[request.priority];
            return (
              <div key={request.id} className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                {/* Card header */}
                <div className="px-7 py-5 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 border-b-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span className="text-slate-900 font-extrabold text-2xl tracking-tight">
                        {request.equipment_type_name || '-'}
                        {request.equipment_model && ` — ${request.equipment_model}`}
                      </span>
                    </div>
                    <p className="text-blue-600 font-mono font-bold text-base bg-blue-50/80 px-3 py-0.5 rounded-lg border border-blue-200/80 inline-block mt-1">
                      #{request.request_no || request.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="rounded-2xl" onClick={() => { setSelectedRequest(request); setDetailDialogOpen(true); }}><Eye className="mr-2 h-4 w-4" /> ดูรายละเอียด</Button>
                    {pr && (
                      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold border ${pr.bg} ${pr.text} ${pr.border} shadow-sm`}>
                        <span className={`size-2.5 rounded-full ${pr.dot} shadow-sm`} />
                        {pr.label}
                      </span>
                    )}
                    {st && (
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-extrabold border-2 ${st.bg} ${st.text} ${st.border} shadow-sm`}>
                        {st.icon}
                        {st.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-7">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                    {/* Left details section */}
                    <div className="flex-1 w-full space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex items-start gap-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                          <MapPin className="size-5 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">สถานที่ตั้ง</p>
                            <p className="text-slate-900 font-bold text-base leading-snug">{request.location_description || '-'}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                          <Calendar className="size-5 text-indigo-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">วันที่แจ้งซ่อม</p>
                            <p className="text-slate-900 font-bold text-base leading-snug">{fmtDate(request.created_at || request.createdAt)}</p>
                          </div>
                        </div>

                        {currentUser?.role !== 'student' && request.user_name && (
                          <div className="flex items-start gap-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                            <User className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ผู้แจ้งซ่อม (รหัสนศ.)</p>
                              <p className="text-slate-900 font-bold text-base leading-snug">{request.user_name} ({request.student_id})</p>
                              {request.user_phone && <p className="text-slate-500 text-sm font-semibold mt-0.5">{request.user_phone}</p>}
                            </div>
                          </div>
                        )}

                        {request.technician_name && (
                          <div className="flex items-start gap-3 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                            <Wrench className="size-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ช่างผู้รับผิดชอบ</p>
                              <p className="text-slate-900 font-bold text-base leading-snug">{request.technician_name}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Problem */}
                      <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200/60">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">รายละเอียดปัญหา / อาการเสีย</p>
                        <p className="text-slate-900 font-semibold text-base leading-relaxed">{request.problem_description || '-'}</p>
                      </div>

                      {/* Technician notes */}
                      {request.technician_notes && (
                        <div className="bg-blue-50/80 rounded-2xl p-4 border-2 border-blue-200/80">
                          <p className="text-blue-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">หมายเหตุจากช่าง</p>
                          <p className="text-blue-950 font-bold text-base leading-relaxed">{request.technician_notes}</p>
                        </div>
                      )}

                      {/* Completed at */}
                      {request.completed_at && (
                        <div className="bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-200 flex items-center gap-3">
                          <CheckCircle className="size-6 text-emerald-600 shrink-0" />
                          <p className="text-emerald-900 font-extrabold text-base">
                            ซ่อมเสร็จสิ้นเมื่อ {fmtDate(request.completed_at)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right side: Enlarged QR Code container */}
                    <div className="w-full md:w-auto flex flex-col items-center justify-center p-4 bg-slate-50/90 border-2 border-slate-200/80 rounded-3xl shrink-0 self-center md:self-start shadow-inner">
                      <img
                        src="/line-oa-qr.jpg"
                        alt="สแกนเพื่อติดตามสถานะผ่าน LINE OA"
                        title="สแกนเพื่อติดตามสถานะผ่าน LINE OA"
                        className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-md object-contain"
                      />
                      <span className="text-sm text-slate-700 font-extrabold mt-3 text-center">
                        สแกนติดตามผ่าน LINE OA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedRequest(null); }}>
        <DialogContent className="w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-8 rounded-2xl bg-white shadow-2xl !max-w-5xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="flex justify-between items-center text-xl">
              <span>รายละเอียดงานซ่อม #{selectedRequest?.request_no}</span>
            </DialogTitle>
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
                        <p className="flex items-center gap-2"><Calendar size={16}/> {fmtDate(selectedRequest.created_at || selectedRequest.createdAt)}</p>
                        <p><strong>ปัญหา:</strong> {selectedRequest.problem_description || selectedRequest.problemDescription}</p>
                    </div>
                    <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <h3 className="font-black text-lg flex items-center gap-2"><Settings/> ข้อมูลช่างผู้ดูแล</h3>
                        <p><strong>ชื่อช่างผู้ดูแล:</strong> {selectedRequest.technician_name || selectedRequest.technician || 'ยังไม่ระบุ'}</p>
                        <p><strong>เบอร์โทรช่าง:</strong> {selectedRequest.technician_phone || selectedRequest.technicianPhone || '-'}</p>
                        <p><strong>หมายเหตุจากช่าง:</strong> {selectedRequest.technician_notes || selectedRequest.technicianNotes || 'ไม่มีหมายเหตุ'}</p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-black text-lg flex items-center gap-2"><History size={18}/> ประวัติการดำเนินงาน</h3>
                      <div className="space-y-4 border-l-2 border-slate-200 ml-2 pl-4">
                        {selectedRequest.status_history && JSON.parse(selectedRequest.status_history).sort((a:any, b:any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map((h:any, i:number) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-0 p-1 bg-white border rounded-full"><CheckCircle2 size={12} className="text-emerald-500"/></div>
                            <p className="font-bold text-sm text-blue-700">{getStatusLabel(h.status)}</p>
                            <p className="text-xs text-slate-500">{fmtDate(h.updated_at)} โดย {h.updated_by}</p>
                            {h.note && <p className="text-sm bg-slate-50 p-2 rounded mt-1">หมายเหตุ: {h.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div><h4 className="font-bold flex items-center gap-2"><ImageIcon size={18}/> รูปก่อนซ่อม</h4><div className="grid grid-cols-2 gap-2 mt-2">{selectedRequest.images && JSON.parse(selectedRequest.images).map((img:string, i:number) => <img key={i} src={img} className="w-full h-32 object-cover rounded-lg border"/>)}</div></div>
                    <div>
                      <h4 className="font-bold flex items-center gap-2"><Camera size={18}/> รูปหลังซ่อม</h4>
                      {(() => {
                        const afterImagesRaw = selectedRequest?.after_images || selectedRequest?.after_repair_images || selectedRequest?.repair_images;
                        let afterImages: string[] = [];
                        
                        try {
                          if (afterImagesRaw) {
                            afterImages = typeof afterImagesRaw === 'string' ? JSON.parse(afterImagesRaw) : afterImagesRaw;
                          } else if (selectedRequest.repair_image) {
                            afterImages = [selectedRequest.repair_image];
                          }
                        } catch (e) {
                          afterImages = typeof afterImagesRaw === 'string' ? [afterImagesRaw] : [];
                        }
                        
                        return afterImages.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {afterImages.map((img:string, i:number) => <img key={i} src={img} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Error'} className="w-full h-32 object-cover rounded-lg border"/>)}
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