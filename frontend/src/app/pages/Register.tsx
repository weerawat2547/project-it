import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, AlertCircle, CheckCircle, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2, User, KeyRound, Mail, Phone, Building2, IdCard } from 'lucide-react';
import { mockUsers } from '../utils/mockData';
import { User as UserType } from '../types';
import { BASE_URL, usersApi } from '../utils/api';

function Field({
  id, label, type = 'text', placeholder, value, onChange, required = false, rightEl, icon: Icon,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  rightEl?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-slate-200 text-sm font-bold mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="size-4 text-blue-400" />}
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full h-12 px-4 bg-slate-950/80 border-2 border-slate-800 rounded-2xl text-white font-semibold placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-sm"
          style={rightEl ? { paddingRight: '2.75rem' } : {}}
        />
        {rightEl && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );
}

export default function Register() {
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '',
    name: '', email: '', phone: '', department: '', student_id: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [k]: e.target.value }));

  const handleGoToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอักขระอย่างน้อย 6 ตัว');
      return;
    }
    if (!formData.student_id) {
      setError('กรุณากรอกรหัสประจำตัว / รหัสนักศึกษา');
      return;
    }

    setLoading(true);
    try {
      const res: any = await usersApi.register({
          username:   formData.username,
          password:   formData.password,
          name:       formData.name,
          email:      formData.email,
          phone:      formData.phone,
          department: formData.department,
          student_id: formData.student_id,
      });
      if (res && res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 1800);
      } else {
        setError(result.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const allUsers = [...mockUsers, ...existingUsers];
      if (allUsers.find((u) => u.username === formData.username)) {
        setError('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
        setLoading(false);
        return;
      }
      if (allUsers.find((u) => u.email === formData.email)) {
        setError('อีเมลนี้มีอยู่ในระบบแล้ว');
        setLoading(false);
        return;
      }
      if (allUsers.find((u) => u.student_id === formData.student_id)) {
        setError('รหัสประจำตัวนี้มีอยู่ในระบบแล้ว');
        setLoading(false);
        return;
      }
      const newUser: UserType = {
        id:         Date.now().toString(),
        username:   formData.username,
        password:   formData.password,
        name:       formData.name,
        email:      formData.email,
        role:       'student',
        department: formData.department,
        phone:      formData.phone,
        student_id: formData.student_id,
        createdAt:  new Date().toISOString(),
      };
      existingUsers.push(newUser);
      localStorage.setItem('users', JSON.stringify(existingUsers));
      setSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-10 text-center max-w-md w-full backdrop-blur-xl animate-in zoom-in-90 duration-300">
          <div className="inline-flex bg-green-500/20 p-5 rounded-3xl mb-6 border border-green-500/30 animate-bounce">
            <CheckCircle className="size-16 text-green-400" />
          </div>
          <h3 className="text-white text-3xl font-black mb-2">สมัครสมาชิกสำเร็จ!</h3>
          <p className="text-slate-400 font-medium">กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans antialiased text-slate-100 overflow-hidden">
      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes slideLeftToRight {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cardReveal {
          from { transform: scale(0.92) translateY(30px); opacity: 0; filter: blur(8px); }
          to { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes staggerFade {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .anim-slide-panel { animation: slideLeftToRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-card-reveal { animation: cardReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
        .anim-stagger-1 { animation: staggerFade 0.5s ease-out 0.3s forwards; opacity: 0; }
        .anim-stagger-2 { animation: staggerFade 0.5s ease-out 0.45s forwards; opacity: 0; }

        /* Exit Animation */
        .page-exit {
          opacity: 0 !important;
          transform: scale(0.96) translateY(-10px) !important;
          filter: blur(4px) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>

      {/* ── Left Panel: Dynamic Sliding Panel ─────────────────────────────── */}
      <div className={`hidden lg:flex lg:w-5/12 relative flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800/60 anim-slide-panel ${isExiting ? 'page-exit' : ''}`}>
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-md text-center">
          <div className="anim-stagger-1 flex flex-col items-center">
            <div className="relative inline-block mb-8 group">
              <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl group-hover:bg-blue-400/50 transition-all duration-500" />
              <div className="relative bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-6 rounded-3xl shadow-2xl shadow-blue-500/40 border border-white/20">
                <Wrench className="size-14 text-white stroke-[2.2]" />
              </div>
            </div>

            <h1 className="text-white text-4xl font-black tracking-tight mb-3">
              เข้าร่วมกับเรา
            </h1>
            <p className="text-cyan-300/90 text-base font-medium mb-8 flex items-center gap-2">
              <Sparkles className="size-5 text-cyan-400" /> สร้างบัญชีใช้งานระบบแจ้งซ่อม IT
            </p>
          </div>

          <div className="anim-stagger-2 space-y-3.5 text-left bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
            {[
              'ส่งคำร้องแจ้งซ่อมได้ 24 ชั่วโมง',
              'ระบบติดตามสถานะงานแบบ Real-time',
              'แจ้งเตือนผ่าน LINE อัปเดตทุกขั้นตอน',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-cyan-400 shrink-0" />
                <span className="text-slate-300 text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Form Card Reveal ────────────────────────────── */}
      <div className={`flex-1 flex items-center justify-center p-6 bg-slate-950 relative my-auto py-10 overflow-y-auto max-h-screen transition-all duration-300 ${isExiting ? 'page-exit' : ''}`}>
        <div className="w-full max-w-xl relative z-10 anim-card-reveal">
          
          {/* Mobile Brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl mb-3 shadow-lg shadow-blue-500/30">
              <Wrench className="size-10 text-white" />
            </div>
            <h1 className="text-white text-2xl font-extrabold tracking-tight">สมัครสมาชิก</h1>
          </div>

          <div className="bg-slate-900/80 rounded-3xl shadow-2xl shadow-black/90 p-8 sm:p-10 border border-slate-800/90 backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-8 bg-blue-500 rounded-full animate-pulse" />
              <span className="h-2 w-2 bg-blue-400/80 rounded-full" />
            </div>

            <h2 className="text-white text-3xl font-black tracking-tight mb-1">สร้างบัญชีใหม่</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">กรอกข้อมูลให้ครบถ้วนเพื่อลงทะเบียนระบบ</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="username" label="ชื่อผู้ใช้" placeholder="กรอกชื่อผู้ใช้" icon={User}
                  value={formData.username} onChange={set('username')} required
                />
                <Field
                  id="name" label="ชื่อ-นามสกุล" placeholder="กรอกชื่อ-นามสกุล" icon={User}
                  value={formData.name} onChange={set('name')} required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="password" label="รหัสผ่าน" icon={KeyRound}
                  type={showPass ? 'text' : 'password'}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={formData.password} onChange={set('password')} required
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
                <Field
                  id="confirmPassword" label="ยืนยันรหัสผ่าน" icon={KeyRound}
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={formData.confirmPassword} onChange={set('confirmPassword')} required
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </div>

              <Field
                id="email" label="อีเมล" type="email" icon={Mail}
                placeholder="example@university.ac.th"
                value={formData.email} onChange={set('email')} required
              />

              <Field
                id="student_id" label="รหัสประจำตัว / รหัสนักศึกษา" placeholder="กรอกรหัสนักศึกษา" icon={IdCard}
                value={formData.student_id} onChange={set('student_id')} required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="phone" label="เบอร์โทรศัพท์" type="tel" icon={Phone}
                  placeholder="08-xxxx-xxxx"
                  value={formData.phone} onChange={set('phone')}
                />
                <div className="space-y-2">
                  <label htmlFor="department" className="block text-slate-200 text-sm font-bold flex items-center gap-1.5">
                    <Building2 className="size-4 text-blue-400" />
                    คณะ/หน่วยงาน
                  </label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({...prev, department: e.target.value}))}
                    className="w-full h-12 px-4 bg-slate-950/80 border-2 border-slate-800 rounded-2xl text-white font-semibold focus:outline-none focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-sm"
                  >
                    <option value="">เลือกคณะ</option>
                    <option value="คณะวิทยาศาสตร์และเทคโนโลยี">คณะวิทยาศาสตร์และเทคโนโลยี</option>
                    <option value="คณะมนุษยศาสตร์และสังคมศาสตร์">คณะมนุษยศาสตร์และสังคมศาสตร์</option>
                    <option value="คณะวิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</option>
                    <option value="คณะวิทยาการจัดการ">คณะวิทยาการจัดการ</option>
                    <option value="คณะเทคโนโลยีการเกษตร">คณะเทคโนโลยีการเกษตร</option>
                    <option value="คณะนิติศาสตร์">คณะนิติศาสตร์</option>
                    <option value="คณะรัฐศาสตร์และรัฐประศาสนศาสตร์">คณะรัฐศาสตร์และรัฐประศาสนศาสตร์</option>
                    <option value="คณะครุศาสตร์">คณะครุศาสตร์</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-950/60 text-red-300 text-sm font-semibold p-4 rounded-2xl border border-red-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle className="size-5 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-12 mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-base rounded-2xl transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.01] active:scale-[0.98] cursor-pointer overflow-hidden border border-blue-400/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังสมัคร...
                  </span>
                ) : (
                  <>
                    <span>สมัครสมาชิก</span>
                    <ArrowRight className="size-5 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 font-medium text-sm mt-6">
              มีบัญชีอยู่แล้ว?{' '}
              <button 
                type="button"
                onClick={handleGoToLogin} 
                className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4 hover:decoration-2 transition-all cursor-pointer bg-transparent border-0 p-0"
              >
                เข้าสู่ระบบ
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}