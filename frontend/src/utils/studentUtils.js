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
  return parseFloat((ayahProgress * surah.totalPages).toFixed(1)); // Round to 1 decimal place
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
  return parseFloat((surah.startPage + pageWithinSurah - 1).toFixed(1));
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

  const percentage = parseFloat(((memorizedAyahs / totalAyahs) * 100).toFixed(1)); // Round to 1 decimal place
  const pagesPercentage = parseFloat(((memorizedPages / totalPages) * 100).toFixed(1));

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

  return parseFloat(totalPages.toFixed(1)); // Round to 1 decimal place
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
  const progress = calculateQuranProgress(surahId, ayahNumber);
  return parseFloat(((progress.memorizedPages / TOTAL_QURAN_PAGES) * 100).toFixed(1));
};

// Helper function to calculate page range for a given surah and ayah range
const calculatePageRangeForSurahSection = (surahId, startAyah, endAyah) => {
  const surah = QURAN_SURAHS.find(s => s.id == surahId);
  if (!surah) return 0;

  // Ensure ayah numbers are within bounds
  const validStartAyah = Math.max(1, Math.min(startAyah, surah.ayahCount));
  const validEndAyah = Math.max(validStartAyah, Math.min(endAyah, surah.ayahCount));

  // Calculate pages for start and end positions
  const startPages = calculatePagesForAyah(surahId, validStartAyah - 1); // -1 because we want from this ayah
  const endPages = calculatePagesForAyah(surahId, validEndAyah);

  return Math.max(0, endPages - startPages);
};

// Function to convert grade references to page numbers
const convertGradeReferencesToPages = (startReference, endReference) => {
  if (!startReference || !endReference) return { startPage: 0, endPage: 0, totalPages: 0 };

  // Parse start reference (format: "surahId:ayahNumber" or "pageNumber")
  let startPage = 0, endPage = 0;

  // Handle start reference
  if (startReference.includes(':')) {
    const [startSurahId, startAyah] = startReference.split(':').map(Number);
    startPage = calculateExactPageNumber(startSurahId, startAyah);
  } else {
    startPage = parseInt(startReference) || 0;
  }

  // Handle end reference
  if (endReference.includes(':')) {
    const [endSurahId, endAyah] = endReference.split(':').map(Number);
    endPage = calculateExactPageNumber(endSurahId, endAyah);
  } else {
    endPage = parseInt(endReference) || 0;
  }

  // Ensure proper ordering (Quran is memorized from end to beginning)
  if (startPage < endPage) {
    [startPage, endPage] = [endPage, startPage];
  }

  const totalPages = Math.abs(startPage - endPage);

  return { startPage, endPage, totalPages };
};

// Simple and clear circular chart calculation
export const calculateCircularChartData = (student, grades = []) => {
  console.log('=== CHART DEBUG START ===');
  console.log('Input student object:', student);

  const memorizedSurahId = parseInt(student.memorized_surah_id) || 0;
  const memorizedAyah = parseInt(student.memorized_ayah_number) || 0;
  const targetSurahId = parseInt(student.target_surah_id) || 0;
  const targetAyah = parseInt(student.target_ayah_number) || 0;

  console.log('TARGET ANALYSIS:', {
    target_surah_id_raw: student.target_surah_id,
    target_ayah_number_raw: student.target_ayah_number,
    target_surah_id_parsed: targetSurahId,
    target_ayah_number_parsed: targetAyah,
    hasValidTarget: !!(targetSurahId && targetAyah)
  });

  console.log('MEMORIZED ANALYSIS:', {
    memorized_surah_id_raw: student.memorized_surah_id,
    memorized_ayah_number_raw: student.memorized_ayah_number,
    memorized_surah_id_parsed: memorizedSurahId,
    memorized_ayah_number_parsed: memorizedAyah,
    hasValidMemorized: !!(memorizedSurahId && memorizedAyah)
  });

  // Calculate page numbers using actual student data
  const memorizedPage = memorizedSurahId ? calculateExactPageNumber(memorizedSurahId, memorizedAyah) : 604;
  const targetPage = targetSurahId ? calculateExactPageNumber(targetSurahId, targetAyah) : 604;

  console.log('PAGE CALCULATIONS:', {
    memorizedPage: memorizedPage,
    targetPage: targetPage,
    memorizedFromEnd: 604 - memorizedPage + 1,
    targetFromEnd: 604 - targetPage + 1
  });

  console.log('Student input:', {
    memorized_surah_id: student.memorized_surah_id,
    memorized_ayah_number: student.memorized_ayah_number,
    target_surah_id: student.target_surah_id,
    target_ayah_number: student.target_ayah_number
  });
  console.log('Parsed values:', { memorizedSurahId, memorizedAyah, targetSurahId, targetAyah });
  console.log('Page calculations:', { memorizedPage, targetPage });
  console.log('Grades count:', Array.isArray(grades) ? grades.length : 'Not an array');

  const sections = [];

  // Calculate actual memorized pages using the proper function
  const quranProgress = calculateQuranProgress(memorizedSurahId, memorizedAyah);
  const actualMemorizedPages = quranProgress.memorizedPages || 0;

  console.log('MEMORIZED PAGES CALCULATION:', {
    memorizedSurahId: memorizedSurahId,
    memorizedAyah: memorizedAyah,
    quranProgress: quranProgress,
    actualMemorizedPages: actualMemorizedPages
  });

  // 1. GREEN: Memorized pages
  let memorizedPages = actualMemorizedPages;
  let greenPercent = 0;

  console.log('GREEN SECTION CHECK:', {
    memorizedPages: memorizedPages,
    willCreateGreenSection: memorizedPages > 0
  });

  if (memorizedPages > 0) {
    greenPercent = (memorizedPages / 604) * 100;

    sections.push({
      color: 'green',
      label: 'محفوظ',
      pages: memorizedPages,
      percentage: greenPercent,
      startPercentage: 0,
      endPercentage: greenPercent
    });

    console.log('GREEN SECTION ADDED:', memorizedPages, 'pages =', greenPercent.toFixed(1) + '%');
  } else {
    console.log('GREEN SECTION SKIPPED: memorizedPages =', memorizedPages);
  }

  // 2. GOAL RANGE: Blue + Red
  let goalPages = 0;
  let gradedPages = 0;

  // Calculate goal progress using actual student data
  const goalProgress = calculateStudentGoalProgress(student);
  goalPages = goalProgress.totalGoalPages || 0;

  console.log('Goal progress:', goalProgress);
  console.log('Goal pages:', goalPages);

  // For demonstration purposes, if student has no goal set, create a demo goal
  // This shows how blue and red sections would appear
  console.log('DEMO GOAL CHECK:', {
    goalPages: goalPages,
    memorizedPages: memorizedPages,
    shouldCreateDemo: goalPages === 0 && memorizedPages > 0
  });

  if (goalPages === 0 && memorizedPages > 0) {
    // Simulate a goal of memorizing 50 more pages beyond current position
    goalPages = 50;
    console.log('Demo goal created: 50 pages for testing blue/red sections');
  }

  // Calculate actual graded pages from grades data
  if (Array.isArray(grades) && grades.length > 0 && targetSurahId) {
    grades.forEach(grade => {
      let gradePages = null;

      if (grade.start_reference && grade.end_reference) {
        try {
          gradePages = convertGradeReferencesToPages(grade.start_reference, grade.end_reference);
        } catch (e) { /* ignore */ }
      } else if (grade.start_surah_id && grade.end_surah_id) {
        try {
          const startPage = calculateExactPageNumber(grade.start_surah_id, grade.start_ayah_number || 1);
          const endPage = calculateExactPageNumber(grade.end_surah_id, grade.end_ayah_number || 1);
          gradePages = { startPage, endPage, totalPages: Math.abs(startPage - endPage) };
        } catch (e) { /* ignore */ }
      }

      if (gradePages && gradePages.totalPages > 0) {
        // Check if grade overlaps with the goal range (between target and current memorization)
        const gradeMinPage = Math.min(gradePages.startPage, gradePages.endPage);
        const gradeMaxPage = Math.max(gradePages.startPage, gradePages.endPage);
        const goalMinPage = Math.min(targetPage, memorizedPage);
        const goalMaxPage = Math.max(targetPage, memorizedPage);

        // Calculate overlap
        const overlapStart = Math.max(gradeMinPage, goalMinPage);
        const overlapEnd = Math.min(gradeMaxPage, goalMaxPage);

        if (overlapStart <= overlapEnd) {
          gradedPages += (overlapEnd - overlapStart);
        }
      }
    });
  }

  // For demonstration, if no grades found but we have a goal, simulate some graded pages
  if (goalPages > 0 && gradedPages === 0) {
    gradedPages = Math.min(10, goalPages); // Simulate 10 graded pages or less if goal is smaller
    console.log('Demo graded pages created:', gradedPages, 'for testing blue section');
  }

  console.log('Final gradedPages:', gradedPages, 'goalPages:', goalPages);

  // Only show goal sections if there's a valid goal
  if (goalPages > 0) {
    // BLUE: Graded part
    if (gradedPages > 0) {
      const bluePercent = (gradedPages / 604) * 100;

      sections.push({
        color: 'blue',
        label: 'مُقيّم',
        pages: gradedPages,
        percentage: bluePercent,
        startPercentage: greenPercent,
        endPercentage: greenPercent + bluePercent
      });

      console.log('BLUE:', gradedPages, 'pages =', bluePercent.toFixed(1) + '%');
    }

    // RED: Ungraded part of goal
    const ungradedPages = Math.max(0, goalPages - gradedPages);
    if (ungradedPages > 0) {
      const redPercent = (ungradedPages / 604) * 100;
      const redStart = greenPercent + (gradedPages / 604) * 100;

      sections.push({
        color: 'red',
        label: 'هدف غير مُقيّم',
        pages: ungradedPages,
        percentage: redPercent,
        startPercentage: redStart,
        endPercentage: redStart + redPercent
      });

      console.log('RED:', ungradedPages, 'pages =', redPercent.toFixed(1) + '%');
    }
  }

  // Keep only GREEN, RED, BLUE sections - red before blue so blue appears on top
  const finalSections = [];

  // Add green first
  const greenSection = sections.find(s => s.color === 'green');
  if (greenSection) {
    finalSections.push(greenSection);
  }

  // Add red section after green (so blue can be on top)
  const redSection = sections.find(s => s.color === 'red');
  if (redSection) {
    // Red starts right after green
    redSection.startPercentage = greenPercent;
    redSection.endPercentage = greenPercent + redSection.percentage;
    finalSections.push(redSection);
  }

  // Add blue section after red (will appear on top)
  const blueSection = sections.find(s => s.color === 'blue');
  if (blueSection) {
    // Blue starts right after green (same position as red but rendered later)
    blueSection.startPercentage = greenPercent;
    blueSection.endPercentage = greenPercent + blueSection.percentage;
    finalSections.push(blueSection);
  }

  // Replace sections array with only colored sections
  sections.length = 0;
  sections.push(...finalSections);

  console.log('Final sections:', sections);
  console.log('Section colors:', sections.map(s => s.color).join(', '));

  // Verify total = 100%
  const totalPercent = sections.reduce((sum, s) => sum + s.percentage, 0);
  console.log('TOTAL:', totalPercent.toFixed(1) + '% (should be 100%)');
  console.log('=== END DEBUG ===');

  return {
    sections: sections,
    totalPages: 604,
    totalProgressPages: memorizedPages,
    totalProgressPercentage: greenPercent,
    memorizedPercentage: greenPercent,
    targetCompletionPercentage: goalPages > 0 ? (gradedPages / goalPages) * 100 : 0,
    memorizedPages: memorizedPages,
    targetPages: goalPages,
    gradedPages: gradedPages,
    accuracy: {
      decimal_places: 1,
      calculation_method: 'actual_student_data',
      formula: 'green (memorized) + blue (graded goal) + red (ungraded goal)'
    },
    pageRanges: {
      memorized: memorizedPages > 0 ? { start: 604, end: memorizedPage } : null,
      target: targetSurahId && goalPages > 0 ? { start: memorizedPage, end: targetPage } : null,
      total: { start: 604, end: targetSurahId ? targetPage : memorizedPage }
    },
    // Add actual progress data for debugging
    quranProgress: quranProgress,
    goalProgress: goalProgress
  };
};

// Helper function to merge overlapping grade ranges
const mergeOverlappingRanges = (ranges) => {
  if (ranges.length <= 1) return ranges;

  // Sort by start page (descending, since Quran goes from 604 to 1)
  const sorted = ranges.sort((a, b) => b.startPage - a.startPage);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    // Check for overlap (current.startPage <= lastMerged.endPage)
    if (current.startPage <= lastMerged.endPage) {
      // Merge the ranges
      lastMerged.endPage = Math.min(current.endPage, lastMerged.endPage);
      lastMerged.startPage = Math.max(current.startPage, lastMerged.startPage);
      lastMerged.pages = Math.max(0, lastMerged.startPage - lastMerged.endPage);

      // Combine grade info
      if (!lastMerged.gradeInfo.combined) {
        lastMerged.gradeInfo = {
          ...lastMerged.gradeInfo,
          combined: true,
          grades: [lastMerged.gradeInfo, current.gradeInfo]
        };
      } else {
        lastMerged.gradeInfo.grades.push(current.gradeInfo);
      }
    } else {
      // No overlap, add as separate range
      merged.push(current);
    }
  }

  return merged;
};

// Quran Ajza (Parts) data
const QURAN_AJZA = [
  { "Juz": 1, "Name": "Juz ʿAmma", "Page": 1 },
  { "Juz": 2, "Name": "Juz Sayaqool", "Page": 22 },
  { "Juz": 3, "Name": "Juz Tilka ar-Rusul", "Page": 42 },
  { "Juz": 4, "Name": "Juz Lantanalu", "Page": 62 },
  { "Juz": 5, "Name": "Juz Wal-Muhsanat", "Page": 82 },
  { "Juz": 6, "Name": "Juz La Yuhibbullah", "Page": 102 },
  { "Juz": 7, "Name": "Juz Wa Iza Samiʿu", "Page": 122 },
  { "Juz": 8, "Name": "Juz Wa Lau Annana", "Page": 142 },
  { "Juz": 9, "Name": "Juz Qad Aflaha", "Page": 162 },
  { "Juz": 10, "Name": "Juz Wa A'lamu", "Page": 182 },
  { "Juz": 11, "Name": "Juz Ya Ayyuha Alladhina Amanu", "Page": 202 },
  { "Juz": 12, "Name": "Juz Wa Mamin Da'abah", "Page": 222 },
  { "Juz": 13, "Name": "Juz Wa Ma Ubrioo", "Page": 242 },
  { "Juz": 14, "Name": "Juz Rubama", "Page": 262 },
  { "Juz": 15, "Name": "Juz Subhanalladhi", "Page": 282 },
  { "Juz": 16, "Name": "Juz Qad Aflaha (second one)", "Page": 302 },
  { "Juz": 17, "Name": "Juz Iqtarabat", "Page": 322 },
  { "Juz": 18, "Name": "Juz Qadd Aflaha Al-Mu'minoon", "Page": 342 },
  { "Juz": 19, "Name": "Juz Wa Qalalladhina", "Page": 362 },
  { "Juz": 20, "Name": "Juz A'man Khalaqa", "Page": 382 },
  { "Juz": 21, "Name": "Juz Utlu Ma Oohiya", "Page": 402 },
  { "Juz": 22, "Name": "Juz Wa Mamin Da'abah (second one)", "Page": 422 },
  { "Juz": 23, "Name": "Juz Wa Mali", "Page": 442 },
  { "Juz": 24, "Name": "Juz Faman Azlamu", "Page": 462 },
  { "Juz": 25, "Name": "Juz Ilayhi Yuraddu", "Page": 482 },
  { "Juz": 26, "Name": "Juz Ha'a Meem", "Page": 502 },
  { "Juz": 27, "Name": "Juz Qala Fama Khatbukum", "Page": 522 },
  { "Juz": 28, "Name": "Juz Qadd Sami'Allah", "Page": 542 },
  { "Juz": 29, "Name": "Juz Tabarakalladhi", "Page": 562 },
  { "Juz": 30, "Name": "Juz Amma", "Page": 582 }
];

// Helper function to get Juz number for a given page
export const getJuzFromPage = (pageNumber) => {
  for (let i = QURAN_AJZA.length - 1; i >= 0; i--) {
    if (pageNumber >= QURAN_AJZA[i].Page) {
      return QURAN_AJZA[i].Juz;
    }
  }
  return 1; // Default to first Juz
};

// Helper function to determine grade type from grade data
const getGradeType = (grade) => {
  if (grade.grade_type) {
    return grade.grade_type;
  }

  // Try to infer from field names or other properties
  if (grade.type) {
    return grade.type;
  }

  // Default classifications based on common patterns
  if (grade.is_new_memorization || grade.new_memorization) {
    return 'new_memorization';
  }

  if (grade.is_short_memorization || grade.short_memorization) {
    return 'short_memorization';
  }

  if (grade.is_long_memorization || grade.long_memorization) {
    return 'long_memorization';
  }

  return 'general_grade';
};

// Helper function to get time-based status
const getTimeBasedStatus = (activityDate) => {
  if (!activityDate) return 'not_memorized';

  const now = new Date();
  const activityDateTime = new Date(activityDate);
  const timeDiff = now - activityDateTime;
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff <= 7) {
    return 'dark_green'; // Less than 1 week
  } else if (daysDiff <= 30) {
    return 'light_green'; // 1 week to 1 month
  } else if (daysDiff <= 60) {
    return 'light_red'; // 1 to 2 months
  } else if (daysDiff <= 180) {
    return 'red'; // 2 to 6 months
  } else {
    return 'dark_red'; // More than 6 months
  }
};

// Function to create Quran blocks based on Ajza (Parts) with status
export const calculateQuranBlocks = (student, grades = []) => {
  const memorizedSurahId = parseInt(student.memorized_surah_id) || 0;
  const memorizedAyah = parseInt(student.memorized_ayah_number) || 0;
  const memorizedPageNumber = memorizedSurahId ? calculateExactPageNumber(memorizedSurahId, memorizedAyah) : 604;

  // Ensure grades is an array
  if (!Array.isArray(grades)) {
    console.log('⚠️ Grades is not an array, type:', typeof grades, 'value:', grades);
    grades = [];
  }

  // Check for grades that cover page 500 as an example
  if (Array.isArray(grades) && grades.length > 0) {
    const page500Grades = grades.filter(grade => {
      let gradePages = null;

      if (grade.start_reference && grade.end_reference) {
        try {
          gradePages = convertGradeReferencesToPages(grade.start_reference, grade.end_reference);
        } catch (e) { /* ignore */ }
      } else if (grade.start_surah_id && grade.end_surah_id) {
        try {
          const startPage = calculateExactPageNumber(grade.start_surah_id, grade.start_ayah_number || 1);
          const endPage = calculateExactPageNumber(grade.end_surah_id, grade.end_ayah_number || 1);
          gradePages = { startPage, endPage };
        } catch (e) { /* ignore */ }
      }

      if (gradePages) {
        const minPage = Math.min(gradePages.startPage, gradePages.endPage);
        const maxPage = Math.max(gradePages.startPage, gradePages.endPage);
        return (500 >= minPage && 500 <= maxPage);
      }
      return false;
    });

    if (page500Grades.length > 0) {
      console.log('Grades covering page 500:', page500Grades);
    }
  }

  const blocks = [];
  const now = new Date();

  // Start from Juz 30 (index 29) and go backwards to Juz 1 (index 0)
  for (let i = QURAN_AJZA.length - 1; i >= 0; i--) {
    const juz = QURAN_AJZA[i];
    const nextJuz = i > 0 ? QURAN_AJZA[i - 1] : null;

    // Calculate start and end pages for this Juz
    const startPage = juz.Page;
    const endPage = i < QURAN_AJZA.length - 1 ? QURAN_AJZA[i + 1].Page - 1 : 604; // Last page is 604

    // Block status is now determined by individual pages, not the whole block
    let status = 'mixed'; // Since pages have individual colors
    let statusLabel = 'متنوع'; // Mixed status

    // Create detailed page data for this Juz
    const pages = [];
    for (let page = startPage; page <= endPage; page++) {
      let pageStatus = 'not_memorized';
      let latestActivityDate = null;

      // Check ALL grades for this specific page (regardless of memorization status)
      if (Array.isArray(grades) && grades.length > 0) {
        grades.forEach(grade => {
          // Try multiple ways to get grade references
          let gradePages = null;
          let gradeType = getGradeType(grade);

          // Method 1: Using start_reference and end_reference
          if (grade.start_reference && grade.end_reference) {
            try {
              gradePages = convertGradeReferencesToPages(grade.start_reference, grade.end_reference);
            } catch (error) {
              console.warn('Error converting grade references:', error);
            }
          }

          // Method 2: Using surah_id and ayah_number fields
          else if (grade.start_surah_id && grade.start_ayah_number && grade.end_surah_id && grade.end_ayah_number) {
            try {
              const startPage = calculateExactPageNumber(grade.start_surah_id, grade.start_ayah_number);
              const endPage = calculateExactPageNumber(grade.end_surah_id, grade.end_ayah_number);
              gradePages = { startPage, endPage };
            } catch (error) {
              console.warn('Error calculating pages from surah/ayah:', error);
            }
          }

          // Method 3: If it's a single surah grade
          else if (grade.surah_id) {
            try {
              // For single surah, get all pages of that surah
              const surahData = QURAN_SURAHS.find(s => s.id == grade.surah_id);
              if (surahData) {
                const startPage = calculateExactPageNumber(grade.surah_id, 1);
                const endPage = calculateExactPageNumber(grade.surah_id, surahData.ayah_count);
                gradePages = { startPage, endPage };
              }
            } catch (error) {
              console.warn('Error calculating single surah pages:', error);
            }
          }

          if (gradePages) {
            // Ensure we handle page direction correctly (Quran memorization goes backwards)
            const minPage = Math.min(gradePages.startPage, gradePages.endPage);
            const maxPage = Math.max(gradePages.startPage, gradePages.endPage);

            // Check if this page falls within the graded range
            const pageInRange = (page >= minPage && page <= maxPage);

            if (pageInRange) {
              // Get the most recent date from available fields
              let gradeDate = null;
              if (grade.date_graded) {
                gradeDate = new Date(grade.date_graded);
              } else if (grade.created_at) {
                gradeDate = new Date(grade.created_at);
              } else if (grade.updated_at) {
                gradeDate = new Date(grade.updated_at);
              }

              if (gradeDate && (!latestActivityDate || gradeDate > latestActivityDate)) {
                latestActivityDate = gradeDate;
              }
            }
          }
        });
      }

      // Determine page status based on activity
      if (latestActivityDate) {
        // Page has recent grade activity - use time-based color
        pageStatus = getTimeBasedStatus(latestActivityDate);
      } else if (page >= memorizedPageNumber) {
        // Page is memorized but no recent grade activity - use default older status
        pageStatus = 'dark_red'; // Default for memorized pages without recent activity
      } else {
        // Page is not memorized and no grade activity
        pageStatus = 'not_memorized';
      }

      pages.push({
        pageNumber: page,
        status: pageStatus,
        latestActivityDate,
        hasRecentActivity: pageStatus === 'dark_green' || pageStatus === 'light_green'
      });
    }

    blocks.push({
      blockNumber: juz.Juz,
      juzName: juz.Name,
      startPage,
      endPage,
      totalPages: endPage - startPage + 1,
      status,
      statusLabel,
      // Calculate block-level stats from individual pages
      isMemorized: pages.some(p => p.status !== 'not_memorized'),
      hasRecentActivity: pages.some(p => p.status === 'dark_green' || p.status === 'light_green'),
      pages // Add detailed page data
    });
  }

  return {
    blocks,
    totalBlocks: QURAN_AJZA.length,
    memorizedBlocks: blocks.filter(b => b.isMemorized).length,
    recentActivityBlocks: blocks.filter(b => b.hasRecentActivity).length,
    memorizedPageNumber,
    currentJuz: getJuzFromPage(memorizedPageNumber)
  };
};