import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Search, Filter, RefreshCw, Plus, Minus, Trash2,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Package, History,
  X, Layers, MapPin, Briefcase, Eye, Send
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

export default function MaterialRequisitionTab() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortOption, setSortOption] = useState('DEFAULT');
  const [page, setPage] = useState(1);

  // Cart state: { [itemCode]: { item, qty } }
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requisition Form Fields
  const [reqType, setReqType] = useState('STOCK'); // STOCK or K2
  const [destLocationId, setDestLocationId] = useState('');
  const [internalJobNo, setInternalJobNo] = useState('');
  const [remark, setRemark] = useState('');

  // Master Data (Locations, Jobs)
  const [locations, setLocations] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [userLine, setUserLine] = useState('');

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Success message modal
  const [successReqNumber, setSuccessReqNumber] = useState(null);

  // Load Catalog items
  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getCatalog({
        category: selectedCategory,
        search,
        sort: sortOption,
        page
      });
      if (res && res.success) {
        setCatalog(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Master Data (WIP Locations & Line)
  const fetchMasterData = async () => {
    try {
      const res = await storeApi.getMasterData();
      if (res && res.success) {
        const allLocs = res.data?.locations || [];
        // Filter only WIP and Production locations
        const wipLocs = allLocs.filter(l => l.location_type === 'WIP' || l.production_line);
        setLocations(wipLocs.length > 0 ? wipLocs : allLocs);
        if (res.user_line) setUserLine(res.user_line);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  // Load Active Jobs when Destination Location changes
  const handleLocationChange = async (locId) => {
    setDestLocationId(locId);
    setInternalJobNo('');
    if (!locId) {
      setActiveJobs([]);
      return;
    }
    const loc = locations.find(l => String(l.location_id) === String(locId));
    const lineParam = loc ? (loc.production_line || loc.location_name) : '';
    try {
      const res = await storeApi.getActiveJobs(lineParam);
      if (res && res.success) {
        setActiveJobs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  // Load Order History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await storeApi.getMyOrders();
      if (res && res.success) {
        setHistoryOrders(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openOrderDetails = async (orderId) => {
    try {
      const res = await storeApi.getMyOrderDetails(orderId);
      if (res && res.success) {
        setSelectedOrderDetails(res);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory, sortOption, page]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Cart operations
  const addToCart = (item, qtyToAdd = 1) => {
    const code = item.item_code || item.sap_no || item.part_no;
    setCart(prev => {
      const existing = prev[code];
      const newQty = existing ? existing.qty + qtyToAdd : qtyToAdd;
      return {
        ...prev,
        [code]: {
          item,
          qty: Math.max(1, newQty)
        }
      };
    });
  };

  const updateCartQty = (code, newQty) => {
    if (newQty <= 0) {
      removeFromCart(code);
      return;
    }
    setCart(prev => {
      if (!prev[code]) return prev;
      return {
        ...prev,
        [code]: {
          ...prev[code],
          qty: newQty
        }
      };
    });
  };

  const removeFromCart = (code) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
  };

  const cartList = useMemo(() => Object.values(cart), [cart]);
  const cartTotalCount = useMemo(() => cartList.reduce((sum, c) => sum + c.qty, 0), [cartList]);

  // Submit Requisition
  const handleSubmitRequisition = async () => {
    if (cartList.length === 0) return;
    setIsSubmitting(true);
    try {
      const payloadCart = cartList.map(c => ({
        item_code: c.item.item_code || c.item.sap_no || c.item.part_no,
        qty: c.qty,
        item_name: c.item.part_description || c.item.description || ''
      }));

      const res = await storeApi.submitRequisition({
        cart: JSON.stringify(payloadCart),
        remark,
        requestType: reqType,
        internalJobNo,
        destinationLocationId: destLocationId ? parseInt(destLocationId) : null
      });

      if (res && res.success) {
        setCart({});
        setRemark('');
        setInternalJobNo('');
        setIsCartOpen(false);
        setSuccessReqNumber(res.req_number || 'REQ-' + Date.now());
      } else {
        alert(res?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
      }
    } catch (err) {
      alert('ส่งคำขอล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2.5 relative">
      {/* Search & Category Filter Toolbar */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); setPage(1); fetchCatalog(); }} 
            className="relative flex-1 min-w-0"
          >
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัส SAP, ชื่อวัสดุ, Part No..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </form>

          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0"
          >
            <option value="DEFAULT">พร้อมเบิก</option>
            <option value="SAP_ASC">A-Z</option>
            <option value="SAP_DESC">Z-A</option>
            <option value="STOCK_DESC">สต็อกมากสุด</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 justify-between md:justify-end">
          {/* History Button */}
          <button
            type="button"
            onClick={() => { setIsHistoryOpen(true); fetchHistory(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>ประวัติการเบิก</span>
          </button>

          {/* Cart Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors relative"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>ตะกร้าเบิก</span>
            {cartTotalCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center -mr-1">
                {cartTotalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-nowrap py-1 flex-shrink-0">
        {[
          { id: 'ALL', label: 'ทั้งหมด (All Items)' },
          { id: 'RM', label: 'วัตถุดิบ (RM)' },
          { id: 'PKG', label: 'บรรจุภัณฑ์ (PKG)' },
          { id: 'CON', label: 'วัสดุสิ้นเปลือง (CON)' },
          { id: 'SP', label: 'อะไหล่ซ่อม (SP)' },
          { id: 'TOOL', label: 'เครื่องมือ (TOOL)' }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catalog Grid View */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-1 sm:p-2 min-h-0 border border-slate-200/60 dark:border-slate-800/60">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-semibold">กำลังโหลดรายการพัสดุและวัตถุดิบ...</p>
          </div>
        ) : catalog.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">ไม่พบรายการพัสดุในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {catalog.map((item, idx) => {
              const code = item.item_code || item.sap_no || item.part_no || `ITEM-${idx}`;
              const desc = item.part_description || item.description || '-';
              const onhand = parseFloat(item.onhand_qty ?? item.onhand ?? item.quantity ?? 0);
              const inStock = onhand > 0;
              const cartItem = cart[code];
              const qtyInCart = cartItem ? cartItem.qty : 0;

              return (
                <div
                  key={code}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col overflow-hidden"
                >
                  {/* Item Image / Placeholder */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
                    {item.image_path ? (
                      <img
                        src={item.image_path}
                        alt={desc}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400 opacity-40" />
                    )}

                    {/* Stock Badge */}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs ${
                      inStock 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-rose-500 text-white'
                    }`}>
                      {inStock ? `คงเหลือ ${onhand}` : 'หมด'}
                    </span>
                  </div>

                  {/* Item Details */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={code}>
                        {code}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight" title={desc}>
                        {desc}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                      {qtyInCart > 0 ? (
                        <div className="flex items-center justify-between w-full bg-blue-50 dark:bg-blue-950/60 rounded-lg p-0.5 border border-blue-200 dark:border-blue-800">
                          <button
                            type="button"
                            onClick={() => updateCartQty(code, qtyInCart - 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 px-1">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(code, qtyInCart + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item, 1)}
                          className="w-full flex items-center justify-center gap-1 text-xs font-semibold py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors"
                        >
                          <Plus size={13} />
                          <span>ใส่ตะกร้า</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  รายการเบิกพัสดุ ({cartTotalCount} รายการ)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartList.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">ไม่มีสินค้าในตะกร้า</p>
                </div>
              ) : (
                cartList.map(c => {
                  const item = c.item;
                  const code = item.item_code || item.sap_no || item.part_no;
                  const desc = item.part_description || item.description || '-';

                  return (
                    <div
                      key={code}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {code}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {desc}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(code, c.qty - 1)}
                          className="w-6 h-6 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="font-mono text-xs font-bold px-1.5 min-w-[24px] text-center">
                          {c.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(code, c.qty + 1)}
                          className="w-6 h-6 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(code)}
                          className="w-6 h-6 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center ml-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Requisition Checkout Form */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 space-y-3">
              {/* Type Switcher */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  ประเภทคำขอ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReqType('STOCK')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      reqType === 'STOCK'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    เบิกจากคลัง (Stock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('K2')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      reqType === 'K2'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    ขอสั่งซื้อ (K2 PR)
                  </button>
                </div>
              </div>

              {/* Destination WIP Location */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  คลังปลายทาง (WIP) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destLocationId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- เลือกคลังปลายทาง / ไลน์ผลิต --</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name} {loc.production_line ? `(${loc.production_line})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Internal Job Order */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  เลขที่ Internal Job (MES) <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <select
                  value={internalJobNo}
                  onChange={(e) => setInternalJobNo(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- ไม่ผูกกับ Job Order --</option>
                  {activeJobs.map(job => (
                    <option key={job.job_no || job.job_id} value={job.job_no || job.job_id}>
                      {job.job_no} ({job.model_name || job.part_no || 'Job'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remark */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  หมายเหตุ / วัตถุประสงค์การใช้งาน
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  placeholder="ระบุเหตุผลการเบิกหรือการนำไปใช้..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={cartList.length === 0 || isSubmitting}
                onClick={handleSubmitRequisition}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังส่งคำขอ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>ยืนยันส่งคำขอเบิกพัสดุ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ประวัติการขอเบิกพัสดุของฉัน (My Requisitions)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsHistoryOpen(false); setSelectedOrderDetails(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-xs">กำลังโหลดประวัติการเบิก...</p>
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">ไม่พบประวัติการขอเบิก</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyOrders.map(order => {
                    const status = (order.status || '').toUpperCase();
                    const isPending = status === 'PENDING' || status === 'SUBMITTED';
                    const isAccepted = status === 'ACCEPTED' || status === 'IN_PROGRESS';
                    const isCompleted = status === 'COMPLETED' || status === 'ISSUED';
                    const isRejected = status === 'REJECTED' || status === 'CANCELLED';

                    return (
                      <div
                        key={order.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                              {order.req_number}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              isAccepted ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                              isRejected ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {order.status || 'PENDING'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {order.req_time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            จำนวน: {order.total_items} รายการ • ประเภท: {order.req_type || 'STOCK'} • หมายเหตุ: {order.remark || '-'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openOrderDetails(order.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors self-end sm:self-center"
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Order Details Sub-modal */}
              {selectedOrderDetails && (
                <div className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      รายละเอียดใบเบิก: {selectedOrderDetails.header?.req_number}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(null)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      ปิดรายละเอียด
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(selectedOrderDetails.items || []).map((it, idx) => (
                      <div key={idx} className="text-xs flex justify-between py-1 border-b border-blue-100 dark:border-blue-900/50">
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {it.item_code} - {it.description}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ขอเบิก: {it.qty_requested} • จ่ายแล้ว: {it.qty_issued || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      {successReqNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 text-center shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              ส่งคำขอเบิกพัสดุสำเร็จ!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono font-bold">
              เลขที่ใบเบิก: {successReqNumber}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 leading-relaxed">
              ระบบส่งคำขอไปยังเจ้าหน้าที่สโตร์เรียบร้อยแล้ว ท่านสามารถติดตามสถานะการจ่ายของได้ที่แท็บ "ประวัติการเบิก"
            </p>
            <button
              type="button"
              onClick={() => setSuccessReqNumber(null)}
              className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
