import { QURAN_SURAHS } from "../components/QuranData";

// Complete list of Quran Surahs with verse counts
export const surahVerses = {
  'الفاتحة': 7, 'البقرة': 286, 'آل عمران': 200, 'النساء': 176, 'المائدة': 120,
  'الأنعام': 165, 'الأعراف': 206, 'الأنفال': 75, 'التوبة': 129, 'يونس': 109,
  'هود': 123, 'يوسف': 111, 'الرعد': 43, 'إبراهيم': 52, 'الحجر': 99,
  'النحل': 128, 'الإسراء': 111, 'الكهف': 110, 'مريم': 98, 'طه': 135,
  'الأنبياء': 112, 'الحج': 78, 'المؤمنون': 118, 'النور': 64, 'الفرقان': 77,
  'الشعراء': 227, 'النمل': 93, 'القصص': 88, 'العنكبوت': 69, 'الروم': 60,
  'لقمان': 34, 'السجدة': 30, 'الأحزاب': 73, 'سبأ': 54, 'فاطر': 45,
  'يس': 83, 'الصافات': 182, 'ص': 88, 'الزمر': 75, 'غافر': 85,
  'فصلت': 54, 'الشورى': 53, 'الزخرف': 89, 'الدخان': 59, 'الجاثية': 37,
  'الأحقاف': 35, 'محمد': 38, 'الفتح': 29, 'الحجرات': 18, 'ق': 45,
  'الذاريات': 60, 'الطور': 49, 'النجم': 62, 'القمر': 55, 'الرحمن': 78,
  'الواقعة': 96, 'الحديد': 29, 'المجادلة': 22, 'الحشر': 24, 'الممتحنة': 13,
  'الصف': 14, 'الجمعة': 11, 'المنافقون': 11, 'التغابن': 18, 'الطلاق': 12,
  'التحريم': 12, 'الملك': 30, 'القلم': 52, 'الحاقة': 52, 'المعارج': 44,
  'نوح': 28, 'الجن': 28, 'المزمل': 20, 'المدثر': 56, 'القيامة': 40,
  'الإنسان': 31, 'المرسلات': 50, 'النبأ': 40, 'النازعات': 46, 'عبس': 42,
  'التكوير': 29, 'الانفطار': 19, 'المطففين': 36, 'الانشقاق': 25, 'البروج': 22,
  'الطارق': 17, 'الأعلى': 19, 'الغاشية': 26, 'الفجر': 30, 'البلد': 20,
  'الشمس': 15, 'الليل': 21, 'الضحى': 11, 'الشرح': 8, 'التين': 8,
  'العلق': 19, 'القدر': 5, 'البينة': 8, 'الزلزلة': 8, 'العاديات': 11,
  'القارعة': 11, 'التكاثر': 8, 'العصر': 3, 'الهمزة': 9, 'الفيل': 5,
  'قريش': 4, 'الماعون': 7, 'الكوثر': 3, 'الكافرون': 6, 'النصر': 3,
  'المسد': 5, 'الإخلاص': 4, 'الفلق': 5, 'الناس': 6
};

// List of Quran Surahs organized by learning difficulty
export const surahGroups = [
  {
    title: 'القصار (Short Surahs)',
    surahs: ['الناس', 'الفلق', 'الإخلاص', 'المسد', 'النصر', 'الكافرون', 'الكوثر', 'الماعون', 'قريش', 'الفيل', 'الهمزة', 'العصر', 'التكاثر', 'القارعة', 'العاديات', 'الزلزلة', 'البينة', 'القدر', 'العلق', 'التين', 'الشرح', 'الضحى', 'الليل', 'الشمس', 'البلد', 'الفجر']
  },
  {
    title: 'المتوسطات (Medium Surahs)',
    surahs: ['الغاشية', 'الأعلى', 'الطارق', 'البروج', 'الانشقاق', 'المطففين', 'الانفطار', 'التكوير', 'عبس', 'النازعات', 'النبأ', 'المرسلات', 'الإنسان', 'القيامة', 'المدثر', 'المزمل', 'الجن', 'نوح', 'المعارج', 'الحاقة', 'القلم', 'الملك', 'التحريم', 'الطلاق', 'التغابن', 'المنافقون', 'الجمعة', 'الصف', 'الممتحنة', 'الحشر', 'المجادلة']
  },
  {
    title: 'الطوال (Long Surahs)',
    surahs: ['الحديد', 'الواقعة', 'الرحمن', 'القمر', 'النجم', 'الطور', 'الذاريات', 'ق', 'الحجرات', 'الفتح', 'محمد', 'الأحقاف', 'الجاثية', 'الدخان', 'الزخرف', 'الشورى', 'فصلت', 'غافر', 'الزمر', 'ص', 'الصافات', 'يس', 'فاطر', 'سبأ', 'الأحزاب', 'السجدة', 'لقمان', 'الروم', 'العنكبوت', 'القصص', 'النمل', 'الشعراء', 'الفرقان', 'النور', 'المؤمنون', 'الحج', 'الأنبياء', 'طه', 'مريم', 'الكهف', 'الإسراء', 'النحل', 'الحجر', 'إبراهيم', 'الرعد', 'يوسف', 'هود', 'يونس']
  },
  {
    title: 'الأساسيات (Foundation)',
    surahs: ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة']
  }
];

// Get maximum verse count for a given Surah
export const getMaxVerse = (surahName) => {
  return surahVerses[surahName] || 1;
};

// Convert Surah name to ID (matching StudentManagement logic)
export const getSurahIdFromName = (surahName) => {
  const surahMapping = {
    'الناس': 114, 'الفلق': 113, 'الإخلاص': 112, 'المسد': 111, 'النصر': 110,
    'الكافرون': 109, 'الكوثر': 108, 'الماعون': 107, 'قريش': 106, 'الفيل': 105,
    'الهمزة': 104, 'العصر': 103, 'التكاثر': 102, 'القارعة': 101, 'العاديات': 100,
    'الزلزلة': 99, 'البينة': 98, 'القدر': 97, 'العلق': 96, 'التين': 95,
    'الشرح': 94, 'الضحى': 93, 'الليل': 92, 'الشمس': 91, 'البلد': 90,
    'الفجر': 89, 'الغاشية': 88, 'الأعلى': 87, 'الطارق': 86, 'البروج': 85,
    'الانشقاق': 84, 'المطففين': 83, 'الانفطار': 82, 'التكوير': 81, 'عبس': 80,
    'النازعات': 79, 'النبأ': 78, 'المرسلات': 77, 'الإنسان': 76, 'القيامة': 75,
    'المدثر': 74, 'المزمل': 73, 'الجن': 72, 'نوح': 71, 'المعارج': 70,
    'الحاقة': 69, 'القلم': 68, 'الملك': 67, 'التحريم': 66, 'الطلاق': 65,
    'التغابن': 64, 'المنافقون': 63, 'الجمعة': 62, 'الصف': 61, 'الممتحنة': 60,
    'الحشر': 59, 'المجادلة': 58, 'الحديد': 57, 'الواقعة': 56, 'الرحمن': 55,
    'القمر': 54, 'النجم': 53, 'الطور': 52, 'الذاريات': 51, 'ق': 50,
    'الحجرات': 49, 'الفتح': 48, 'محمد': 47, 'الأحقاف': 46, 'الجاثية': 45,
    'الدخان': 44, 'الزخرف': 43, 'الشورى': 42, 'فصلت': 41, 'غافر': 40,
    'الزمر': 39, 'ص': 38, 'الصافات': 37, 'يس': 36, 'فاطر': 35,
    'سبأ': 34, 'الأحزاب': 33, 'السجدة': 32, 'لقمان': 31, 'الروم': 30,
    'العنكبوت': 29, 'القصص': 28, 'النمل': 27, 'الشعراء': 26, 'الفرقان': 25,
    'النور': 24, 'المؤمنون': 23, 'الحج': 22, 'الأنبياء': 21, 'طه': 20,
    'مريم': 19, 'الكهف': 18, 'الإسراء': 17, 'النحل': 16, 'الحجر': 15,
    'إبراهيم': 14, 'الرعد': 13, 'يوسف': 12, 'هود': 11, 'يونس': 10,
    'التوبة': 9, 'الأنفال': 8, 'الأعراف': 7, 'الأنعام': 6, 'المائدة': 5,
    'النساء': 4, 'آل عمران': 3, 'البقرة': 2, 'الفاتحة': 1
  };
  return surahMapping[surahName] || null;
};

// Convert Surah ID to name
export const getSurahNameFromId = (surahId) => {
  const idMapping = {
    114: 'الناس', 113: 'الفلق', 112: 'الإخلاص', 111: 'المسد', 110: 'النصر',
    109: 'الكافرون', 108: 'الكوثر', 107: 'الماعون', 106: 'قريش', 105: 'الفيل',
    104: 'الهمزة', 103: 'العصر', 102: 'التكاثر', 101: 'القارعة', 100: 'العاديات',
    99: 'الزلزلة', 98: 'البينة', 97: 'القدر', 96: 'العلق', 95: 'التين',
    94: 'الشرح', 93: 'الضحى', 92: 'الليل', 91: 'الشمس', 90: 'البلد',
    89: 'الفجر', 88: 'الغاشية', 87: 'الأعلى', 86: 'الطارق', 85: 'البروج',
    84: 'الانشقاق', 83: 'المطففين', 82: 'الانفطار', 81: 'التكوير', 80: 'عبس',
    79: 'النازعات', 78: 'النبأ', 77: 'المرسلات', 76: 'الإنسان', 75: 'القيامة',
    74: 'المدثر', 73: 'المزمل', 72: 'الجن', 71: 'نوح', 70: 'المعارج',
    69: 'الحاقة', 68: 'القلم', 67: 'الملك', 66: 'التحريم', 65: 'الطلاق',
    64: 'التغابن', 63: 'المنافقون', 62: 'الجمعة', 61: 'الصف', 60: 'الممتحنة',
    59: 'الحشر', 58: 'المجادلة', 57: 'الحديد', 56: 'الواقعة', 55: 'الرحمن',
    54: 'القمر', 53: 'النجم', 52: 'الطور', 51: 'الذاريات', 50: 'ق',
    49: 'الحجرات', 48: 'الفتح', 47: 'محمد', 46: 'الأحقاف', 45: 'الجاثية',
    44: 'الدخان', 43: 'الزخرف', 42: 'الشورى', 41: 'فصلت', 40: 'غافر',
    39: 'الزمر', 38: 'ص', 37: 'الصافات', 36: 'يس', 35: 'فاطر',
    34: 'سبأ', 33: 'الأحزاب', 32: 'السجدة', 31: 'لقمان', 30: 'الروم',
    29: 'العنكبوت', 28: 'القصص', 27: 'النمل', 26: 'الشعراء', 25: 'الفرقان',
    24: 'النور', 23: 'المؤمنون', 22: 'الحج', 21: 'الأنبياء', 20: 'طه',
    19: 'مريم', 18: 'الكهف', 17: 'الإسراء', 16: 'النحل', 15: 'الحجر',
    14: 'إبراهيم', 13: 'الرعد', 12: 'يوسف', 11: 'هود', 10: 'يونس',
    9: 'التوبة', 8: 'الأنفال', 7: 'الأعراف', 6: 'الأنعام', 5: 'المائدة',
    4: 'النساء', 3: 'آل عمران', 2: 'البقرة', 1: 'الفاتحة'
  };
  return idMapping[surahId] || null;
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

  // Helper function to get max verse count for a surah by ID
  const getMaxVerseById = (surahId) => {
    const surah = QURAN_SURAHS.find(s => s.id === parseInt(surahId));
    return surah ? surah.ayahCount : 0;
  };

  let totalGoalVerses = 0;
  let memorizedVerses = 0;

  const currentSurahIdInt = parseInt(currentSurahId) || 0;
  const currentAyahInt = parseInt(currentAyah) || 0;

  if (!currentSurahIdInt || currentSurahIdInt === 0) {
    // No current memorization - calculate from beginning (Surah 114) to target
    for (let surahId = 114; surahId >= targetSurahId; surahId--) {
      const maxVerse = getMaxVerseById(surahId);
      
      if (surahId === targetSurahId) {
        totalGoalVerses += targetAyah;
      } else {
        totalGoalVerses += maxVerse;
      }
    }
    memorizedVerses = 0;
  } else if (currentSurahIdInt === targetSurahId) {
    // Same surah - calculate verses between current and target
    if (currentAyahInt >= targetAyah) {
      // Goal already achieved
      totalGoalVerses = 1;
      memorizedVerses = 1;
    } else {
      totalGoalVerses = targetAyah - currentAyahInt;
      memorizedVerses = 0; // Haven't reached goal yet
    }
  } else if (currentSurahIdInt > targetSurahId) {
    // Current surah is before target surah (higher number = earlier in Quran)
    for (let surahId = currentSurahIdInt; surahId >= targetSurahId; surahId--) {
      const maxVerse = getMaxVerseById(surahId);
      
      if (surahId === currentSurahIdInt) {
        // For current surah, count from current ayah to end
        totalGoalVerses += Math.max(0, maxVerse - currentAyahInt);
        memorizedVerses += 0; // Starting point
      } else if (surahId === targetSurahId) {
        // For target surah, count from beginning to target ayah
        totalGoalVerses += targetAyah;
      } else {
        // For surahs in between, count all verses
        totalGoalVerses += maxVerse;
      }
    }
  } else {
    // Current surah is after target surah - goal already achieved
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
  
  return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(1) : 0;
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