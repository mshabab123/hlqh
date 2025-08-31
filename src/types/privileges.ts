export enum UserRole {
  ADMIN = 'admin',
  ADMINISTRATOR = 'administrator', 
  SUPERVISOR = 'supervisor',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STUDENT = 'student'
}

export enum PrivilegeType {
  FULL_ACCESS = 'full_access',
  EDIT_ACCESS = 'edit_access', 
  READ_ONLY = 'read_only'
}

export enum AccessScope {
  GLOBAL = 'global',
  SCHOOL_LEVEL = 'school_level',
  CLASS_LEVEL = 'class_level',
  PROFILE_LEVEL = 'profile_level',
  PARENT_CHILDREN = 'parent_children',
  STUDENT_SELF = 'student_self'
}

export interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RoleDefinition {
  role: UserRole;
  privilegeType: PrivilegeType;
  scope: AccessScope;
  permissions: Permission;
  customPermissions?: {
    [key: string]: Permission;
  };
}

export interface AccessContext {
  userId: string;
  role: UserRole;
  schoolId?: string;
  classIds?: string[];
  childrenIds?: string[];
}

export interface ResourceAccess {
  resource: string;
  resourceId?: string;
  action: 'view' | 'edit' | 'delete';
  ownerId?: string;
  schoolId?: string;
  classId?: string;
}