const db = require('./database');

async function ensureAuthSchema() {
  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lockout_until timestamptz
  `);
}

async function ensureSemesterRegistrationSchema() {
  await db.query(`
    ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS can_assign_registered_students boolean NOT NULL DEFAULT true
  `);

  await db.query(`
    ALTER TABLE semesters
      ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT false
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS semester_registrations (
      id serial PRIMARY KEY,
      semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      student_id varchar(20) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      registered_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
      status varchar(20) NOT NULL DEFAULT 'registered',
      created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (semester_id, student_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_semester_registrations_semester
      ON semester_registrations(semester_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_semester_registrations_student
      ON semester_registrations(student_id)
  `);
}

async function ensureParentChildRequestSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS parent_child_link_requests (
      id serial PRIMARY KEY,
      parent_id varchar(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id varchar(20) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relationship_type varchar(30) NOT NULL DEFAULT 'parent',
      status varchar(20) NOT NULL DEFAULT 'pending',
      requested_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      review_notes text,
      created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      reviewed_at timestamp without time zone,
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_child_link_requests_status
      ON parent_child_link_requests(status, created_at DESC)
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_child_link_requests_pending_unique
      ON parent_child_link_requests(parent_id, student_id)
      WHERE status = 'pending'
  `);
}

async function ensureAppSettingsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key varchar(100) PRIMARY KEY,
      value jsonb NOT NULL,
      updated_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    INSERT INTO app_settings (key, value)
    VALUES ('student_auto_activation_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);
}

async function ensureCertificatesSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_certificates (
      id serial PRIMARY KEY,
      semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      student_id varchar(20) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
      school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
      certificate_number varchar(80) NOT NULL UNIQUE,
      status varchar(20) NOT NULL DEFAULT 'issued',
      average_grade numeric(5,2) NOT NULL DEFAULT 0,
      total_grade numeric(7,2),
      grade_count integer NOT NULL DEFAULT 0,
      issued_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      issued_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      revoked_by varchar(20) REFERENCES users(id) ON DELETE SET NULL,
      revoked_at timestamp without time zone,
      revoke_reason text,
      notes text,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (semester_id, student_id),
      CHECK (status IN ('issued', 'revoked'))
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_certificates_semester_status
      ON student_certificates(semester_id, status)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_certificates_student
      ON student_certificates(student_id)
  `);
}

async function ensureSchema() {
  await ensureAuthSchema();
  await ensureSemesterRegistrationSchema();
  await ensureParentChildRequestSchema();
  await ensureAppSettingsSchema();
  await ensureCertificatesSchema();
}

module.exports = {
  ensureAuthSchema,
  ensureSemesterRegistrationSchema,
  ensureParentChildRequestSchema,
  ensureAppSettingsSchema,
  ensureCertificatesSchema,
  ensureSchema,
};
