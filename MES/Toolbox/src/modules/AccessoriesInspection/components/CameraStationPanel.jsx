import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Lightbulb,
  Play,
  Plug,
  RefreshCw,
  Sliders,
  Video,
  VideoOff,
} from 'lucide-react';
import { accessoriesApi } from '../../../shared/services/accessoriesApi';
import { ACCESSORY_PRODUCTS, formatAccessoryProductLabel } from '../utils/accessoriesHelpers';

/**
 * Live AI Vision camera stream & station controls panel.
 */
export default function CameraStationPanel({
  camConfigured,
  canControl,
  camOnline,
  camStatus,
  models,
  selectedProduct,
  onProductChange,
  selectedModel,
  onModelSelectChange,
  streamBust,
  onReconnect,
  onRefreshModels,
  onLoadModel,
  modelLoadingMsg,
  onStart,
  onCapture,
  onApplySettings,
  isOnline,
}) {
  const [showCameraTune, setShowCameraTune] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  const [confPct, setConfPct] = useState(() => Math.round((camStatus?.conf_threshold ?? 0.25) * 100));
  const [expAuto, setExpAuto] = useState(true);
  const [expTime, setExpTime] = useState(43000);
  const [gainAuto, setGainAuto] = useState(true);
  const [gainX10, setGainX10] = useState(10);
  const [alarmTimeoutSec, setAlarmTimeoutSec] = useState(30);
  const [okClearSec, setOkClearSec] = useState(30);

  const requiredClasses = Array.isArray(camStatus?.required_classes) ? camStatus.required_classes : [];
  const confirmedClasses = Array.isArray(camStatus?.confirmed_classes) ? camStatus.confirmed_classes : [];
  const modelClasses = Array.isArray(camStatus?.model_classes) ? camStatus.model_classes : [];
  const liveLabels = Array.isArray(camStatus?.labels) ? camStatus.labels : [];
  const isArmed = Boolean(camStatus?.armed);
  const camConnected = Boolean(camStatus?.camera_connected);
  const ioConnected = Boolean(camStatus?.io_connected);
  const dbConnected = Boolean(camStatus?.db_connected);

  const ioState = String(camStatus?.io_state || 'idle').toLowerCase();
  const stateLabel =
    ioState === 'idle' && isArmed
      ? 'RUNNING'
      : ioState === 'waiting'
        ? `WAITING ${Number(camStatus?.wait_sec ?? 3).toFixed(0)}s`
        : ioState.toUpperCase();

  const toggleClass = (cls) => {
    const next = requiredClasses.includes(cls)
      ? requiredClasses.filter((c) => c !== cls)
      : [...requiredClasses, cls];
    onApplySettings({ required_classes: next });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Camera Feed Card */}
      <div className="lg:col-span-8 bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-sm">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span
              className={`px-2.5 py-0.5 rounded-full ${
                ioState === 'alarm'
                  ? 'bg-red-600'
                  : ioState === 'detecting'
                    ? 'bg-blue-600'
                    : isArmed
                      ? 'bg-emerald-600'
                      : 'bg-slate-700'
              }`}
            >
              {stateLabel}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              FPS: {camStatus?.fps ?? '—'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${camOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span>{camConfigured ? (camOnline ? 'Online' : 'Offline') : 'ไม่ระบุ Upstream (.env)'}</span>
            </span>
            <button
              type="button"
              onClick={onReconnect}
              disabled={!camConfigured || !isOnline}
              className="min-h-[36px] min-w-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 text-xs disabled:opacity-40"
              title="Reconnect Stream"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {ioState === 'alarm' && (
          <div className="px-4 py-2 bg-red-600/90 text-white text-xs sm:text-sm font-bold flex items-center gap-2">
            <Bell size={16} />
            <span>ALARM — ชิ้นงานหลุดออกก่อนตรวจจับสำเร็จ กรุณาตรวจสอบ</span>
          </div>
        )}

        <div className="relative flex-1 min-h-[260px] sm:min-h-[340px] flex items-center justify-center bg-black">
          {camConfigured && camOnline && camConnected ? (
            <img
              src={accessoriesApi.getStreamUrl(streamBust)}
              alt="Live AI Inspection Stream"
              className="w-full h-full max-h-[460px] object-contain"
            />
          ) : (
            <div className="p-6 text-center space-y-2 max-w-md">
              <VideoOff size={44} className="mx-auto text-slate-500" />
              <div className="text-sm font-semibold text-slate-200">
                {camConfigured ? 'กล้องหน้าไลน์ไม่ได้เชื่อมต่อ' : 'ยังไม่ได้กำหนดค่า ACCESSORIES_CAM_UPSTREAM'}
              </div>
              <p className="text-xs text-slate-400">
                {camConfigured
                  ? 'ตรวจสอบสาย LAN ของเครื่อง AI Vision และบริการ main.py บนสายการผลิต (ประวัติการตรวจสอบจากฐานข้อมูลยังแสดงตามปกติ)'
                  : 'สามารถเปิดใช้งานสตรีมกล้องสดได้โดยกำหนด ACCESSORIES_CAM_UPSTREAM และ ACCESSORIES_CAM_API_KEY ในไฟล์ .env'}
              </p>
              {camConfigured && (
                <button
                  type="button"
                  onClick={onReconnect}
                  className="mt-2 min-h-[40px] px-4 rounded-xl border border-slate-600 text-xs font-semibold text-white hover:bg-slate-800 inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Reconnect
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom IO telemetry strip */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${camStatus?.sensor1 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span>Sensor 1: {camStatus?.sensor1 ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${camStatus?.sensor2 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span>Sensor 2: {camStatus?.sensor2 ? 'ON' : 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Lightbulb size={14} className="text-amber-400" />
            <span>{camStatus?.light ?? 'OFF'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bell size={14} className={camStatus?.alarm ? 'text-red-400' : 'text-slate-500'} />
            <span>Alarm: {camStatus?.alarm ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 shadow-sm">
        {/* Product */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
            Product (เลือกรุ่นงาน)
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
          >
            <option value="">-- เลือกรุ่นงาน --</option>
            {ACCESSORY_PRODUCTS.map((code) => (
              <option key={code} value={code}>
                {formatAccessoryProductLabel(code)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Video size={14} className="mx-auto text-gray-400 mb-1" />
            <div className="text-[11px] text-gray-500">Camera</div>
            <div className={`text-xs font-bold ${camConnected ? 'text-emerald-600' : 'text-gray-400'}`}>
              {camConnected ? 'Connected' : 'Off'}
            </div>
          </div>
          <div className="rounded-xl p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Plug size={14} className="mx-auto text-gray-400 mb-1" />
            <div className="text-[11px] text-gray-500">IO</div>
            <div className={`text-xs font-bold ${ioConnected ? 'text-emerald-600' : 'text-gray-400'}`}>
              {ioConnected ? 'Connected' : 'Off'}
            </div>
          </div>
          <div className="rounded-xl p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <Database size={14} className="mx-auto text-gray-400 mb-1" />
            <div className="text-[11px] text-gray-500">SQL DB</div>
            <div className={`text-xs font-bold ${dbConnected || isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
              {dbConnected ? 'Connected' : isOnline ? 'History OK' : 'Off'}
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Cpu size={13} /> AI Vision Model
          </div>
          <div className="flex gap-1.5">
            <select
              value={selectedModel}
              onChange={(e) => onModelSelectChange(e.target.value)}
              disabled={!canControl || !camConfigured}
              className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 disabled:opacity-50"
            >
              <option value="">-- เลือก Model --</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefreshModels}
              disabled={!camConfigured || !isOnline}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              title="รีเฟรชรายการ Model"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={onLoadModel}
            disabled={!canControl || !camConfigured || !selectedModel || !isOnline}
            className="w-full min-h-[40px] rounded-xl bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold disabled:opacity-40"
          >
            โหลด Model AI
          </button>
          {modelLoadingMsg && <div className="text-xs text-gray-500">{modelLoadingMsg}</div>}
        </div>

        {/* Required Classes */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <CheckSquare size={13} /> Required Classes
          </div>
          {modelClasses.length === 0 ? (
            <div className="text-xs text-gray-400">(เชื่อมต่อกล้องและโหลด Model เพื่อเลือกชิ้นส่วน)</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-1">
              {modelClasses.map((cls) => {
                const checked = requiredClasses.includes(cls);
                const found = confirmedClasses.includes(cls) || liveLabels.includes(cls);
                return (
                  <label key={cls} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canControl}
                      onChange={() => toggleClass(cls)}
                    />
                    <span className={`truncate ${found ? 'text-emerald-600 font-semibold' : ''}`}>{cls}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase text-gray-500 flex items-center gap-1">
              <Sliders size={13} /> Confidence
            </span>
            <span className="font-mono font-bold">{(confPct / 100).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={confPct}
            disabled={!canControl || !camConfigured}
            onChange={(e) => {
              const pct = Number(e.target.value);
              setConfPct(pct);
              onApplySettings({ conf: pct / 100, product: selectedProduct });
            }}
            className="w-full accent-blue-600"
          />
        </div>

        {/* Collapsible Exposure & Settings */}
        {canControl && (
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2">
            <button
              type="button"
              onClick={() => setShowCameraTune((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 py-1"
            >
              <span>ตั้งค่าแสงกล้อง (Exposure / Gain)</span>
              {showCameraTune ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showCameraTune && (
              <div className="space-y-2 text-xs bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl">
                <label className="flex items-center justify-between">
                  <span>Exposure Auto</span>
                  <input type="checkbox" checked={expAuto} onChange={(e) => setExpAuto(e.target.checked)} />
                </label>
                {!expAuto && (
                  <input
                    type="range"
                    min={100}
                    max={200000}
                    step={1000}
                    value={expTime}
                    onChange={(e) => setExpTime(Number(e.target.value))}
                    className="w-full"
                  />
                )}
                <label className="flex items-center justify-between">
                  <span>Gain Auto</span>
                  <input type="checkbox" checked={gainAuto} onChange={(e) => setGainAuto(e.target.checked)} />
                </label>
                {!gainAuto && (
                  <input
                    type="range"
                    min={10}
                    max={160}
                    value={gainX10}
                    onChange={(e) => setGainX10(Number(e.target.value))}
                    className="w-full"
                  />
                )}
                <button
                  type="button"
                  disabled={!camConfigured || !isOnline}
                  onClick={() =>
                    onApplySettings({
                      exposure_auto: expAuto,
                      exposure_time: expTime,
                      gain_auto: gainAuto,
                      gain_value: gainX10 / 10,
                    })
                  }
                  className="w-full min-h-[36px] rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40"
                >
                  บันทึกค่าแสงกล้อง
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTimerSettings((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 py-1"
            >
              <span>ตั้งค่า Timeout / Green Light Hold</span>
              {showTimerSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTimerSettings && (
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl">
                <div>
                  <span className="text-gray-500">Alarm Timeout (s)</span>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={alarmTimeoutSec}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setAlarmTimeoutSec(val);
                      onApplySettings({ alarm_timeout_sec: val });
                    }}
                    className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <span className="text-gray-500">Green Hold (s)</span>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={okClearSec}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setOkClearSec(val);
                      onApplySettings({ ok_clear_sec: val });
                    }}
                    className="w-full mt-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onStart}
            disabled={!canControl || !camConfigured || !camConnected || isArmed || !isOnline}
            className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Play size={16} /> START
          </button>
          <button
            type="button"
            onClick={onCapture}
            disabled={!canControl || !camConfigured || !camConnected || !isOnline}
            className="min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Camera size={16} /> Capture
          </button>
        </div>

        {!canControl && (
          <div className="rounded-xl bg-slate-100 dark:bg-slate-900 p-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>สิทธิ์ผู้ใช้งานของคุณเป็นโหมดดูผลเท่านั้น (Viewer Mode)</span>
          </div>
        )}
      </div>
    </div>
  );
}
