import React from 'react';
import { Globe, KeyRound, Building2 } from 'lucide-react';
import { InboundHubProvider } from '../context/InboundHubContext';
import PartnerPortalView from '../components/PartnerPortalView';

export default function StandalonePartnerPortalPage() {
  return (
    <InboundHubProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* แถบส่วนหัวแยกขาดจากเมนูภายในโรงงาน 100% */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">SNC PARTNER PORTAL</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Inbound Document & Container Pre-Advice System
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                <KeyRound className="w-3.5 h-3.5" /> Magic Link Verified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> Daikin Industries
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <PartnerPortalView isProxyMode={false} />
        </main>
      </div>
    </InboundHubProvider>
  );
}
