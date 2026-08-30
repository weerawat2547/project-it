import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { FileText, CheckCircle, Upload, X, ImageIcon, MapPin, Send, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import LocationPicker from '../components/LocationPicker';
import { repairApi, equipmentApi, BASE_URL } from '../utils/api';
import { User } from '../types';

export default function ReportRepair() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestNo, setSubmittedRequestNo] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter] = useState<[number, number]>([18.7883, 98.9853]);
  const [equipmentTypes, setEquipmentTypes] = useState<{ id: number; name: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState<'medium' | 'high' | 'urgent'>('medium');
  const [formData, setFormData] = useState({
    equipmentType: '',
    equipmentTypeId: '',
    equipmentModel: '',
    serialNumber: '',
    location: '',
    problemDescription: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    loadEquipmentTypes();
  }, []);

  const loadEquipmentTypes = async () => {
    try {
      const res = await equipmentApi.getAll();
      setEquipmentTypes(res.data);
    } catch {
      setEquipmentTypes([
        { id: 1, name: 'คอมพิวเตอร์ตั้งโต๊ะ' },
        { id: 2, name: 'โน้ตบุ๊ก' },
        { id: 3, name: 'เครื่องพิมพ์' },
        { id: 4, name: 'โปรเจกเตอร์' },
        { id: 5, name: 'สแกนเนอร์' },
        { id: 6, name: 'จอมอนิเตอร์' },
        { id: 7, name: 'อุปกรณ์เครือข่าย' },
        { id: 8, name: 'อื่นๆ' },
      ]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      if (images.length + fileArray.length > 5) {
        toast.error('สามารถอัปโหลดได้สูงสุด 5 รูปภาพ');
        return;
      }

      const oversizedFiles = fileArray.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB');
        return;
      }

      setImages([...images, ...fileArray]);

      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      toast.success(`อัปโหลดรูปภาพสำเร็จ ${fileArray.length} รูป`);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    toast.info('ลบรูปภาพแล้ว');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    try {
      // 1. ส่งข้อมูลผ่าน API เพื่อบันทึก DB และยิง LINE Notify
      const fd = new FormData();
      fd.append('user_id', currentUser.id);
      fd.append('equipment_type_id', formData.equipmentTypeId || '');
      fd.append('equipment_model', formData.equipmentModel);
      fd.append('serial_number', formData.serialNumber);
      fd.append('location_description', formData.location);
      fd.append('problem_description', formData.problemDescription);
      fd.append('priority', priority);
      images.forEach((img) => fd.append('images[]', img));

      const res = await fetch(`${BASE_URL}/repair_requests.php`, {
        method: 'POST',
        body: fd,
      }).then(r => r.json());

      if (res && res.success === false) {
        throw new Error(res.message || 'Server returned an error');
      }

      // 2. อ่านข้อมูลเดิมจาก localStorage เพื่อซิงค์
      const savedData = localStorage.getItem('repair_requests_data');
      let currentRequests = [];
      if (savedData) {
        try { currentRequests = JSON.parse(savedData); } catch (e) { currentRequests = []; }
      }

      // 3. สร้างวัตถุรายการใหม่ (ใช้ข้อมูลจาก response API ถ้ามี)
      const newRepairItem = {
        id: res.id || `REQ-${Date.now()}`,
        request_no: res.request_no || `REQ-${Date.now()}`,
        userId: currentUser?.id || 'user-new',
        user_name: currentUser?.name || 'ไม่ระบุ',
        user_phone: currentUser?.phone || '',
        department: currentUser?.department || formData.faculty || '',
        student_id: currentUser?.student_id || '',
        equipment_type_name: formData.equipmentType,
        equipment_model: formData.equipmentModel,
        location_description: formData.location,
        problem_description: formData.problemDescription,
        priority: priority,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        images: JSON.stringify(imagePreviews),
        after_images: [],
        after_repair_images: [],
        status_history: JSON.stringify([{
            status: 'pending',
            updated_at: new Date().toISOString(),
            updated_by: currentUser?.name || 'ผู้แจ้งซ่อม',
            note: 'ส่งคำขอแจ้งซ่อมเรียบร้อย'
        }])
      };

      // 4. บันทึกลง localStorage
      const updatedList = [newRepairItem, ...currentRequests];
      localStorage.setItem('repair_requests_data', JSON.stringify(updatedList));

      // 5. ยิง LINE Notify แจ้งซ่อมใหม่ (แบบ Async)
      fetch(`${BASE_URL}/line_notify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_repair',
          ticket_id: res.id || `REQ-${Date.now()}`,
          reporter: currentUser.name,
          device: formData.equipmentType,
          location: formData.location,
          problem: formData.problemDescription,
          priority: priority,
          images: imagePreviews, // รายการรูปภาพ
          created_at: new Date().toLocaleString('th-TH')
        })
      }).catch(err => console.error("LINE Notify Error:", err));

      setSubmittedRequestNo(newRepairItem.request_no);
      setSubmitted(true);
      toast.success('ส่งคำขอซ่อมเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSubmitted(false);
        setSubmittedRequestNo('');
        setFormData({ equipmentType: '', equipmentTypeId: '', equipmentModel: '', serialNumber: '', location: '', problemDescription: '' });
        setImages([]);
        setImagePreviews([]);
      }, 3000);
    }
  };

  if (submitted) {
    return (
      <Card className="rounded-3xl border-2 border-slate-200/90 shadow-[0_20px_50px_rgba(16,185,129,0.2)] overflow-hidden animate-fade-in">
        <CardContent className="pt-10 pb-14">
          <div className="text-center py-8">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-100 p-6 rounded-3xl shadow-xl shadow-emerald-600/30 ring-8 ring-emerald-50">
                <CheckCircle className="size-20 text-emerald-600 animate-bounce" />
              </div>
            </div>
            <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-4">
              ส่งคำขอซ่อมเรียบร้อยแล้ว!
            </h3>
            <p className="text-slate-600 text-xl font-medium">
              เลขที่คำขอ: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl border-2 border-blue-200 shadow-sm text-2xl">{submittedRequestNo}</span>
            </p>
            <p className="text-slate-500 text-base mt-5 max-w-lg mx-auto">
              เจ้าหน้าที่ได้รับข้อมูลคำขอซ่อมของคุณแล้ว และจะดำเนินการตรวจสอบโดยเร็วที่สุด
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-2 border-slate-200/90 shadow-[0_15px_45px_rgba(0,0,0,0.12)] bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-100 via-blue-50/50 to-slate-100 border-b-2 border-slate-200/80 p-8">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl shadow-blue-600/30 text-white shrink-0">
            <FileText className="size-9" />
          </div>
          <div>
            <CardTitle className="text-3xl font-extrabold text-slate-800 tracking-tight">แจ้งซ่อมอุปกรณ์ IT</CardTitle>
            <CardDescription className="text-slate-600 font-semibold text-base mt-1">
              กรุณากรอกรายละเอียดอาการเสียและข้อมูลอุปกรณ์เพื่อให้เจ้าหน้าที่เข้าดำเนินการ
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ข้อมูลอุปกรณ์ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <Label htmlFor="equipmentType" className="text-slate-800 font-bold text-base">ประเภทอุปกรณ์ <span className="text-rose-500">*</span></Label>
              <Select
                value={formData.equipmentTypeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, equipmentTypeId: value, equipmentType: equipmentTypes.find(e => String(e.id) === value)?.name || '' })
                }
                required
              >
                <SelectTrigger className="rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-md h-12 text-base font-medium">
                  <SelectValue placeholder="เลือกประเภทอุปกรณ์" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl border-2 border-slate-200">
                  {equipmentTypes.map((et) => (
                    <SelectItem key={et.id} value={String(et.id)} className="rounded-lg text-base py-2.5">{et.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="equipmentModel" className="text-slate-800 font-bold text-base">รุ่นอุปกรณ์</Label>
              <Input
                id="equipmentModel"
                placeholder="เช่น Dell OptiPlex 7090"
                value={formData.equipmentModel}
                onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
                className="rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-md h-12 text-base font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="serialNumber" className="text-slate-800 font-bold text-base">Serial Number</Label>
              <Input
                id="serialNumber"
                placeholder="หมายเลขเครื่อง (ถ้ามี)"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-md h-12 text-base font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* สถานที่ตั้ง */}
          <div className="space-y-2.5">
            <Label htmlFor="location" className="text-slate-800 font-bold text-base">สถานที่ตั้งอุปกรณ์ <span className="text-rose-500">*</span></Label>
            <div className="flex flex-col sm:flex-row gap-3.5">
              <Input
                id="location"
                placeholder="เช่น ห้องปฏิบัติการคอมพิวเตอร์ 301 อาคาร 3"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-md h-12 text-base font-medium placeholder:text-slate-400 flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  setPendingCoords(locationCoords);
                  setShowMap(true);
                }}
                className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border-2 font-bold text-base transition-all shadow-md shrink-0 active:scale-95 ${
                  locationCoords
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-emerald-500/20 hover:bg-emerald-100'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 shadow-slate-300/40'
                }`}
              >
                <MapPin className={`size-5 ${locationCoords ? 'text-emerald-600' : 'text-slate-600'}`} />
                {locationCoords
                  ? `📍 ปักหมุดแล้ว (${locationCoords.lat.toFixed(4)}, ${locationCoords.lng.toFixed(4)})`
                  : 'ปักหมุดตำแหน่งบนแผนที่'}
              </button>
            </div>
          </div>

          {/* Map Dialog */}
          <Dialog open={showMap} onOpenChange={(open) => {
            if (!open) setPendingCoords(locationCoords);
            setShowMap(open);
          }}>
            <DialogContent className="max-w-3xl w-full rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] border-2 border-slate-200">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                  <MapPin className="size-7 text-blue-600" />
                  เลือกสถานที่บนแผนที่
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-base">
                  คลิกบนแผนที่เพื่อปักหมุดตำแหน่งที่ต้องการซ่อมอุปกรณ์
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 my-2 shadow-inner">
                <LocationPicker
                  center={mapCenter}
                  initialCoords={locationCoords}
                  onSelect={(lat, lng) => setPendingCoords({ lat, lng })}
                />
              </div>

              <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-base font-bold shadow-inner ${
                pendingCoords
                  ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-900'
                  : 'bg-slate-100 border-2 border-slate-200 text-slate-500'
              }`}>
                <MapPin className="size-5 shrink-0" />
                {pendingCoords
                  ? `ตำแหน่งที่เลือก: ${pendingCoords.lat.toFixed(6)}, ${pendingCoords.lng.toFixed(6)}`
                  : 'ยังไม่ได้เลือกตำแหน่ง — กรุณาคลิกบนแผนที่'}
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-2 border-slate-200 font-bold text-base h-11 px-5"
                  onClick={() => {
                    setPendingCoords(locationCoords);
                    setShowMap(false);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  disabled={!pendingCoords}
                  onClick={() => {
                    if (pendingCoords) {
                      setLocationCoords(pendingCoords);
                      toast.success('บันทึกตำแหน่งสำเร็จ');
                    }
                    setShowMap(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/30 h-11 px-6"
                >
                  <MapPin className="size-5 mr-2" />
                  ยืนยันตำแหน่ง
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ความเร่งด่วน */}
          <div className="space-y-3">
            <Label className="text-slate-800 font-bold text-base">ระดับความเร่งด่วน <span className="text-rose-500">*</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { value: 'medium', label: 'ปานกลาง', icon: '🟡', desc: 'ไม่เร่งด่วน ดำเนินการตามคิว', border: 'hover:border-amber-400', activeBg: 'bg-amber-50 border-amber-500 shadow-xl shadow-amber-500/25 ring-4 ring-amber-400/20' },
                { value: 'high',   label: 'เร่งด่วน',   icon: '🟠', desc: 'กระทบการทำงาน ต้องซ่อมเร็ว', border: 'hover:border-orange-400', activeBg: 'bg-orange-50 border-orange-500 shadow-xl shadow-orange-500/25 ring-4 ring-orange-400/20' },
                { value: 'urgent', label: 'เร่งด่วนมาก', icon: '🔴', desc: 'หยุดการทำงานทันที ต้องซ่อมด่วน', border: 'hover:border-rose-400', activeBg: 'bg-rose-50 border-rose-500 shadow-xl shadow-rose-500/25 ring-4 ring-rose-400/20' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value as typeof priority)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all duration-200 text-center hover:-translate-y-1 ${
                    priority === opt.value
                      ? opt.activeBg
                      : `border-slate-200 bg-white shadow-md hover:shadow-lg ${opt.border}`
                  }`}
                >
                  <span className="text-4xl filter drop-shadow-md">{opt.icon}</span>
                  <span className={`text-lg font-black ${priority === opt.value ? 'text-slate-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  <span className="text-sm text-slate-500 font-semibold leading-relaxed">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* อาการเสีย */}
          <div className="space-y-2.5">
            <Label htmlFor="problemDescription" className="text-slate-800 font-bold text-base">อาการเสีย / ปัญหาที่พบ <span className="text-rose-500">*</span></Label>
            <Textarea
              id="problemDescription"
              placeholder="โปรดอธิบายอาการเสียหรือปัญหาที่พบโดยละเอียด..."
              rows={4}
              value={formData.problemDescription}
              onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
              required
              className="rounded-2xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-md p-4 text-slate-900 font-medium text-base leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* อัปโหลดรูปภาพ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="images" className="text-slate-800 font-bold text-base">อัปโหลดรูปภาพเพิ่มเติม (สูงสุด 5 รูป)</Label>
              <span className="text-sm font-bold text-slate-500">ขนาดไม่เกิน 5 MB/รูป</span>
            </div>

            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg shadow-slate-300/50">
                    <img
                      src={preview}
                      alt={`รูปภาพแนบที่ ${index + 1}`}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-all"
                      onClick={() => removeImage(index)}
                    >
                      <X className="size-5" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white font-mono text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow">
                      {index + 1}/5
                    </span>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('images')?.click()}
                    className="h-32 rounded-2xl border-2 border-dashed border-slate-300 shadow-md flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                  >
                    <Upload className="size-6" />
                    <span className="text-sm font-bold">เพิ่มรูปภาพ</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => document.getElementById('images')?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 text-center bg-slate-50/80 hover:bg-blue-50/30 cursor-pointer transition-all duration-200 group shadow-inner"
              >
                <div className="size-14 rounded-2xl bg-white shadow-md border border-slate-200 group-hover:bg-blue-100 flex items-center justify-center mx-auto mb-3.5 text-slate-500 group-hover:text-blue-600 transition-colors">
                  <ImageIcon className="size-7" />
                </div>
                <p className="text-base font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">
                  คลิกที่นี่เพื่อเลือกอัปโหลดรูปภาพอาการเสีย
                </p>
                <p className="text-sm font-semibold text-slate-400 mt-1">
                  รองรับไฟล์ภาพ JPG, PNG (สูงสุด 5 รูป)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t-2 border-slate-100">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg h-14 rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:shadow-2xl hover:shadow-blue-600/40 active:scale-[0.99]"
            >
              {loading ? (
                'กำลังส่งข้อมูล...'
              ) : (
                <span className="flex items-center gap-2.5">
                  <Send className="size-5" /> ส่งคำขอแจ้งซ่อม
                </span>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({ equipmentType: '', equipmentTypeId: '', equipmentModel: '', serialNumber: '', location: '', problemDescription: '' });
                setLocationCoords(null);
                setPendingCoords(null);
                setImages([]);
                setImagePreviews([]);
              }}
              className="rounded-2xl border-2 border-slate-200 text-slate-700 font-extrabold text-base hover:bg-slate-100 shadow-md h-14 px-8"
            >
              <RotateCcw className="size-5 mr-2" /> ล้างข้อมูล
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}