import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Wrench, AlertCircle, Eye, EyeOff, ArrowRight, ChevronDown, Shield, Clock, Star, Sparkles, KeyRound, UserCheck } from 'lucide-react';
import { mockUsers } from '../utils/mockData';
import { BASE_URL } from '../utils/api';

const TEST_ACCOUNTS = [
  { role: 'ผู้ดูแลระบบ (Admin)', username: 'admin', password: 'admin123', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { role: 'ช่างซ่อม (Technician)', username: 'tech1', password: 'tech123', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { role: 'นักศึกษา/บุคลากร (User)', username: 'student', password: 'student1234', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const allUsers = [...mockUsers, ...storedUsers.filter((su: any) => !mockUsers.find((mu) => mu.username === su.username))];
    const localUser = allUsers.find((u) => u.username === username && u.password === password);

    if (localUser) {
      localStorage.setItem('currentUser', JSON.stringify(localUser));
      setLoading(false);
      navigate('/dashboard');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/login.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        navigate('/dashboard');
      } else {
        setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('เชื่อมต่อ XAMPP ไม่ได้ — กรุณาตรวจสอบว่า Apache และ MySQL เปิดอยู่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans antialiased text-slate-100">
      {/* ── Left Panel: Branding & Animated Icon ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-r border-slate-800/60">
        {/* Background Glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

        {/* Rotating Decorative Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-[520px] h-[520px] rounded-full border border-blue-500/20 animate-spin-slow border-dashed" />
          <div className="absolute w-[380px] h-[380px] rounded-full border border-cyan-400/20 animate-spin-slow border-dashed [animation-direction:reverse] [animation-duration:20s]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg text-center animate-fade-in-up">
          
          {/* โลโก้อุปกรณ์ IT เด้งลอย */}
          <div className="relative inline-block mb-8 group cursor-pointer">
            <div className="absolute inset-0 bg-blue-500/40 rounded-3xl blur-xl animate-pulse group-hover:bg-cyan-400/60 transition-all duration-500" />
            <div className="relative bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-6 rounded-3xl shadow-2xl shadow-blue-500/30 border border-white/20 animate-bounce [animation-duration:3s] hover:scale-110 transition-transform duration-300">
              <Wrench className="size-16 text-white stroke-[2.2] animate-pulse" />
            </div>
          </div>

          <h1 className="text-white text-4xl font-extrabold tracking-tight leading-tight mb-3">
            ระบบแจ้งซ่อมอุปกรณ์ IT
          </h1>
          <p className="text-cyan-300/90 text-xl font-medium mb-12 flex items-center justify-center gap-2">
            <Sparkles className="size-5 text-cyan-400 animate-spin [animation-duration:8s]" /> มหาวิทยาลัย · IT Support System
          </p>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <Clock className="size-6 text-cyan-300 mx-auto mb-2 animate-pulse" />, num: '24/7', label: 'บริการตลอดเวลา' },
              { icon: <Shield className="size-6 text-blue-300 mx-auto mb-2 animate-pulse" />, num: '< 2h', label: 'ตอบสนองรวดเร็ว' },
              { icon: <Star className="size-6 text-indigo-300 mx-auto mb-2 animate-pulse" />, num: '99%', label: 'ความพึงพอใจ' },
            ].map((s, i) => (
              <div
                key={s.num}
                className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl hover:border-blue-500/50 hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                {s.icon}
                <p className="text-white text-2xl font-black tracking-tight">{s.num}</p>
                <p className="text-slate-400 text-xs font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form (Dark Tone matched) ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Header Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl mb-3 shadow-lg shadow-blue-500/30 animate-bounce [animation-duration:2.5s]">
              <Wrench className="size-10 text-white" />
            </div>
            <h1 className="text-white text-2xl font-extrabold tracking-tight">ระบบแจ้งซ่อมอุปกรณ์ IT</h1>
            <p className="text-slate-400 text-sm font-medium">มหาวิทยาลัย · IT Support System</p>
          </div>

          {/* Dark Glassmorphism Card */}
          <div className="bg-slate-900/80 rounded-3xl shadow-2xl shadow-black/80 p-8 sm:p-10 border border-slate-800/90 backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-8 bg-blue-500 rounded-full animate-pulse" />
              <span className="h-2 w-2 bg-blue-400/80 rounded-full" />
            </div>

            <h2 className="text-white text-3xl font-black tracking-tight mb-1">เข้าสู่ระบบ</h2>
            <p className="text-slate-400 text-base font-medium mb-8">กรุณากรอกข้อมูลบัญชีเพื่อเข้าใช้งานระบบ</p>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Input */}
              <div>
                <label className="block text-slate-200 text-sm font-bold mb-2 flex items-center gap-1.5">
                  <UserCheck className="size-4 text-blue-400" /> ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  placeholder="กรอกชื่อผู้ใช้ เช่น admin, student"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full h-13 px-4.5 bg-slate-950/80 border-2 border-slate-800 rounded-2xl text-white font-semibold placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-base"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-slate-200 text-sm font-bold mb-2 flex items-center gap-1.5">
                  <KeyRound className="size-4 text-blue-400" /> รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-13 px-4.5 pr-12 bg-slate-950/80 border-2 border-slate-800 rounded-2xl text-white font-semibold placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 bg-red-950/50 text-red-300 text-sm font-semibold p-4 rounded-2xl border border-red-800/80 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="size-5 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-13 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden border border-blue-400/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังตรวจสอบข้อมูล...
                  </span>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight className="size-5 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1.5" />
                  </>
                )}
              </button>
            </form>

            {/* Register Link */}
            <p className="text-center text-slate-400 font-medium text-base mt-8">
              ยังไม่มีบัญชีผู้ใช้?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 hover:decoration-2 transition-all">
                สมัครสมาชิกใหม่
              </Link>
            </p>

            {/* Quick Demo Test Accounts Accordion */}
            <div className="mt-8 border-t border-slate-800/80 pt-5">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="w-full flex items-center justify-between text-slate-400 hover:text-white text-sm font-bold transition-colors py-1 cursor-pointer group"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-amber-400 animate-bounce" /> คลิกเพื่อเลือกบัญชีทดสอบระบบ
                </span>
                <ChevronDown className={`size-4 transition-transform duration-300 ${showHint ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {showHint && (
                <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {TEST_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        setUsername(acc.username);
                        setPassword(acc.password);
                        setError('');
                      }}
                      className="group w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all duration-300 hover:translate-x-1 cursor-pointer shadow-sm"
                    >
                      <div>
                        <span className={`inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${acc.color} mb-1`}>
                          {acc.role}
                        </span>
                        <p className="text-slate-300 text-sm font-mono font-bold">
                          {acc.username} <span className="text-slate-600 font-normal">/</span> {acc.password}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        ใช้ข้อมูลนี้ →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}