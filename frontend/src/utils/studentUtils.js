import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "./quranData";

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
  return Math.round(ayahProgress * surah.totalPages * 100) / 100; // Round to 2 decimal places
};

// Calculate the exact page number for a specific surah and ayah
const calculateExactPageNumber = (surahId, ayahNumber) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return 0;

  // If ayah is beyond surah length, return end page
  if (ayahNumber >= surah.ayahCount) {
    return surah.endPage;
  }

  // Calculate exact page within the surah range
  const ayahProgress = ayahNumber / surah.ayahCount;
  const pageWithinSurah = ayahProgress * (surah.endPage - surah.startPage + 1);
  return Math.round((surah.startPage + pageWithinSurah - 1) * 100) / 100;
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

  // Calculate exact page number reached
  const currentPageNumber = calculateExactPageNumber(memorizedSurahId, currentAyahs);

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
    remainingPages: totalPages - memorizedPages,
    currentPageNumber
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

// Helper function to calculate total pages between two positions
const calculateMemorizedPagesInRange = (startSurahId, startAyah, endSurahId, endAyah) => {
  if (!startSurahId || !endSurahId) return 0;

  let totalPages = 0;

  // Convert to memorization positions
  const startPosition = getMemorizationPosition(startSurahId);
  const endPosition = getMemorizationPosition(endSurahId);

  if (startPosition === endPosition) {
    // Same surah - calculate partial pages
    const startPages = calculatePagesForAyah(startSurahId, startAyah);
    const endPages = calculatePagesForAyah(endSurahId, endAyah);
    totalPages = Math.max(0, endPages - startPages);
  } else {
    // Different surahs - calculate across multiple surahs
    for (let pos = startPosition; pos <= endPosition; pos++) {
      const surahId = getSurahIdFromPosition(pos);
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;

      if (pos === startPosition) {
        // Starting surah - from startAyah to end
        const startPages = calculatePagesForAyah(surahId, startAyah);
        totalPages += (surah.totalPages - startPages);
      } else if (pos === endPosition) {
        // Ending surah - from beginning to endAyah
        totalPages += calculatePagesForAyah(surahId, endAyah);
      } else {
        // Complete surah in between
        totalPages += surah.totalPages;
      }
    }
  }

  return Math.round(totalPages * 100) / 100; // Round to 2 decimal places
};

// Calculate goal progress from current memorized position to target (using memorization order)
export const calculateStudentGoalProgress = (student) => {
  if (!student.target_surah_id || !student.target_ayah_number) {
    return {
      percentage: 0,
      memorizedVerses: 0,
      totalGoalVerses: 0,
      memorizedPages: 0,
      totalGoalPages: 0,
      pagePercentage: 0,
      currentPageNumber: 0,
      targetPageNumber: 0
    };
  }

  // Get current memorized position and target position in memorization order
  const currentSurahId = parseInt(student.memorized_surah_id) || 0;
  const currentAyah = parseInt(student.memorized_ayah_number) || 0;
  const targetSurahId = parseInt(student.target_surah_id) || 0;
  const targetAyah = parseInt(student.target_ayah_number) || 0;

  // Calculate exact page numbers
  const currentPageNumber = currentSurahId ? calculateExactPageNumber(currentSurahId, currentAyah) : 0;
  const targetPageNumber = calculateExactPageNumber(targetSurahId, targetAyah);

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

  // Calculate page-based goal tracking
  let memorizedPages = 0;
  let totalGoalPages = 0;

  if (!currentSurahId || currentSurahId === 0) {
    // No current memorization - calculate total pages from beginning to target
    totalGoalPages = calculateMemorizedPagesInRange(1, 7, targetSurahId, targetAyah); // Start from Al-Fatiha
    memorizedPages = 0;
  } else {
    // Calculate pages from current position to target
    if (currentSurahId === targetSurahId) {
      if (currentAyah >= targetAyah) {
        // Already achieved target
        totalGoalPages = 1;
        memorizedPages = 1;
      } else {
        // Same surah - calculate partial pages
        const currentPages = calculatePagesForAyah(currentSurahId, currentAyah);
        const targetPages = calculatePagesForAyah(targetSurahId, targetAyah);
        totalGoalPages = targetPages - currentPages;
        memorizedPages = 0;
      }
    } else {
      // Different surahs - calculate total pages in range
      totalGoalPages = calculateMemorizedPagesInRange(currentSurahId, currentAyah, targetSurahId, targetAyah);
      memorizedPages = 0; // Not achieved yet
    }
  }

  // Calculate percentages and prevent NaN
  if (!totalGoalVerses || totalGoalVerses <= 0) {
    return {
      percentage: 0,
      memorizedVerses: 0,
      totalGoalVerses: 0,
      memorizedPages: 0,
      totalGoalPages: 0,
      pagePercentage: 0,
      currentPageNumber,
      targetPageNumber
    };
  }

  const percentage = Math.min(100, Math.round((memorizedVerses / totalGoalVerses) * 100));
  const pagePercentage = totalGoalPages > 0 ? Math.min(100, Math.round((memorizedPages / totalGoalPages) * 100)) : 0;

  return {
    percentage: percentage || 0,
    memorizedVerses: memorizedVerses || 0,
    totalGoalVerses: totalGoalVerses || 0,
    memorizedPages: memorizedPages || 0,
    totalGoalPages: totalGoalPages || 0,
    pagePercentage: pagePercentage || 0,
    currentPageNumber,
    targetPageNumber
  };
};

// Calculate three-section progress bar: baseline (green), new progress (blue), remaining (red)
export const calculateGoalProgressBar = (student) => {
  if (!student.target_surah_id || !student.target_ayah_number) {
    return {
      totalGoalVerses: 0,
      baselineVerses: 0,
      newProgressVerses: 0,
      remainingVerses: 0,
      baselinePercentage: 0,
      newProgressPercentage: 0,
      remainingPercentage: 0,
      totalGoalPages: 0,
      baselinePages: 0,
      newProgressPages: 0,
      remainingPages: 0,
      baselinePagesPercentage: 0,
      newProgressPagesPercentage: 0,
      remainingPagesPercentage: 0
    };
  }

  const targetSurahId = parseInt(student.target_surah_id) || 0;
  const targetAyah = parseInt(student.target_ayah_number) || 0;
  const currentSurahId = parseInt(student.memorized_surah_id) || 0;
  const currentAyah = parseInt(student.memorized_ayah_number) || 0;

  // Get the baseline from when the target was set (we'll assume this was when the student was at the memorized position)
  // If no current memorization, start from Al-Fatiha
  const baselineSurahId = currentSurahId || 1; // Al-Fatiha ID is 1
  const baselineAyah = currentSurahId ? currentAyah : 0;

  const baselinePosition = getMemorizationPosition(baselineSurahId);
  const targetPosition = getMemorizationPosition(targetSurahId);

  // Calculate total verses from baseline to target
  let totalGoalVerses = 0;

  if (baselinePosition === targetPosition) {
    // Same surah
    totalGoalVerses = targetAyah - baselineAyah;
  } else if (baselinePosition < targetPosition) {
    // Different surahs
    for (let pos = baselinePosition; pos <= targetPosition; pos++) {
      const surahId = getSurahIdFromPosition(pos);
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;

      if (pos === baselinePosition) {
        // Baseline surah - count from baseline ayah to end
        totalGoalVerses += (surah.ayahCount - baselineAyah);
      } else if (pos === targetPosition) {
        // Target surah - count from beginning to target ayah
        totalGoalVerses += targetAyah;
      } else {
        // Complete surah in between
        totalGoalVerses += surah.ayahCount;
      }
    }
  } else {
    // Target is before current position - goal already achieved
    totalGoalVerses = 1;
  }

  // For this example, we'll calculate three sections:
  // 1. Baseline (green): What was already memorized when target was set
  // 2. New Progress (blue): Additional memorization toward target
  // 3. Remaining (red): What's left to reach target

  let baselineVerses = 0; // What was memorized when target was set (always the starting point)
  let newProgressVerses = 0; // Additional progress beyond baseline
  let remainingVerses = totalGoalVerses; // What's left

  // For this implementation, we assume the current memorized position is the new progress
  if (currentSurahId && currentSurahId !== 0) {
    const currentPosition = getMemorizationPosition(currentSurahId);

    if (currentPosition > targetPosition) {
      // Already exceeded target
      baselineVerses = 0;
      newProgressVerses = totalGoalVerses;
      remainingVerses = 0;
    } else if (currentPosition === targetPosition && currentAyah >= targetAyah) {
      // Reached target in same surah
      baselineVerses = 0;
      newProgressVerses = totalGoalVerses;
      remainingVerses = 0;
    } else {
      // Calculate new progress from baseline to current
      if (baselinePosition === currentPosition) {
        // Same surah as baseline
        newProgressVerses = Math.max(0, currentAyah - baselineAyah);
      } else if (currentPosition > baselinePosition) {
        // Progress beyond baseline surah
        for (let pos = baselinePosition; pos <= currentPosition; pos++) {
          const surahId = getSurahIdFromPosition(pos);
          const surah = QURAN_SURAHS.find(s => s.id === surahId);
          if (!surah) continue;

          if (pos === baselinePosition) {
            // Baseline surah - count from baseline ayah to end
            newProgressVerses += (surah.ayahCount - baselineAyah);
          } else if (pos === currentPosition) {
            // Current surah - count from beginning to current ayah
            newProgressVerses += currentAyah;
          } else {
            // Complete surah in between
            newProgressVerses += surah.ayahCount;
          }
        }
      }

      remainingVerses = Math.max(0, totalGoalVerses - newProgressVerses);
    }
  } else {
    // No memorization yet
    newProgressVerses = 0;
    remainingVerses = totalGoalVerses;
  }

  // Calculate page-based tracking for progress bar
  let totalGoalPages = 0;
  let baselinePages = 0;
  let newProgressPages = 0;
  let remainingPages = 0;

  if (baselinePosition === targetPosition) {
    // Same surah for baseline and target
    const baselinePageCount = calculatePagesForAyah(baselineSurahId, baselineAyah);
    const targetPageCount = calculatePagesForAyah(targetSurahId, targetAyah);
    totalGoalPages = Math.max(0, targetPageCount - baselinePageCount);
  } else if (baselinePosition < targetPosition) {
    // Calculate total pages from baseline to target
    totalGoalPages = calculateMemorizedPagesInRange(baselineSurahId, baselineAyah, targetSurahId, targetAyah);
  } else {
    totalGoalPages = 1; // Target already achieved
  }

  // Calculate current progress in pages
  if (currentSurahId && currentSurahId !== 0) {
    const currentPosition = getMemorizationPosition(currentSurahId);

    if (currentPosition > targetPosition) {
      // Already exceeded target
      baselinePages = 0;
      newProgressPages = totalGoalPages;
      remainingPages = 0;
    } else if (currentPosition === targetPosition && currentAyah >= targetAyah) {
      // Reached target in same surah
      baselinePages = 0;
      newProgressPages = totalGoalPages;
      remainingPages = 0;
    } else {
      // Calculate new progress from baseline to current
      if (baselinePosition === currentPosition) {
        // Same surah as baseline
        const currentPageCount = calculatePagesForAyah(currentSurahId, currentAyah);
        const baselinePageCount = calculatePagesForAyah(baselineSurahId, baselineAyah);
        newProgressPages = Math.max(0, currentPageCount - baselinePageCount);
      } else if (currentPosition > baselinePosition) {
        // Progress beyond baseline surah
        newProgressPages = calculateMemorizedPagesInRange(baselineSurahId, baselineAyah, currentSurahId, currentAyah);
      }

      remainingPages = Math.max(0, totalGoalPages - newProgressPages);
    }
  } else {
    // No memorization yet
    newProgressPages = 0;
    remainingPages = totalGoalPages;
  }

  // Calculate percentages
  const baselinePercentage = totalGoalVerses > 0 ? Math.round((baselineVerses / totalGoalVerses) * 100) : 0;
  const newProgressPercentage = totalGoalVerses > 0 ? Math.round((newProgressVerses / totalGoalVerses) * 100) : 0;
  const remainingPercentage = totalGoalVerses > 0 ? Math.round((remainingVerses / totalGoalVerses) * 100) : 0;

  // Calculate page percentages
  const baselinePagesPercentage = totalGoalPages > 0 ? Math.round((baselinePages / totalGoalPages) * 100) : 0;
  const newProgressPagesPercentage = totalGoalPages > 0 ? Math.round((newProgressPages / totalGoalPages) * 100) : 0;
  const remainingPagesPercentage = totalGoalPages > 0 ? Math.round((remainingPages / totalGoalPages) * 100) : 0;

  return {
    totalGoalVerses,
    baselineVerses,
    newProgressVerses,
    remainingVerses,
    baselinePercentage,
    newProgressPercentage,
    remainingPercentage,
    totalGoalPages,
    baselinePages,
    newProgressPages,
    remainingPages,
    baselinePagesPercentage,
    newProgressPagesPercentage,
    remainingPagesPercentage
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

// Export utility functions for page calculations
export const calculatePageNumber = calculateExactPageNumber;
export const calculatePagesInRange = calculateMemorizedPagesInRange;

// Function to convert Surah and Ayah to display format with page info
export const formatMemorizationDisplay = (surahId, ayahNumber) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return { display: '', pageNumber: 0, totalPages: 0 };

  const pageNumber = calculateExactPageNumber(surahId, ayahNumber);
  const pages = calculatePagesForAyah(surahId, ayahNumber);

  return {
    display: `${surah.name} - آية ${ayahNumber} (صفحة ${pageNumber})`,
    pageNumber,
    totalPages: pages,
    surahName: surah.name
  };
};

// Function to calculate percentage of total Quran by page
export const calculateQuranPagePercentage = (surahId, ayahNumber) => {
  const totalMemorizedPages = calculateMemorizedPages(surahId, ayahNumber);
  return Math.round((totalMemorizedPages / TOTAL_QURAN_PAGES) * 100 * 100) / 100;
};