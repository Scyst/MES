import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Info,
  DollarSign,
  Route as RouteIcon,
  Plus,
  Trash2,
  Package,
  Layers,
  History,
  Link2,
} from 'lucide-react';

const MATERIAL_TYPES = [
  { value: 'FG', label: 'FG (Finished Goods)' },
  { value: 'SEMI', label: 'SEMI (Semi-Finished)' },
  { value: 'WIP', label: 'WIP (Work in Process)' },
  { value: 'RM', label: 'RM (Raw Material)' },
  { value: 'PKG', label: 'PKG (Packaging)' },
  { value: 'CON', label: 'CON (Consumable)' },
  { value: 'SP', label: 'SP (Spare Part)' },
  { value: 'TOOL', label: 'TOOL (Tools)' },
  { value: 'OTHER', label: 'OTHER (อื่นๆ)' },
  { value: 'UNCLASSIFIED', label: 'UNCLASSIFIED (รอจัดหมวด)' },
];

export default function ItemEditModal({
  isOpen,
  onClose,
  onSave,
  item,
  lines = [],
  models = [],
  onOpenWhereUsed,
  onOpenAudit,
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({});
  const [routes, setRoutes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        item_id: item.item_id || 0,
        sap_no: item.sap_no || '',
        part_no: item.part_no || '',
        material_type: item.material_type || 'FG',
        material_sub_type: item.material_sub_type || '',
        sku: item.sku || '',
        barcode: item.barcode || '',
        part_description: item.part_description || '',
        planned_output: item.planned_output !== undefined ? item.planned_output : '',
        strokes_per_part: item.strokes_per_part || 1,
        min_stock: item.min_stock !== undefined ? item.min_stock : '',
        max_stock: item.max_stock !== undefined ? item.max_stock : '',
        is_active: item.is_active !== undefined ? (item.is_active ? 1 : 0) : 1,

        // Logistics
        CTN: item.CTN || '',
        net_weight: item.net_weight || '',
        gross_weight: item.gross_weight || '',
        cbm: item.cbm || '',
        invoice_product_type: item.invoice_product_type || '',
        invoice_description: item.invoice_description || '',

        // Financials
        StandardPrice: item.StandardPrice || '',
        Price_USD: item.Price_USD || '',
        Cost_RM: item.Cost_RM || '',
        Cost_PKG: item.Cost_PKG || '',
        Cost_SUB: item.Cost_SUB || '',
        Cost_DL: item.Cost_DL || '',
        Cost_OH_Machine: item.Cost_OH_Machine || '',
        Cost_OH_Utilities: item.Cost_OH_Utilities || '',
        Cost_OH_Indirect: item.Cost_OH_Indirect || '',
        Cost_OH_Staff: item.Cost_OH_Staff || '',
        Cost_OH_Accessory: item.Cost_OH_Accessory || '',
        Cost_OH_Others: item.Cost_OH_Others || '',
      });
      setRoutes(item.routes ? [...item.routes] : []);
    } else {
      setFormData({
        item_id: 0,
        sap_no: '',
        part_no: '',
        material_type: 'FG',
        material_sub_type: '',
        sku: '',
        barcode: '',
        part_description: '',
        planned_output: 100,
        strokes_per_part: 1,
        min_stock: 0,
        max_stock: 0,
        is_active: 1,
        StandardPrice: 0,
        Price_USD: 0,
      });
      setRoutes([]);
    }
    setActiveTab('basic');
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleAddRoute = () => {
    setRoutes([
      ...routes,
      {
        line: lines.length > 0 ? lines[0] : '',
        model: models.length > 0 ? models[0] : '',
        planned_output: formData.planned_output || 100,
      },
    ]);
  };

  const handleRemoveRoute = (index) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const handleRouteChange = (index, field, value) => {
    const updated = [...routes];
    updated[index][field] = value;
    setRoutes(updated);
  };

  const handleSapNoChange = (val) => {
    let newType = formData.material_type;
    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      const prefix = trimmed.substring(0, 2);
      if (prefix === '10') newType = 'RM';
      else if (prefix === '20') newType = 'PKG';
      else if (prefix === '30') newType = 'SEMI';
      else if (prefix === '40') newType = 'FG';
      else if (prefix === '70') newType = 'CON';
    }
    setFormData((prev) => ({ ...prev, sap_no: val, material_type: newType || prev.material_type }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sap_no.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        routes: routes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold">
                {formData.item_id ? `แก้ไขข้อมูลสินค้า (Item: ${formData.sap_no})` : 'เพิ่มสินค้าใหม่ (Add New Item)'}
              </h3>
              <p className="text-xs text-slate-400">กำหนดรหัสสินค้า ต้นทุนมาตรฐาน และเส้นทางการผลิต</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Info className="w-4 h-4" />
            ข้อมูลพื้นฐาน (Basic Info)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('costing')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'costing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            โลจิสติกส์ & ต้นทุน (Logistics & Costing)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'routes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <RouteIcon className="w-4 h-4 text-amber-500" />
            เส้นทางผลิต (Routes & UPH)
            {routes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {routes.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <form id="itemForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    SAP No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 4001552"
                    value={formData.sap_no || ''}
                    onChange={(e) => handleSapNoChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Part No.
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น PN-99023"
                    value={formData.part_no || ''}
                    onChange={(e) => setFormData({ ...formData, part_no: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Type (หมวดหลัก) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.material_type || 'FG'}
                    onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Sub-Type (กลุ่มย่อย)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น COVER, BASE, INK"
                    value={formData.material_sub_type || ''}
                    onChange={(e) => setFormData({ ...formData, material_sub_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Customer SKU
                  </label>
                  <input
                    type="text"
                    placeholder="SKU ลูกค้า"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="สแกนบาร์โค้ด"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Description (ชื่อ/รายละเอียดสินค้า)
                  </label>
                  <input
                    type="text"
                    placeholder="รายละเอียดสินค้า..."
                    value={formData.part_description || ''}
                    onChange={(e) => setFormData({ ...formData, part_description: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Standard UPH (Default)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.planned_output || ''}
                    onChange={(e) => setFormData({ ...formData, planned_output: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Strokes / Part
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.strokes_per_part || 1}
                    onChange={(e) => setFormData({ ...formData, strokes_per_part: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_stock || ''}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.max_stock || ''}
                    onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="item_is_active"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="item_is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  เปิดใช้งานสินค้านี้ (Active Status)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'costing' && (
            <div className="space-y-6">
              {/* Logistics */}
              <div>
                <h4 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-3">
                  Logistics & Packaging
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      CTN (Pack Size)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.CTN || ''}
                      onChange={(e) => setFormData({ ...formData, CTN: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Net Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.net_weight || ''}
                      onChange={(e) => setFormData({ ...formData, net_weight: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Gross Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.gross_weight || ''}
                      onChange={(e) => setFormData({ ...formData, gross_weight: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      CBM (m³)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.cbm || ''}
                      onChange={(e) => setFormData({ ...formData, cbm: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Standard Costing */}
              <div>
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
                  Pricing & Cost Breakdown (THB)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      Standard Price (THB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.StandardPrice || ''}
                      onChange={(e) => setFormData({ ...formData, StandardPrice: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={formData.Price_USD || ''}
                      onChange={(e) => setFormData({ ...formData, Price_USD: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Cost: RM
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_RM || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_RM: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Cost: PKG
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_PKG || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_PKG: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Cost: SUB
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_SUB || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_SUB: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Cost: DL
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_DL || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_DL: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      OH: Machine
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_OH_Machine || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_OH_Machine: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      OH: Utilities
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_OH_Utilities || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_OH_Utilities: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      OH: Indirect
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_OH_Indirect || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_OH_Indirect: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      OH: Staff
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.Cost_OH_Staff || ''}
                      onChange={(e) => setFormData({ ...formData, Cost_OH_Staff: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Manufacturing Routes & UPH
                  </h4>
                  <p className="text-xs text-slate-400">
                    กำหนดกำลังการผลิตเป้าหมาย (UPH) แยกตามไลน์และโมเดลที่ใช้ผลิต
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRoute}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มเส้นทาง (Add Route)
                </button>
              </div>

              {routes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  ยังไม่ได้กำหนดเส้นทางการผลิตเฉพาะ (จะใช้ Standard UPH พื้นฐานในการคำนวณ)
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Production Line</th>
                        <th className="py-2.5 px-3 font-semibold">Model</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-36">Target UPH</th>
                        <th className="py-2.5 px-3 font-semibold text-center w-16">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {routes.map((rt, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={rt.line || ''}
                              onChange={(e) => handleRouteChange(idx, 'line', e.target.value)}
                              placeholder="เช่น ASSY-01"
                              list="line-list"
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={rt.model || ''}
                              onChange={(e) => handleRouteChange(idx, 'model', e.target.value)}
                              placeholder="เช่น MODEL-A"
                              list="model-list"
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={rt.planned_output || ''}
                              onChange={(e) => handleRouteChange(idx, 'planned_output', e.target.value)}
                              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-blue-600"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRoute(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <datalist id="line-list">
                {lines.map((ln) => (
                  <option key={ln} value={ln} />
                ))}
              </datalist>
              <datalist id="model-list">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {formData.item_id ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenWhereUsed?.(formData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 rounded-xl border border-sky-200 dark:border-sky-800 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Where-Used
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAudit?.(formData)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-750 hover:bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Activity Log
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="itemForm"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสินค้า'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

