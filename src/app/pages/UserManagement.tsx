import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, UserPlus, Edit, Trash2, Search, ShieldCheck, Loader2 } from 'lucide-react';
import { UserRole } from '../types';
import { toast } from 'sonner';
import { usersApi } from '../utils/api';
import { mockUsers } from '../utils/mockData';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '', password: '', name: '', email: '',
    role: 'student' as UserRole, department: '', phone: '',
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(res.data);
    } catch {
      setUsers(mockUsers.map((u) => ({ ...u, is_active: true, created_at: u.createdAt })));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditMode(false);
    setCurrentEditUser(null);
    setFormData({ username: '', password: '', name: '', email: '', role: 'student', department: '', phone: '' });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (user: any) => {
    setEditMode(true);
    setCurrentEditUser(user);
    setFormData({
      username: user.username, password: '',
      name: user.name, email: user.email,
      role: user.role, department: user.department || '', phone: user.phone || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editMode && currentEditUser) {
        await usersApi.update({ id: currentEditUser.id, ...formData });
        toast.success('อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว');
      } else {
        await usersApi.create(formData);
        toast.success('เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว');
      }
      setDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) return;
    try {
      await usersApi.delete(userId);
      toast.success('ลบผู้ใช้เรียบร้อยแล้ว');
      loadUsers();
    } catch {
      toast.error('ไม่สามารถลบผู้ใช้ได้');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-rose-100/80 text-rose-800 border border-rose-300/60 font-medium px-2.5 py-0.5 shadow-xs">ผู้ดูแลระบบ</Badge>;
      case 'technician':
        return <Badge className="bg-blue-100/80 text-blue-800 border border-blue-300/60 font-medium px-2.5 py-0.5 shadow-xs">ช่างซ่อม</Badge>;
      case 'student':
        return <Badge className="bg-sky-100/80 text-sky-800 border border-sky-300/60 font-medium px-2.5 py-0.5 shadow-xs">นักศึกษา</Badge>;
      default:
        return null;
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(term) ||
      user.username?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full min-h-[calc(100vh-80px)] p-6 bg-gradient-to-br from-sky-100/70 via-blue-50/50 to-indigo-100/60 text-slate-800 space-y-6">
      {/* Main Card Container */}
      <Card className="bg-sky-50/60 border border-blue-200/70 shadow-sm rounded-xl overflow-hidden backdrop-blur-xs">
        <CardHeader className="border-b border-blue-200/60 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="bg-white/20 p-3 rounded-xl text-white backdrop-blur-md border border-white/20 shadow-sm">
                <Users className="size-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  จัดการผู้ใช้งาน
                  <ShieldCheck className="size-5 text-sky-200" />
                </CardTitle>
                <CardDescription className="text-blue-100 text-sm mt-0.5 font-normal">
                  เพิ่ม แก้ไข และจัดการสิทธิ์ผู้ใช้งานในระบบบริการไอที
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={handleOpenAddDialog}
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-lg shadow-sm transition-all active:scale-95 border border-white/30"
            >
              <UserPlus className="size-4 mr-2 text-blue-600" />
              เพิ่มผู้ใช้ใหม่
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search Controls */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-blue-500/70" />
              <Input
                placeholder="ค้นหาชื่อ, ชื่อผู้ใช้ หรืออีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/90 border-blue-200 text-slate-800 placeholder:text-blue-400 focus-visible:ring-blue-500 rounded-lg h-10 text-sm shadow-2xs"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={loadUsers}
              className="border-blue-200 bg-white/90 text-blue-700 hover:bg-blue-50 rounded-lg h-10 px-4 font-medium shadow-2xs"
            >
              ค้นหา
            </Button>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-blue-600">
              <Loader2 className="size-7 animate-spin text-blue-600" />
              <p className="text-sm">กำลังโหลดข้อมูลผู้ใช้...</p>
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200/80 overflow-hidden bg-white/80 backdrop-blur-xs shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-blue-200/80 bg-blue-100/50 hover:bg-blue-100/50">
                    <TableHead className="text-blue-900 font-bold text-xs uppercase tracking-wider">ชื่อผู้ใช้</TableHead>
                    <TableHead className="text-blue-900 font-bold text-xs uppercase tracking-wider">ชื่อ-นามสกุล</TableHead>
                    <TableHead className="text-blue-900 font-bold text-xs uppercase tracking-wider">อีเมล</TableHead>
                    <TableHead className="text-blue-900 font-bold text-xs uppercase tracking-wider">แผนก/คณะ</TableHead>
                    <TableHead className="text-blue-900 font-bold text-xs uppercase tracking-wider">บทบาท</TableHead>
                    <TableHead className="text-right text-blue-900 font-bold text-xs uppercase tracking-wider">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-blue-100/80">
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-blue-50/70 transition-colors">
                      <TableCell className="font-medium text-blue-950">@{user.username}</TableCell>
                      <TableCell className="text-slate-900 font-semibold">{user.name}</TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell className="text-slate-600">{user.department || '-'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEditDialog(user)}
                            className="text-blue-700 hover:text-blue-900 hover:bg-blue-100/80 h-8 w-8 p-0 rounded-md"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/80 h-8 w-8 p-0 rounded-md"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">ไม่พบข้อมูลผู้ใช้งาน</div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-50 border-blue-200 text-slate-900 rounded-xl shadow-xl">
          <DialogHeader className="border-b border-blue-100 pb-4">
            <DialogTitle className="text-lg font-bold text-blue-950">
              {editMode ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วนเพื่ออัปเดตเข้าระบบ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">ชื่อผู้ใช้ *</Label>
                <Input 
                  value={formData.username} 
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                  disabled={editMode} 
                  className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">{editMode ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</Label>
                <Input 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-semibold">ชื่อ-นามสกุล *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">อีเมล *</Label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">เบอร์โทรศัพท์</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">บทบาท *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
                  <SelectTrigger className="bg-white border-blue-200 text-slate-800 rounded-md focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-blue-200 text-slate-800">
                    <SelectItem value="student">นักศึกษา</SelectItem>
                    <SelectItem value="technician">ช่างซ่อม</SelectItem>
                    <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">แผนก/คณะ</Label>
                <Input 
                  value={formData.department} 
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                  className="bg-white border-blue-200 text-slate-800 rounded-md focus-visible:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-blue-100 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="border-blue-200 text-slate-700 hover:bg-blue-50 rounded-md"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
            >
              {saving ? 'กำลังบันทึก...' : editMode ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}