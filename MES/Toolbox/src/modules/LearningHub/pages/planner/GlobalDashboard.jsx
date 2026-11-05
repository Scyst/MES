import { mockTasks, mockUsers } from '../../data/mockPlannerData';
import TaskCard from '../../components/planner/TaskCard';

export default function GlobalDashboard() {
  // Filter ONLY public tasks or leaves
  const teamTasks = mockTasks.filter(task => task.visibility === 'PUBLIC' || task.type === 'LEAVE');

  const getOwnerName = (ownerId) => {
    const user = mockUsers.find(u => u.id === ownerId);
    return user ? user.name : 'Unknown';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen text-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
            Team Global Dashboard
          </h1>
          <p className="text-slate-400">Overview of the team's public tasks, events, and holidays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar / Filters */}
        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm h-fit">
          <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Team Members</h3>
          <ul className="space-y-3">
            {mockUsers.map(user => (
              <li key={user.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-sm text-white">
                  {user.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Board / Feed */}
        <div className="col-span-1 lg:col-span-3">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-slate-700 pb-2">Shared Board</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {teamTasks.map(task => (
              <div key={task.id} className="relative group">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center font-bold text-xs text-white z-10 shadow-lg">
                  {mockUsers.find(u => u.id === task.ownerId)?.avatar}
                </div>
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
