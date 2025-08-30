const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication and admin role
const requireAdmin = [authenticateToken, authorizeRoles('admin')];

// Get all tables in the database
router.get('/tables', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    
    const tableNames = result.rows.map(t => t.tablename);
    res.json({ tables: tableNames });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'فشل في جلب قائمة الجداول' });
  }
});

// Get table data with columns info
router.get('/table/:tableName', requireAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate table name to prevent SQL injection
    const tableExists = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
      [tableName]
    );
    
    if (!tableExists.rows.length) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Get column information
    const columns = await pool.query(
      `SELECT 
        c.column_name as name, 
        c.data_type as type, 
        c.is_nullable as nullable, 
        c.column_default as default,
        CASE 
          WHEN pk.constraint_type = 'PRIMARY KEY' THEN 'PRI'
          ELSE NULL
        END as key
       FROM information_schema.columns c
       LEFT JOIN (
         SELECT tc.table_name, kcu.column_name, tc.constraint_type
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
       ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
       WHERE c.table_schema = 'public' AND c.table_name = $1
       ORDER BY c.ordinal_position`,
      [tableName]
    );
    
    // Build dynamic query for records with search
    let query = `SELECT * FROM "${tableName}"`;
    let countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      // Search in all text columns
      const textColumns = columns.rows.filter(col => 
        ['varchar', 'text', 'char', 'character'].some(type => col.type.includes(type))
      );
      
      if (textColumns.length > 0) {
        const searchConditions = textColumns.map(col => {
          queryParams.push(`%${search}%`);
          return `"${col.name}"::text ILIKE $${paramIndex++}`;
        });
        
        const whereClause = ` WHERE ${searchConditions.join(' OR ')}`;
        query += whereClause;
        countQuery += whereClause;
      }
    }
    
    // Get total count
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);
    
    // Get paginated records
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    const records = await pool.query(query, queryParams);
    
    res.json({
      records: records.rows,
      columns: columns.rows,
      totalRecords,
      totalPages,
      currentPage: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الجدول' });
  }
});

// Add new record to table
router.post('/table/:tableName/record', requireAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    // Validate table exists
    const tableExists = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
      [tableName]
    );
    
    if (!tableExists.rows.length) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Build dynamic INSERT query
    const columns = Object.keys(data).filter(key => data[key] !== undefined && data[key] !== '');
    const values = columns.map(col => data[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    if (columns.length === 0) {
      return res.status(400).json({ error: 'لا توجد بيانات للإضافة' });
    }
    
    const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      message: 'تم إضافة السجل بنجاح',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ error: 'فشل في إضافة السجل: ' + error.message });
  }
});

// Update record in table
router.put('/table/:tableName/record/:id', requireAdmin, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    
    // Validate table exists
    const tableExists = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
      [tableName]
    );
    
    if (!tableExists.rows.length) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Get primary key column
    const primaryKey = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public' 
         AND tc.table_name = $1 
         AND tc.constraint_type = 'PRIMARY KEY'`,
      [tableName]
    );
    
    if (!primaryKey.rows.length) {
      return res.status(400).json({ error: 'لا يمكن تحديد المفتاح الأساسي للجدول' });
    }
    
    const pkColumn = primaryKey.rows[0].column_name;
    
    // Build dynamic UPDATE query
    const columns = Object.keys(data).filter(key => key !== pkColumn && data[key] !== undefined);
    const values = columns.map(col => data[col]);
    const setClause = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
    
    if (columns.length === 0) {
      return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
    }
    
    const query = `UPDATE "${tableName}" SET ${setClause} WHERE "${pkColumn}" = $${columns.length + 1} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'السجل غير موجود' });
    }
    
    res.json({
      success: true,
      message: 'تم تحديث السجل بنجاح'
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'فشل في تحديث السجل: ' + error.message });
  }
});

// Delete record from table
router.delete('/table/:tableName/record/:id', requireAdmin, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    // Validate table exists
    const tableExists = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
      [tableName]
    );
    
    if (!tableExists.rows.length) {
      return res.status(404).json({ error: 'الجدول غير موجود' });
    }
    
    // Get primary key column
    const primaryKey = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public' 
         AND tc.table_name = $1 
         AND tc.constraint_type = 'PRIMARY KEY'`,
      [tableName]
    );
    
    if (!primaryKey.rows.length) {
      return res.status(400).json({ error: 'لا يمكن تحديد المفتاح الأساسي للجدول' });
    }
    
    const pkColumn = primaryKey.rows[0].column_name;
    
    const query = `DELETE FROM "${tableName}" WHERE "${pkColumn}" = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'السجل غير موجود' });
    }
    
    res.json({
      success: true,
      message: 'تم حذف السجل بنجاح'
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    
    // Check for foreign key constraint violations
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'لا يمكن حذف هذا السجل لأنه مرتبط بسجلات أخرى في النظام' 
      });
    }
    
    res.status(500).json({ error: 'فشل في حذف السجل: ' + error.message });
  }
});

module.exports = router;