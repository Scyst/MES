import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * ConfirmModal — Generic confirmation dialog to replace all window.confirm() calls.
 *
 * Props:
 *   isOpen       {boolean}   — Whether the modal is visible
 *   onClose      {function}  — Called when user cancels or closes
 *   onConfirm    {function}  — Called when user confirms
 *   title        {string}    — Modal header
 *   message      {string}    — Main description text
 *   details      {Array<{label, value}>} — Optional key-value rows shown in a summary box
 *   confirmText  {string}    — Confirm button label (default: "ยืนยัน")
 *   cancelText   {string}    — Cancel button label (default: "ยกเลิก")
 *   variant      {string}    — "danger" (red) | "warning" (amber) | "info" (blue)
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'ยืนยันการดำเนินการ',
  message = 'คุณแน่ใจหรือไม่?',
  details = [],
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'danger',
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const variantConfig = {
    danger: {
      icon: <Trash2 size={24} />,
      iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
    },
    info: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const config = variantConfig[variant] || variantConfig.danger;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full z-10 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="p-6">
              {/* Icon + Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${config.iconBg}`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
                </div>
              </div>

              {/* Details summary box */}
              {details.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 mb-5">
                  {details.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{label}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => { onConfirm(); onClose(); }}
                  className={`flex-1 py-2.5 px-4 text-white rounded-xl font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.confirmBtn}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
