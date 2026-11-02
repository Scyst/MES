import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, CheckCircle2, XCircle, Search, MapPin, Layers } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import LocationEditModal from './LocationEditModal';

const TYPE_COLORS = {
  RM: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  SEMI: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  FG: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  STORE: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  TOOL: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export default function LocationsTab({ lines = [] }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getLocations();
      if (res && res.success) {
        setLocations(res.data || []);
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดข้อมูลตำแหน่งจัดเก็บได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่งจัดเก็บ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const uniqueZones = useMemo(() => {
    const zones = new Set();
    locations.forEach((loc) => {
      if (loc.zone_name) zones.add(loc.zone_name);
    });
    return Array.from(zones).sort();
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        !searchTerm ||
        loc.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.location_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.production_line?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.zone_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'ALL' || loc.location_type === selectedType;
      const matchesZone = selectedZone === 'ALL' || loc.zone_name === selectedZone;

      return matchesSearch && matchesType && matchesZone;
    });
  }, [locations, searchTerm, selectedType, selectedZone]);

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLocation(loc);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      const res = await systemSettingsApi.saveLocation(formData);
      if (res && res.success) {
        showToast(res.message || 'บันทึกตำแหน่งจัดเก็บเรียบร้อย', 'success');
        fetchLocations();
      } else {
        showToast(res?.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (loc) => {
    const isActivating = loc.is_active == 0;
    const confirmed = await confirm({
      title: isActivating ? 'ยืนยันเปิดใช้งาน' : 'ยืนยันปิดใช้งาน',
      message: `คุณต้องการ${isActivating ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}ตำแหน่ง "${loc.location_name}" ใช่หรือไม่?`,
      type: isActivating ? 'info' : 'warning',
      confirmText: isActivating ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    });

    if (confirmed) {
      try {
        const res = await systemSettingsApi.deleteLocation(loc.location_id);
        if (res && res.success) {
          showToast(res.message || 'ปรับปรุงสถานะเรียบร้อย', 'success');
          fetchLocations();
        } else {
          showToast(res?.message || 'ปรับปรุงสถานะไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }
  };

  const columns = [
    {
      key: 'location_name',
      label: 'Location Name',
      sortable: true,
      render: (loc) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white">{loc.location_name}</span>
        </div>
      ),
    },
    {
      key: 'location_type',
      label: 'Type',
      sortable: true,
      render: (loc) => {
        const colorClass = TYPE_COLORS[loc.location_type] || 'bg-slate-100 text-slate-700 border-slate-200';
        return (
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colorClass}`}>
            {loc.location_type || 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'zone_name',
      label: 'Zone',
      sortable: true,
      render: (loc) =>
        loc.zone_name ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
            <Layers className="w-3 h-3 text-slate-400" />
            {loc.zone_name}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: 'production_line',
      label: 'Line',
      sortable: true,
      render: (loc) =>
        loc.production_line ? (
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {loc.production_line}
          </span>
        ) : (
          <span className="text-xs text-slate-400">- (คลังกลาง)</span>
        ),
    },
    {
      key: 'location_description',
      label: 'Description',
      render: (loc) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs block">
          {loc.location_description || '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (loc) =>
        loc.is_active == 1 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (loc) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(loc)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="แก้ไข"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleActive(loc)}
            className={`p-1.5 rounded-lg transition-colors ${
              loc.is_active == 1
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
            }`}
            title={loc.is_active == 1 ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อตำแหน่ง, รายละเอียด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกหมวดหมู่ (All Types)</option>
            {Object.keys(TYPE_COLORS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {uniqueZones.length > 0 && (
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">ทุกโซน (All Zones)</option>
              {uniqueZones.map((z) => (
                <option key={z} value={z}>
                  โซน {z}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLocations}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตำแหน่งจัดเก็บ
          </button>
        </div>
      </div>

      {/* Locations DataTable */}
      <DataTable
        columns={columns}
        rows={filteredLocations}
        data={filteredLocations}
        rowKey={(loc) => loc.location_id || loc.location_name}
        loading={loading}
        defaultSortKey="location_name"
        emptyMessage="ไม่พบข้อมูลตำแหน่งจัดเก็บสินค้า"
      />

      {/* Modal */}
      <LocationEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        location={editingLocation}
        lines={lines}
      />
    </div>
  );
}

