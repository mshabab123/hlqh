import { UserRole, AccessContext, ResourceAccess, AccessScope } from '../types/privileges';
import { ROLE_DEFINITIONS, getPermissionsForRole } from '../config/roleDefinitions';

export class PrivilegeChecker {
  
  static hasAccess(context: AccessContext, resourceAccess: ResourceAccess): boolean {
    const roleDefinition = ROLE_DEFINITIONS[context.role];
    const permissions = getPermissionsForRole(context.role, resourceAccess.resource);
    
    if (!this.hasPermissionForAction(permissions, resourceAccess.action)) {
      return false;
    }
    
    return this.hasScope(context, resourceAccess, roleDefinition.scope);
  }
  
  private static hasPermissionForAction(permissions: any, action: string): boolean {
    switch (action) {
      case 'view':
        return permissions.view;
      case 'edit':
        return permissions.edit;
      case 'delete':
        return permissions.delete;
      default:
        return false;
    }
  }
  
  private static hasScope(context: AccessContext, resourceAccess: ResourceAccess, scope: AccessScope): boolean {
    switch (scope) {
      case AccessScope.GLOBAL:
        return true;
        
      case AccessScope.SCHOOL_LEVEL:
        return this.hasSchoolAccess(context, resourceAccess);
        
      case AccessScope.CLASS_LEVEL:
        return this.hasClassAccess(context, resourceAccess);
        
      case AccessScope.PROFILE_LEVEL:
        return resourceAccess.ownerId === context.userId;
        
      case AccessScope.PARENT_CHILDREN:
        return this.hasParentChildrenAccess(context, resourceAccess);
        
      case AccessScope.STUDENT_SELF:
        return resourceAccess.ownerId === context.userId;
        
      default:
        return false;
    }
  }
  
  private static hasSchoolAccess(context: AccessContext, resourceAccess: ResourceAccess): boolean {
    return context.schoolId === resourceAccess.schoolId;
  }
  
  private static hasClassAccess(context: AccessContext, resourceAccess: ResourceAccess): boolean {
    if (!this.hasSchoolAccess(context, resourceAccess)) {
      return false;
    }
    
    return context.classIds?.includes(resourceAccess.classId || '') || false;
  }
  
  private static hasParentChildrenAccess(context: AccessContext, resourceAccess: ResourceAccess): boolean {
    if (resourceAccess.ownerId === context.userId) {
      return true;
    }
    
    return context.childrenIds?.includes(resourceAccess.ownerId || '') || false;
  }
  
  static canView(context: AccessContext, resource: string, resourceId?: string, ownerId?: string, schoolId?: string, classId?: string): boolean {
    return this.hasAccess(context, {
      resource,
      resourceId,
      action: 'view',
      ownerId,
      schoolId,
      classId
    });
  }
  
  static canEdit(context: AccessContext, resource: string, resourceId?: string, ownerId?: string, schoolId?: string, classId?: string): boolean {
    return this.hasAccess(context, {
      resource,
      resourceId,
      action: 'edit',
      ownerId,
      schoolId,
      classId
    });
  }
  
  static canDelete(context: AccessContext, resource: string, resourceId?: string, ownerId?: string, schoolId?: string, classId?: string): boolean {
    return this.hasAccess(context, {
      resource,
      resourceId,
      action: 'delete',
      ownerId,
      schoolId,
      classId
    });
  }
  
  static getAccessibleSchools(context: AccessContext): string[] | 'all' {
    const roleDefinition = ROLE_DEFINITIONS[context.role];
    
    if (roleDefinition.scope === AccessScope.GLOBAL) {
      return 'all';
    }
    
    return context.schoolId ? [context.schoolId] : [];
  }
  
  static getAccessibleClasses(context: AccessContext): string[] | 'all' {
    const roleDefinition = ROLE_DEFINITIONS[context.role];
    
    if (roleDefinition.scope === AccessScope.GLOBAL) {
      return 'all';
    }
    
    if (roleDefinition.scope === AccessScope.SCHOOL_LEVEL) {
      return 'all';
    }
    
    return context.classIds || [];
  }
  
  static canAccessStudent(context: AccessContext, studentId: string, studentClassId?: string, studentSchoolId?: string): boolean {
    switch (context.role) {
      case UserRole.ADMIN:
        return true;
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
        return studentSchoolId === context.schoolId;
        
      case UserRole.TEACHER:
        return studentSchoolId === context.schoolId && 
               context.classIds?.includes(studentClassId || '') || false;
        
      case UserRole.PARENT:
        return context.childrenIds?.includes(studentId) || false;
        
      case UserRole.STUDENT:
        return studentId === context.userId;
        
      default:
        return false;
    }
  }
  
  static getAccessibleStudents(context: AccessContext): string[] | 'all' {
    switch (context.role) {
      case UserRole.ADMIN:
        return 'all';
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
        return 'all';
        
      case UserRole.TEACHER:
        return 'all';
        
      case UserRole.PARENT:
        return context.childrenIds || [];
        
      case UserRole.STUDENT:
        return [context.userId];
        
      default:
        return [];
    }
  }
}