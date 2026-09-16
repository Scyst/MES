// TimeSlotSelector.jsx — Pill selector for choosing a time slot
export default function TimeSlotSelector({ slots, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onChange(slot)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selected === slot
              ? 'bg-blue-600 text-white border-blue-600 shadow'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
