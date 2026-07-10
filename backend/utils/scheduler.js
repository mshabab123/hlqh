// Lightweight in-process scheduler (no external cron dependency). Checks once an
// hour whether the periodic student report is due, and runs it at most once per
// day/week — guarded by a DB-stored "last sent" date so restarts can't double-send.

const db = require('../config/database');
const {
  isEmailServiceEnabled,
  isEmailReportsEnabled,
  getEmailReportsFrequency,
  getStringSetting,
  setStringSetting,
  EMAIL_REPORTS_LAST_SENT_KEY,
} = require('./appSettings');
const { runStudentReports } = require('./studentReports');

const HOUR_MS = 60 * 60 * 1000;
// Reports are sent after this local hour of the day (gives the day's data time
// to accumulate). Overridable via env.
const SEND_AFTER_HOUR = parseInt(process.env.EMAIL_REPORTS_HOUR, 10) || 18;

const todayStr = () => new Date().toISOString().split('T')[0];

function weekKey(date = new Date()) {
  // ISO-ish year+week so weekly reports fire once per calendar week.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

async function tick() {
  try {
    if (!(await isEmailServiceEnabled())) return;
    if (!(await isEmailReportsEnabled())) return;
    if (new Date().getHours() < SEND_AFTER_HOUR) return;

    const frequency = await getEmailReportsFrequency();
    const marker = frequency === 'daily' ? todayStr() : weekKey();
    const lastSent = await getStringSetting(EMAIL_REPORTS_LAST_SENT_KEY, '');
    if (lastSent === marker) return; // already sent for this period

    // Claim the period BEFORE sending so a crash mid-run doesn't re-blast.
    await setStringSetting(EMAIL_REPORTS_LAST_SENT_KEY, marker, null);
    const result = await runStudentReports();
    console.log(`[reports] ${frequency} run:`, JSON.stringify(result));
  } catch (error) {
    console.error('[reports] scheduler tick error:', error.message);
  }
}

function startScheduler() {
  // Run soon after boot, then hourly.
  setTimeout(tick, 30 * 1000);
  setInterval(tick, HOUR_MS);
  console.log('[reports] scheduler started (hourly check, send after hour', SEND_AFTER_HOUR + ')');
}

module.exports = { startScheduler };
