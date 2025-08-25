const pool = require('../db');

async function runMigration() {
  try {
    console.log('Starting semester table migration...');
    
    // Add new columns to semesters table
    await pool.query(`
      ALTER TABLE semesters 
      ADD COLUMN IF NOT EXISTS vacation_days JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS weekend_days JSONB DEFAULT '[5, 6]',
      ADD COLUMN IF NOT EXISTS working_days_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_days_count INTEGER DEFAULT 0
    `);
    console.log('✅ Added new columns to semesters table');
    
    // Create semester_attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semester_attendance (
        id SERIAL PRIMARY KEY,
        semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_id VARCHAR(10) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        is_present BOOLEAN NOT NULL DEFAULT false,
        is_explicit BOOLEAN DEFAULT false,
        has_grade BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(semester_id, class_id, student_id, attendance_date)
      )
    `);
    console.log('✅ Created semester_attendance table');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_semester_attendance_semester ON semester_attendance(semester_id);
      CREATE INDEX IF NOT EXISTS idx_semester_attendance_class ON semester_attendance(class_id);
      CREATE INDEX IF NOT EXISTS idx_semester_attendance_student ON semester_attendance(student_id);
      CREATE INDEX IF NOT EXISTS idx_semester_attendance_date ON semester_attendance(attendance_date);
      CREATE INDEX IF NOT EXISTS idx_semester_attendance_composite ON semester_attendance(semester_id, class_id, student_id);
    `);
    console.log('✅ Created indexes for semester_attendance');
    
    // Create function to calculate working days
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_working_days(
        start_date DATE,
        end_date DATE,
        weekend_days JSONB DEFAULT '[5, 6]',
        vacation_days JSONB DEFAULT '[]'
      ) RETURNS INTEGER AS $$
      DECLARE
        curr_date DATE;
        working_days INTEGER := 0;
        total_days INTEGER := 0;
        day_of_week INTEGER;
        vacation_list DATE[];
        is_vacation BOOLEAN;
      BEGIN
        -- Convert vacation_days JSONB to DATE array
        SELECT ARRAY(SELECT (value::text)::date FROM jsonb_array_elements(vacation_days)) INTO vacation_list;
        
        curr_date := start_date;
        
        WHILE curr_date <= end_date LOOP
          total_days := total_days + 1;
          day_of_week := EXTRACT(ISODOW FROM curr_date);
          
          -- Check if current day is not a weekend
          IF NOT (weekend_days ? day_of_week::text) THEN
            -- Check if current day is not a vacation day
            is_vacation := curr_date = ANY(vacation_list);
            
            IF NOT is_vacation THEN
              working_days := working_days + 1;
            END IF;
          END IF;
          
          curr_date := curr_date + INTERVAL '1 day';
        END LOOP;
        
        RETURN working_days;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Created calculate_working_days function');
    
    // Create function to update semester working days
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_semester_working_days(semester_id INTEGER) RETURNS VOID AS $$
      DECLARE
        semester_record RECORD;
        working_days_calc INTEGER;
        total_days_calc INTEGER;
      BEGIN
        SELECT * INTO semester_record FROM semesters WHERE id = semester_id;
        
        IF semester_record.start_date IS NULL OR semester_record.end_date IS NULL THEN
          RETURN;
        END IF;
        
        -- Calculate total days
        total_days_calc := (semester_record.end_date - semester_record.start_date) + 1;
        
        -- Calculate working days
        working_days_calc := calculate_working_days(
          semester_record.start_date,
          semester_record.end_date,
          COALESCE(semester_record.weekend_days, '[5, 6]'),
          COALESCE(semester_record.vacation_days, '[]')
        );
        
        -- Update the semester record
        UPDATE semesters 
        SET 
          working_days_count = working_days_calc,
          total_days_count = total_days_calc
        WHERE id = semester_id;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Created update_semester_working_days function');
    
    // Create trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION trigger_update_working_days() RETURNS TRIGGER AS $$
      BEGIN
        -- Update working days calculation
        PERFORM update_semester_working_days(NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Created trigger function');
    
    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS tr_semester_working_days ON semesters;
      CREATE TRIGGER tr_semester_working_days
        AFTER INSERT OR UPDATE OF start_date, end_date, weekend_days, vacation_days
        ON semesters
        FOR EACH ROW
        EXECUTE FUNCTION trigger_update_working_days()
    `);
    console.log('✅ Created trigger for automatic working days calculation');
    
    // Update existing semesters with default values
    await pool.query(`
      UPDATE semesters 
      SET 
        weekend_days = '[5, 6]',
        vacation_days = '[]'
      WHERE weekend_days IS NULL OR vacation_days IS NULL
    `);
    console.log('✅ Updated existing semesters with default values');
    
    // Recalculate working days for all existing semesters
    const semesters = await pool.query('SELECT id FROM semesters WHERE start_date IS NOT NULL AND end_date IS NOT NULL');
    for (const semester of semesters.rows) {
      await pool.query('SELECT update_semester_working_days($1)', [semester.id]);
    }
    console.log(`✅ Recalculated working days for ${semesters.rows.length} existing semesters`);
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();