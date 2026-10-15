import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LearningHub ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-slate-800/90 rounded-2xl border border-rose-500/40 text-center max-w-xl mx-auto my-8 shadow-xl shadow-rose-950/20">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <FiAlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            เกิดข้อผิดพลาดในการแสดงผลเนื้อหาบทเรียน
          </h3>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            ระบบพบข้อผิดพลาดขณะโหลดโมดูลนี้ ({this.props.moduleName || 'Lesson Module'})
          </p>
          {this.state.error && (
            <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-rose-300 text-left mb-6 overflow-x-auto border border-rose-900/50">
              {this.state.error.toString()}
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-lg shadow-fuchsia-600/20"
            >
              <FiRefreshCw className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง
            </button>
            <a
              href="#/"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
            >
              <FiHome className="w-3.5 h-3.5" /> กลับสู่หน้าหลัก
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
