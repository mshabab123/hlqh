import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "./quranData";

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

// Helper functions for Qur'an progress calculation (using memorization order: الفاتحة 1→الناس 2→الفلق 3...)
export const calculateQuranProgress = (memorizedSurahId, memorizedAyahNumber) => {
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

  const percentage = Math.round((memorizedAyahs / totalAyahs) * 100 * 100) / 100; // Round to 2 decimal places
  const pagesPercentage = Math.round((memorizedPages / totalPages) * 100 * 100) / 100;

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

export const getProgressColor = (percentage) => {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage >= 30) return 'text-orange-600';
  return 'text-red-600';
};

export const getProgressBgColor = (percentage) => {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 70) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 30) return 'bg-orange-500';
  return 'bg-red-500';
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

// Calculate goal progress from current memorized position to target (using memorization order)
export const calculateStudentGoalProgress = (student) => {
  if (!student.target_surah_id || !student.target_ayah_number) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  // Get current memorized position and target position in memorization order
  const currentSurahId = parseInt(student.memorized_surah_id) || 0;
  const currentAyah = parseInt(student.memorized_ayah_number) || 0;
  const targetSurahId = parseInt(student.target_surah_id) || 0;
  const targetAyah = parseInt(student.target_ayah_number) || 0;

  // Convert to memorization positions (الفاتحة=1, الناس=2, الفلق=3, etc.)
  const currentPosition = getMemorizationPosition(currentSurahId);
  const targetPosition = getMemorizationPosition(targetSurahId);

  let totalGoalVerses = 0;
  let memorizedVerses = 0;

  if (!currentSurahId || currentSurahId === 0) {
    // No current memorization - calculate from position 1 (الفاتحة) to target position
    for (let pos = 1; pos <= targetPosition; pos++) {
      const surahId = getSurahIdFromPosition(pos);
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;

      if (pos === targetPosition) {
        // Target surah - only count up to target ayah
        totalGoalVerses += Math.min(targetAyah, surah.ayahCount);
      } else {
        // Complete surah
        totalGoalVerses += surah.ayahCount;
      }
    }
    memorizedVerses = 0; // Nothing memorized yet
  } else {
    // Calculate from current position to target position
    if (currentPosition > targetPosition) {
      // Current is beyond target - goal already achieved
      totalGoalVerses = 1;
      memorizedVerses = 1;
    } else if (currentPosition === targetPosition) {
      // Same surah - calculate verses from current to target
      if (currentAyah >= targetAyah) {
        // Already achieved or beyond target
        totalGoalVerses = 1;
        memorizedVerses = 1;
      } else {
        // Need to memorize from current ayah to target ayah
        totalGoalVerses = targetAyah - currentAyah;
        memorizedVerses = 0; // Not achieved yet
      }
    } else {
      // Need to go from current position to target position
      for (let pos = currentPosition; pos <= targetPosition; pos++) {
        const surahId = getSurahIdFromPosition(pos);
        const surah = QURAN_SURAHS.find(s => s.id === surahId);
        if (!surah) continue;

        if (pos === currentPosition) {
          // Current surah - count from current ayah to end
          totalGoalVerses += (surah.ayahCount - currentAyah);
        } else if (pos === targetPosition) {
          // Target surah - count from beginning to target ayah
          totalGoalVerses += targetAyah;
        } else {
          // Complete surah in between
          totalGoalVerses += surah.ayahCount;
        }
      }
      memorizedVerses = 0; // Not achieved yet
    }
  }

  // Calculate percentage and prevent NaN
  if (!totalGoalVerses || totalGoalVerses <= 0) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  const percentage = Math.min(100, Math.round((memorizedVerses / totalGoalVerses) * 100));

  return {
    percentage: percentage || 0,
    memorizedVerses: memorizedVerses || 0,
    totalGoalVerses: totalGoalVerses || 0
  };
};

// Helper function to generate ayah options based on selected surah
export const generateAyahOptions = (surahId) => {
  if (!surahId) return [];
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return [];
  
  const options = [];
  for (let i = 1; i <= surah.ayahCount; i++) {
    options.push(i);
  }
  return options;
};