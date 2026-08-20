import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Settings, Clock, CheckCircle, XCircle, Wrench, Calendar, MapPin, MessageSquareText, User as UserIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { repairApi, usersApi } from '../utils/api';
import { mockRepairRequests, mockUsers } from '../utils/mockData';
import { User } from '../types';

export default function UpdateRepair() {
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [updateData, setUpdateData] = useState({ status: '', assignedTo: '', technicianNotes: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
    loadRequests();
    loadTechnicians();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await repairApi.getAll();
      setRequests(res.data);
    } catch {
      setRequests(mockRepairRequests.map((r) => ({
        id: r.id, request_no: r.id,
        equipment_type_name: r.equipmentType, equipment_model: r.equipmentModel,
        location_description: r.location, problem_description: r.problemDescription,
        status: r.status, priority: r.priority,
        assigned_to: r.assignedTo, technician_name: r.assignedTechnicianName,
        technician_notes: r.technicianNotes,
        user_name: r.userName, user_phone: r.userPhone, department: r.department,
        created_at: r.createdAt,
      })));
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const res = await usersApi.getAll('technician');
      const adminRes = await usersApi.getAll('admin');
      setTechnicians([...res.data, ...adminRes.data]);
    } catch {
      setTechnicians(mockUsers.filter((u) => u.role === 'technician' || u.role === 'admin'));
    }
  };

  const handleOpenDialog = (request: any) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status,
      assignedTo: request.assigned_to || '',
      technicianNotes: request.technician_notes || '',
    });
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedRequest || !currentUser) return;
    setSaving(true);
    try {
      await repairApi.update({
        id:               selectedRequest.id,
        status:           updateData.status,
        assigned_to:      updateData.assignedTo || null,
        technician_notes: updateData.technicianNotes,
        technicianNotes:  updateData.technicianNotes,
        changed_by:       currentUser.id,
      });
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว', {
        description: `คำขอ ${selectedRequest.request_no || selectedRequest.id} ได้รับการอัปเดตและแจ้งเตือนไปยัง LINE เรียบร้อยแล้ว`,
      });
      setDialogOpen(false);
      loadRequests();
    } catch {
      setRequests((prev) => prev.map((r) =>
        r.id === selectedRequest.id
          ? { ...r, status: updateData.status, assigned_to: updateData.assignedTo, technician_notes: updateData.technicianNotes }
          : r
      ));
      toast.success('อัปเดตสถานะเรียบร้อยแล้ว (offline mode)');
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':      return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-2 border-amber-300 text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm"><Clock className="size-4 mr-1.5" />รอดำเนินการ</Badge>;
      case 'in_progress':
      case 'in-progress':  return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-2 border-blue-300 text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm"><Wrench className="size-4 mr-1.5" />กำลังดำเนินการ</Badge>;
      case 'completed':    return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-2 border-emerald-300 text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm"><CheckCircle className="size-4 mr-1.5" />เสร็จสิ้น</Badge>;
      case 'cancelled':    return <Badge variant="outline" className="bg-rose-50 text-rose-800 border-2 border-rose-300 text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm"><XCircle className="size-4 mr-1.5" />ยกเลิก</Badge>;
      default:             return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1 rounded-xl border border-slate-200">ต่ำ</Badge>;
      case 'medium': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm">ปานกลาง</Badge>;
      case 'high':   return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm">สูง</Badge>;
      case 'urgent': return <Badge variant="destructive" className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold px-3 py-1 rounded-xl shadow-sm animate-pulse">เร่งด่วนมาก</Badge>;
      default:       return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-2 border-slate-200/90 shadow-md bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b-2 border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-blue-600/30 text-white shrink-0">
              <Settings className="size-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">อัปเดตการซ่อม</CardTitle>
              <CardDescription className="text-slate-600 font-semibold text-base mt-1">
                จัดการและอัปเดตสถานะคำขอซ่อมต่างๆ พร้อมส่งการแจ้งเตือนไปยัง LINE OA
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="rounded-3xl border-2 border-slate-200/90 shadow-md p-16 text-center">
          <RefreshCw className="size-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-bold">กำลังโหลดข้อมูลคำขอซ่อม...</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {requests.map((request) => (
            <Card key={request.id} className="rounded-3xl border-2 border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 border-b-2 border-slate-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-slate-900 font-black text-2xl tracking-tight">
                        เลขที่: <span className="text-blue-600 font-mono">#{request.request_no || request.id}</span>
                      </span>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    <CardDescription className="text-slate-700 font-extrabold text-lg">
                      {request.equipment_type_name || '-'}
                      {request.equipment_model && ` — ${request.equipment_model}`}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => handleOpenDialog(request)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/30 transition-all shrink-0 active:scale-95"
                  >
                    <Settings className="size-5 mr-2" />
                    อัปเดตสถานะ
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                    <MapPin className="size-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">สถานที่</p>
                      <p className="text-slate-900 font-bold text-base">{request.location_description || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                    <Calendar className="size-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">วันที่แจ้ง</p>
                      <p className="text-slate-900 font-bold text-base">
                        {new Date(request.created_at || request.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-200/60">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">รายละเอียดปัญหา</p>
                  <p className="text-slate-900 font-semibold text-base leading-relaxed">{request.problem_description || '-'}</p>
                </div>

                {request.technician_notes && (
                  <div className="bg-blue-50/80 rounded-2xl p-4 border-2 border-blue-200/80">
                    <p className="text-blue-700 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <MessageSquareText className="size-4" />
                      หมายเหตุจากช่าง
                    </p>
                    <p className="text-blue-950 font-bold text-base leading-relaxed whitespace-pre-wrap">{request.technician_notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <UserIcon className="size-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">ผู้แจ้ง</p>
                    <p className="text-slate-900 font-bold text-base">
                      {request.user_name} {request.user_phone ? `| ${request.user_phone}` : ''} {request.department ? `| ${request.department}` : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog อัปเดตสถานะ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-full rounded-3xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.3)] border-2 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Settings className="size-7 text-blue-600" />
              อัปเดตสถานะการซ่อม
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-bold text-base mt-1">
              เลขที่คำขอ: <span className="font-mono text-blue-600 font-extrabold">#{selectedRequest?.request_no || selectedRequest?.id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-slate-800 font-bold text-base">สถานะการดำเนินการ <span className="text-rose-500">*</span></Label>
              <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                <SelectTrigger className="rounded-xl border-2 border-slate-200 bg-white h-12 text-base font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-slate-200 shadow-xl">
                  <SelectItem value="pending" className="text-base py-2.5 font-bold text-amber-700">🕒 รอดำเนินการ</SelectItem>
                  <SelectItem value="in_progress" className="text-base py-2.5 font-bold text-blue-700">🔧 กำลังดำเนินการ</SelectItem>
                  <SelectItem value="completed" className="text-base py-2.5 font-bold text-emerald-700">✅ เสร็จสิ้น</SelectItem>
                  <SelectItem value="cancelled" className="text-base py-2.5 font-bold text-rose-700">❌ ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-800 font-bold text-base">มอบหมายให้ช่าง</Label>
              <Select value={updateData.assignedTo} onValueChange={(v) => setUpdateData({ ...updateData, assignedTo: v })}>
                <SelectTrigger className="rounded-xl border-2 border-slate-200 bg-white h-12 text-base font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="เลือกช่างผู้รับผิดชอบ" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-slate-200 shadow-xl">
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id} className="text-base py-2.5 font-medium">
                      {tech.name} ({tech.role === 'admin' ? 'Admin' : 'Technician'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-800 font-bold text-base">หมายเหตุจากช่าง</Label>
              <Textarea
                placeholder="กรุณากรอกรายละเอียดการซ่อม (ข้อความนี้จะถูกแสดงในระบบ และส่งแจ้งเตือนไปยัง LINE OA)..."
                rows={4}
                value={updateData.technicianNotes}
                onChange={(e) => setUpdateData({ ...updateData, technicianNotes: e.target.value })}
                className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-base font-medium text-slate-900 shadow-inner focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="rounded-xl border-2 border-slate-200 font-bold text-base h-11 px-6 text-slate-700"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl h-11 px-7 shadow-lg shadow-blue-600/30"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}