import { UserRole, PrivilegeType, AccessScope, RoleDefinition, Permission } from '../types/privileges';

const FULL_PERMISSION: Permission = { view: true, edit: true, delete: true };
const EDIT_PERMISSION: Permission = { view: true, edit: true, delete: false };
const READ_PERMISSION: Permission = { view: true, edit: false, delete: false };

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    privilegeType: PrivilegeType.FULL_ACCESS,
    scope: AccessScope.GLOBAL,
    permissions: FULL_PERMISSION
  },

  [UserRole.ADMINISTRATOR]: {
    role: UserRole.ADMINISTRATOR,
    privilegeType: PrivilegeType.FULL_ACCESS,
    scope: AccessScope.SCHOOL_LEVEL,
    permissions: FULL_PERMISSION
  },

  [UserRole.SUPERVISOR]: {
    role: UserRole.SUPERVISOR,
    privilegeType: PrivilegeType.EDIT_ACCESS,
    scope: AccessScope.SCHOOL_LEVEL,
    permissions: EDIT_PERMISSION
  },

  [UserRole.TEACHER]: {
    role: UserRole.TEACHER,
    privilegeType: PrivilegeType.EDIT_ACCESS,
    scope: AccessScope.CLASS_LEVEL,
    permissions: EDIT_PERMISSION,
    customPermissions: {
      'students': { view: true, edit: true, delete: false },
      'student_profiles': { view: true, edit: true, delete: false },
      'student_grades': EDIT_PERMISSION,
      'student_attendance': EDIT_PERMISSION,
      'student_behavior': EDIT_PERMISSION,
      'class_materials': EDIT_PERMISSION,
      'assignments': EDIT_PERMISSION,
      'class_announcements': EDIT_PERMISSION
    }
  },

  [UserRole.PARENT]: {
    role: UserRole.PARENT,
    privilegeType: PrivilegeType.READ_ONLY,
    scope: AccessScope.PARENT_CHILDREN,
    permissions: READ_PERMISSION,
    customPermissions: {
      'children_profiles': { view: true, edit: true, delete: false },
      'children_grades': READ_PERMISSION,
      'children_attendance': READ_PERMISSION,
      'children_behavior': READ_PERMISSION,
      'children_reports': READ_PERMISSION,
      'own_profile': { view: true, edit: true, delete: false }
    }
  },

  [UserRole.STUDENT]: {
    role: UserRole.STUDENT,
    privilegeType: PrivilegeType.READ_ONLY,
    scope: AccessScope.STUDENT_SELF,
    permissions: READ_PERMISSION,
    customPermissions: {
      'own_grades': READ_PERMISSION,
      'own_attendance': READ_PERMISSION,
      'own_performance': READ_PERMISSION,
      'announcements': READ_PERMISSION,
      'own_profile': { view: true, edit: true, delete: false }
    }
  }
};

export const getPermissionsForRole = (role: UserRole, resource?: string): Permission => {
  const roleDefinition = ROLE_DEFINITIONS[role];
  
  if (resource && roleDefinition.customPermissions?.[resource]) {
    return roleDefinition.customPermissions[resource];
  }
  
  return roleDefinition.permissions;
};