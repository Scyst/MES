import { mockTasks } from '../../data/mockPlannerData';
import TaskCard from '../../components/planner/TaskCard';

export default function PlannerHome() {
  // Filter tasks where ownerId is the current user (e.g. 'u1')
  const myTasks = mockTasks.filter(task => task.ownerId === 'u1');

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen text-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2">
            My Personal Space
          </h1>
          <p className="text-slate-400">View your private and assigned public tasks.</p>
        </div>
        <button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2 px-6 rounded-full shadow-lg shadow-violet-500/30 transition-all transform hover:scale-105">
          + New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats */}
        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
          <h4 className="text-slate-400 font-bold mb-1">To Do</h4>
          <p className="text-3xl font-black text-white">{myTasks.filter(t => t.status === 'TODO').length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
          <h4 className="text-slate-400 font-bold mb-1">In Progress</h4>
          <p className="text-3xl font-black text-amber-400">{myTasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
          <h4 className="text-slate-400 font-bold mb-1">Done</h4>
          <p className="text-3xl font-black text-green-400">{myTasks.filter(t => t.status === 'DONE').length}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-white border-b border-slate-700 pb-2">My Tasks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
        {myTasks.length === 0 && <p className="text-slate-500 italic">No tasks found.</p>}
      </div>
    </div>
  );
}
