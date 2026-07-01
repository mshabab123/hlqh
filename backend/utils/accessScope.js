async function userSchoolMatches(db, tableName, userId, schoolId) {
  const result = await db.query(
    `SELECT 1 FROM ${tableName} WHERE id = $1 AND school_id = $2 LIMIT 1`,
    [userId, schoolId]
  );
  return result.rows.length > 0;
}

async function canAccessSchool(db, user, schoolId) {
  const role = user?.role;
  const userId = user?.id;
  if (!role || !userId || !schoolId) return false;
  if (role === 'admin') return true;
  if (role === 'administrator') return userSchoolMatches(db, 'administrators', userId, schoolId);
  if (role === 'supervisor') return userSchoolMatches(db, 'supervisors', userId, schoolId);
  return false;
}

async function getClassSchoolId(db, classId) {
  const result = await db.query('SELECT school_id FROM classes WHERE id = $1', [classId]);
  return result.rows[0]?.school_id || null;
}

async function canAccessClass(db, user, classId) {
  const role = user?.role;
  const userId = user?.id;
  if (!role || !userId || !classId) return false;
  if (role === 'admin') return true;

  if (role === 'teacher') {
    const result = await db.query(
      `SELECT 1 FROM teacher_class_assignments
       WHERE teacher_id = $1 AND class_id = $2 AND is_active = true
       LIMIT 1`,
      [userId, classId]
    );
    return result.rows.length > 0;
  }

  if (role === 'administrator' || role === 'supervisor') {
    const schoolId = await getClassSchoolId(db, classId);
    return canAccessSchool(db, user, schoolId);
  }

  return false;
}

async function canAccessStudent(db, user, studentId) {
  const role = user?.role;
  const userId = user?.id;
  if (!role || !userId || !studentId) return false;
  if (role === 'admin') return true;
  if ((role === 'student' || role === 'parent_student') && String(userId) === String(studentId)) {
    return true;
  }

  if (role === 'parent' || role === 'parent_student') {
    const result = await db.query(
      `SELECT 1 FROM parent_student_relationships
       WHERE parent_id = $1 AND student_id = $2
       LIMIT 1`,
      [userId, studentId]
    );
    if (result.rows.length > 0) return true;
  }

  if (role === 'teacher') {
    const result = await db.query(
      `SELECT 1
       FROM student_enrollments se
       JOIN teacher_class_assignments tca ON se.class_id = tca.class_id
       WHERE se.student_id = $1
         AND se.status = 'enrolled'
         AND tca.teacher_id = $2
         AND tca.is_active = true
       LIMIT 1`,
      [studentId, userId]
    );
    return result.rows.length > 0;
  }

  if (role === 'administrator' || role === 'supervisor') {
    const tableName = role === 'administrator' ? 'administrators' : 'supervisors';
    const result = await db.query(
      `SELECT 1
       FROM student_enrollments se
       JOIN classes c ON se.class_id = c.id
       JOIN ${tableName} scoped ON c.school_id = scoped.school_id
       WHERE se.student_id = $1
         AND se.status = 'enrolled'
         AND scoped.id = $2
       LIMIT 1`,
      [studentId, userId]
    );
    return result.rows.length > 0;
  }

  return false;
}

async function canAccessCourse(db, user, courseId) {
  const role = user?.role;
  if (!role || !courseId) return false;
  if (role === 'admin') return true;

  const result = await db.query(
    `SELECT COALESCE(sc.school_id, c.school_id) as school_id
     FROM semester_courses sc
     LEFT JOIN classes c ON sc.class_id = c.id
     WHERE sc.id = $1`,
    [courseId]
  );

  const schoolId = result.rows[0]?.school_id;
  return canAccessSchool(db, user, schoolId);
}

module.exports = {
  canAccessSchool,
  canAccessClass,
  canAccessStudent,
  canAccessCourse,
};
