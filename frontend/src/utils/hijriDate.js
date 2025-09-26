// Hijri date conversion utilities

// Hijri months in Arabic
const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

// Arabic day names
const ARABIC_DAYS = [
  'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
];

// Convert Gregorian date to Hijri using a simple calculation
// Note: This is an approximation. For precise conversion, you'd need a proper Islamic calendar library
export const gregorianToHijri = (gregorianDate) => {
  try {
    // Use Intl.DateTimeFormat with Islamic calendar
    const hijriDateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const hijriParts = hijriDateFormatter.formatToParts(gregorianDate);

    const day = hijriParts.find(part => part.type === 'day')?.value || '';
    const month = hijriParts.find(part => part.type === 'month')?.value || '';
    const year = hijriParts.find(part => part.type === 'year')?.value || '';

    return {
      day: parseInt(day) || 1,
      month: month || HIJRI_MONTHS[0],
      year: parseInt(year) || 1445,
      formatted: `${day} ${month} ${year}هـ`
    };
  } catch (error) {
    // Fallback calculation if Intl.DateTimeFormat fails
    console.warn('Failed to convert to Hijri using Intl API, using fallback:', error);
    return fallbackHijriConversion(gregorianDate);
  }
};

// Fallback Hijri conversion using approximate calculation
const fallbackHijriConversion = (gregorianDate) => {
  // This is a very rough approximation
  // The Islamic calendar started on July 16, 622 CE (Gregorian)
  const islamicEpoch = new Date(622, 6, 16); // July 16, 622
  const gregorianEpoch = new Date(gregorianDate);

  // Calculate days since Islamic epoch
  const daysSinceEpoch = Math.floor((gregorianEpoch - islamicEpoch) / (1000 * 60 * 60 * 24));

  // Islamic year is approximately 354.37 days
  const islamicYear = Math.floor(daysSinceEpoch / 354.37) + 1;
  const remainingDays = daysSinceEpoch % 354.37;

  // Approximate month (Islamic months are about 29.53 days)
  const islamicMonth = Math.floor(remainingDays / 29.53);
  const islamicDay = Math.floor(remainingDays % 29.53) + 1;

  const monthName = HIJRI_MONTHS[islamicMonth % 12];

  return {
    day: Math.max(1, islamicDay),
    month: monthName,
    year: Math.max(1, islamicYear),
    formatted: `${Math.max(1, islamicDay)} ${monthName} ${Math.max(1, islamicYear)}هـ`
  };
};

// Get Arabic day name
export const getArabicDayName = (date) => {
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  return ARABIC_DAYS[dayIndex] || 'غير محدد';
};

// Format date with both Gregorian and Hijri
export const formatDateWithHijri = (date, options = {}) => {
  const gregorianDate = new Date(date);

  // Arabic day name
  const dayName = getArabicDayName(gregorianDate);

  // Gregorian date in Arabic format
  const gregorianFormatted = gregorianDate.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Hijri date
  const hijriDate = gregorianToHijri(gregorianDate);

  // Build formatted string based on options
  const parts = [];

  if (options.includeDayName !== false) {
    parts.push(dayName);
  }

  if (options.includeGregorian !== false) {
    parts.push(gregorianFormatted + 'م');
  }

  if (options.includeHijri !== false) {
    parts.push(hijriDate.formatted);
  }

  return {
    dayName,
    gregorian: gregorianFormatted + 'م',
    hijri: hijriDate.formatted,
    full: parts.join(' - '),
    short: `${dayName} ${gregorianDate.getDate()}/${gregorianDate.getMonth() + 1} - ${hijriDate.day} ${hijriDate.month}`
  };
};

// Get short Hijri date
export const getShortHijriDate = (date) => {
  const hijriDate = gregorianToHijri(new Date(date));
  return `${hijriDate.day}/${hijriDate.month.substring(0, 3)}/${hijriDate.year}هـ`;
};

export default {
  gregorianToHijri,
  getArabicDayName,
  formatDateWithHijri,
  getShortHijriDate,
  HIJRI_MONTHS,
  ARABIC_DAYS
};