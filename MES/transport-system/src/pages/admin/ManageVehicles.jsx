import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Search, Bus, X, QrCode as QrIcon, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const ManageVehicles = () => {
  const { data, addVehicle, deleteVehicle } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('');

  const filteredVehicles = data.vehicles.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    addVehicle({
      name,
      licensePlate,
      capacity: parseInt(capacity) || 0
    });
    setShowAddModal(false);
    // Reset
    setName(''); setLicensePlate(''); setCapacity('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <Bus className="text-blue-600 dark:text-blue-500" size={28} />
            จัดการรถ
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">จัดการข้อมูลรถและพิมพ์ QR Code ประจำรถแต่ละคัน</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary whitespace-nowrap"
        >
          <Plus size={20} />
          เพิ่มรถคันใหม่
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อรถ, ทะเบียนรถ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredVehicles.map(vehicle => (
            <div key={vehicle.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col group hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                    {vehicle.id}
                  </span>
                  <div className="flex gap-1 -mr-2 -mt-2">
                    <button 
                      onClick={() => setShowQrModal(vehicle)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                      title="พิมพ์ QR Code ประจำรถ"
                    >
                      <QrIcon size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if(window.confirm('คุณแน่ใจหรือไม่ที่จะลบรถคันนี้? การลบรถจะทำให้ QR Code เดิมใช้งานไม่ได้')) deleteVehicle(vehicle.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">
                  {vehicle.name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 dark:text-gray-400">ป้ายทะเบียน</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{vehicle.licensePlate}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 dark:text-gray-400">ความจุ (คน)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{vehicle.capacity || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => setShowQrModal(vehicle)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded-lg transition-colors"
                >
                  <QrIcon size={16} />
                  ดู QR Code ประจำรถ
                </button>
              </div>
            </div>
          ))}
          {filteredVehicles.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <Bus size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <p>ไม่พบข้อมูลรถที่ค้นหา</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="text-blue-600 dark:text-blue-500" size={20} />
                เพิ่มรถคันใหม่
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form id="add-vehicle-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ชื่อเรียก / สายรถ</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น รถตู้สายระยอง-พัทยา" className="input-field" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ป้ายทะเบียน</label>
                    <input required type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="เช่น ฮท-1234" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ความจุที่นั่ง (คน)</label>
                    <input required type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} className="input-field" />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                ยกเลิก
              </button>
              <button type="submit" form="add-vehicle-form" className="btn-primary">
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden text-center shadow-xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <QrIcon className="text-blue-600 dark:text-blue-500" size={18} /> QR Code ประจำรถ
              </h2>
              <button onClick={() => setShowQrModal(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">พิมพ์ QR Code นี้ไปติดที่รถคันนี้ได้เลยครับ (ใช้ได้ตลอดไป)</p>
              <div className="p-4 bg-white rounded-xl shadow-sm inline-block border border-gray-200">
                <QRCodeSVG 
                  value={`${window.location.origin}${window.location.pathname}#/checkin?vehicleId=${showQrModal.id}`} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <h3 className="font-bold text-lg mt-6 text-gray-900 dark:text-gray-100">{showQrModal.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-mono text-sm">{showQrModal.licensePlate}</p>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 w-full">
                <a 
                  href={`#/checkin?vehicleId=${showQrModal.id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} /> ทดสอบสแกนจำลอง
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageVehicles;
