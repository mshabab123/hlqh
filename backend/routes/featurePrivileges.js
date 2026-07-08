const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  FEATURES,
  ASSIGNABLE_ROLES,
  canUseFeature,
} = require('../utils/featurePrivileges');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (String(req.user?.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'هذه الصلاحية متاحة لمدير المنصة فقط' });
  }
  next();
}

// Feature map for the logged-in user: { key: true/false }. Used by the
// frontend to show/hide action buttons.
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const map = {};
    for (const feature of FEATURES) {
      map[feature.key] = await canUseFeature(req.user, feature.key);
    }
    res.json({ features: map });
  } catch (error) {
    console.error('Error building feature map:', error);
    res.status(500).json({ error: 'فشل تحميل الصلاحيات' });
  }
});

// Full table (admin/administrator can view; only admin can edit).
router.get('/', authenticateToken, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'administrator'].includes(role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية لعرض هذه الصفحة' });
    }

    const result = await db.query(
      'SELECT key, label, description, allowed_roles, allowed_user_ids, updated_at FROM feature_privileges'
    );
    const byKey = new Map(result.rows.map((row) => [row.key, row]));

    // Keep the registry order, and resolve specific user ids to names for display.
    const features = FEATURES.map((feature) => {
      const row = byKey.get(feature.key);
      return {
        key: feature.key,
        label: feature.label,
        description: feature.description,
        allowed_roles: row ? row.allowed_roles : feature.defaultRoles,
        allowed_user_ids: row ? row.allowed_user_ids : [],
        updated_at: row ? row.updated_at : null,
      };
    });

    const allUserIds = [...new Set(features.flatMap((f) => (f.allowed_user_ids || []).map(String)))];
    let userNames = {};
    if (allUserIds.length > 0) {
      const users = await db.query(
        `SELECT id, CONCAT_WS(' ', first_name, second_name, third_name, last_name) as name, role
         FROM users WHERE id = ANY($1::varchar[])`,
        [allUserIds]
      );
      userNames = Object.fromEntries(users.rows.map((u) => [String(u.id), { name: u.name, role: u.role }]));
    }

    res.json({ features, users: userNames, assignable_roles: ASSIGNABLE_ROLES });
  } catch (error) {
    console.error('Error listing feature privileges:', error);
    res.status(500).json({ error: 'فشل تحميل جدول الصلاحيات' });
  }
});

// Update one feature's roles / specific users (admin only).
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const feature = FEATURES.find((f) => f.key === key);
    if (!feature) {
      return res.status(404).json({ error: 'الوظيفة غير موجودة' });
    }

    let { allowed_roles = [], allowed_user_ids = [] } = req.body;
    if (!Array.isArray(allowed_roles) || !Array.isArray(allowed_user_ids)) {
      return res.status(400).json({ error: 'صيغة الصلاحيات غير صحيحة' });
    }

    allowed_roles = [...new Set(allowed_roles.map((r) => String(r).toLowerCase()))]
      .filter((r) => ASSIGNABLE_ROLES.includes(r));
    // The platform admin is always allowed; keep it explicit in the stored list.
    if (!allowed_roles.includes('admin')) allowed_roles.unshift('admin');

    allowed_user_ids = [...new Set(allowed_user_ids.map((id) => String(id).trim()).filter(Boolean))];

    // Only keep user ids that actually exist, so typos are surfaced.
    let validUserIds = [];
    if (allowed_user_ids.length > 0) {
      const found = await db.query('SELECT id FROM users WHERE id = ANY($1::varchar[])', [allowed_user_ids]);
      validUserIds = found.rows.map((r) => String(r.id));
    }
    const unknownIds = allowed_user_ids.filter((id) => !validUserIds.includes(id));

    const result = await db.query(
      `INSERT INTO feature_privileges (key, label, description, allowed_roles, allowed_user_ids, updated_by, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
       ON CONFLICT (key)
       DO UPDATE SET allowed_roles = $4::jsonb,
                     allowed_user_ids = $5::jsonb,
                     updated_by = $6,
                     updated_at = NOW()
       RETURNING key, label, description, allowed_roles, allowed_user_ids, updated_at`,
      [key, feature.label, feature.description, JSON.stringify(allowed_roles), JSON.stringify(validUserIds), req.user.id]
    );

    res.json({
      message: 'تم تحديث الصلاحية بنجاح',
      feature: result.rows[0],
      unknown_user_ids: unknownIds,
    });
  } catch (error) {
    console.error('Error updating feature privilege:', error);
    res.status(500).json({ error: 'فشل تحديث الصلاحية' });
  }
});

module.exports = router;
