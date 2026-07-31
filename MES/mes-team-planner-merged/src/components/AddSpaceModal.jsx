import React, { useState } from 'react';
import { FiX, FiUsers, FiFolder, FiGrid, FiLayout, FiCheck } from 'react-icons/fi';

const ICON_OPTIONS = [
  { name: 'FiUsers', icon: FiUsers },
  { name: 'FiFolder', icon: FiFolder },
  { name: 'FiGrid', icon: FiGrid },
  { name: 'FiLayout', icon: FiLayout }
];

const COLOR_OPTIONS = [
  { name: 'Indigo', value: 'text-indigo-500 bg-indigo-500/10', hex: 'bg-indigo-500' },
  { name: 'Emerald', value: 'text-emerald-500 bg-emerald-500/10', hex: 'bg-emerald-500' },
  { name: 'Pink', value: 'text-pink-500 bg-pink-500/10', hex: 'bg-pink-500' },
  { name: 'Cyan', value: 'text-cyan-500 bg-cyan-500/10', hex: 'bg-cyan-500' },
  { name: 'Amber', value: 'text-amber-500 bg-amber-500/10', hex: 'bg-amber-500' },
  { name: 'Rose', value: 'text-rose-500 bg-rose-500/10', hex: 'bg-rose-500' }
];

export default function AddSpaceModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('FiUsers');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.Name || '');
      setSelectedIcon(initialData.Icon || 'FiUsers');
      setSelectedColor(initialData.Color || COLOR_OPTIONS[0].value);
    } else if (isOpen) {
      setName('');
      setSelectedIcon('FiUsers');
      setSelectedColor(COLOR_OPTIONS[0].value);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    const success = await onSave({ id: initialData?.Id, name, icon: selectedIcon, color: selectedColor });
    setIsSubmitting(false);
    
    if (success) {
      setName('');
      setSelectedIcon('FiUsers');
      setSelectedColor(COLOR_OPTIONS[0].value);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 animate-slide-up overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedColor}`}>
              <FiUsers />
            </div>
            {initialData ? 'แก้ไขข้อมูล Space' : 'Create New Space'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-xl transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Space Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Team, Development"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Color Theme</label>
            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${c.hex} ${selectedColor === c.value ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-900' : ''}`}
                >
                  {selectedColor === c.value && <FiCheck className="text-white text-sm" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm">
              {isSubmitting ? 'กำลังบันทึก...' : (initialData ? 'บันทึกการแก้ไข' : 'Create Space')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
