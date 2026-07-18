import React from 'react';
import { FiFolder, FiFileText, FiImage, FiMoreVertical, FiDownload, FiEye, FiLink } from 'react-icons/fi';

export default function Resources() {
  const mockFiles = [
    { id: 1, name: 'Q3_Project_Brief.pdf', type: 'pdf', size: '2.4 MB', date: '2026-07-15', uploader: 'Admin' },
    { id: 2, name: 'Wireframes_v2.fig', type: 'figma', size: '15.1 MB', date: '2026-07-14', uploader: 'Design Team' },
    { id: 3, name: 'API_Documentation.md', type: 'doc', size: '45 KB', date: '2026-07-10', uploader: 'Developer Team' },
    { id: 4, name: 'Meeting_Notes_July.docx', type: 'doc', size: '1.2 MB', date: '2026-07-08', uploader: 'Engineers' },
    { id: 5, name: 'Architecture_Diagram.png', type: 'image', size: '3.8 MB', date: '2026-07-05', uploader: 'Admin' }
  ];

  const getIconForType = (type) => {
    switch(type) {
      case 'image': return <FiImage className="text-emerald-500" />;
      case 'pdf': return <FiFileText className="text-rose-500" />;
      case 'figma': return <FiLink className="text-purple-500" />;
      default: return <FiFileText className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500">
            <FiFolder />
          </span> 
          Resources
        </h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors">
          Upload File
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">File Name</th>
                <th className="px-6 py-4 font-bold">Size</th>
                <th className="px-6 py-4 font-bold">Uploaded By</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockFiles.map(file => (
                <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                        {getIconForType(file.type)}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{file.size}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{file.uploader}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{file.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                        <FiEye />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                        <FiDownload />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <FiMoreVertical />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-center text-xs text-slate-400 mt-4">
        * ข้อมูลในหน้านี้เป็นข้อมูลจำลอง (Mock Data) สำหรับการแสดงผลหน้า UI
      </div>
    </div>
  );
}
