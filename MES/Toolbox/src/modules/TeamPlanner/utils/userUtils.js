export function resolveAssigneeName(name, users) {
  return getCanonicalName(name, users);
}

export function getCanonicalName(name, users) {
  if (!name || !users || !Array.isArray(users)) return name || 'Unassigned';
  const lowerName = name.toLowerCase().trim();
  
  const matchingUsers = users.filter(u => {
    if (u.fullname && u.fullname.toLowerCase() === lowerName) return true;
    if (u.username && u.username.toLowerCase() === lowerName) return true;
    if (u.aka) {
       const akas = u.aka.split(',').map(a => a.trim().toLowerCase());
       if (akas.includes(lowerName)) return true;
    }
    return false;
  });
  
  if (matchingUsers.length > 0) {
     const userWithAka = matchingUsers.find(u => u.aka) || matchingUsers[0];
     const firstAka = userWithAka.aka ? userWithAka.aka.split(',')[0].trim() : null;
     return firstAka || userWithAka.fullname || userWithAka.username || name;
  }
  
  return name;
}
