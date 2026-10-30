import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare } from 'lucide-react';

const SurveyModal = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;
    
    // In a real app, send to API. Here we just mock it.
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      // reset after close
      setTimeout(() => {
        setRating(0);
        setHoverRating(0);
        setFeedback('');
        setSubmitted(false);
      }, 500);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          ></motion.div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-sm"
          >
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-emerald-500 fill-emerald-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ขอบคุณสำหรับคำติชม</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">ความคิดเห็นของคุณจะช่วยพัฒนาการบริการให้ดียิ่งขึ้น</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ประเมินความพึงพอใจ</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">การเดินทางเที่ยวนี้เป็นอย่างไรบ้าง?</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star 
                          size={40} 
                          className={`${
                            (hoverRating || rating) >= star 
                              ? 'text-amber-400 fill-amber-400' 
                              : 'text-gray-200 dark:text-gray-700'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mb-6 relative">
                    <div className="absolute top-3 left-3">
                      <MessageSquare size={18} className="text-gray-400" />
                    </div>
                    <textarea
                      placeholder="มีอะไรอยากบอกเราเพิ่มเติมไหม? (ไม่บังคับ)"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900 dark:text-white transition-all min-h-[100px] resize-none"
                    ></textarea>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all"
                    >
                      ข้ามไปก่อน
                    </button>
                    <button 
                      type="submit"
                      disabled={rating === 0}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-sm"
                    >
                      ส่งคำประเมิน
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SurveyModal;
