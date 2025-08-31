import { Request, Response, NextFunction } from 'express';
import { UserRole, AccessContext } from '../types/privileges';
import { PrivilegeChecker } from '../utils/privilegeChecker';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    schoolId?: string;
    classIds?: string[];
    childrenIds?: string[];
  };
}

export interface AccessControlOptions {
  resource: string;
  action: 'view' | 'edit' | 'delete';
  getOwnerId?: (req: AuthenticatedRequest) => string | undefined;
  getSchoolId?: (req: AuthenticatedRequest) => string | undefined;
  getClassId?: (req: AuthenticatedRequest) => string | undefined;
  customCheck?: (context: AccessContext, req: AuthenticatedRequest) => boolean;
}

export const requireAccess = (options: AccessControlOptions) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const context: AccessContext = {
      userId: req.user.id,
      role: req.user.role,
      schoolId: req.user.schoolId,
      classIds: req.user.classIds,
      childrenIds: req.user.childrenIds
    };

    const ownerId = options.getOwnerId?.(req);
    const schoolId = options.getSchoolId?.(req) || req.user.schoolId;
    const classId = options.getClassId?.(req);

    if (options.customCheck && !options.customCheck(context, req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const hasAccess = PrivilegeChecker.hasAccess(context, {
      resource: options.resource,
      action: options.action,
      ownerId,
      schoolId,
      classId
    });

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    next();
  };
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Role not authorized' });
    }

    next();
  };
};

export const requireSchoolAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const targetSchoolId = req.params.schoolId || req.body.schoolId || req.query.schoolId;
    
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    if (req.user.schoolId !== targetSchoolId) {
      return res.status(403).json({ error: 'School access denied' });
    }

    next();
  };
};

export const requireClassAccess = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const targetClassId = req.params.classId || req.body.classId || req.query.classId;
    
    if ([UserRole.ADMIN, UserRole.ADMINISTRATOR, UserRole.SUPERVISOR].includes(req.user.role)) {
      return next();
    }

    if (!targetClassId) {
      return res.status(400).json({ error: 'Class ID required' });
    }

    if (req.user.role === UserRole.TEACHER && !req.user.classIds?.includes(targetClassId)) {
      return res.status(403).json({ error: 'Class access denied' });
    }

    next();
  };
};

export const requireOwnership = (getOwnerId: (req: AuthenticatedRequest) => string | undefined) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if ([UserRole.ADMIN, UserRole.ADMINISTRATOR, UserRole.SUPERVISOR].includes(req.user.role)) {
      return next();
    }

    const ownerId = getOwnerId(req);
    
    if (!ownerId || ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Resource ownership required' });
    }

    next();
  };
};