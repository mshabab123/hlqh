export { UserRole, PrivilegeType, AccessScope } from './types/privileges';
export type { Permission, RoleDefinition, AccessContext, ResourceAccess } from './types/privileges';

export { ROLE_DEFINITIONS, getPermissionsForRole } from './config/roleDefinitions';

export { PrivilegeChecker } from './utils/privilegeChecker';
export { ScopeValidator } from './utils/scopeValidator';

export { 
  requireAccess, 
  requireRole, 
  requireSchoolAccess, 
  requireClassAccess, 
  requireOwnership 
} from './middleware/accessControl';
export type { AuthenticatedRequest, AccessControlOptions } from './middleware/accessControl';