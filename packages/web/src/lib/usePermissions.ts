import { useAuth } from '../context/AuthContext';
import { hasPermission, hasAnyPermission, Permission } from './permissions';

export function usePermissions() {
  const { primaryRole } = useAuth();

  return {
    hasPermission: (permission: Permission) => primaryRole ? hasPermission(primaryRole, permission) : false,
    hasAnyPermission: (...permissions: Permission[]) => primaryRole ? hasAnyPermission(primaryRole, ...permissions) : false,
    role: primaryRole,
  };
}
