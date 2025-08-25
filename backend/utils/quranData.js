// Qur'an Surahs with their ayah counts and page information - reusable data component
const QURAN_SURAHS = [
  { id: 1, name: "الفاتحة", ayahCount: 7, startPage: 1, endPage: 1, totalPages: 1 },
  { id: 2, name: "البقرة", ayahCount: 286, startPage: 2, endPage: 49, totalPages: 48 },
  { id: 3, name: "آل عمران", ayahCount: 200, startPage: 50, endPage: 76, totalPages: 27 },
  { id: 4, name: "النساء", ayahCount: 176, startPage: 77, endPage: 106, totalPages: 30 },
  { id: 5, name: "المائدة", ayahCount: 120, startPage: 106, endPage: 128, totalPages: 22 },
  { id: 6, name: "الأنعام", ayahCount: 165, startPage: 128, endPage: 151, totalPages: 23 },
  { id: 7, name: "الأعراف", ayahCount: 206, startPage: 151, endPage: 177, totalPages: 26 },
  { id: 8, name: "الأنفال", ayahCount: 75, startPage: 177, endPage: 187, totalPages: 10 },
  { id: 9, name: "التوبة", ayahCount: 129, startPage: 187, endPage: 207, totalPages: 20 },
  { id: 10, name: "يونس", ayahCount: 109, startPage: 208, endPage: 221, totalPages: 13 },
  { id: 11, name: "هود", ayahCount: 123, startPage: 221, endPage: 235, totalPages: 14 },
  { id: 12, name: "يوسف", ayahCount: 111, startPage: 235, endPage: 249, totalPages: 14 },
  { id: 13, name: "الرعد", ayahCount: 43, startPage: 249, endPage: 255, totalPages: 6 },
  { id: 14, name: "إبراهيم", ayahCount: 52, startPage: 255, endPage: 261, totalPages: 6 },
  { id: 15, name: "الحجر", ayahCount: 99, startPage: 262, endPage: 267, totalPages: 5 },
  { id: 16, name: "النحل", ayahCount: 128, startPage: 267, endPage: 281, totalPages: 14 },
  { id: 17, name: "الإسراء", ayahCount: 111, startPage: 282, endPage: 293, totalPages: 11 },
  { id: 18, name: "الكهف", ayahCount: 110, startPage: 293, endPage: 304, totalPages: 11 },
  { id: 19, name: "مريم", ayahCount: 98, startPage: 305, endPage: 312, totalPages: 7 },
  { id: 20, name: "طه", ayahCount: 135, startPage: 312, endPage: 322, totalPages: 10 },
  { id: 21, name: "الأنبياء", ayahCount: 112, startPage: 322, endPage: 332, totalPages: 10 },
  { id: 22, name: "الحج", ayahCount: 78, startPage: 332, endPage: 341, totalPages: 9 },
  { id: 23, name: "المؤمنون", ayahCount: 118, startPage: 342, endPage: 350, totalPages: 8 },
  { id: 24, name: "النور", ayahCount: 64, startPage: 350, endPage: 359, totalPages: 9 },
  { id: 25, name: "الفرقان", ayahCount: 77, startPage: 359, endPage: 367, totalPages: 8 },
  { id: 26, name: "الشعراء", ayahCount: 227, startPage: 367, endPage: 377, totalPages: 10 },
  { id: 27, name: "النمل", ayahCount: 93, startPage: 377, endPage: 385, totalPages: 8 },
  { id: 28, name: "القصص", ayahCount: 88, startPage: 385, endPage: 396, totalPages: 11 },
  { id: 29, name: "العنكبوت", ayahCount: 69, startPage: 396, endPage: 404, totalPages: 8 },
  { id: 30, name: "الروم", ayahCount: 60, startPage: 404, endPage: 411, totalPages: 7 },
  { id: 31, name: "لقمان", ayahCount: 34, startPage: 411, endPage: 414, totalPages: 3 },
  { id: 32, name: "السجدة", ayahCount: 30, startPage: 415, endPage: 418, totalPages: 3 },
  { id: 33, name: "الأحزاب", ayahCount: 73, startPage: 418, endPage: 427, totalPages: 9 },
  { id: 34, name: "سبأ", ayahCount: 54, startPage: 428, endPage: 434, totalPages: 6 },
  { id: 35, name: "فاطر", ayahCount: 45, startPage: 434, endPage: 440, totalPages: 6 },
  { id: 36, name: "يس", ayahCount: 83, startPage: 440, endPage: 446, totalPages: 6 },
  { id: 37, name: "الصافات", ayahCount: 182, startPage: 446, endPage: 453, totalPages: 7 },
  { id: 38, name: "ص", ayahCount: 88, startPage: 453, endPage: 458, totalPages: 5 },
  { id: 39, name: "الزمر", ayahCount: 75, startPage: 458, endPage: 467, totalPages: 9 },
  { id: 40, name: "غافر", ayahCount: 85, startPage: 467, endPage: 477, totalPages: 10 },
  { id: 41, name: "فصلت", ayahCount: 54, startPage: 477, endPage: 482, totalPages: 5 },
  { id: 42, name: "الشورى", ayahCount: 53, startPage: 483, endPage: 489, totalPages: 6 },
  { id: 43, name: "الزخرف", ayahCount: 89, startPage: 489, endPage: 496, totalPages: 7 },
  { id: 44, name: "الدخان", ayahCount: 59, startPage: 496, endPage: 499, totalPages: 3 },
  { id: 45, name: "الجاثية", ayahCount: 37, startPage: 499, endPage: 502, totalPages: 3 },
  { id: 46, name: "الأحقاف", ayahCount: 35, startPage: 502, endPage: 507, totalPages: 5 },
  { id: 47, name: "محمد", ayahCount: 38, startPage: 507, endPage: 511, totalPages: 4 },
  { id: 48, name: "الفتح", ayahCount: 29, startPage: 511, endPage: 515, totalPages: 4 },
  { id: 49, name: "الحجرات", ayahCount: 18, startPage: 515, endPage: 518, totalPages: 3 },
  { id: 50, name: "ق", ayahCount: 45, startPage: 518, endPage: 523, totalPages: 5 },
  { id: 51, name: "الذاريات", ayahCount: 60, startPage: 523, endPage: 528, totalPages: 5 },
  { id: 52, name: "الطور", ayahCount: 49, startPage: 523, endPage: 528, totalPages: 5 },
  { id: 53, name: "النجم", ayahCount: 62, startPage: 526, endPage: 529, totalPages: 3 },
  { id: 54, name: "القمر", ayahCount: 55, startPage: 528, endPage: 533, totalPages: 5 },
  { id: 55, name: "الرحمن", ayahCount: 78, startPage: 531, endPage: 534, totalPages: 3 },
  { id: 56, name: "الواقعة", ayahCount: 96, startPage: 534, endPage: 537, totalPages: 3 },
  { id: 57, name: "الحديد", ayahCount: 29, startPage: 537, endPage: 542, totalPages: 5 },
  { id: 58, name: "المجادلة", ayahCount: 22, startPage: 542, endPage: 545, totalPages: 3 },
  { id: 59, name: "الحشر", ayahCount: 24, startPage: 545, endPage: 549, totalPages: 4 },
  { id: 60, name: "الممتحنة", ayahCount: 13, startPage: 549, endPage: 551, totalPages: 2 },
  { id: 61, name: "الصف", ayahCount: 14, startPage: 551, endPage: 553, totalPages: 2 },
  { id: 62, name: "الجمعة", ayahCount: 11, startPage: 553, endPage: 554, totalPages: 1 },
  { id: 63, name: "المنافقون", ayahCount: 11, startPage: 554, endPage: 556, totalPages: 2 },
  { id: 64, name: "التغابن", ayahCount: 18, startPage: 556, endPage: 558, totalPages: 2 },
  { id: 65, name: "الطلاق", ayahCount: 12, startPage: 558, endPage: 560, totalPages: 2 },
  { id: 66, name: "التحريم", ayahCount: 12, startPage: 560, endPage: 562, totalPages: 2 },
  { id: 67, name: "الملك", ayahCount: 30, startPage: 562, endPage: 564, totalPages: 2 },
  { id: 68, name: "القلم", ayahCount: 52, startPage: 564, endPage: 566, totalPages: 2 },
  { id: 69, name: "الحاقة", ayahCount: 52, startPage: 566, endPage: 568, totalPages: 2 },
  { id: 70, name: "المعارج", ayahCount: 44, startPage: 568, endPage: 570, totalPages: 2 },
  { id: 71, name: "نوح", ayahCount: 28, startPage: 570, endPage: 573, totalPages: 3 },
  { id: 72, name: "الجن", ayahCount: 28, startPage: 572, endPage: 574, totalPages: 2 },
  { id: 73, name: "المزمل", ayahCount: 20, startPage: 574, endPage: 575, totalPages: 1 },
  { id: 74, name: "المدثر", ayahCount: 56, startPage: 575, endPage: 577, totalPages: 2 },
  { id: 75, name: "القيامة", ayahCount: 40, startPage: 577, endPage: 578, totalPages: 1 },
  { id: 76, name: "الإنسان", ayahCount: 31, startPage: 578, endPage: 580, totalPages: 2 },
  { id: 77, name: "المرسلات", ayahCount: 50, startPage: 580, endPage: 582, totalPages: 2 },
  { id: 78, name: "النبأ", ayahCount: 40, startPage: 582, endPage: 583, totalPages: 1 },
  { id: 79, name: "النازعات", ayahCount: 46, startPage: 583, endPage: 585, totalPages: 2 },
  { id: 80, name: "عبس", ayahCount: 42, startPage: 585, endPage: 586, totalPages: 1 },
  { id: 81, name: "التكوير", ayahCount: 29, startPage: 586, endPage: 587, totalPages: 1 },
  { id: 82, name: "الانفطار", ayahCount: 19, startPage: 587, endPage: 587, totalPages: 1 },
  { id: 83, name: "المطففين", ayahCount: 36, startPage: 587, endPage: 589, totalPages: 2 },
  { id: 84, name: "الانشقاق", ayahCount: 25, startPage: 589, endPage: 590, totalPages: 1 },
  { id: 85, name: "البروج", ayahCount: 22, startPage: 590, endPage: 590, totalPages: 1 },
  { id: 86, name: "الطارق", ayahCount: 17, startPage: 591, endPage: 591, totalPages: 1 },
  { id: 87, name: "الأعلى", ayahCount: 19, startPage: 591, endPage: 592, totalPages: 1 },
  { id: 88, name: "الغاشية", ayahCount: 26, startPage: 592, endPage: 592, totalPages: 1 },
  { id: 89, name: "الفجر", ayahCount: 30, startPage: 593, endPage: 594, totalPages: 2 },
  { id: 90, name: "البلد", ayahCount: 20, startPage: 594, endPage: 594, totalPages: 1 },
  { id: 91, name: "الشمس", ayahCount: 15, startPage: 595, endPage: 595, totalPages: 1 },
  { id: 92, name: "الليل", ayahCount: 21, startPage: 595, endPage: 596, totalPages: 1 },
  { id: 93, name: "الضحى", ayahCount: 11, startPage: 596, endPage: 596, totalPages: 1 },
  { id: 94, name: "الشرح", ayahCount: 8, startPage: 596, endPage: 596, totalPages: 1 },
  { id: 95, name: "التين", ayahCount: 8, startPage: 597, endPage: 597, totalPages: 1 },
  { id: 96, name: "العلق", ayahCount: 19, startPage: 597, endPage: 597, totalPages: 1 },
  { id: 97, name: "القدر", ayahCount: 5, startPage: 598, endPage: 598, totalPages: 1 },
  { id: 98, name: "البينة", ayahCount: 8, startPage: 598, endPage: 599, totalPages: 1 },
  { id: 99, name: "الزلزلة", ayahCount: 8, startPage: 599, endPage: 599, totalPages: 1 },
  { id: 100, name: "العاديات", ayahCount: 11, startPage: 599, endPage: 600, totalPages: 1 },
  { id: 101, name: "القارعة", ayahCount: 11, startPage: 600, endPage: 600, totalPages: 1 },
  { id: 102, name: "التكاثر", ayahCount: 8, startPage: 600, endPage: 601, totalPages: 1 },
  { id: 103, name: "العصر", ayahCount: 3, startPage: 601, endPage: 601, totalPages: 1 },
  { id: 104, name: "الهمزة", ayahCount: 9, startPage: 601, endPage: 601, totalPages: 1 },
  { id: 105, name: "الفيل", ayahCount: 5, startPage: 601, endPage: 602, totalPages: 1 },
  { id: 106, name: "قريش", ayahCount: 4, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 107, name: "الماعون", ayahCount: 7, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 108, name: "الكوثر", ayahCount: 3, startPage: 602, endPage: 602, totalPages: 1 },
  { id: 109, name: "الكافرون", ayahCount: 6, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 110, name: "النصر", ayahCount: 3, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 111, name: "المسد", ayahCount: 5, startPage: 603, endPage: 603, totalPages: 1 },
  { id: 112, name: "الإخلاص", ayahCount: 4, startPage: 604, endPage: 604, totalPages: 1 },
  { id: 113, name: "الفلق", ayahCount: 5, startPage: 604, endPage: 604, totalPages: 1 },
  { id: 114, name: "الناس", ayahCount: 6, startPage: 604, endPage: 604, totalPages: 1 }
];

// Total Quran pages
const TOTAL_QURAN_PAGES = 604;

// Helper function to calculate pages for a given ayah position within a surah
const calculatePagesForAyah = (surahId, ayahNumber) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return 0;

  // If memorizing the complete surah
  if (ayahNumber >= surah.ayahCount) {
    return surah.totalPages;
  }

  // Calculate approximate pages based on ayah progress within the surah
  const ayahProgress = ayahNumber / surah.ayahCount;
  return Math.ceil(ayahProgress * surah.totalPages);
};

// Helper function to calculate total memorized pages
const calculateMemorizedPages = (memorizedSurahId, memorizedAyahNumber) => {
  if (!memorizedSurahId || !memorizedAyahNumber) {
    return 0;
  }

  let memorizedPages = 0;
  
  // Add all pages from completed surahs (from 114 down to current surah + 1)
  for (let surahId = 114; surahId > memorizedSurahId; surahId--) {
    const surah = QURAN_SURAHS.find(s => s.id === surahId);
    if (surah) {
      memorizedPages += surah.totalPages;
    }
  }
  
  // Add pages from current surah
  memorizedPages += calculatePagesForAyah(memorizedSurahId, memorizedAyahNumber);
  
  return memorizedPages;
};

module.exports = {
  QURAN_SURAHS,
  TOTAL_QURAN_PAGES,
  calculateMemorizedPages
};