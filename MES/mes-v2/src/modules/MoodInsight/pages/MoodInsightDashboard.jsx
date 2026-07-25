import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { HeartPulse, ArrowLeft, Users, Frown, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';

const mockData = [
  { name: 'Line A', "ดีมาก": 15, "ดี": 20, "เฉยๆ": 10, "แย่": 2, "แย่มาก": 1 },
  { name: 'Line B', "ดีมาก": 10, "ดี": 15, "เฉยๆ": 20, "แย่": 5, "แย่มาก": 2 },
  { name: 'Line C', "ดีมาก": 25, "ดี": 10, "เฉยๆ": 5, "แย่": 1, "แย่มาก": 0 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export default function MoodInsightDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2 text-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> กลับหน้าหลัก
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <HeartPulse className="text-red-500" size={32} />
            Mood Insight Report
          </h1>
          <p className="text-gray-500 mt-1">วิเคราะห์สุขภาพใจพนักงาน (Mental Health Analytics)</p>
        </div>
        <div className="flex gap-2">
          <input type="date" className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500" defaultValue={new Date().toISOString().split('T')[0]} />
          <select className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500">
            <option value="ALL">ทุกไลน์ (Factory)</option>
            <option value="LINE_A">Line A</option>
            <option value="LINE_B">Line B</option>
            <option value="LINE_C">Line C</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600"><Users size={32} /></div>
          <div>
            <div className="text-sm font-bold text-gray-500">พนักงานที่ประเมินวันนี้</div>
            <div className="text-3xl font-black text-gray-800">105 <span className="text-sm font-normal text-gray-500">คน</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full text-green-600"><Smile size={32} /></div>
          <div>
            <div className="text-sm font-bold text-gray-500">ค่าเฉลี่ยความสุข (Mean)</div>
            <div className="text-3xl font-black text-green-600">4.2 <span className="text-sm font-normal text-gray-500">/ 5.0</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-full text-orange-600"><Frown size={32} /></div>
          <div>
            <div className="text-sm font-bold text-gray-500">กลุ่มเสี่ยง (ความสุข &lt; 3)</div>
            <div className="text-3xl font-black text-orange-600">8 <span className="text-sm font-normal text-gray-500">คน</span></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">ภาพรวมระดับความรู้สึก (Factory Overview)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'ดีมาก (5)', value: 50 },
                    { name: 'ดี (4)', value: 45 },
                    { name: 'เฉยๆ (3)', value: 35 },
                    { name: 'แย่ (2)', value: 8 },
                    { name: 'แย่มาก (1)', value: 3 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {mockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">ความรู้สึกแยกตามพื้นที่ (By Line)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ดีมาก" stackId="a" fill="#10b981" />
                <Bar dataKey="ดี" stackId="a" fill="#3b82f6" />
                <Bar dataKey="เฉยๆ" stackId="a" fill="#f59e0b" />
                <Bar dataKey="แย่" stackId="a" fill="#f97316" />
                <Bar dataKey="แย่มาก" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
}
