import React, { useState } from 'react';

const UserAvatar = ({ username, displayName, className = '', fallbackClass = 'bg-gradient-to-br from-indigo-500 to-violet-600', textClass = 'text-[11px] md:text-xs text-white', style = {}, onClick, users = [] }) => {
  const [error, setError] = useState(false);
  const avatarTimestamp = localStorage.getItem('avatar_ts') || '';
  
  if (!username && !displayName) return null;
  const safeUsername = String(username || displayName).trim();
  const safeDisplayName = displayName ? String(displayName).trim() : safeUsername;
  
  // Find real username for avatar lookup
  let realUsername = safeUsername;
  if (users && users.length > 0) {
    const userMatch = users.find(u => {
      const target = safeUsername.toLowerCase();
      if (u.username && u.username.toLowerCase() === target) return true;
      if (u.fullname && u.fullname.toLowerCase() === target) return true;
      const akas = (u.aka || u.akas || '').split(',').map(a => a.trim().toLowerCase());
      if (akas.includes(target)) return true;
      return false;
    });
    if (userMatch && userMatch.username) {
      realUsername = userMatch.username;
    }
  }

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper className={`relative shrink-0 rounded-full overflow-hidden ${className}`} style={style} title={safeDisplayName} onClick={onClick}>
      {/* Fallback */}
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${fallbackClass} ${textClass}`}>
        {safeDisplayName.substring(0, 1).toUpperCase()}
      </div>
      
      {/* Real Image */}
      {!error && (
        <img 
          src={`api/uploads/avatars/${encodeURIComponent(realUsername)}.jpg?t=${avatarTimestamp}`} 
          onError={() => setError(true)} 
          className="absolute inset-0 w-full h-full object-cover bg-white dark:bg-slate-800" 
          alt={safeUsername} 
        />
      )}
    </Wrapper>
  );
};

export default UserAvatar;
