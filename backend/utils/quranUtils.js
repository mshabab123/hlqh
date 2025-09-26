// Backend Quran utilities - CommonJS format
const QURAN_SURAHS = [
  { id: 1, name: "الفاتحة", ayahCount: 7, startPage: 1, endPage: 1, totalPages: 1 },
  { id: 2, name: "الناس", ayahCount: 6, startPage: 604, endPage: 604, totalPages: 1 },
  { id: 3, name: "الفلق", ayahCount: 5, startPage: 604, endPage: 604, totalPages: 1 },
  { id: 4, name: "الإخلاص", ayahCount: 4, startPage: 604, endPage: 604, totalPages: 1 },
  { id: 5, name: "المسد", ayahCount: 5, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 6, name: "النصر", ayahCount: 3, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 7, name: "الكافرون", ayahCount: 6, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 8, name: "الكوثر", ayahCount: 3, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 9, name: "الماعون", ayahCount: 7, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 10, name: "قريش", ayahCount: 4, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 11, name: "الفيل", ayahCount: 5, startPage: 601, endPage: 602, totalPages: 1 },
  { id: 12, name: "الهمزة", ayahCount: 9, startPage: 601, endPage: 601, totalPages: 1 },
  { id: 13, name: "العصر", ayahCount: 3, startPage: 601, endPage: 601, totalPages: 1 },
  { id: 14, name: "التكاثر", ayahCount: 8, startPage: 600, endPage: 601, totalPages: 1 },
  { id: 15, name: "القارعة", ayahCount: 11, startPage: 600, endPage: 600, totalPages: 1 },
  { id: 16, name: "العاديات", ayahCount: 11, startPage: 599, endPage: 600, totalPages: 1 },
  { id: 17, name: "الزلزلة", ayahCount: 8, startPage: 599, endPage: 599, totalPages: 1 },
  { id: 18, name: "البينة", ayahCount: 8, startPage: 598, endPage: 599, totalPages: 1 },
  { id: 19, name: "القدر", ayahCount: 5, startPage: 598, endPage: 598, totalPages: 1 },
  { id: 20, name: "العلق", ayahCount: 19, startPage: 597, endPage: 597, totalPages: 1 },
  { id: 21, name: "التين", ayahCount: 8, startPage: 597, endPage: 597, totalPages: 1 },
  { id: 22, name: "الشرح", ayahCount: 8, startPage: 596, endPage: 596, totalPages: 1 },
  { id: 23, name: "الضحى", ayahCount: 11, startPage: 596, endPage: 596, totalPages: 1 },
  { id: 24, name: "الليل", ayahCount: 21, startPage: 595, endPage: 596, totalPages: 1 },
  { id: 25, name: "الشمس", ayahCount: 15, startPage: 595, endPage: 595, totalPages: 1 },
  { id: 26, name: "البلد", ayahCount: 20, startPage: 594, endPage: 594, totalPages: 1 },
  { id: 27, name: "الفجر", ayahCount: 30, startPage: 593, endPage: 594, totalPages: 2 },
  { id: 28, name: "الغاشية", ayahCount: 26, startPage: 592, endPage: 592, totalPages: 1 },
  { id: 29, name: "الأعلى", ayahCount: 19, startPage: 591, endPage: 592, totalPages: 1 },
  { id: 30, name: "الطارق", ayahCount: 17, startPage: 591, endPage: 591, totalPages: 1 },
  { id: 31, name: "البروج", ayahCount: 22, startPage: 590, endPage: 590, totalPages: 1 },
  { id: 32, name: "الانشقاق", ayahCount: 25, startPage: 589, endPage: 590, totalPages: 1 },
  { id: 33, name: "المطففين", ayahCount: 36, startPage: 587, endPage: 589, totalPages: 2 },
  { id: 34, name: "الانفطار", ayahCount: 19, startPage: 587, endPage: 587, totalPages: 1 },
  { id: 35, name: "التكوير", ayahCount: 29, startPage: 586, endPage: 587, totalPages: 1 },
  { id: 36, name: "عبس", ayahCount: 42, startPage: 585, endPage: 586, totalPages: 1 },
  { id: 37, name: "النازعات", ayahCount: 46, startPage: 583, endPage: 585, totalPages: 2 },
  { id: 38, name: "النبأ", ayahCount: 40, startPage: 582, endPage: 583, totalPages: 1 },
  { id: 39, name: "المرسلات", ayahCount: 50, startPage: 580, endPage: 582, totalPages: 2 },
  { id: 40, name: "الإنسان", ayahCount: 31, startPage: 578, endPage: 580, totalPages: 2 },
  { id: 41, name: "القيامة", ayahCount: 40, startPage: 577, endPage: 578, totalPages: 1 },
  { id: 42, name: "المدثر", ayahCount: 56, startPage: 575, endPage: 577, totalPages: 2 },
  { id: 43, name: "المزمل", ayahCount: 20, startPage: 574, endPage: 575, totalPages: 1 },
  { id: 44, name: "الجن", ayahCount: 28, startPage: 572, endPage: 574, totalPages: 2 },
  { id: 45, name: "نوح", ayahCount: 28, startPage: 570, endPage: 573, totalPages: 3 },
  { id: 46, name: "المعارج", ayahCount: 44, startPage: 568, endPage: 570, totalPages: 2 },
  { id: 47, name: "الحاقة", ayahCount: 52, startPage: 566, endPage: 568, totalPages: 2 },
  { id: 48, name: "القلم", ayahCount: 52, startPage: 564, endPage: 566, totalPages: 2 },
  { id: 49, name: "الملك", ayahCount: 30, startPage: 562, endPage: 564, totalPages: 2 },
  { id: 50, name: "التحريم", ayahCount: 12, startPage: 560, endPage: 562, totalPages: 2 },
  { id: 51, name: "الطلاق", ayahCount: 12, startPage: 558, endPage: 560, totalPages: 2 },
  { id: 52, name: "التغابن", ayahCount: 18, startPage: 556, endPage: 558, totalPages: 2 },
  { id: 53, name: "المنافقون", ayahCount: 11, startPage: 554, endPage: 556, totalPages: 2 },
  { id: 54, name: "الجمعة", ayahCount: 11, startPage: 553, endPage: 554, totalPages: 1 },
  { id: 55, name: "الصف", ayahCount: 14, startPage: 551, endPage: 553, totalPages: 2 },
  { id: 56, name: "الممتحنة", ayahCount: 13, startPage: 549, endPage: 551, totalPages: 2 },
  { id: 57, name: "الحشر", ayahCount: 24, startPage: 545, endPage: 549, totalPages: 4 },
  { id: 58, name: "المجادلة", ayahCount: 22, startPage: 542, endPage: 545, totalPages: 3 },
  { id: 59, name: "الحديد", ayahCount: 29, startPage: 537, endPage: 542, totalPages: 5 },
  { id: 60, name: "الواقعة", ayahCount: 96, startPage: 534, endPage: 537, totalPages: 3 },
  { id: 61, name: "الرحمن", ayahCount: 78, startPage: 531, endPage: 534, totalPages: 3 },
  { id: 62, name: "القمر", ayahCount: 55, startPage: 528, endPage: 531, totalPages: 3 },
  { id: 63, name: "النجم", ayahCount: 62, startPage: 526, endPage: 528, totalPages: 2 },
  { id: 64, name: "الطور", ayahCount: 49, startPage: 523, endPage: 526, totalPages: 3 },
  { id: 65, name: "الذاريات", ayahCount: 60, startPage: 520, endPage: 523, totalPages: 3 },
  { id: 66, name: "ق", ayahCount: 45, startPage: 518, endPage: 520, totalPages: 2 },
  { id: 67, name: "الحجرات", ayahCount: 18, startPage: 515, endPage: 518, totalPages: 3 },
  { id: 68, name: "الفتح", ayahCount: 29, startPage: 511, endPage: 515, totalPages: 4 },
  { id: 69, name: "محمد", ayahCount: 38, startPage: 507, endPage: 511, totalPages: 4 },
  { id: 70, name: "الأحقاف", ayahCount: 35, startPage: 502, endPage: 507, totalPages: 5 },
  { id: 71, name: "الجاثية", ayahCount: 37, startPage: 499, endPage: 502, totalPages: 3 },
  { id: 72, name: "الدخان", ayahCount: 59, startPage: 496, endPage: 499, totalPages: 3 },
  { id: 73, name: "الزخرف", ayahCount: 89, startPage: 489, endPage: 496, totalPages: 7 },
  { id: 74, name: "الشورى", ayahCount: 53, startPage: 483, endPage: 489, totalPages: 6 },
  { id: 75, name: "فصلت", ayahCount: 54, startPage: 477, endPage: 483, totalPages: 6 },
  { id: 76, name: "غافر", ayahCount: 85, startPage: 467, endPage: 477, totalPages: 10 },
  { id: 77, name: "الزمر", ayahCount: 75, startPage: 458, endPage: 467, totalPages: 9 },
  { id: 78, name: "ص", ayahCount: 88, startPage: 453, endPage: 458, totalPages: 5 },
  { id: 79, name: "الصافات", ayahCount: 182, startPage: 446, endPage: 453, totalPages: 7 },
  { id: 80, name: "يس", ayahCount: 83, startPage: 440, endPage: 446, totalPages: 6 },
  { id: 81, name: "فاطر", ayahCount: 45, startPage: 434, endPage: 440, totalPages: 6 },
  { id: 82, name: "سبأ", ayahCount: 54, startPage: 428, endPage: 434, totalPages: 6 },
  { id: 83, name: "الأحزاب", ayahCount: 73, startPage: 418, endPage: 428, totalPages: 10 },
  { id: 84, name: "السجدة", ayahCount: 30, startPage: 415, endPage: 418, totalPages: 3 },
  { id: 85, name: "لقمان", ayahCount: 34, startPage: 411, endPage: 415, totalPages: 4 },
  { id: 86, name: "الروم", ayahCount: 60, startPage: 404, endPage: 411, totalPages: 7 },
  { id: 87, name: "العنكبوت", ayahCount: 69, startPage: 396, endPage: 404, totalPages: 8 },
  { id: 88, name: "القصص", ayahCount: 88, startPage: 385, endPage: 396, totalPages: 11 },
  { id: 89, name: "النمل", ayahCount: 93, startPage: 377, endPage: 385, totalPages: 8 },
  { id: 90, name: "الشعراء", ayahCount: 227, startPage: 367, endPage: 377, totalPages: 10 },
  { id: 91, name: "الفرقان", ayahCount: 77, startPage: 359, endPage: 367, totalPages: 8 },
  { id: 92, name: "النور", ayahCount: 64, startPage: 350, endPage: 359, totalPages: 9 },
  { id: 93, name: "المؤمنون", ayahCount: 118, startPage: 342, endPage: 350, totalPages: 8 },
  { id: 94, name: "الحج", ayahCount: 78, startPage: 332, endPage: 342, totalPages: 10 },
  { id: 95, name: "الأنبياء", ayahCount: 112, startPage: 322, endPage: 332, totalPages: 10 },
  { id: 96, name: "طه", ayahCount: 135, startPage: 312, endPage: 322, totalPages: 10 },
  { id: 97, name: "مريم", ayahCount: 98, startPage: 305, endPage: 312, totalPages: 7 },
  { id: 98, name: "الكهف", ayahCount: 110, startPage: 293, endPage: 305, totalPages: 12 },
  { id: 99, name: "الإسراء", ayahCount: 111, startPage: 282, endPage: 293, totalPages: 11 },
  { id: 100, name: "النحل", ayahCount: 128, startPage: 267, endPage: 282, totalPages: 15 },
  { id: 101, name: "الحجر", ayahCount: 99, startPage: 262, endPage: 267, totalPages: 5 },
  { id: 102, name: "إبراهيم", ayahCount: 52, startPage: 255, endPage: 262, totalPages: 7 },
  { id: 103, name: "الرعد", ayahCount: 43, startPage: 249, endPage: 255, totalPages: 6 },
  { id: 104, name: "يوسف", ayahCount: 111, startPage: 235, endPage: 249, totalPages: 14 },
  { id: 105, name: "هود", ayahCount: 123, startPage: 221, endPage: 235, totalPages: 14 },
  { id: 106, name: "يونس", ayahCount: 109, startPage: 208, endPage: 221, totalPages: 13 },
  { id: 107, name: "التوبة", ayahCount: 129, startPage: 187, endPage: 208, totalPages: 21 },
  { id: 108, name: "الأنفال", ayahCount: 75, startPage: 176, endPage: 187, totalPages: 11 },
  { id: 109, name: "الأعراف", ayahCount: 206, startPage: 151, endPage: 176, totalPages: 25 },
  { id: 110, name: "الأنعام", ayahCount: 165, startPage: 128, endPage: 151, totalPages: 23 },
  { id: 111, name: "المائدة", ayahCount: 120, startPage: 106, endPage: 128, totalPages: 22 },
  { id: 112, name: "النساء", ayahCount: 176, startPage: 77, endPage: 106, totalPages: 29 },
  { id: 113, name: "آل عمران", ayahCount: 200, startPage: 50, endPage: 77, totalPages: 27 },
  { id: 114, name: "البقرة", ayahCount: 286, startPage: 2, endPage: 50, totalPages: 48 }
];

const TOTAL_QURAN_PAGES = 604;

// Helper function to calculate pages for a given ayah position within a surah
const calculatePagesForAyah = (surahId, ayahNumber) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return 0;

  // If memorizing the complete surah
  if (ayahNumber >= surah.ayahCount) {
    return surah.totalPages;
  }

  // Calculate precise pages based on ayah progress within the surah
  const ayahProgress = ayahNumber / surah.ayahCount;
  return Math.ceil(ayahProgress * surah.totalPages);
};

// Helper function to get memorization position (1-114) from surah ID
const getMemorizationPosition = (surahId) => {
  const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
  return index !== -1 ? index + 1 : 0;
};

// Helper function to get surah ID from memorization position
const getSurahIdFromPosition = (position) => {
  if (position < 1 || position > QURAN_SURAHS.length) return 0;
  return QURAN_SURAHS[position - 1].id;
};

// Helper function for Qur'an progress calculation (using memorization order: الفاتحة 1→الناس 2→الفلق 3...)
const calculateQuranProgress = (memorizedSurahId, memorizedAyahNumber) => {
  if (!memorizedSurahId || !memorizedAyahNumber) {
    return {
      totalAyahs: 0,
      memorizedAyahs: 0,
      percentage: 0,
      completedSurahs: 0,
      totalPages: 0,
      memorizedPages: 0,
      pagesPercentage: 0
    };
  }

  const currentSurah = QURAN_SURAHS.find(s => s.id == memorizedSurahId);
  if (!currentSurah) return {
    totalAyahs: 0,
    memorizedAyahs: 0,
    percentage: 0,
    completedSurahs: 0,
    totalPages: 0,
    memorizedPages: 0,
    pagesPercentage: 0
  };

  // Calculate total ayahs and pages in Qur'an
  const totalAyahs = QURAN_SURAHS.reduce((sum, surah) => sum + surah.ayahCount, 0);
  const totalPages = TOTAL_QURAN_PAGES;

  // Get memorization position (الفاتحة=1, الناس=2, الفلق=3, etc.)
  const currentPosition = getMemorizationPosition(memorizedSurahId);

  // Calculate memorized ayahs and pages (from position 1 up to current position)
  let memorizedAyahs = 0;
  let memorizedPages = 0;

  // Add all ayahs and pages from completed surahs (from position 1 to current position - 1)
  for (let pos = 1; pos < currentPosition; pos++) {
    const surahId = getSurahIdFromPosition(pos);
    const surah = QURAN_SURAHS.find(s => s.id === surahId);
    if (surah) {
      memorizedAyahs += surah.ayahCount;
      memorizedPages += surah.totalPages;
    }
  }

  // Add ayahs and pages from current surah
  const currentAyahs = parseInt(memorizedAyahNumber) || 0;
  memorizedAyahs += currentAyahs;
  memorizedPages += calculatePagesForAyah(memorizedSurahId, currentAyahs);

  const percentage = parseFloat(((memorizedAyahs / totalAyahs) * 100).toFixed(1));
  const pagesPercentage = parseFloat(((memorizedPages / totalPages) * 100).toFixed(1));

  // Count completed surahs (memorization positions completed)
  let completedSurahs = currentPosition - 1; // Positions before current
  if (memorizedAyahNumber == currentSurah.ayahCount) {
    completedSurahs += 1; // Current surah is also complete
  }

  return {
    totalAyahs,
    memorizedAyahs,
    percentage,
    completedSurahs,
    currentSurah,
    remainingAyahs: totalAyahs - memorizedAyahs,
    totalPages,
    memorizedPages,
    pagesPercentage,
    remainingPages: totalPages - memorizedPages
  };
};

// Get surah name by ID
const getSurahNameFromId = (surahId) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  return surah ? surah.name : '';
};

// Get surah ID by name
const getSurahIdFromName = (surahName) => {
  const surah = QURAN_SURAHS.find(s => s.name === surahName);
  return surah ? surah.id : 0;
};

module.exports = {
  QURAN_SURAHS,
  TOTAL_QURAN_PAGES,
  getSurahIdFromName,
  getSurahNameFromId,
  calculatePagesForAyah,
  getMemorizationPosition,
  getSurahIdFromPosition,
  calculateQuranProgress
};