export function resolveAssigneeName(name, users) {
  if (!name || !users || !Array.isArray(users)) return name || 'Unassigned';
  const lowerName = name.toLowerCase().trim();
  const foundUser = users.find(u => {
    if (u.fullname && u.fullname.toLowerCase() === lowerName) return true;
    if (u.username && u.username.toLowerCase() === lowerName) return true;
    if (u.aka) {
       const akas = u.aka.split(',').map(a => a.trim().toLowerCase());
       if (akas.includes(lowerName)) return true;
    }
    return false;
  });
  
  if (foundUser) {
     const firstAka = foundUser.aka ? foundUser.aka.split(',')[0].trim() : null;
     return firstAka || foundUser.fullname || foundUser.username || name;
  }
  
  return name;
}

export function getCanonicalName(name, users) {
  if (!name || !users || !Array.isArray(users)) return name || 'Unassigned';
  const lowerName = name.toLowerCase().trim();
  const foundUser = users.find(u => {
    if (u.fullname && u.fullname.toLowerCase() === lowerName) return true;
    if (u.username && u.username.toLowerCase() === lowerName) return true;
    if (u.aka) {
       const akas = u.aka.split(',').map(a => a.trim().toLowerCase());
       if (akas.includes(lowerName)) return true;
    }
    return false;
  });
  
  if (foundUser) {
     const firstAka = foundUser.aka ? foundUser.aka.split(',')[0].trim() : null;
     return firstAka || foundUser.fullname || foundUser.username || name;
  }
  
  return name;
}
