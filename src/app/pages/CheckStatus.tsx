import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, Calendar, User, MapPin, Wrench, RefreshCw } from 'lucide-react';
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
  const [requests, setRequests]       = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      loadRequests(user);
    }
  }, []);

  const loadRequests = async (user: UserType) => {
    setLoading(true);
    try {
      const res = await repairApi.getAll(user.id, user.role);
      setRequests(res.data);
    } catch {
      const list = user.role === 'student'
        ? mockRepairRequests.filter((r) => r.userId === user.id)
        : mockRepairRequests;
      setRequests(list.map((r) => ({
        id: r.id, request_no: r.id,
        equipment_type_name: r.equipmentType, equipment_model: r.equipmentModel,
        location_description: r.location, problem_description: r.problemDescription,
        status: r.status, priority: r.priority,
        technician_name: r.assignedTechnicianName, technician_notes: r.technicianNotes,
        user_name: r.userName, user_phone: r.userPhone,
        created_at: r.createdAt, completed_at: r.completedAt,
      })));
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchTerm.toLowerCase();
    return (
      (req.request_no || req.id || '').toLowerCase().includes(term) ||
      (req.equipment_type_name || '').toLowerCase().includes(term) ||
      (req.location_description || '').toLowerCase().includes(term)
    );
  });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

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
                  <div className="flex items-center gap-3 flex-wrap sm:justify-end">
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
                              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ผู้แจ้งซ่อม</p>
                              <p className="text-slate-900 font-bold text-base leading-snug">{request.user_name}</p>
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
    </div>
  );
}