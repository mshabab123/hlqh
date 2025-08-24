import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineCheck, AiOutlineClose, AiOutlineUser, AiOutlineWarning, AiOutlineBook, AiOutlineDelete } from "react-icons/ai";

// Qur'an Surahs with their ayah counts
const QURAN_SURAHS = [
  { id: 1, name: "الفاتحة", ayahCount: 7 },
  { id: 2, name: "البقرة", ayahCount: 286 },
  { id: 3, name: "آل عمران", ayahCount: 200 },
  { id: 4, name: "النساء", ayahCount: 176 },
  { id: 5, name: "المائدة", ayahCount: 120 },
  { id: 6, name: "الأنعام", ayahCount: 165 },
  { id: 7, name: "الأعراف", ayahCount: 206 },
  { id: 8, name: "الأنفال", ayahCount: 75 },
  { id: 9, name: "التوبة", ayahCount: 129 },
  { id: 10, name: "يونس", ayahCount: 109 },
  { id: 11, name: "هود", ayahCount: 123 },
  { id: 12, name: "يوسف", ayahCount: 111 },
  { id: 13, name: "الرعد", ayahCount: 43 },
  { id: 14, name: "إبراهيم", ayahCount: 52 },
  { id: 15, name: "الحجر", ayahCount: 99 },
  { id: 16, name: "النحل", ayahCount: 128 },
  { id: 17, name: "الإسراء", ayahCount: 111 },
  { id: 18, name: "الكهف", ayahCount: 110 },
  { id: 19, name: "مريم", ayahCount: 98 },
  { id: 20, name: "طه", ayahCount: 135 },
  { id: 21, name: "الأنبياء", ayahCount: 112 },
  { id: 22, name: "الحج", ayahCount: 78 },
  { id: 23, name: "المؤمنون", ayahCount: 118 },
  { id: 24, name: "النور", ayahCount: 64 },
  { id: 25, name: "الفرقان", ayahCount: 77 },
  { id: 26, name: "الشعراء", ayahCount: 227 },
  { id: 27, name: "النمل", ayahCount: 93 },
  { id: 28, name: "القصص", ayahCount: 88 },
  { id: 29, name: "العنكبوت", ayahCount: 69 },
  { id: 30, name: "الروم", ayahCount: 60 },
  { id: 31, name: "لقمان", ayahCount: 34 },
  { id: 32, name: "السجدة", ayahCount: 30 },
  { id: 33, name: "الأحزاب", ayahCount: 73 },
  { id: 34, name: "سبأ", ayahCount: 54 },
  { id: 35, name: "فاطر", ayahCount: 45 },
  { id: 36, name: "يس", ayahCount: 83 },
  { id: 37, name: "الصافات", ayahCount: 182 },
  { id: 38, name: "ص", ayahCount: 88 },
  { id: 39, name: "الزمر", ayahCount: 75 },
  { id: 40, name: "غافر", ayahCount: 85 },
  { id: 41, name: "فصلت", ayahCount: 54 },
  { id: 42, name: "الشورى", ayahCount: 53 },
  { id: 43, name: "الزخرف", ayahCount: 89 },
  { id: 44, name: "الدخان", ayahCount: 59 },
  { id: 45, name: "الجاثية", ayahCount: 37 },
  { id: 46, name: "الأحقاف", ayahCount: 35 },
  { id: 47, name: "محمد", ayahCount: 38 },
  { id: 48, name: "الفتح", ayahCount: 29 },
  { id: 49, name: "الحجرات", ayahCount: 18 },
  { id: 50, name: "ق", ayahCount: 45 },
  { id: 51, name: "الذاريات", ayahCount: 60 },
  { id: 52, name: "الطور", ayahCount: 49 },
  { id: 53, name: "النجم", ayahCount: 62 },
  { id: 54, name: "القمر", ayahCount: 55 },
  { id: 55, name: "الرحمن", ayahCount: 78 },
  { id: 56, name: "الواقعة", ayahCount: 96 },
  { id: 57, name: "الحديد", ayahCount: 29 },
  { id: 58, name: "المجادلة", ayahCount: 22 },
  { id: 59, name: "الحشر", ayahCount: 24 },
  { id: 60, name: "الممتحنة", ayahCount: 13 },
  { id: 61, name: "الصف", ayahCount: 14 },
  { id: 62, name: "الجمعة", ayahCount: 11 },
  { id: 63, name: "المنافقون", ayahCount: 11 },
  { id: 64, name: "التغابن", ayahCount: 18 },
  { id: 65, name: "الطلاق", ayahCount: 12 },
  { id: 66, name: "التحريم", ayahCount: 12 },
  { id: 67, name: "الملك", ayahCount: 30 },
  { id: 68, name: "القلم", ayahCount: 52 },
  { id: 69, name: "الحاقة", ayahCount: 52 },
  { id: 70, name: "المعارج", ayahCount: 44 },
  { id: 71, name: "نوح", ayahCount: 28 },
  { id: 72, name: "الجن", ayahCount: 28 },
  { id: 73, name: "المزمل", ayahCount: 20 },
  { id: 74, name: "المدثر", ayahCount: 56 },
  { id: 75, name: "القيامة", ayahCount: 40 },
  { id: 76, name: "الإنسان", ayahCount: 31 },
  { id: 77, name: "المرسلات", ayahCount: 50 },
  { id: 78, name: "النبأ", ayahCount: 40 },
  { id: 79, name: "النازعات", ayahCount: 46 },
  { id: 80, name: "عبس", ayahCount: 42 },
  { id: 81, name: "التكوير", ayahCount: 29 },
  { id: 82, name: "الإنفطار", ayahCount: 19 },
  { id: 83, name: "المطففين", ayahCount: 36 },
  { id: 84, name: "الإنشقاق", ayahCount: 25 },
  { id: 85, name: "البروج", ayahCount: 22 },
  { id: 86, name: "الطارق", ayahCount: 17 },
  { id: 87, name: "الأعلى", ayahCount: 19 },
  { id: 88, name: "الغاشية", ayahCount: 26 },
  { id: 89, name: "الفجر", ayahCount: 30 },
  { id: 90, name: "البلد", ayahCount: 20 },
  { id: 91, name: "الشمس", ayahCount: 15 },
  { id: 92, name: "الليل", ayahCount: 21 },
  { id: 93, name: "الضحى", ayahCount: 11 },
  { id: 94, name: "الشرح", ayahCount: 8 },
  { id: 95, name: "التين", ayahCount: 8 },
  { id: 96, name: "العلق", ayahCount: 19 },
  { id: 97, name: "القدر", ayahCount: 5 },
  { id: 98, name: "البينة", ayahCount: 8 },
  { id: 99, name: "الزلزلة", ayahCount: 8 },
  { id: 100, name: "العاديات", ayahCount: 11 },
  { id: 101, name: "القارعة", ayahCount: 11 },
  { id: 102, name: "التكاثر", ayahCount: 8 },
  { id: 103, name: "العصر", ayahCount: 3 },
  { id: 104, name: "الهمزة", ayahCount: 9 },
  { id: 105, name: "الفيل", ayahCount: 5 },
  { id: 106, name: "قريش", ayahCount: 4 },
  { id: 107, name: "الماعون", ayahCount: 7 },
  { id: 108, name: "الكوثر", ayahCount: 3 },
  { id: 109, name: "الكافرون", ayahCount: 6 },
  { id: 110, name: "النصر", ayahCount: 3 },
  { id: 111, name: "المسد", ayahCount: 5 },
  { id: 112, name: "الإخلاص", ayahCount: 4 },
  { id: 113, name: "الفلق", ayahCount: 5 },
  { id: 114, name: "الناس", ayahCount: 6 }
];

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Helper functions for Qur'an progress calculation (from Al-Nas to Al-Baqarah)
const calculateQuranProgress = (memorizedSurahId, memorizedAyahNumber) => {
  if (!memorizedSurahId || !memorizedAyahNumber) {
    return { totalAyahs: 0, memorizedAyahs: 0, percentage: 0, completedSurahs: 0 };
  }

  const currentSurah = QURAN_SURAHS.find(s => s.id == memorizedSurahId);
  if (!currentSurah) return { totalAyahs: 0, memorizedAyahs: 0, percentage: 0, completedSurahs: 0 };

  // Calculate total ayahs in Qur'an
  const totalAyahs = QURAN_SURAHS.reduce((sum, surah) => sum + surah.ayahCount, 0);
  
  // Calculate memorized ayahs (starting from Al-Nas = 114, going backward)
  let memorizedAyahs = 0;
  
  // Add all ayahs from completed surahs (from 114 down to current surah + 1)
  for (let surahId = 114; surahId > memorizedSurahId; surahId--) {
    const surah = QURAN_SURAHS.find(s => s.id === surahId);
    if (surah) {
      memorizedAyahs += surah.ayahCount;
    }
  }
  
  // Add ayahs from current surah
  memorizedAyahs += parseInt(memorizedAyahNumber) || 0;
  
  const percentage = Math.round((memorizedAyahs / totalAyahs) * 100 * 100) / 100; // Round to 2 decimal places
  
  // Count completed surahs (from 114 down to current)
  let completedSurahs = 114 - memorizedSurahId;
  if (memorizedAyahNumber == currentSurah.ayahCount) {
    completedSurahs += 1; // Current surah is also complete
  }
  
  return {
    totalAyahs,
    memorizedAyahs,
    percentage,
    completedSurahs,
    currentSurah,
    remainingAyahs: totalAyahs - memorizedAyahs
  };
};

const getProgressColor = (percentage) => {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage >= 30) return 'text-orange-600';
  return 'text-red-600';
};

const getProgressBgColor = (percentage) => {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 70) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 30) return 'bg-orange-500';
  return 'bg-red-500';
};

const StudentForm = ({ student, onSubmit, onCancel, isEditing = false, onStudentChange, schools, classes }) => {
  // Helper function to generate ayah options based on selected surah
  const generateAyahOptions = (surahId) => {
    if (!surahId) return [];
    const surah = QURAN_SURAHS.find(s => s.id == surahId);
    if (!surah) return [];
    
    const options = [];
    for (let i = 1; i <= surah.ayahCount; i++) {
      options.push(i);
    }
    return options;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-5xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
          {isEditing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
        </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
            <input
              type="text"
              value={student.id || ""}
              onChange={(e) => onStudentChange({...student, id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength="10"
              pattern="[0-9]{10}"
              placeholder="1234567890"
              required
              disabled={isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={student.email || ""}
              onChange={(e) => onStudentChange({...student, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={student.first_name || ""}
              onChange={(e) => onStudentChange({...student, first_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم الأب *</label>
            <input
              type="text"
              value={student.second_name || ""}
              onChange={(e) => onStudentChange({...student, second_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الجد *</label>
            <input
              type="text"
              value={student.third_name || ""}
              onChange={(e) => onStudentChange({...student, third_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={student.last_name || ""}
              onChange={(e) => onStudentChange({...student, last_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={student.phone || ""}
              onChange={(e) => onStudentChange({...student, phone: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^05[0-9]{8}$"
              placeholder="05xxxxxxxx"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ الميلاد</label>
            <input
              type="date"
              value={student.date_of_birth || ""}
              onChange={(e) => onStudentChange({...student, date_of_birth: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={student.address || ""}
              onChange={(e) => onStudentChange({...student, address: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الصف الدراسي *</label>
            <select
              value={student.school_level || ""}
              onChange={(e) => onStudentChange({...student, school_level: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر الصف</option>
              <optgroup label="المرحلة الابتدائية">
                <option value="الأول الابتدائي">الأول الابتدائي</option>
                <option value="الثاني الابتدائي">الثاني الابتدائي</option>
                <option value="الثالث الابتدائي">الثالث الابتدائي</option>
                <option value="الرابع الابتدائي">الرابع الابتدائي</option>
                <option value="الخامس الابتدائي">الخامس الابتدائي</option>
                <option value="السادس الابتدائي">السادس الابتدائي</option>
              </optgroup>
              <optgroup label="المرحلة المتوسطة">
                <option value="الأول متوسط">الأول متوسط</option>
                <option value="الثاني متوسط">الثاني متوسط</option>
                <option value="الثالث متوسط">الثالث متوسط</option>
              </optgroup>
              <optgroup label="المرحلة الثانوية">
                <option value="الأول ثانوي">الأول ثانوي</option>
                <option value="الثاني ثانوي">الثاني ثانوي</option>
                <option value="الثالث ثانوي">الثالث ثانوي</option>
              </optgroup>
              <optgroup label="المرحلة الجامعية">
                <option value="السنة الأولى جامعي">السنة الأولى جامعي</option>
                <option value="السنة الثانية جامعي">السنة الثانية جامعي</option>
                <option value="السنة الثالثة جامعي">السنة الثالثة جامعي</option>
                <option value="السنة الرابعة جامعي">السنة الرابعة جامعي</option>
                <option value="دراسات عليا">دراسات عليا</option>
              </optgroup>
              <optgroup label="أخرى">
                <option value="لم يدخل المدرسة">لم يدخل المدرسة</option>
                <option value="خريج">خريج</option>
                <option value="غير محدد">غير محدد</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات</label>
            <select
              value={student.school_id || ""}
              onChange={(e) => onStudentChange({...student, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر مجمع الحلقات</option>
              {schools && schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحلقة (اختياري)</label>
            <select
              value={student.class_id || ""}
              onChange={(e) => onStudentChange({...student, class_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">لا يوجد - غير منتسب لحلقة</option>
              {classes && classes
                .filter(cls => !student.school_id || cls.school_id == student.school_id)
                .map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))
              }
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يمكن تغيير مجمع الحلقات بدون تحديد حلقة. سيتم إلحاق الطالب بحلقة لاحقاً.
            </p>
          </div>
        </div>


        <div>
          <label className="block text-sm font-medium mb-1">ملاحظات</label>
          <textarea
            value={student.notes || ""}
            onChange={(e) => onStudentChange({...student, notes: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

// Calculate goal progress from current memorized position to target
const calculateStudentGoalProgress = (student) => {
  if (!student.target_surah_id || !student.target_ayah_number) {
    return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
  }

  // Get current memorized position and target position
  const currentSurahId = student.memorized_surah_id || null;
  const currentAyah = student.memorized_ayah_number || 0;
  const targetSurahId = parseInt(student.target_surah_id);
  const targetAyah = parseInt(student.target_ayah_number);

  let totalGoalVerses = 0;
  let memorizedVerses = 0;

  if (!currentSurahId) {
    // No current memorization - calculate from beginning (Surah 114) to target
    for (let surahId = 114; surahId >= targetSurahId; surahId--) {
      const surah = QURAN_SURAHS.find(s => s.id === surahId);
      if (!surah) continue;
      
      if (surahId === targetSurahId) {
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
    const currentSurahIdInt = parseInt(currentSurahId);
    const currentAyahInt = parseInt(currentAyah);

    if (currentSurahIdInt < targetSurahId) {
      // Current is beyond target - goal already achieved
      totalGoalVerses = 1;
      memorizedVerses = 1;
    } else if (currentSurahIdInt === targetSurahId) {
      // Same surah - calculate verses from current to target
      if (currentAyahInt >= targetAyah) {
        // Already achieved or beyond target
        totalGoalVerses = 1;
        memorizedVerses = 1;
      } else {
        // Need to memorize from current ayah to target ayah
        totalGoalVerses = targetAyah - currentAyahInt;
        memorizedVerses = 0; // Not achieved yet
      }
    } else {
      // Current surah is after target surah - need to go from current to target
      for (let surahId = currentSurahIdInt; surahId >= targetSurahId; surahId--) {
        const surah = QURAN_SURAHS.find(s => s.id === surahId);
        if (!surah) continue;
        
        if (surahId === currentSurahIdInt) {
          // Current surah - count from current ayah to end
          totalGoalVerses += (surah.ayahCount - currentAyahInt);
        } else if (surahId === targetSurahId) {
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

  // Calculate percentage
  const percentage = totalGoalVerses > 0 ? Math.min(100, Math.round((memorizedVerses / totalGoalVerses) * 100)) : 0;

  return {
    percentage,
    memorizedVerses,
    totalGoalVerses
  };
};

// Goal and Progress Modal Component (matching ClassManagement style)
const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showGoalForm, setShowGoalForm] = useState(false);
  // Helper function to generate ayah options based on selected surah
  const generateAyahOptions = (surahId) => {
    if (!surahId) return [];
    const surah = QURAN_SURAHS.find(s => s.id == surahId);
    if (!surah) return [];
    
    const options = [];
    for (let i = 1; i <= surah.ayahCount; i++) {
      options.push(i);
    }
    return options;
  };

  // Calculate progress
  const progress = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number);
  const targetProgress = calculateQuranProgress(student.target_surah_id, student.target_ayah_number);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6 text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineBook className="text-2xl" />
          الهدف والتقدم - {student.first_name} {student.last_name}
        </h3>

        {/* Goal and Progress Section */}
        {student.target_surah_id && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">الهدف والتقدم</h3>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                {showGoalForm ? 'إخفاء' : 'تعديل الهدف'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المحدد:</h4>
                <p className="text-base font-bold text-blue-700">
                  {(() => {
                    const currentSurahId = student.memorized_surah_id;
                    const currentAyah = student.memorized_ayah_number;
                    const targetSurahId = student.target_surah_id;
                    const targetAyah = student.target_ayah_number;
                    
                    const getCurrentSurahName = (surahId) => {
                      const surah = QURAN_SURAHS.find(s => s.id == surahId);
                      return surah ? surah.name : '';
                    };
                    
                    if (!currentSurahId) {
                      // No current memorization - start from beginning
                      return `من سورة الناس إلى سورة ${getCurrentSurahName(targetSurahId)} الآية ${targetAyah}`;
                    } else if (parseInt(currentSurahId) === parseInt(targetSurahId)) {
                      // Same surah
                      const currentSurahName = getCurrentSurahName(currentSurahId);
                      if (parseInt(currentAyah) >= parseInt(targetAyah)) {
                        return `🎉 تم تحقيق الهدف - سورة ${currentSurahName} الآية ${currentAyah}`;
                      } else {
                        return `من سورة ${currentSurahName} الآية ${parseInt(currentAyah) + 1} إلى الآية ${targetAyah}`;
                      }
                    } else {
                      // Different surahs
                      const currentSurahName = getCurrentSurahName(currentSurahId);
                      const targetSurahName = getCurrentSurahName(targetSurahId);
                      if (parseInt(currentSurahId) < parseInt(targetSurahId)) {
                        return `🎉 تم تجاوز الهدف - الحالي: سورة ${currentSurahName}`;
                      } else {
                        return `من سورة ${currentSurahName} الآية ${parseInt(currentAyah) + 1} إلى سورة ${targetSurahName} الآية ${targetAyah}`;
                      }
                    }
                  })()}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">التقدم نحو الهدف:</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الآيات المحفوظة:</span>
                    <span className="font-bold">
                      {(() => {
                        const progress = calculateStudentGoalProgress(student);
                        return `${progress.memorizedVerses} من ${progress.totalGoalVerses}`;
                      })()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(() => {
                          const progress = calculateStudentGoalProgress(student);
                          return progress.percentage;
                        })()}%` 
                      }}
                    >
                      <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                        {(() => {
                          const progress = calculateStudentGoalProgress(student);
                          return progress.percentage;
                        })()}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!student.target_surah_id && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
            <p className="text-center text-yellow-700 mb-3">لم يتم تحديد هدف للطالب بعد</p>
            <div className="text-center">
              <button
                onClick={() => setShowGoalForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                تحديد هدف جديد
              </button>
            </div>
          </div>
        )}

        {/* Simplified Statistics Section */}
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
          <h4 className="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
            <AiOutlineCheck className="text-green-600" />
            إحصائيات الحفظ العامة
          </h4>
          <p className="text-sm text-gray-600 mb-4 bg-blue-100 p-2 rounded">
            📖 نظام الحفظ: يبدأ من سورة الناس (114) وينتهي بسورة البقرة (2) - الطريقة التقليدية للحفظ
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Progress Chart */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">التقدم الحالي</h5>
              
              {progress.percentage > 0 ? (
                <>
                  {/* Circular Progress */}
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        {/* Background circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={339.292}
                          strokeDashoffset={339.292 - (339.292 * progress.percentage) / 100}
                          className={getProgressBgColor(progress.percentage).replace('bg-', 'text-')}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${getProgressColor(progress.percentage)}`}>
                            {progress.percentage}%
                          </span>
                          <div className="text-xs text-gray-600">مكتمل</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>الآيات المحفوظة:</span>
                      <span className="font-bold text-green-600">{progress.memorizedAyahs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الآيات:</span>
                      <span className="font-bold">{progress.totalAyahs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الآيات المتبقية:</span>
                      <span className="font-bold text-orange-600">{progress.remainingAyahs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>السور المكتملة:</span>
                      <span className="font-bold text-blue-600">{progress.completedSurahs} من 114</span>
                    </div>
                    {progress.currentSurah && (
                      <div className="mt-3 p-2 bg-green-100 rounded-lg text-center">
                        <div className="text-xs text-green-700">يحفظ حاليًا من:</div>
                        <div className="font-bold text-green-800">
                          سورة {progress.currentSurah.name} - الآية {student.memorized_ayah_number}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AiOutlineBook className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>لم يتم تسجيل أي حفظ بعد</p>
                </div>
              )}
            </div>

            {/* Target Progress */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">الهدف المحدد</h5>
              
              {targetProgress.percentage > 0 ? (
                <>
                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>التقدم نحو الهدف:</span>
                      <span className="font-bold">{targetProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getProgressBgColor(targetProgress.percentage)}`}
                        style={{ width: `${Math.min(targetProgress.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Target Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>الهدف (آيات):</span>
                      <span className="font-bold text-blue-600">{targetProgress.memorizedAyahs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المتبقي للهدف:</span>
                      <span className="font-bold text-orange-600">
                        {Math.max(0, targetProgress.memorizedAyahs - progress.memorizedAyahs).toLocaleString()}
                      </span>
                    </div>
                    {progress.memorizedAyahs >= targetProgress.memorizedAyahs && (
                      <div className="text-center p-2 bg-green-100 text-green-700 rounded-lg font-bold">
                        🎉 تم تحقيق الهدف!
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AiOutlineBook className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>لم يتم تحديد هدف بعد</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Current Memorization */}
            <div className="space-y-4 p-4 border rounded-lg bg-green-50">
              <h5 className="font-semibold text-lg text-green-700 flex items-center gap-2">
                <AiOutlineCheck className="text-green-600" />
                الحفظ الحالي
              </h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">السورة المحفوظة</label>
                  <select
                    value={student.memorized_surah_id || ""}
                    onChange={(e) => {
                      const newSurahId = e.target.value;
                      onStudentChange({
                        ...student, 
                        memorized_surah_id: newSurahId,
                        memorized_ayah_number: "" // Reset ayah when surah changes
                      });
                    }}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">اختر السورة</option>
                    {[...QURAN_SURAHS].reverse().map(surah => (
                      <option key={surah.id} value={surah.id}>
                        {surah.id}. {surah.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">آخر آية محفوظة</label>
                  <select
                    value={student.memorized_ayah_number || ""}
                    onChange={(e) => onStudentChange({...student, memorized_ayah_number: e.target.value})}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!student.memorized_surah_id}
                  >
                    <option value="">اختر الآية</option>
                    {generateAyahOptions(student.memorized_surah_id).map(ayahNum => (
                      <option key={ayahNum} value={ayahNum}>الآية {ayahNum}</option>
                    ))}
                  </select>
                </div>
                
                {student.memorized_surah_id && student.memorized_ayah_number && (
                  <div className="p-3 bg-green-100 rounded-lg text-sm">
                    <strong>الإنجاز الحالي:</strong> سورة {QURAN_SURAHS.find(s => s.id == student.memorized_surah_id)?.name} حتى الآية {student.memorized_ayah_number}
                  </div>
                )}
              </div>
            </div>

            {/* Target Memorization */}
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <h5 className="font-semibold text-lg text-blue-700 flex items-center gap-2">
                <AiOutlineBook className="text-blue-600" />
                هدف الفصل الدراسي
              </h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">السورة المستهدفة</label>
                  <select
                    value={student.target_surah_id || ""}
                    onChange={(e) => {
                      const newSurahId = e.target.value;
                      onStudentChange({
                        ...student, 
                        target_surah_id: newSurahId,
                        target_ayah_number: "" // Reset ayah when surah changes
                      });
                    }}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر السورة</option>
                    {[...QURAN_SURAHS].reverse().map(surah => (
                      <option key={surah.id} value={surah.id}>
                        {surah.id}. {surah.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">الآية المستهدفة</label>
                  <select
                    value={student.target_ayah_number || ""}
                    onChange={(e) => onStudentChange({...student, target_ayah_number: e.target.value})}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!student.target_surah_id}
                  >
                    <option value="">اختر الآية</option>
                    {generateAyahOptions(student.target_surah_id).map(ayahNum => (
                      <option key={ayahNum} value={ayahNum}>الآية {ayahNum}</option>
                    ))}
                  </select>
                </div>
                
                {student.target_surah_id && student.target_ayah_number && (
                  <div className="p-3 bg-blue-100 rounded-lg text-sm">
                    <strong>الهدف المحدد:</strong> سورة {QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.name} حتى الآية {student.target_ayah_number}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="bg-[var(--color-primary-700)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors flex items-center gap-2"
            >
              <AiOutlineCheck /> حفظ التقدم
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StudentCard = ({ student, onView, onEdit, onToggleStatus, onQuranProgress, onDelete }) => {
  const hasSchoolAssignment = student.school_id;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
            <AiOutlineUser className="text-[var(--color-primary-700)] text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h3>
            <p className="text-sm text-gray-600">رقم الهوية: {student.id}</p>
            <p className="text-sm text-gray-600">المستوى: {student.school_level}</p>
            
            {/* Quick Quran Progress */}
            {student.memorized_surah_id && student.memorized_ayah_number && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">تقدم الحفظ:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage)}`}
                      style={{ 
                        width: `${Math.min(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className={`text-xs font-bold ${getProgressColor(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage)}`}>
                    {calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).memorizedAyahs.toLocaleString()} آية محفوظة
                </div>
              </div>
            )}
            
            {!hasSchoolAssignment && (
              <div className="flex items-center gap-1 mt-1 text-orange-600">
                <AiOutlineWarning className="text-sm" />
                <span className="text-xs">               لا يسمح بتنشيط حساب الطالب لان الطالب غير مسجل في مجمع حلقات، لتسجيل الطالب يجب الدخول على تعديل ومن ثم تعديل بينات الطالب وتعيينه في مجمع حلقات وبعد ذلك اضغط على تفعيل لتنشيط الحساب.</span>
              </div>
            )}
          </div>
        </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
        student.status === 'active' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        {student.status === 'active' ? 'نشط' : 'غير نشط'}
      </div>
    </div>
    
    <div className="space-y-2 text-sm text-gray-600 mb-4">
      {student.email && <p>البريد: {student.email}</p>}
      {student.phone && <p>الهاتف: {student.phone}</p>}
      {student.school_name && <p>مجمع الحلقات: {student.school_name}</p>}
      {student.class_name && <p>الحلقة: {student.class_name}</p>}
      {student.enrollment_date && (
        <p>تاريخ التسجيل: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}</p>
      )}
    </div>
    
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => onView(student)}
        className="bg-blue-500 text-white py-2 px-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineEye /> عرض
      </button>
      <button
        onClick={() => onEdit(student)}
        className="bg-yellow-500 text-white py-2 px-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineEdit /> تعديل
      </button>
      <button
        onClick={() => onQuranProgress(student)}
        className="bg-green-600 text-white py-2 px-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineBook /> القرآن
      </button>
      <button
        onClick={() => onToggleStatus(student)}
        disabled={student.status !== 'active' && !hasSchoolAssignment}
        className={`py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm ${
          student.status === 'active' 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : hasSchoolAssignment
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 cursor-not-allowed text-white'
        }`}
        title={student.status !== 'active' && !hasSchoolAssignment 
          ? 'يجب تعيين الطالب إلى مدرسة أولاً' 
          : ''
        }
      >
        {student.status === 'active' ? (
          <><AiOutlineClose /> إيقاف</>
        ) : hasSchoolAssignment ? (
          <><AiOutlineCheck /> تفعيل</>
        ) : (
          <><AiOutlineWarning /> تفعيل</>
        )}
      </button>
      <button
        onClick={() => onDelete(student)}
        className="bg-red-600 text-white py-2 px-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1 text-sm col-span-2"
      >
        <AiOutlineDelete /> حذف الطالب
      </button>
    </div>
  </div>
  );
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showQuranModal, setShowQuranModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [quranStudent, setQuranStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  
  const [currentStudent, setCurrentStudent] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    school_level: "",
    school_id: "",
    class_id: "",
    status: "active",
    notes: ""
  });

  useEffect(() => {
    fetchStudents();
    fetchSchools();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError("حدث خطأ في تحميل بيانات الطلاب");
      console.error("Error fetching students:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchools(Array.isArray(response.data.schools) ? response.data.schools : []);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setSchools([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setClasses([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare clean data
      const studentData = {
        first_name: currentStudent.first_name,
        second_name: currentStudent.second_name,
        third_name: currentStudent.third_name,
        last_name: currentStudent.last_name,
        school_level: currentStudent.school_level,
        status: currentStudent.status || 'active'
      };
      
      // Add ID for new students
      if (!editingStudent) {
        studentData.id = currentStudent.id;
      }
      
      // Only include optional fields if they have values
      if (currentStudent.email && currentStudent.email.trim()) {
        studentData.email = currentStudent.email.trim();
      }
      if (currentStudent.phone && currentStudent.phone.trim()) {
        studentData.phone = currentStudent.phone.trim();
      }
      if (currentStudent.address && currentStudent.address.trim()) {
        studentData.address = currentStudent.address.trim();
      }
      if (currentStudent.date_of_birth && currentStudent.date_of_birth.trim()) {
        studentData.date_of_birth = currentStudent.date_of_birth;
      }
      if (currentStudent.notes && currentStudent.notes.trim()) {
        studentData.notes = currentStudent.notes.trim();
      }
      if (currentStudent.school_id) {
        studentData.school_id = currentStudent.school_id;
      }
      if (currentStudent.class_id) {
        studentData.class_id = currentStudent.class_id;
      }
      
      // Include memorization progress fields
      if (currentStudent.memorized_surah_id) {
        studentData.memorized_surah_id = parseInt(currentStudent.memorized_surah_id);
      }
      if (currentStudent.memorized_ayah_number) {
        studentData.memorized_ayah_number = parseInt(currentStudent.memorized_ayah_number);
      }
      if (currentStudent.target_surah_id) {
        studentData.target_surah_id = parseInt(currentStudent.target_surah_id);
      }
      if (currentStudent.target_ayah_number) {
        studentData.target_ayah_number = parseInt(currentStudent.target_ayah_number);
      }
      
      if (editingStudent) {
        await axios.put(`${API_BASE}/api/students/${editingStudent.id}`, studentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${API_BASE}/api/students/manage`, studentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      setShowForm(false);
      setEditingStudent(null);
      setCurrentStudent({
        id: "",
        first_name: "",
        second_name: "",
        third_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        date_of_birth: "",
        school_level: "",
        school_id: "",
        class_id: "",
        status: "active",
        notes: ""
      });
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في حفظ بيانات الطالب");
      console.error("Error saving student:", err);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    // Format the date properly for the input field
    const formattedStudent = {
      ...student,
      date_of_birth: student.date_of_birth ? 
        new Date(student.date_of_birth).toISOString().split('T')[0] : "",
      email: student.email || "",
      phone: student.phone || "",
      address: student.address || "",
      notes: student.notes || ""
    };
    setCurrentStudent(formattedStudent);
    setShowForm(true);
  };

  const handleView = (student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  const handleQuranProgress = (student) => {
    console.log('Opening Quran modal for student:', student);
    console.log('Memorization data:', {
      memorized_surah_id: student.memorized_surah_id,
      memorized_ayah_number: student.memorized_ayah_number,
      target_surah_id: student.target_surah_id,
      target_ayah_number: student.target_ayah_number
    });
    
    const formattedStudent = {
      ...student,
      memorized_surah_id: student.memorized_surah_id ? String(student.memorized_surah_id) : "",
      memorized_ayah_number: student.memorized_ayah_number ? String(student.memorized_ayah_number) : "",
      target_surah_id: student.target_surah_id ? String(student.target_surah_id) : "",
      target_ayah_number: student.target_ayah_number ? String(student.target_ayah_number) : ""
    };
    
    console.log('Formatted student for form:', formattedStudent);
    setQuranStudent(formattedStudent);
    setShowQuranModal(true);
  };

  const handleQuranSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare Qur'an data
      const quranData = {
        first_name: quranStudent.first_name,
        second_name: quranStudent.second_name,
        third_name: quranStudent.third_name,
        last_name: quranStudent.last_name,
        school_level: quranStudent.school_level,
        status: quranStudent.status
      };
      
      // Add other existing fields if they exist
      if (quranStudent.email && quranStudent.email.trim()) {
        quranData.email = quranStudent.email.trim();
      }
      if (quranStudent.phone && quranStudent.phone.trim()) {
        quranData.phone = quranStudent.phone.trim();
      }
      if (quranStudent.address && quranStudent.address.trim()) {
        quranData.address = quranStudent.address.trim();
      }
      if (quranStudent.date_of_birth) {
        quranData.date_of_birth = quranStudent.date_of_birth;
      }
      if (quranStudent.notes && quranStudent.notes.trim()) {
        quranData.notes = quranStudent.notes.trim();
      }
      if (quranStudent.school_id) {
        quranData.school_id = quranStudent.school_id;
      }
      if (quranStudent.class_id) {
        quranData.class_id = quranStudent.class_id;
      }
      
      // Add Qur'an progress fields
      if (quranStudent.memorized_surah_id && quranStudent.memorized_surah_id !== "") {
        quranData.memorized_surah_id = parseInt(quranStudent.memorized_surah_id);
      }
      if (quranStudent.memorized_ayah_number && quranStudent.memorized_ayah_number !== "") {
        quranData.memorized_ayah_number = parseInt(quranStudent.memorized_ayah_number);
      }
      if (quranStudent.target_surah_id && quranStudent.target_surah_id !== "") {
        quranData.target_surah_id = parseInt(quranStudent.target_surah_id);
      }
      if (quranStudent.target_ayah_number && quranStudent.target_ayah_number !== "") {
        quranData.target_ayah_number = parseInt(quranStudent.target_ayah_number);
      }
      
      console.log('Saving Quran data:', quranData);
      
      // Save the data
      const response = await axios.put(`${API_BASE}/api/students/${quranStudent.id}`, quranData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      console.log('Save response:', response.data);
      
      // Update the students list in the background
      await fetchStudents();
      
      // Keep the modal open but refresh it with updated data
      // Keep the form data as-is since it was successfully saved
      console.log('Keeping form open with saved data');
      
    } catch (err) {
      setError("حدث خطأ في حفظ تقدم القرآن");
      console.error("Error saving Quran progress:", err);
    }
  };

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'suspended' : 'active';
      
      // Check if trying to activate student without school assignment
      if (newStatus === 'active' && !student.school_id) {
        alert("يجب أولاً تسجيل الطالب في مدرسة قبل تفعيل حسابه. يرجى تعديل بيانات الطالب وتحديد المدرسة.");
        return;
      }
      
      // Confirm deactivation
      if (newStatus === 'suspended') {
        const confirmed = window.confirm(
          `هل أنت متأكد من تعليق حساب الطالب "${student.first_name} ${student.last_name}"؟\n` +
          `سيتم منع الطالب من الوصول للمنصة حتى يتم تفعيل حسابه مرة أخرى.`
        );
        if (!confirmed) return;
      }
      
      // Only send the fields needed for update
      const updateData = {
        first_name: student.first_name,
        second_name: student.second_name,
        third_name: student.third_name,
        last_name: student.last_name,
        school_level: student.school_level,
        status: newStatus
      };
      
      // Only include optional fields if they have values
      if (student.email && student.email.trim()) updateData.email = student.email;
      if (student.phone && student.phone.trim()) updateData.phone = student.phone;
      if (student.address && student.address.trim()) updateData.address = student.address;
      if (student.date_of_birth) updateData.date_of_birth = student.date_of_birth;
      if (student.notes && student.notes.trim()) updateData.notes = student.notes;
      if (student.class_id) updateData.class_id = student.class_id;
      
      await axios.put(`${API_BASE}/api/students/${student.id}`, 
        updateData, 
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في تغيير حالة الطالب");
      console.error("Error toggling student status:", err);
      console.error("Response data:", err.response?.data);
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الطالب "${student.first_name} ${student.second_name} ${student.third_name} ${student.last_name}"؟\n\n` +
      `⚠️ تحذير: هذا حذف نهائي من قاعدة البيانات!\n\n` +
      `سيتم حذف:\n` +
      `• بيانات الطالب الشخصية\n` +
      `• حساب المستخدم\n` +
      `• سجلات الحضور والغياب\n` +
      `• التسجيلات في الحلقات\n` +
      `• جميع البيانات المرتبطة\n\n` +
      `⚠️ لا يمكن التراجع عن هذا الإجراء نهائياً!`
    );
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API_BASE}/api/students/${student.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في حذف الطالب");
      console.error("Error deleting student:", err);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.id?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSchool = schoolFilter === "all" || student.school_id == schoolFilter;
    
    return matchesSearch && matchesStatus && matchesSchool;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">إدارة الطلاب</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[var(--color-primary-700)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors flex items-center gap-2"
          >
            <AiOutlinePlus /> إضافة طالب جديد
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">البحث</label>
              <input
                type="text"
                placeholder="البحث بالاسم أو رقم الهوية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="suspended">معلق</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">مجمع الحلقات</label>
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع مجمعات الحلقات</option>
                {schools && schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                إجمالي الطلاب: {filteredStudents.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onView={handleView}
              onEdit={handleEdit}
              onQuranProgress={handleQuranProgress}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteStudent}
            />
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلاب مطابقون لمعايير البحث</p>
          </div>
        )}

        {showForm && (
          <StudentForm
            student={currentStudent}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingStudent(null);
              setCurrentStudent({
                id: "",
                first_name: "",
                second_name: "",
                third_name: "",
                last_name: "",
                email: "",
                phone: "",
                address: "",
                date_of_birth: "",
                school_level: "",
                school_id: "",
                class_id: "",
                status: "active",
                notes: ""
              });
            }}
            isEditing={!!editingStudent}
            onStudentChange={setCurrentStudent}
            schools={schools}
            classes={classes}
          />
        )}

        {showQuranModal && quranStudent && (
          <QuranProgressModal
            student={quranStudent}
            onSubmit={handleQuranSubmit}
            onCancel={() => {
              setShowQuranModal(false);
              setQuranStudent(null);
            }}
            onStudentChange={setQuranStudent}
          />
        )}

        {showDetails && selectedStudent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4">
              <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
                تفاصيل الطالب
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>الاسم الكامل:</strong>
                    <p>{selectedStudent.first_name} {selectedStudent.second_name} {selectedStudent.third_name} {selectedStudent.last_name}</p>
                  </div>
                  <div>
                    <strong>رقم الهوية:</strong>
                    <p>{selectedStudent.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>البريد الإلكتروني:</strong>
                    <p>{selectedStudent.email || "غير محدد"}</p>
                  </div>
                  <div>
                    <strong>الهاتف:</strong>
                    <p>{selectedStudent.phone || "غير محدد"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>المستوى الدراسي:</strong>
                    <p>{selectedStudent.school_level}</p>
                  </div>
                  <div>
                    <strong>الحالة:</strong>
                    <p>{selectedStudent.status === 'active' ? 'نشط' : 'غير نشط'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>مجمع الحلقات:</strong>
                    <p>{selectedStudent.school_name || "غير محدد"}</p>
                  </div>
                  <div>
                    <strong>الحلقة:</strong>
                    <p>{selectedStudent.class_name || "غير محدد"}</p>
                  </div>
                </div>

                {selectedStudent.address && (
                  <div>
                    <strong>العنوان:</strong>
                    <p>{selectedStudent.address}</p>
                  </div>
                )}

                {selectedStudent.notes && (
                  <div>
                    <strong>الملاحظات:</strong>
                    <p>{selectedStudent.notes}</p>
                  </div>
                )}

                {selectedStudent.enrollment_date && (
                  <div>
                    <strong>تاريخ التسجيل:</strong>
                    <p>{new Date(selectedStudent.enrollment_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}