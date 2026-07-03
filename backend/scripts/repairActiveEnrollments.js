const db = require('../config/database');

async function repairActiveEnrollments() {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const activatedUsers = await client.query(
      `
        UPDATE users u
        SET is_active = true, updated_at = NOW()
        WHERE u.role = 'student'
          AND COALESCE(u.is_active, false) = false
          AND EXISTS (
            SELECT 1
            FROM student_enrollments se
            WHERE se.student_id = u.id
              AND se.status = 'enrolled'
          )
        RETURNING u.id
      `
    );

    const activatedStudents = await client.query(
      `
        UPDATE students s
        SET status = 'active'
        WHERE COALESCE(s.status, '') <> 'active'
          AND EXISTS (
            SELECT 1
            FROM student_enrollments se
            WHERE se.student_id = s.id
              AND se.status = 'enrolled'
          )
        RETURNING s.id
      `
    );

    const updatedRegistrations = await client.query(
      `
        UPDATE semester_registrations sr
        SET class_id = se.class_id,
            status = 'assigned',
            updated_at = NOW()
        FROM student_enrollments se
        JOIN classes c ON c.id = se.class_id
        WHERE sr.student_id = se.student_id
          AND sr.semester_id = c.semester_id
          AND se.status = 'enrolled'
          AND (
            sr.class_id IS NULL
            OR sr.class_id <> se.class_id
            OR sr.status <> 'assigned'
          )
        RETURNING sr.student_id, sr.class_id
      `
    );

    await client.query('COMMIT');

    console.log(JSON.stringify({
      activatedUsers: activatedUsers.rowCount,
      activatedStudents: activatedStudents.rowCount,
      updatedRegistrations: updatedRegistrations.rowCount,
      students: activatedStudents.rows.map((row) => row.id)
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

repairActiveEnrollments();
