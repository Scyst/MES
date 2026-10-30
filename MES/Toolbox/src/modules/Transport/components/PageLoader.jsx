import { Loader2 } from 'lucide-react';

const PageLoader = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">กำลังโหลด...</p>
    </div>
  );
};

export default PageLoader;
