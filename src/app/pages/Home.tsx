import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText, Search, Settings, MessageSquare, Users,
  TrendingUp, Clock, CheckCircle, Wrench, BarChart2, ArrowRight,
} from 'lucide-react';
import { User } from '../types';
import { statsApi, repairApi } from '../utils/api';
import { mockRepairRequests } from '../utils/mockData';

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  pending:     { label: 'รอดำเนินการ',    dot: 'bg-amber-500',  bg: 'bg-amber-50/80',  text: 'text-amber-700', border: 'border-amber-200/60' },
  in_progress: { label: 'กำลังดำเนินการ', dot: 'bg-blue-500',   bg: 'bg-blue-50/80',   text: 'text-blue-700',  border: 'border-blue-200/60' },
  'in-progress': { label: 'กำลังดำเนินการ', dot: 'bg-blue-500',   bg: 'bg-blue-50/80',   text: 'text-blue-700',  border: 'border-blue-200/60' },
  completed:   { label: 'เสร็จสิ้น',       dot: 'bg-emerald-500', bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  cancelled:   { label: 'ยกเลิก',          dot: 'bg-rose-500',    bg: 'bg-rose-50/80',    text: 'text-rose-700',  border: 'border-rose-200/60' },
};

const QUICK_ACTIONS = [
  { title: 'แจ้งซ่อม',          desc: 'แจ้งซ่อมอุปกรณ์ที่มีปัญหา', icon: FileText,     color: '#2563eb', path: '/dashboard/report',    roles: ['student', 'technician', 'admin'] },
  { title: 'ตรวจสอบสถานะ',      desc: 'ดูสถานะการซ่อมปัจจุบัน',    icon: Search,       color: '#0891b2', path: '/dashboard/status',    roles: ['student', 'technician', 'admin'] },
  { title: 'อัปเดตการซ่อม',      desc: 'จัดการและอัปเดตคำขอซ่อม',  icon: Settings,     color: '#7c3aed', path: '/dashboard/update',    roles: ['technician', 'admin'] },
  { title: 'แชทบอท LINE OA',    desc: 'สอบถามผ่านแชทบอท',          icon: MessageSquare,color: '#059669', path: '/dashboard/chat',      roles: ['student', 'technician', 'admin'] },
  { title: 'จัดการผู้ใช้',       desc: 'จัดการบัญชีผู้ใช้งาน',      icon: Users,        color: '#d97706', path: '/dashboard/users',     roles: ['admin'] },
  { title: 'รายงานและวิเคราะห์', desc: 'ดูกราฟและสถิติการซ่อม',     icon: BarChart2,    color: '#dc2626', path: '/dashboard/analytics', roles: ['admin', 'technician'] },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', technician: 'ช่างซ่อม', student: 'นักศึกษา',
};

export default function Home() {
  const [currentUser, setCurrentUser]     = useState<User | null>(null);
  const [stats, setStats]                 = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      loadStats(user);
      if (user.role === 'student') loadRecentRequests(user);
    }
  }, []);

  const loadStats = async (user: User) => {
    try {
      const data = await statsApi.get(user.id, user.role);
      setStats({ total: data.total, pending: data.pending, inProgress: data.in_progress, completed: data.completed });
    } catch {
      const list = user.role === 'student'
        ? mockRepairRequests.filter((r) => r.userId === user.id)
        : mockRepairRequests;
      setStats({
        total:      list.length,
        pending:    list.filter((r) => r.status === 'pending').length,
        inProgress: list.filter((r) => r.status === 'in-progress' || r.status === 'in_progress').length,
        completed:  list.filter((r) => r.status === 'completed').length,
      });
    }
  };

  const loadRecentRequests = async (user: User) => {
    try {
      const res = await repairApi.getAll(user.id, user.role);
      setRecentRequests(res.data.slice(0, 4));
    } catch {
      setRecentRequests(mockRepairRequests.filter((r) => r.userId === user.id).slice(0, 4));
    }
  };

  if (!currentUser) return null;

  const filteredActions = QUICK_ACTIONS.filter((a) => a.roles.includes(currentUser.role));
  const roleLabel = ROLE_LABEL[currentUser.role] ?? currentUser.role;

  return (
    <div className="space-y-8 pb-6">

      {/* ── Animated Welcome Banner ──────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-xl shadow-blue-900/10 border border-white/20 animate-fade-in-up"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #1e3a8a 70%, #2563eb 100%)',
        }}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 px-8 py-8 flex items-center justify-between gap-6 backdrop-blur-[2px]">
          <div>
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 border border-white/15 backdrop-blur-md mb-3 shadow-inner">
              {roleLabel}
            </span>
            <h2 className="text-white text-3xl font-extrabold tracking-tight mb-1.5 drop-shadow-md">
              ยินดีต้อนรับ, {currentUser.name}!
            </h2>
            <p className="text-blue-100 text-sm font-medium">
              ระบบแจ้งซ่อมและติดตามสถานะอุปกรณ์ IT มหาวิทยาลัย
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center size-20 rounded-2xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-md shrink-0 ring-4 ring-white/5">
            <Wrench className="size-10 text-blue-200 drop-shadow" />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            label: 'คำขอทั้งหมด', 
            value: stats.total, 
            icon: TrendingUp, 
            iconColor: 'text-blue-600', 
            iconBg: 'bg-blue-500/10', 
            borderHover: 'hover:border-blue-400/50',
            glow: 'hover:shadow-blue-500/10',
            gradient: 'from-blue-500 to-indigo-600',
            delay: 0 
          },
          { 
            label: 'รอดำเนินการ', 
            value: stats.pending, 
            icon: Clock, 
            iconColor: 'text-amber-600', 
            iconBg: 'bg-amber-500/10', 
            borderHover: 'hover:border-amber-400/50',
            glow: 'hover:shadow-amber-500/10',
            gradient: 'from-amber-400 to-amber-600',
            delay: 1 
          },
          { 
            label: 'กำลังดำเนินการ', 
            value: stats.inProgress, 
            icon: Wrench, 
            iconColor: 'text-purple-600', 
            iconBg: 'bg-purple-500/10', 
            borderHover: 'hover:border-purple-400/50',
            glow: 'hover:shadow-purple-500/10',
            gradient: 'from-purple-500 to-indigo-600',
            delay: 2 
          },
          { 
            label: 'เสร็จสิ้น', 
            value: stats.completed, 
            icon: CheckCircle, 
            iconColor: 'text-emerald-600', 
            iconBg: 'bg-emerald-500/10', 
            borderHover: 'hover:border-emerald-400/50',
            glow: 'hover:shadow-emerald-500/10',
            gradient: 'from-emerald-400 to-teal-600',
            delay: 3 
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-md hover:shadow-xl ${s.glow} ${s.borderHover} transition-all duration-300 hover:-translate-y-1 group animate-fade-in-up overflow-hidden`}
              style={{ animationDelay: `${s.delay * 0.08}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                {/* ขยายขนาดหัวข้อการ์ดเป็น text-base font-bold */}
                <p className="text-slate-700 text-base font-bold tracking-wide">{s.label}</p>
                <div className={`${s.iconBg} p-2.5 rounded-xl border border-slate-100 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`size-5 ${s.iconColor}`} />
                </div>
              </div>
              
              <div className="flex items-baseline justify-between">
                {/* ขยายขนาดตัวเลขสถิติเป็น text-4xl */}
                <p className="text-slate-900 text-4xl font-black tracking-tight">{s.value}</p>
              </div>

              {/* Accent Line Bottom */}
              <div className={`mt-4 h-1.5 w-full bg-gradient-to-r ${s.gradient} rounded-full opacity-80 group-hover:opacity-100 transition-opacity`} />
            </div>
          );
        })}
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-md shadow-slate-200/50 animate-fade-in-up delay-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-sm" />
          {/* ขยายหัวข้อเมนูหลักเป็น text-xl */}
          <h3 className="text-slate-900 font-bold text-xl tracking-tight">เมนูหลัก</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-blue-300/80 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-200 group text-left"
                style={{ animationDelay: `${0.3 + i * 0.06}s` }}
              >
                <div
                  className="size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: action.color + '15' }}
                >
                  <Icon className="size-6 transition-colors" style={{ color: action.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  {/* ขยายขนาดฟอนต์หัวข้อเมนูย่อยเป็น text-base font-bold */}
                  <p className="text-slate-800 font-bold text-base group-hover:text-blue-600 transition-colors">{action.title}</p>
                  {/* ขยายขนาดคำอธิบายเป็น text-sm */}
                  <p className="text-slate-500 text-sm mt-0.5 truncate">{action.desc}</p>
                </div>
                <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="size-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recent Requests (student only) ──────────────── */}
      {currentUser.role === 'student' && (
        <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-md shadow-slate-200/50 animate-fade-in-up delay-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-sm" />
              <h3 className="text-slate-900 font-bold text-xl tracking-tight">คำขอซ่อมล่าสุด</h3>
            </div>
            <button
              onClick={() => navigate('/dashboard/status')}
              className="text-blue-600 hover:text-blue-700 text-base font-semibold flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-xl hover:bg-blue-50"
            >
              ดูทั้งหมด <ArrowRight className="size-4" />
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-500 text-base font-medium">
              ยังไม่มีประวัติคำขอซ่อมในระบบ
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req, i) => {
                const s = STATUS_MAP[req.status] ?? { 
                  label: req.status, 
                  dot: 'bg-slate-400', 
                  bg: 'bg-slate-50', 
                  text: 'text-slate-600',
                  border: 'border-slate-200' 
                };
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${0.5 + i * 0.07}s` }}
                  >
                    <div>
                      {/* ขยายขนาดชื่ออุปกรณ์เป็น text-base */}
                      <p className="text-slate-800 text-base font-bold">{req.equipment_type_name || req.equipmentType || '-'}</p>
                      <p className="text-slate-500 text-xs mt-0.5 font-mono">รหัสอ้างอิง: {req.request_no || req.id}</p>
                    </div>
                    {/* ขยายขนาดป้ายสถานะเป็น text-sm */}
                    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${s.bg} ${s.text} ${s.border} shadow-sm`}>
                      <span className={`size-2.5 rounded-full ${s.dot} ${req.status === 'in_progress' || req.status === 'in-progress' ? 'animate-pulse' : ''}`} />
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}