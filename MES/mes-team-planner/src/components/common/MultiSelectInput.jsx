import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function MultiSelectInput({ value = '', onChange, suggestions = [], placeholder = '' }) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  const tags = value.split(',').map(t => t.trim()).filter(Boolean);

  const searchStr = inputValue.trim().toLowerCase();
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(searchStr) && !tags.includes(s)
  );

  const updatePosition = () => {
    if (wrapperRef.current && showDropdown) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 192; // max-h-48
      
      let top = rect.bottom + 4; // mt-1
      let maxH = 192;
      
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - Math.min(dropdownHeight, spaceAbove - 10) - 4;
        maxH = Math.min(dropdownHeight, spaceAbove - 10);
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: `${maxH}px`,
        zIndex: 999999
      });
    }
  };

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown, tags.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target) &&
          (!dropdownRef.current || !dropdownRef.current.contains(event.target))) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagToAdd) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags.join(', '));
    }
    setInputValue('');
    setShowDropdown(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (showDropdown && focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
        addTag(filteredSuggestions[focusedIndex]);
      } else if (inputValue) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '') {
      if (tags.length > 0) {
        removeTag(tags.length - 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showDropdown) setShowDropdown(true);
      setFocusedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="flex flex-row flex-nowrap items-center gap-1.5 w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-[44px] overflow-x-auto overflow-y-hidden custom-scrollbar cursor-text transition-all focus-within:ring-2 focus-within:ring-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg text-[13px] font-medium border border-indigo-200 dark:border-indigo-500/30 shrink-0 whitespace-nowrap"
          >
            {tag}
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); removeTag(idx); }}
              className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
            >
              <FiX className="text-xs" />
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
            setFocusedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className="flex-1 min-w-[100px] shrink-0 bg-transparent outline-none text-slate-900 dark:text-white text-sm placeholder-slate-500 p-1"
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>

      {/* Dropdown Suggestions */}
      {showDropdown && filteredSuggestions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-y-auto animate-slide-up"
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300 transition-colors ${idx === focusedIndex || (idx === 0 && focusedIndex === -1 && inputValue) ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                addTag(suggestion);
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              {suggestion}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
