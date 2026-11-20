import fs from 'fs';
import path from 'path';

/**
 * MES SQL Server 2016 Query & Lock Safety Inspector
 */
export function analyzeQuery(sqlString) {
  const issues = [];
  const normalized = sqlString.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments

  // 1. Check SELECT * on Core Tables
  const selectStarRegex = /SELECT\s+\*\s+FROM\s+([a-zA-Z0-9_]+)/gi;
  let match;
  while ((match = selectStarRegex.exec(normalized)) !== null) {
    const table = match[1].toUpperCase();
    if (['TRANSACTIONS_TABLE', 'ONHAND_TABLE', 'JOB_ORDERS_TABLE', 'PRODUCTION_RECORDS'].includes(table)) {
      issues.push({
        level: 'CRITICAL',
        code: 'UNBOUNDED_SELECT_STAR',
        message: `ตรวจพบ 'SELECT * FROM ${table}' ซึ่งเป็นตารางผลิตขนาดใหญ่ ห้ามใช้ SELECT * เด็ดขาด ให้เลือกเฉพาะ Column ที่จำเป็นและใส่ TOP(N) หรือ OFFSET...FETCH เพื่อป้องกัน Memory Overflow`
      });
    }
  }

  // 2. Check Unbounded Queries (No TOP, No OFFSET...FETCH)
  if (/SELECT\s+/i.test(normalized) && !/TOP\s*\(/i.test(normalized) && !/OFFSET\s+\d+\s+ROWS/i.test(normalized)) {
    if (/FROM\s+(TRANSACTIONS_TABLE|JOB_ORDERS_TABLE|ONHAND_TABLE)/i.test(normalized)) {
      issues.push({
        level: 'HIGH',
        code: 'MISSING_PAGINATION',
        message: `Query บนตารางธุรกรรมไม่มีการจำกัดผลลัพธ์ (ขาด TOP หรือ OFFSET...FETCH) เสี่ยงทำให้ Database ค้างและกระทบไลน์ผลิต`
      });
    }
  }

  // 3. Check NOLOCK Rule
  const hasNoLock = /WITH\s*\(\s*NOLOCK\s*\)/i.test(normalized);
  const isTransaction = /BEGIN\s+TRAN/i.test(normalized) || /UPDATE\s+/i.test(normalized) || /DELETE\s+/i.test(normalized);
  
  if (hasNoLock && isTransaction) {
    issues.push({
      level: 'CRITICAL',
      code: 'NOLOCK_IN_MUTATION',
      message: `ตรวจพบ 'WITH (NOLOCK)' ใน Transaction ที่มีการแก้ไขข้อมูล (UPDATE/DELETE/INSERT) มีความเสี่ยงอ่านข้อมูล Dirty Read หรือข้อมูลเสียหายร้ายแรง`
    });
  }

  // 4. Missing WHERE in UPDATE or DELETE
  const updateWithoutWhere = /UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+[\s\S]+?(?!WHERE)/gi;
  if (/UPDATE\s+[a-zA-Z0-9_]+/i.test(normalized) && !/WHERE\s+/i.test(normalized)) {
    issues.push({
      level: 'BLOCKING',
      code: 'UPDATE_WITHOUT_WHERE',
      message: `ตรวจพบคำสั่ง UPDATE โดยไม่มี WHERE clause! ห้ามรันเด็ดขาด จะทำให้ข้อมูลถูกทับทั้งตาราง`
    });
  }
  if (/DELETE\s+FROM\s+[a-zA-Z0-9_]+/i.test(normalized) && !/WHERE\s+/i.test(normalized)) {
    issues.push({
      level: 'BLOCKING',
      code: 'DELETE_WITHOUT_WHERE',
      message: `ตรวจพบคำสั่ง DELETE โดยไม่มี WHERE clause! ห้ามรันเด็ดขาด จะทำให้ข้อมูลสูญหายทั้งตาราง`
    });
  }

  // 5. Transaction Commit/Rollback check
  if (/BEGIN\s+TRAN/i.test(normalized)) {
    if (!/COMMIT\s+TRAN/i.test(normalized) || !/ROLLBACK\s+TRAN/i.test(normalized)) {
      issues.push({
        level: 'HIGH',
        code: 'IMPROPER_TRANSACTION_BOUNDARY',
        message: `มี BEGIN TRAN แต่ขาดคู่ COMMIT หรือ ROLLBACK ในบล็อก CATCH เสี่ยงทำให้ตารางถูก Lock ค้าง (Orphan Lock)`
      });
    }
  }

  return {
    isSafe: issues.filter(i => i.level === 'BLOCKING' || i.level === 'CRITICAL').length === 0,
    issuesCount: issues.length,
    issues
  };
}

async function main() {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.log('วิธีใช้: node inspector.mjs "<SQL_QUERY>" หรือ node inspector.mjs file <path_to_sql_file>');
    return;
  }

  let sqlToAnalyze = query;
  if (query.startsWith('file ')) {
    const filePath = query.substring(5).trim();
    sqlToAnalyze = fs.readFileSync(filePath, 'utf8');
  }

  console.log('====================================================');
  console.log('🔍 MES SQL Server 2016 Lock & Performance Inspector');
  console.log('====================================================');
  console.log('📝 SQL Query:\n' + sqlToAnalyze.trim());
  console.log('----------------------------------------------------');

  const report = analyzeQuery(sqlToAnalyze);
  if (report.issuesCount === 0) {
    console.log('✅ ผ่านการตรวจสอบ: ไม่พบจุดเสี่ยง Table Lock หรือความผิดพลาดด้าน Performance');
  } else {
    console.log(`⚠️ ตรวจพบข้อควรระวัง ${report.issuesCount} รายการ:`);
    for (const issue of report.issues) {
      const icon = issue.level === 'BLOCKING' ? '🛑' : issue.level === 'CRITICAL' ? '❌' : '⚠️';
      console.log(`\n${icon} [${issue.level}] ${issue.code}`);
      console.log(`   👉 ${issue.message}`);
    }
    console.log('\n----------------------------------------------------');
    console.log(`สรุปความปลอดภัย: ${report.isSafe ? '⚠️ ผ่านแบบมีคำเตือน' : '❌ ไม่ปลอดภัยต่อ Production Database'}`);
  }
  console.log('====================================================');
}

main();
