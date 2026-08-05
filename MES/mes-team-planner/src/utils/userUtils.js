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
     const fn = foundUser.fullname || foundUser.username;
     if (fn && fn.toLowerCase() !== lowerName) {
        return `${fn} (${name})`;
     }
     return fn || name;
  }
  
  return name;
}
