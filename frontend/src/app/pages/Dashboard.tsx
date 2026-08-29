import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { User } from '../types';
import {
  Wrench, LogOut, FileText, Search, Settings,
  MessageSquare, Users, Menu, X, BarChart2, ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard',          label: 'หน้าหลัก',          icon: LayoutDashboard, roles: ['student', 'technician', 'admin'] },
  { path: '/dashboard/report',    label: 'แจ้งซ่อม',          icon: FileText,        roles: ['student', 'technician', 'admin'] },
  { path: '/dashboard/status',    label: 'ตรวจสอบสถานะ',       icon: Search,          roles: ['student', 'technician', 'admin'] },
  { path: '/dashboard/update',    label: 'อัปเดตการซ่อม',       icon: Settings,        roles: ['technician', 'admin'] },
  { path: '/dashboard/chat',      label: 'แชทบอท LINE OA',     icon: MessageSquare,   roles: ['student', 'technician', 'admin'] },
  { path: '/dashboard/users',     label: 'จัดการผู้ใช้',       icon: Users,           roles: ['admin'] },
  { path: '/dashboard/analytics', label: 'รายงานและวิเคราะห์', icon: BarChart2,       roles: ['student', 'technician', 'admin'] },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', technician: 'ช่างซ่อม', student: 'นักศึกษา',
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    setCurrentUser(JSON.parse(userStr));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredNav = NAV_ITEMS.filter((item) =>
    currentUser ? item.roles.includes(currentUser.role) : false
  );

  if (!currentUser) return null;

  const avatarLetter = currentUser.name.charAt(0).toUpperCase();
  const roleLabel    = ROLE_LABEL[currentUser.role] ?? currentUser.role;

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none" />
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-10 pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-10 pointer-events-none animate-float-slow"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)', animationDelay: '3s' }}
      />

      {/* Header Sidebar */}
      <div className="relative px-6 py-6 border-b-2 border-slate-700/80">
        <div className="flex items-center gap-3.5">
          <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 rounded-xl glow-blue-sm animate-pulse-ring shrink-0 border-2 border-blue-300/50">
            <Wrench className="size-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">ระบบแจ้งซ่อม IT</p>
            <p className="text-blue-300 text-xs font-medium">IT Support System</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="relative flex-1 px-3.5 py-5 space-y-2.5 overflow-y-auto">
        {filteredNav.map((item, i) => {
          const Icon    = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group animate-slide-left ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.45)] border-2 border-blue-300 font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium border-2 border-transparent'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <Icon className="size-6 shrink-0" />
              <span className="text-base flex-1">{item.label}</span>
              {isActive && <ChevronRight className="size-4 opacity-100 font-bold" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="relative px-5 py-5 border-t-2 border-slate-700/80 bg-slate-900/60">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="size-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md border-2 border-white/40">
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className="text-white text-base font-semibold truncate">{currentUser.name}</p>
            <p className="text-blue-300 text-xs font-medium">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all text-sm font-semibold group border-2 border-red-500/30 hover:border-red-500/60 cursor-pointer"
        >
          <LogOut className="size-4.5 group-hover:translate-x-0.5 transition-transform" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#e2e8f0] flex relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a1628] shrink-0 fixed left-0 top-0 h-full z-20 border-r-4 border-slate-800 shadow-[8px_0_25px_rgba(0,0,0,0.3)]">
        <SidebarContent />
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#0a1628] z-40 md:hidden transform transition-transform duration-300 shadow-2xl border-r-4 border-slate-800 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 cursor-pointer"
        >
          <X className="size-6" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-screen">
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-15 bg-repeat bg-[length:220px_220px]"
          style={{ backgroundImage: `url('/tools.png')` }}
        />

        <header className="md:hidden bg-[#0a1628] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b-4 border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-white cursor-pointer">
              <Menu className="size-6" />
            </button>
            <div className="flex items-center gap-2">
              <Wrench className="size-5 text-blue-400" />
              <span className="font-semibold text-base">ระบบแจ้งซ่อม IT</span>
            </div>
          </div>
          <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white/40">
            {avatarLetter}
          </div>
        </header>

        {/* Clean Main Content Area - นำ Selector บีบขอบที่รบกวนหน้าอื่นออก */}
        <main 
          key={location.pathname} 
          className="flex-1 p-4 md:p-8 animate-fade-in-up relative z-10 w-full"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}