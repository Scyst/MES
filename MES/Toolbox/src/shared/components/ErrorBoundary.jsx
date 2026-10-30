import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.handleHashChange);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange);
  }

  handleHashChange() {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">
              เกิดข้อผิดพลาดในการแสดงผลหน้าต่างนี้ (Runtime Error)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              ระบบตรวจพบข้อผิดพลาดในการประมวลผลส่วนแสดงผล กรุณาลองรีเฟรชหน้าจอ หรือกลับสู่หน้าหลัก
            </p>
            <pre className="text-xs bg-slate-100 dark:bg-slate-950 text-rose-700 dark:text-rose-300 p-3 rounded-xl overflow-x-auto mb-4">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error || 'Unknown Error')}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                ลองอีกครั้ง
              </button>
              <a
                href="#/"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
              >
                กลับสู่หน้าหลัก
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
