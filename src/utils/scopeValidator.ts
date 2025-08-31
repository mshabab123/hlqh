import { UserRole, AccessContext } from '../types/privileges';
import { PrivilegeChecker } from './privilegeChecker';

export class ScopeValidator {
  
  static validateDataAccess(context: AccessContext, data: any[]): any[] {
    return data.filter(item => this.canAccessItem(context, item));
  }
  
  private static canAccessItem(context: AccessContext, item: any): boolean {
    switch (context.role) {
      case UserRole.ADMIN:
        return true;
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
        return item.schoolId === context.schoolId;
        
      case UserRole.TEACHER:
        return item.schoolId === context.schoolId && 
               (context.classIds?.includes(item.classId) || false);
        
      case UserRole.PARENT:
        return context.childrenIds?.includes(item.studentId || item.ownerId) || false;
        
      case UserRole.STUDENT:
        return item.ownerId === context.userId || item.studentId === context.userId;
        
      default:
        return false;
    }
  }
  
  static buildScopeQuery(context: AccessContext, baseQuery: any = {}): any {
    const query = { ...baseQuery };
    
    switch (context.role) {
      case UserRole.ADMIN:
        break;
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
        query.schoolId = context.schoolId;
        break;
        
      case UserRole.TEACHER:
        query.schoolId = context.schoolId;
        if (context.classIds && context.classIds.length > 0) {
          query.classId = { $in: context.classIds };
        }
        break;
        
      case UserRole.PARENT:
        if (context.childrenIds && context.childrenIds.length > 0) {
          query.$or = [
            { studentId: { $in: context.childrenIds } },
            { ownerId: { $in: context.childrenIds } }
          ];
        }
        break;
        
      case UserRole.STUDENT:
        query.$or = [
          { ownerId: context.userId },
          { studentId: context.userId }
        ];
        break;
    }
    
    return query;
  }
  
  static validateStudentAccess(context: AccessContext, studentId: string, studentData?: { classId?: string; schoolId?: string }): boolean {
    return PrivilegeChecker.canAccessStudent(context, studentId, studentData?.classId, studentData?.schoolId);
  }
  
  static validateGradeAccess(context: AccessContext, grade: { studentId: string; classId: string; schoolId: string }): boolean {
    const resourceAccess = {
      resource: 'grades',
      action: 'view' as const,
      ownerId: grade.studentId,
      schoolId: grade.schoolId,
      classId: grade.classId
    };
    
    return PrivilegeChecker.hasAccess(context, resourceAccess);
  }
  
  static validateClassAccess(context: AccessContext, classId: string): boolean {
    switch (context.role) {
      case UserRole.ADMIN:
        return true;
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
        return true;
        
      case UserRole.TEACHER:
        return context.classIds?.includes(classId) || false;
        
      default:
        return false;
    }
  }
  
  static getAccessibleUserIds(context: AccessContext): string[] | 'all' {
    switch (context.role) {
      case UserRole.ADMIN:
        return 'all';
        
      case UserRole.ADMINISTRATOR:
      case UserRole.SUPERVISOR:
      case UserRole.TEACHER:
        return 'all';
        
      case UserRole.PARENT:
        return [context.userId, ...(context.childrenIds || [])];
        
      case UserRole.STUDENT:
        return [context.userId];
        
      default:
        return [];
    }
  }
  
  static canAccessUserProfile(context: AccessContext, targetUserId: string): boolean {
    const accessibleIds = this.getAccessibleUserIds(context);
    
    if (accessibleIds === 'all') {
      return true;
    }
    
    return accessibleIds.includes(targetUserId);
  }
  
  static filterFields(context: AccessContext, data: any, resource: string): any {
    const permissions = PrivilegeChecker.getPermissionsForRole(context.role, resource);
    
    if (!permissions.view) {
      return null;
    }
    
    const filtered = { ...data };
    
    if (context.role === UserRole.PARENT && resource === 'student_profile') {
      const allowedFields = ['name', 'grades', 'attendance', 'behavior', 'contactInfo'];
      Object.keys(filtered).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete filtered[key];
        }
      });
    }
    
    if (context.role === UserRole.STUDENT && resource === 'own_profile') {
      const restrictedFields = ['internalNotes', 'parentContactInfo'];
      restrictedFields.forEach(field => delete filtered[field]);
    }
    
    if (context.role === UserRole.TEACHER && resource === 'students') {
      const allowedFields = ['id', 'name', 'classId', 'schoolId', 'grades', 'attendance', 'behavior', 'performance'];
      Object.keys(filtered).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete filtered[key];
        }
      });
    }
    
    return filtered;
  }
  
  static getStudentsInClass(context: AccessContext, classId: string, allStudents: any[]): any[] {
    if (!this.validateClassAccess(context, classId)) {
      return [];
    }
    
    const studentsInClass = allStudents.filter(student => 
      student.classId === classId && 
      this.canAccessItem(context, student)
    );
    
    return studentsInClass.map(student => 
      this.filterFields(context, student, 'students')
    ).filter(Boolean);
  }
  
  static getTeacherClassList(context: AccessContext, allClasses: any[]): any[] {
    if (context.role !== UserRole.TEACHER) {
      return [];
    }
    
    return allClasses.filter(classData => 
      classData.schoolId === context.schoolId &&
      context.classIds?.includes(classData.id)
    );
  }
}