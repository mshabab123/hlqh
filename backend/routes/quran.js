const express = require('express');
const db = require('../config/database');

const router = express.Router();

const VALID_SOURCES = new Set(['uthmani', 'hafs']);

function getSource(req) {
  const source = (req.query.source || 'hafs').toLowerCase();
  return VALID_SOURCES.has(source) ? source : null;
}

function parseRange(value) {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

router.get('/surahs', async (req, res) => {
  const source = getSource(req);
  if (!source) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  try {
    const result =
      source === 'uthmani'
        ? await db.query(
            `
              SELECT
                id AS number,
                name_arabic,
                name_english,
                name_english_translation,
                revelation_type,
                ayah_count
              FROM quran_surahs
              ORDER BY id
            `
          )
        : await db.query(
            `
              SELECT
                sura_no AS number,
                MIN(sura_name_ar) AS name_arabic,
                MIN(sura_name_en) AS name_english,
                NULL::text AS name_english_translation,
                NULL::text AS revelation_type,
                COUNT(*)::integer AS ayah_count
              FROM hafs_smart_v8
              GROUP BY sura_no
              ORDER BY sura_no
            `
          );
    res.json({ surahs: result.rows });
  } catch (error) {
    console.error('Quran surahs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch surahs' });
  }
});

router.get('/surah/:surahNumber', async (req, res) => {
  const source = getSource(req);
  if (!source) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  const surahNumber = Number(req.params.surahNumber);
  if (!Number.isInteger(surahNumber) || surahNumber < 1) {
    return res.status(400).json({ error: 'Invalid surah number' });
  }

  const fromAyah = parseRange(req.query.from);
  const toAyah = parseRange(req.query.to);
  if (
    (req.query.from !== undefined && fromAyah === null) ||
    (req.query.to !== undefined && toAyah === null) ||
    (fromAyah !== null && toAyah !== null && fromAyah > toAyah)
  ) {
    return res.status(400).json({ error: 'Invalid ayah range' });
  }

  try {
    const surahResult =
      source === 'uthmani'
        ? await db.query(
            `
              SELECT
                id AS number,
                name_arabic,
                name_english,
                name_english_translation,
                revelation_type,
                ayah_count
              FROM quran_surahs
              WHERE id = $1
            `,
            [surahNumber]
          )
        : await db.query(
            `
              SELECT
                sura_no AS number,
                MIN(sura_name_ar) AS name_arabic,
                MIN(sura_name_en) AS name_english,
                NULL::text AS name_english_translation,
                NULL::text AS revelation_type,
                COUNT(*)::integer AS ayah_count
              FROM hafs_smart_v8
              WHERE sura_no = $1
              GROUP BY sura_no
            `,
            [surahNumber]
          );

    if (surahResult.rows.length === 0) {
      return res.status(404).json({ error: 'Surah not found' });
    }

    const rangeClauses = [];
    const rangeParams = [surahNumber];
    if (fromAyah !== null) {
      rangeParams.push(fromAyah);
      rangeClauses.push(
        `${source === 'uthmani' ? 'ayah_number' : 'aya_no'} >= $${
          rangeParams.length
        }`
      );
    }
    if (toAyah !== null) {
      rangeParams.push(toAyah);
      rangeClauses.push(
        `${source === 'uthmani' ? 'ayah_number' : 'aya_no'} <= $${
          rangeParams.length
        }`
      );
    }
    const rangeFilter = rangeClauses.length
      ? `AND ${rangeClauses.join(' AND ')}`
      : '';

    const ayahResult =
      source === 'uthmani'
        ? await db.query(
            `
              SELECT ayah_number, text_uthmani AS text
              FROM quran_ayahs
              WHERE surah_number = $1
              ${rangeFilter}
              ORDER BY ayah_number
            `,
            rangeParams
          )
        : await db.query(
            `
              SELECT aya_no AS ayah_number, aya_text AS text
              FROM hafs_smart_v8
              WHERE sura_no = $1
              ${rangeFilter}
              ORDER BY aya_no
            `,
            rangeParams
          );

    res.json({
      surah: surahResult.rows[0],
      ayahs: ayahResult.rows,
    });
  } catch (error) {
    console.error('Quran surah fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch surah' });
  }
});

router.get('/range', async (req, res) => {
  const source = getSource(req);
  if (!source) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  const fromSurah = parseRange(req.query.fromSurah);
  const toSurah = parseRange(req.query.toSurah);
  const fromAyah = parseRange(req.query.fromAyah);
  const toAyah = parseRange(req.query.toAyah);

  if (fromSurah === null || toSurah === null || fromSurah > toSurah) {
    return res.status(400).json({ error: 'Invalid surah range' });
  }
  if (
    (req.query.fromAyah !== undefined && fromAyah === null) ||
    (req.query.toAyah !== undefined && toAyah === null)
  ) {
    return res.status(400).json({ error: 'Invalid ayah range' });
  }

  const rangeParams = [fromSurah, toSurah];
  const rangeClauses = [];

  if (fromAyah !== null) {
    rangeParams.push(fromAyah);
    rangeClauses.push(
      source === 'uthmani'
        ? `(quran_ayahs.surah_number > $1 OR (quran_ayahs.surah_number = $1 AND quran_ayahs.ayah_number >= $${
            rangeParams.length
          }))`
        : `(sura_no > $1 OR (sura_no = $1 AND aya_no >= $${
            rangeParams.length
          }))`
    );
  }

  if (toAyah !== null) {
    rangeParams.push(toAyah);
    rangeClauses.push(
      source === 'uthmani'
        ? `(quran_ayahs.surah_number < $2 OR (quran_ayahs.surah_number = $2 AND quran_ayahs.ayah_number <= $${
            rangeParams.length
          }))`
        : `(sura_no < $2 OR (sura_no = $2 AND aya_no <= $${
            rangeParams.length
          }))`
    );
  }

  const rangeFilter = rangeClauses.length
    ? `AND ${rangeClauses.join(' AND ')}`
    : '';

  try {
    const ayahResult =
      source === 'uthmani'
        ? await db.query(
            `
              SELECT
                quran_ayahs.surah_number,
                quran_surahs.name_arabic AS surah_name_ar,
                quran_surahs.name_english AS surah_name_en,
                quran_ayahs.ayah_number,
                quran_ayahs.text_uthmani AS text
              FROM quran_ayahs
              JOIN quran_surahs ON quran_surahs.id = quran_ayahs.surah_number
              WHERE quran_ayahs.surah_number BETWEEN $1 AND $2
              ${rangeFilter}
              ORDER BY quran_ayahs.surah_number, quran_ayahs.ayah_number
            `,
            rangeParams
          )
        : await db.query(
            `
              SELECT
                sura_no AS surah_number,
                sura_name_ar AS surah_name_ar,
                sura_name_en AS surah_name_en,
                aya_no AS ayah_number,
                aya_text AS text
              FROM hafs_smart_v8
              WHERE sura_no BETWEEN $1 AND $2
              ${rangeFilter}
              ORDER BY sura_no, aya_no
            `,
            rangeParams
          );

    res.json({ ayahs: ayahResult.rows });
  } catch (error) {
    console.error('Quran range fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ayah range' });
  }
});

module.exports = router;
