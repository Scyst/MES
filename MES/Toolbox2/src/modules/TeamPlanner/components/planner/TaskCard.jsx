export default function TaskCard({ task }) {
  const getBorderColor = () => {
    switch (task.visibility) {
      case 'PRIVATE': return 'border-orange-500/50';
      case 'PUBLIC': return 'border-cyan-500/50';
      default: return 'border-gray-500/30';
    }
  };

  return (
    <div className={`p-4 rounded-xl border bg-slate-800/50 backdrop-blur-md hover:bg-slate-700/50 transition-colors ${getBorderColor()}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-bold text-lg leading-tight">{task.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${task.visibility === 'PRIVATE' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
          {task.visibility}
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{task.description}</p>
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-slate-500">{task.date}</span>
        <span className={`px-2 py-1 rounded-md ${
          task.status === 'DONE' ? 'text-green-400 bg-green-400/10' :
          task.status === 'IN_PROGRESS' ? 'text-amber-400 bg-amber-400/10' :
          'text-slate-300 bg-slate-600/50'
        }`}>
          {task.status}
        </span>
      </div>
    </div>
  );
}
