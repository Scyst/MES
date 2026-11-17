/**
 * Shared RBAC helper for Central Store & Warehouse Management access.
 * Because production/engineering/QC supervisors share `role === 'supervisor'`
 * in dbo.USERS and inherit `manage_warehouse` from SYS_ROLE_PERMISSIONS,
 * supervisor access to Central Store tabs must also be scoped to Warehouse lines.
 */

const CENTRAL_WAREHOUSE_ROLES = ['admin', 'creator', 'manager', 'store'];
const WAREHOUSE_LINES = ['ST/WH', 'STORE', 'WH', 'WAREHOUSE'];

export function hasCentralWarehouseAccess(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  if (CENTRAL_WAREHOUSE_ROLES.includes(role)) {
    return true;
  }
  const line = String(user.line || '').toUpperCase().trim();
  return role === 'supervisor' && WAREHOUSE_LINES.includes(line);
}
