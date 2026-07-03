const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const {
  STUDENT_AUTO_ACTIVATION_KEY,
  isStudentAutoActivationEnabled,
  setBooleanSetting
} = require('../utils/appSettings');

router.get('/student-activation', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const enabled = await isStudentAutoActivationEnabled();
    res.json({
      auto_activation_enabled: enabled,
      requires_manual_activation: !enabled
    });
  } catch (error) {
    console.error('Error reading student activation setting:', error);
    res.status(500).json({ error: 'فشل في قراءة إعداد تفعيل الطلاب' });
  }
});

router.put('/student-activation', authenticateToken, requireRole(ROLES.ADMINISTRATOR), async (req, res) => {
  try {
    const enabled = Boolean(req.body.auto_activation_enabled);
    const setting = await setBooleanSetting(STUDENT_AUTO_ACTIVATION_KEY, enabled, req.user.id);

    res.json({
      message: enabled
        ? 'تم تفعيل الطلاب الجدد تلقائيا'
        : 'تم إيقاف التفعيل التلقائي للطلاب الجدد',
      auto_activation_enabled: setting.value === true,
      requires_manual_activation: setting.value !== true
    });
  } catch (error) {
    console.error('Error updating student activation setting:', error);
    res.status(500).json({ error: 'فشل في تحديث إعداد تفعيل الطلاب' });
  }
});

module.exports = router;
