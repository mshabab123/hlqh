const db = require('../config/database');

// Central registry of gated functions ("features"). Each row in the
// feature_privileges table controls which roles and/or specific users may use
// the function. The admin platform role can always use everything.
const FEATURES = [
  {
    key: 'assign_student_class',
    label: 'تسكين طالب في حلقة',
    description: 'إضافة طالب إلى حلقة (من بطاقة الطالب أو شاشة الحلقة أو شاشة الفصل الدراسي)',
    defaultRoles: ['admin', 'administrator', 'supervisor', 'teacher'],
  },
  {
    key: 'remove_student_class',
    label: 'إزالة طالب من الحلقة',
    description: 'إزالة الطالب من حلقته وإعادته إلى قائمة بانتظار الحلقة',
    defaultRoles: ['admin', 'administrator', 'supervisor', 'teacher'],
  },
  {
    key: 'register_student_semester',
    label: 'تسجيل طالب في الفصل الدراسي',
    description: 'تسجيل الطالب في فصل دراسي من قبل الموظفين (لا يؤثر على تسجيل ولي الأمر/الطالب الذاتي)',
    defaultRoles: ['admin', 'administrator', 'supervisor'],
  },
  {
    key: 'unregister_student_semester',
    label: 'إزالة تسجيل طالب من الفصل الدراسي',
    description: 'إلغاء تسجيل الطالب في الفصل الدراسي وإزالته من حلقته فيه',
    defaultRoles: ['admin', 'administrator'],
  },
  {
    key: 'copy_semester',
    label: 'نقل الحلقات والطلاب إلى فصل جديد',
    description: 'نسخ حلقات فصل دراسي (مع الطلاب والمعلمين والمقررات) إلى فصل آخر',
    defaultRoles: ['admin', 'administrator'],
  },
  {
    key: 'grant_certificates',
    label: 'منح الشهادات وإلغاؤها',
    description: 'منح شهادات اجتياز الفصل الدراسي للطلاب وإلغاؤها وتعديل درجة النجاح',
    defaultRoles: ['admin', 'administrator'],
  },
  {
    key: 'delete_student',
    label: 'حذف الطالب نهائياً',
    description: 'حذف الطالب وجميع بياناته من قاعدة البيانات (لا يمكن التراجع)',
    defaultRoles: ['admin', 'administrator'],
  },
  {
    key: 'manage_stage_exams',
    label: 'إدارة المرحليات',
    description: 'إضافة الطلاب لقوائم المرحليات وتقييمها (نجح / تحتاج إعادة)',
    defaultRoles: ['admin', 'administrator', 'supervisor', 'teacher'],
  },
];

const ASSIGNABLE_ROLES = ['admin', 'administrator', 'supervisor', 'teacher', 'parent', 'student'];

async function ensureFeaturePrivilegesSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS feature_privileges (
      key varchar(60) PRIMARY KEY,
      label varchar(200) NOT NULL,
      description text,
      allowed_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
      allowed_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const feature of FEATURES) {
    await db.query(
      `INSERT INTO feature_privileges (key, label, description, allowed_roles)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description`,
      [feature.key, feature.label, feature.description, JSON.stringify(feature.defaultRoles)]
    );
  }
}

async function getFeatureRow(key) {
  const result = await db.query(
    'SELECT key, label, description, allowed_roles, allowed_user_ids FROM feature_privileges WHERE key = $1',
    [key]
  );
  if (result.rows.length > 0) return result.rows[0];

  const fallback = FEATURES.find((f) => f.key === key);
  if (!fallback) return null;
  return {
    key: fallback.key,
    label: fallback.label,
    description: fallback.description,
    allowed_roles: fallback.defaultRoles,
    allowed_user_ids: [],
  };
}

async function canUseFeature(user, key) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return true; // platform admin can always act

  const row = await getFeatureRow(key);
  if (!row) return false;

  const roles = Array.isArray(row.allowed_roles) ? row.allowed_roles : [];
  const userIds = Array.isArray(row.allowed_user_ids) ? row.allowed_user_ids : [];
  return roles.includes(role) || userIds.map(String).includes(String(user.id));
}

// Express middleware: block the request unless the user may use the feature.
function requireFeature(key) {
  return async (req, res, next) => {
    try {
      if (await canUseFeature(req.user, key)) return next();
      return res.status(403).json({ error: 'ليس لديك صلاحية استخدام هذه الوظيفة' });
    } catch (error) {
      console.error(`Feature check failed (${key}):`, error);
      return res.status(500).json({ error: 'فشل التحقق من الصلاحية' });
    }
  };
}

module.exports = {
  FEATURES,
  ASSIGNABLE_ROLES,
  ensureFeaturePrivilegesSchema,
  getFeatureRow,
  canUseFeature,
  requireFeature,
};
