/**
 * ตรวจสอบว่าเป็นแอดมินหรือผู้จัดการหรือไม่
 * @param {Object} user 
 * @returns {boolean}
 */
export const isAdminOrManager = (user) => {
  if (!user) return false;
  // อิงตามระบบเก่าของคุณที่มี role: admin, manager, supervisor, creator, operator
  const role = user.role?.toLowerCase() || '';
  return ['admin', 'manager', 'supervisor', 'creator'].includes(role);
};

/**
 * ตรวจสอบว่าเป็นเจ้าของโปรเจ็คหรือไม่
 * @param {Object} user 
 * @param {Object} project 
 * @returns {boolean}
 */
export const isProjectOwner = (user, project) => {
  if (!user || !project) return false;
  
  const ownerStr = (project.Assignee || '').toLowerCase();
  const creatorStr = (project.CreatedBy || '').toLowerCase();
  
  const uname = (user.username || '').toLowerCase();
  const fname = (user.fullname || '').toLowerCase();
  const akas = user.aka ? user.aka.split(',').map(a => a.trim().toLowerCase()).filter(Boolean) : [];
  
  const checkMatch = (targetStr) => {
    if (!targetStr) return false;
    const tokens = targetStr.split(',').map(s => s.trim()).filter(Boolean);
    if (uname && tokens.includes(uname)) return true;
    if (fname && tokens.includes(fname)) return true;
    for (let aka of akas) {
      if (tokens.includes(aka)) return true;
    }
    return false;
  };
  
  return checkMatch(ownerStr) || checkMatch(creatorStr);
};

/**
 * ตรวจสอบว่าเป็นเจ้าของงานหรือไม่
 * @param {Object} user 
 * @param {Object} task 
 * @returns {boolean}
 */
export const isTaskOwner = (user, task) => {
  if (!user || !task) return false;
  
  const assigneeStr = (task.Assignee || '').toLowerCase();
  const creatorStr = (task.CreatedBy || '').toLowerCase();
  
  const uname = (user.username || '').toLowerCase();
  const fname = (user.fullname || '').toLowerCase();
  const akas = user.aka ? user.aka.split(',').map(a => a.trim().toLowerCase()).filter(Boolean) : [];
  
  const checkMatch = (targetStr) => {
    if (!targetStr) return false;
    const tokens = targetStr.split(',').map(s => s.trim()).filter(Boolean);
    if (uname && tokens.includes(uname)) return true;
    if (fname && tokens.includes(fname)) return true;
    for (let aka of akas) {
      if (tokens.includes(aka)) return true;
    }
    return false;
  };
  
  return checkMatch(assigneeStr) || checkMatch(creatorStr);
};

// ==========================================
// Action Checkers
// ==========================================

export const canManageSpace = (user) => {
  return isAdminOrManager(user);
};

export const canEditProject = (user, project) => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  return isProjectOwner(user, project);
};

export const canDeleteProject = (user, project) => {
  // ลบโปรเจ็คได้เฉพาะ Admin/Manager ตามความต้องการของ user
  if (!user) return false;
  return isAdminOrManager(user);
};

export const canEditTask = (user, task) => {
  if (!user) return false;
  // If it's a new task (no ID), anyone can edit/create
  if (!task || !task.Id) return true; 
  if (isAdminOrManager(user)) return true;
  return isTaskOwner(user, task);
};

export const canDeleteTask = (user, task) => {
  if (!user) return false;
  if (isAdminOrManager(user)) return true;
  return isTaskOwner(user, task);
};
