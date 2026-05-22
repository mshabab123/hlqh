import { QURAN_SURAHS, getSurahIdFromName, getSurahNameFromId, getMemorizationPosition, getSurahIdFromPosition } from "./quranData";

// Generate surahVerses object from centralized QURAN_SURAHS data
export const surahVerses = QURAN_SURAHS.reduce((acc, surah) => {
  acc[surah.name] = surah.ayahCount;
  return acc;
}, {});

// Get maximum verse count for a given Surah
export const getMaxVerse = (surahName) => {
  return surahVerses[surahName] || 1;
};

// Calculate student goal progress for display
export const calculateStudentGoalProgress = (studentData) => {
  if (!studentData.goal?.target_surah_id || !studentData.goal?.target_ayah_number) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  const currentSurahId = studentData.student?.memorized_surah_id || studentData.memorized_surah_id || 0;
  const currentAyah = studentData.student?.memorized_ayah_number || studentData.memorized_ayah_number || 0;
  const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
  const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;

  let totalGoalVerses = 0;
  let memorizedVerses = 0;

  const currentSurahIdInt = parseInt(currentSurahId) || 0;
  const currentAyahInt = parseInt(currentAyah) || 0;
  const currentPosition = getMemorizationPosition(currentSurahIdInt);
  const targetPosition = getMemorizationPosition(targetSurahId);

  if (!targetPosition) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  if (!currentPosition) {
    for (let pos = 1; pos <= targetPosition; pos++) {
      const surahId = getSurahIdFromPosition(pos);
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;

      totalGoalVerses += pos === targetPosition
        ? Math.min(targetAyah, surah.ayahCount)
        : surah.ayahCount;
    }
    memorizedVerses = 0;
  } else if (currentPosition === targetPosition) {
    if (currentAyahInt >= targetAyah) {
      totalGoalVerses = 1;
      memorizedVerses = 1;
    } else {
      totalGoalVerses = targetAyah - currentAyahInt;
      memorizedVerses = 0;
    }
  } else if (currentPosition < targetPosition) {
    for (let pos = currentPosition; pos <= targetPosition; pos++) {
      const surahId = getSurahIdFromPosition(pos);
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;

      if (pos === currentPosition) {
        totalGoalVerses += Math.max(0, surah.ayahCount - currentAyahInt);
      } else if (pos === targetPosition) {
        totalGoalVerses += targetAyah;
      } else {
        totalGoalVerses += surah.ayahCount;
      }
    }
  } else {
    totalGoalVerses = 1;
    memorizedVerses = 1;
  }

  // Ensure we don't have NaN values
  if (!totalGoalVerses || totalGoalVerses <= 0) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  const percentage = Math.round((memorizedVerses / totalGoalVerses) * 100);
  return { 
    percentage: Math.min(100, Math.max(0, percentage || 0)), 
    memorizedVerses: memorizedVerses || 0, 
    totalGoalVerses: totalGoalVerses || 0 
  };
};

// Calculate total score for a student based on all their grades
export const calculateTotalScore = (studentData) => {
  if (!studentData?.grades || studentData.grades.length === 0) return 0;
  
  let totalWeighted = 0;
  let totalWeight = 0;
  
  studentData.courses?.forEach(course => {
    const courseGrades = studentData.grades.filter(g => g.course_id === course.id);
    if (courseGrades.length > 0) {
      const average = courseGrades.reduce((sum, grade) => 
        sum + (parseFloat(grade.grade_value) / parseFloat(grade.max_grade)) * 100, 0
      ) / courseGrades.length;
      
      totalWeighted += average * parseFloat(course.percentage);
      totalWeight += parseFloat(course.percentage);
    }
  });
  
  return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
};

// User role utilities
export const canManageClass = (classData, userRole, userSchoolId) => {
  if (userRole === 'admin') return true;
  if (userRole === 'administrator' && classData.school_id === userSchoolId) return true;
  return false;
};

export const getFilteredSchools = (schools, userRole, userSchoolId) => {
  if (userRole === 'admin') return schools;
  if (userRole === 'administrator' && userSchoolId) {
    return schools.filter(school => school.id === userSchoolId);
  }
  return [];
};

export const getFilteredClasses = (classes, userRole, userSchoolId) => {
  if (userRole === 'admin') return classes;
  if (userRole === 'administrator' && userSchoolId) {
    return classes.filter(cls => cls.school_id === userSchoolId);
  }
  return classes;
};

export const getFilteredTeachers = (teachers, schoolId) => {
  if (!schoolId) return [];
  // Filter teachers that belong to the specified school
  // Check both school_id field and schools array (some APIs return it differently)
  return teachers.filter(teacher => {
    // Direct school_id match
    if (teacher.school_id === schoolId) return true;
    // Check if teacher has schools array with matching school
    if (teacher.schools && Array.isArray(teacher.schools)) {
      return teacher.schools.some(school => school.id === schoolId);
    }
    // Check if teacher is in a specific school (for teachers with assignments)
    if (teacher.school_ids && Array.isArray(teacher.school_ids)) {
      return teacher.school_ids.includes(schoolId);
    }
    return false;
  });
};
