// Reusable object-level authorization middleware.
//
// role gates (requireRole) only check RANK. These check OWNERSHIP — which
// specific class / student / school / user the request targets — using the
// vetted helpers in utils/accessScope.js. `admin` always passes (handled inside
// the helpers / hierarchy). Apply AFTER authenticateToken.

const db = require('../config/database');
const { canAccessStudent, canAccessClass, canAccessSchool } = require('../utils/accessScope');
const { ROLE_HIERARCHY } = require('./rbac');

// Pull the first present value for any of `keys` from params then body.
const pick = (req, keys) => {
  for (const k of keys) {
    if (req.params && req.params[k] != null && req.params[k] !== '') return req.params[k];
    if (req.body && req.body[k] != null && req.body[k] !== '') return req.body[k];
  }
  return null;
};

function requireClassAccess(keys = ['id', 'classId', 'class_id']) {
  return async (req, res, next) => {
    try {
      const classId = pick(req, keys);
      if (!classId) return res.status(400).json({ error: 'معرف الحلقة مطلوب' });
      if (await canAccessClass(db, req.user, classId)) return next();
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذه الحلقة' });
    } catch (error) {
      console.error('Class access check failed:', error);
      return res.status(500).json({ error: 'فشل التحقق من الصلاحية' });
    }
  };
}

function requireStudentAccess(keys = ['studentId', 'student_id', 'id']) {
  return async (req, res, next) => {
    try {
      const studentId = pick(req, keys);
      if (!studentId) return res.status(400).json({ error: 'معرف الطالب مطلوب' });
      if (await canAccessStudent(db, req.user, studentId)) return next();
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذا الطالب' });
    } catch (error) {
      console.error('Student access check failed:', error);
      return res.status(500).json({ error: 'فشل التحقق من الصلاحية' });
    }
  };
}

function requireSchoolAccess(keys = ['schoolId', 'school_id', 'id']) {
  return async (req, res, next) => {
    try {
      const schoolId = pick(req, keys);
      if (!schoolId) return res.status(400).json({ error: 'معرف المجمع مطلوب' });
      if (await canAccessSchool(db, req.user, schoolId)) return next();
      return res.status(403).json({ error: 'ليس لديك صلاحية على هذا المجمع' });
    } catch (error) {
      console.error('School access check failed:', error);
      return res.status(500).json({ error: 'فشل التحقق من الصلاحية' });
    }
  };
}

const levelOf = (role) => ROLE_HIERARCHY[String(role || '').toLowerCase()] ?? -1;

// Block managing a user whose rank is EQUAL OR HIGHER than the caller's.
// Stops an administrator from deleting/deactivating/editing the platform admin,
// another administrator, or (crucially) promoting themselves — self is same rank.
function requireManageableUser(keys = ['id']) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next(); // platform admin manages everyone
      const targetId = pick(req, keys);
      if (!targetId) return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      const result = await db.query('SELECT role FROM users WHERE id = $1', [targetId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (levelOf(req.user.role) > levelOf(result.rows[0].role)) return next();
      return res.status(403).json({ error: 'لا يمكنك إدارة مستخدم بصلاحية مساوية أو أعلى من صلاحيتك' });
    } catch (error) {
      console.error('Manage-user check failed:', error);
      return res.status(500).json({ error: 'فشل التحقق من الصلاحية' });
    }
  };
}

// Reject setting a NEW role at or above the caller's own rank (privilege escalation).
function assertAssignableRole(callerRole, newRole) {
  if (String(callerRole).toLowerCase() === 'admin') return true; // admin may assign any role
  if (!newRole) return true;
  return levelOf(newRole) < levelOf(callerRole);
}

module.exports = {
  requireClassAccess,
  requireStudentAccess,
  requireSchoolAccess,
  requireManageableUser,
  assertAssignableRole,
  levelOf,
};
