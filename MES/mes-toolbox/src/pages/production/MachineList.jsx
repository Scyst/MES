import { useState, useEffect } from 'react';
import { Settings, Play, Pause, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function MachineList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [machines, setMachines] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lines, setLines] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [resMachines, resLocations] = await Promise.all([
        fetch(`${API_BASE_URL}/machines.php`),
        fetch(`${API_BASE_URL}/locations.php`)
      ]);
      
      if (!resMachines.ok) throw new Error('Network response was not ok');
      const jsonMachines = await resMachines.json();
      const jsonLocations = await resLocations.json();
      
      if (jsonMachines.success) {
        const sortedMachines = jsonMachines.data.sort((a, b) => {
          if (a.line === b.line) {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          }
          return (a.line || '').localeCompare(b.line || '', undefined, { numeric: true });
        });
        setMachines(sortedMachines);
        const uniqueLines = [...new Set(sortedMachines.map(m => m.line).filter(Boolean))];
        setLines(['All', ...uniqueLines]);
      } else {
        throw new Error(jsonMachines.message || 'Failed to fetch machines');
      }

      if (jsonLocations.success) {
        const sortedLocations = jsonLocations.data.sort((a, b) => 
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
        setLocations(sortedLocations);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const getStatusConfig = (status) => {
    switch(status?.toLowerCase()) {
      case 'running': return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-400/10', border: 'border-green-200 dark:border-green-400/20', icon: <Play size={16} /> };
      case 'idle': return { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-400/10', border: 'border-yellow-200 dark:border-yellow-400/20', icon: <Pause size={16} /> };
      case 'down': return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-400/10', border: 'border-red-200 dark:border-red-400/20', icon: <AlertTriangle size={16} /> };
      default: return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-400/10', border: 'border-gray-200 dark:border-gray-400/20', icon: <Settings size={16} /> };
    }
  };

  const getMachineImage = (machine) => {
    if (machine.image_path) {
      if (machine.image_path.startsWith('http')) return machine.image_path;
      let path = machine.image_path;
      if (path.startsWith('/')) path = path.substring(1);
      if (!path.startsWith('../')) {
        return `../../${path}`;
      }
      return path;
    }
    
    const line = machine.line || '';
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('assembly') || lowerLine.includes('line')) return './assets/machine_assembly.png';
    return './assets/machine_cnc.png';
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-10 transition-colors duration-300">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Select Machine</h1>
        
        {/* Line Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {lines.map(line => (
            <button
              key={line}
              onClick={() => setFilter(line)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                filter === line 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {line}
            </button>
          ))}
        </div>
      </div>

      {/* Machine List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 px-4">
        {loading && machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 col-span-full">
            <RefreshCcw size={32} className="animate-spin mb-4" />
            <p>Loading machines...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 text-red-400 p-4 rounded-2xl text-center border border-red-900/50 col-span-full">
            <AlertTriangle className="mx-auto mb-2" size={32} />
            <p className="font-bold">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={fetchMachines} className="mt-4 px-4 py-2 bg-red-900/40 rounded-full text-sm">Retry</button>
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center text-gray-500 py-10 col-span-full">
            <p>No active machines found.</p>
          </div>
        ) : (
          machines.filter(m => filter === 'All' || m.line === filter).map(machine => {
            const status = getStatusConfig(machine.status);
            return (
              <button
                key={machine.id}
                onClick={() => navigate(`/production/machine/${machine.id}`)}
                className="w-full bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center text-left transition-all active:scale-[0.98] shadow-sm"
              >
                <div className="flex-shrink-0 w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center p-2 mr-4 transition-colors">
                  <img 
                    src={getMachineImage(machine)} 
                    alt={machine.name} 
                    className="w-full h-full object-cover rounded-lg drop-shadow-md"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = machine.line?.toLowerCase().includes('assembly') ? './assets/machine_assembly.png' : './assets/machine_cnc.png';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{machine.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{machine.id} • {machine.line}</p>
                </div>
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${status.border} ${status.color} ${status.bg} shrink-0 ml-2`}>
                  {status.icon}
                  <span className="capitalize ml-1">{machine.status || 'Unknown'}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* General Lines Grid */}
      {(filter === 'All' && locations.length > 0) && (
        <>
          <h2 className="text-xl font-bold mt-4 mb-2 text-gray-300">General Assembly Lines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => navigate(`/production/location/${loc.id}`)}
                className="w-full bg-blue-900/20 hover:bg-blue-900/30 border border-blue-900/50 rounded-2xl p-4 flex items-center text-left transition-all active:scale-[0.98]"
              >
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 mr-4">
                  <Settings size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-blue-100">{loc.name}</h3>
                  <p className="text-blue-400/70 text-sm">Line / General Area</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
