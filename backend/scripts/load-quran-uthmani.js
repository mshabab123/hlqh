// Load Quran Uthmani text into Postgres
const https = require('https');
const db = require('../config/database');
require('dotenv').config();

const API_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS quran_surahs (
      id INTEGER PRIMARY KEY,
      name_arabic TEXT NOT NULL,
      name_english TEXT,
      name_english_translation TEXT,
      revelation_type TEXT,
      ayah_count INTEGER NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quran_ayahs (
      id SERIAL PRIMARY KEY,
      surah_number INTEGER NOT NULL REFERENCES quran_surahs(id) ON DELETE CASCADE,
      ayah_number INTEGER NOT NULL,
      text_uthmani TEXT NOT NULL,
      UNIQUE (surah_number, ayah_number)
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_quran_ayahs_surah
    ON quran_ayahs (surah_number, ayah_number);
  `);
}

async function loadQuran() {
  console.log('Fetching Quran data...');
  const data = await fetchJson(API_URL);

  if (!data || !data.data || !Array.isArray(data.data.surahs)) {
    throw new Error('Unexpected API response');
  }

  const surahs = data.data.surahs;

  await ensureSchema();

  console.log(`Loaded ${surahs.length} surahs. Writing to database...`);
  await db.query('BEGIN');
  try {
    for (const surah of surahs) {
      await db.query(
        `
          INSERT INTO quran_surahs
            (id, name_arabic, name_english, name_english_translation, revelation_type, ayah_count)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            name_arabic = EXCLUDED.name_arabic,
            name_english = EXCLUDED.name_english,
            name_english_translation = EXCLUDED.name_english_translation,
            revelation_type = EXCLUDED.revelation_type,
            ayah_count = EXCLUDED.ayah_count
        `,
        [
          surah.number,
          surah.name,
          surah.englishName,
          surah.englishNameTranslation,
          surah.revelationType,
          surah.ayahs.length,
        ]
      );

      for (const ayah of surah.ayahs) {
        await db.query(
          `
            INSERT INTO quran_ayahs (surah_number, ayah_number, text_uthmani)
            VALUES ($1, $2, $3)
            ON CONFLICT (surah_number, ayah_number) DO UPDATE SET
              text_uthmani = EXCLUDED.text_uthmani
          `,
          [surah.number, ayah.numberInSurah, ayah.text]
        );
      }
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }

  console.log('Quran data load complete.');
}

loadQuran()
  .catch((error) => {
    console.error('Failed to load Quran data:', error);
    process.exit(1);
  })
  .finally(() => {
    db.end();
  });
