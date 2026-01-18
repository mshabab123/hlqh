const fs = require("fs");
const path = require("path");
const readline = require("readline");
const db = require("../config/database");

const SQL_PATH = path.resolve(
  __dirname,
  "../../frontend/src/assets/Quran/hafs_smart_v8.sql"
);

function parseValuesTuple(tupleText) {
  const values = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < tupleText.length; i += 1) {
    const ch = tupleText[i];
    const next = tupleText[i + 1];

    if (ch === "'" && inString && next === "'") {
      current += "'";
      i += 1;
      continue;
    }

    if (ch === "'") {
      inString = !inString;
      continue;
    }

    if (ch === "," && !inString) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    values.push(current.trim());
  }

  return values.map((raw) => {
    if (!raw.length) return null;
    if (raw.toUpperCase() === "NULL") return null;
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    return raw;
  });
}

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hafs_smart_v8 (
      id INTEGER PRIMARY KEY,
      jozz INTEGER NOT NULL,
      sura_no INTEGER NOT NULL,
      sura_name_en TEXT NOT NULL,
      sura_name_ar TEXT NOT NULL,
      page INTEGER NOT NULL,
      line_start INTEGER NOT NULL,
      line_end INTEGER NOT NULL,
      aya_no INTEGER NOT NULL,
      aya_text TEXT NOT NULL,
      aya_text_emlaey TEXT NOT NULL
    );
  `);
}

async function insertBatch(rows) {
  if (!rows.length) return;

  const columns = [
    "id",
    "jozz",
    "sura_no",
    "sura_name_en",
    "sura_name_ar",
    "page",
    "line_start",
    "line_end",
    "aya_no",
    "aya_text",
    "aya_text_emlaey",
  ];

  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const startIndex = rowIndex * columns.length;
    values.push(...row);
    const rowPlaceholders = columns.map(
      (_, colIndex) => `$${startIndex + colIndex + 1}`
    );
    return `(${rowPlaceholders.join(", ")})`;
  });

  const sql = `
    INSERT INTO hafs_smart_v8 (${columns.join(", ")})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO UPDATE SET
      jozz = EXCLUDED.jozz,
      sura_no = EXCLUDED.sura_no,
      sura_name_en = EXCLUDED.sura_name_en,
      sura_name_ar = EXCLUDED.sura_name_ar,
      page = EXCLUDED.page,
      line_start = EXCLUDED.line_start,
      line_end = EXCLUDED.line_end,
      aya_no = EXCLUDED.aya_no,
      aya_text = EXCLUDED.aya_text,
      aya_text_emlaey = EXCLUDED.aya_text_emlaey;
  `;

  await db.query(sql, values);
}

async function loadHafsSmartV8() {
  if (!fs.existsSync(SQL_PATH)) {
    throw new Error(`SQL file not found: ${SQL_PATH}`);
  }

  await ensureSchema();

  const stream = fs.createReadStream(SQL_PATH, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const batchSize = 200;
  const batch = [];
  let buffer = "";
  let inserted = 0;

  for await (const line of rl) {
    if (!line.includes("VALUES")) continue;
    buffer += line.trim();

    if (!buffer.endsWith(");")) continue;

    const match = buffer.match(/VALUES\s*\((.*)\)\s*;$/i);
    buffer = "";
    if (!match) continue;

    const tuple = match[1];
    const values = parseValuesTuple(tuple);
    if (values.length !== 11) continue;

    batch.push(values);
    if (batch.length >= batchSize) {
      await insertBatch(batch.splice(0, batch.length));
      inserted += batchSize;
      console.log(`Inserted ${inserted} rows...`);
    }
  }

  if (batch.length) {
    await insertBatch(batch);
    inserted += batch.length;
  }

  console.log(`Done. Inserted ${inserted} rows.`);
}

loadHafsSmartV8()
  .catch((error) => {
    console.error("Failed to load hafs_smart_v8:", error);
    process.exit(1);
  })
  .finally(() => {
    db.end();
  });
