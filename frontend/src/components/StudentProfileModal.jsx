import { useState, useEffect } from "react";
import axios from "axios";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "./QuranData";
import { 
  surahGroups, 
  getMaxVerse, 
  getSurahIdFromName,
  calculateStudentGoalProgress,
  calculateTotalScore
} from "../utils/classUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentProfileModal = ({ student, classItem, onBack, onClose }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState({
    grade_value: '',
    max_grade: 100,
    notes: '',
    start_surah: '',
    start_verse: '',
    end_surah: '',
    end_verse: ''
  });
  const [goalProgress, setGoalProgress] = useState({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState({
    target_surah: '',
    target_ayah_number: '',
    target_date: ''
  });
  const [savingGoal, setSavingGoal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student && classItem) {
      fetchStudentProfile();
    }
  }, [student, classItem]);

  // Calculate goal progress whenever studentData changes
  useEffect(() => {
    if (studentData?.goal && studentData?.grades) {
      calculateGoalProgress();
    }
  }, [studentData]);

  const calculateGoalProgress = () => {
    if (!studentData) {
      setGoalProgress({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
      return;
    }

    const progress = calculateStudentGoalProgress(studentData);
    setGoalProgress(progress);
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/student/${student.id}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setStudentData(response.data);
    } catch (err) {
      setError("فشل في تحميل ملف الطالب");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrade = (course) => {
    setSelectedCourse(course);
    setGradeInput({
      grade_value: '',
      max_grade: 100,
      notes: '',
      start_surah: '',
      start_verse: '',
      end_surah: '',
      end_verse: ''
    });
    setError('');
  };

  const saveGoal = async () => {
    if (!goalInput.target_surah || !goalInput.target_ayah_number) {
      setError('يرجى تحديد السورة والآية المستهدفة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSavingGoal(true);
      
      const response = await axios.put(
        `${API_BASE}/api/classes/${classItem.id}/student/${student.id}/goal`,
        {
          target_surah_id: getSurahIdFromName(goalInput.target_surah),
          target_ayah_number: parseInt(goalInput.target_ayah_number)
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local data with new goal
      setStudentData({
        ...studentData,
        goal: response.data.goal
      });
      
      setShowGoalForm(false);
      setGoalInput({
        target_surah: '',
        target_ayah_number: '',
        target_date: ''
      });
      
      // Refresh the student profile to get updated data
      fetchStudentProfile();
      
      // Show success message
      alert('تم حفظ الهدف بنجاح!');
      
    } catch (err) {
      console.error('Error saving goal:', err);
      setError(err.response?.data?.error || "فشل في حفظ الهدف");
      setTimeout(() => setError(''), 5000);
    } finally {
      setSavingGoal(false);
    }
  };

  const saveGrade = async () => {
    if (!gradeInput.grade_value) {
      setError('يرجى إدخال الدرجة');
      return;
    }

    // Build reference strings for Quran verses
    const start_ref = gradeInput.start_surah && gradeInput.start_verse ? 
      `${gradeInput.start_surah}:${gradeInput.start_verse}` : '';
    const end_ref = gradeInput.end_surah && gradeInput.end_verse ? 
      `${gradeInput.end_surah}:${gradeInput.end_verse}` : '';

    try {
      setSaving(true);
      await axios.post(`${API_BASE}/api/classes/${classItem.id}/grades`, {
        student_id: student.id,
        course_id: selectedCourse.id,
        grade_value: parseFloat(gradeInput.grade_value),
        max_grade: parseFloat(gradeInput.max_grade),
        notes: gradeInput.notes,
        grade_type: 'memorization',
        start_reference: start_ref,
        end_reference: end_ref
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSelectedCourse(null);
      setGradeInput({
        grade_value: '', max_grade: 100, notes: '',
        start_surah: '', start_verse: '', end_surah: '', end_verse: ''
      });
      fetchStudentProfile();
      
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ الدرجة");
    } finally {
      setSaving(false);
    }
  };

  if (!student || !classItem) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <div className="text-center">جاري تحميل ملف الطالب...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-lg"
            >
              ← العودة للقائمة
            </button>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-primary-700)]">
              ملف الطالب: {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h2>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {studentData && (
          <div className="space-y-6">
            {/* Student Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 md:gap-4 bg-gray-50 p-2 sm:p-3 md:p-4 rounded-lg">
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{calculateTotalScore(studentData)}%</div>
                <div className="text-xs sm:text-sm text-gray-600">المجموع الكلي</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{studentData.grades?.length || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600">إجمالي الدرجات</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">
                  {studentData.memorized_pages || 0}
                  <span className="text-xs sm:text-sm text-gray-500">/{studentData.total_pages || TOTAL_QURAN_PAGES}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">الصفحات المحفوظة</div>
                <div className="text-[10px] sm:text-xs text-indigo-500">
                  {studentData.pages_percentage ? `${studentData.pages_percentage}%` : '0%'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-base md:text-lg font-bold text-purple-600">{student.school_level}</div>
                <div className="text-xs sm:text-sm text-gray-600">المستوى</div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-base md:text-lg font-bold text-orange-600">{classItem.name}</div>
                <div className="text-xs sm:text-sm text-gray-600">الحلقة</div>
              </div>
            </div>
 
            {/* Goal and Progress Section */}
            {studentData.goal?.target_surah_id && (
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
                        const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                        const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;
                        
                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };
                        
                        if (!currentSurahId || currentSurahId === 0) {
                          // No current memorization - start from beginning
                          return `من سورة الناس إلى سورة ${getCurrentSurahName(targetSurahId)} الآية ${targetAyah}`;
                        } else if (currentSurahId === targetSurahId) {
                          // Same surah
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          if (currentAyah >= targetAyah) {
                            return `🎉 تم تحقيق الهدف - سورة ${currentSurahName} الآية ${currentAyah}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${currentAyah + 1} إلى الآية ${targetAyah}`;
                          }
                        } else {
                          // Different surahs
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          const targetSurahName = getCurrentSurahName(targetSurahId);
                          if (currentSurahId < targetSurahId) {
                            return `🎉 تم تجاوز الهدف - الحالي: سورة ${currentSurahName}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${currentAyah + 1} إلى سورة ${targetSurahName} الآية ${targetAyah}`;
                          }
                        }
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">إحصائيات الهدف الحالي:</h4>
                    <div className="space-y-3">
                      {(() => {
                        const progress = calculateStudentGoalProgress(studentData);
                        const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                        const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;
                        
                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };
                        
                        // Calculate pages for goal progress
                        const calculateGoalPages = () => {
                          if (!targetSurahId || !targetAyah) return { goalPages: 0, currentPages: 0, remainingPages: 0 };
                          
                          let goalPages = 0;
                          let currentPages = 0;
                          
                          // Calculate total pages needed for the goal (from current position to target)
                          if (!currentSurahId || currentSurahId === 0) {
                            // No current memorization - calculate from beginning (Surah 114) to target
                            for (let surahId = 114; surahId >= targetSurahId; surahId--) {
                              const surah = QURAN_SURAHS.find(s => s.id === surahId);
                              if (!surah) continue;
                              
                              if (surahId === targetSurahId) {
                                // Target surah - calculate pages for target ayahs
                                const ayahProgress = Math.min(targetAyah, surah.ayahCount) / surah.ayahCount;
                                goalPages += Math.ceil(ayahProgress * surah.totalPages);
                              } else {
                                // Complete surah
                                goalPages += surah.totalPages;
                              }
                            }
                            currentPages = 0; // Nothing memorized yet
                          } else {
                            // Calculate pages from current position to target position
                            const currentSurahIdInt = parseInt(currentSurahId);
                            const currentAyahInt = parseInt(currentAyah);
                            
                            if (currentSurahIdInt < targetSurahId || 
                                (currentSurahIdInt === targetSurahId && currentAyahInt >= targetAyah)) {
                              // Goal already achieved
                              goalPages = 1; // Minimum for calculation
                              currentPages = 1;
                            } else {
                              // Calculate pages needed from current to target
                              for (let surahId = currentSurahIdInt; surahId >= targetSurahId; surahId--) {
                                const surah = QURAN_SURAHS.find(s => s.id === surahId);
                                if (!surah) continue;
                                
                                if (surahId === currentSurahIdInt && surahId === targetSurahId) {
                                  // Same surah - calculate pages from current ayah to target ayah
                                  const ayahsNeeded = targetAyah - currentAyahInt;
                                  const ayahProgress = ayahsNeeded / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else if (surahId === currentSurahIdInt) {
                                  // Current surah - pages from current ayah to end
                                  const remainingAyahs = surah.ayahCount - currentAyahInt;
                                  const ayahProgress = remainingAyahs / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else if (surahId === targetSurahId) {
                                  // Target surah - pages from beginning to target ayah
                                  const ayahProgress = targetAyah / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else {
                                  // Complete surah in between
                                  goalPages += surah.totalPages;
                                }
                              }
                              currentPages = 0; // Not achieved yet
                            }
                          }
                          
                          return { 
                            goalPages, 
                            currentPages, 
                            remainingPages: Math.max(0, goalPages - currentPages) 
                          };
                        };
                        
                        const goalPagesInfo = calculateGoalPages();
                        const isGoalAchieved = progress.percentage >= 100;
                        
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                            {/* Goal Status */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">حالة الهدف</div>
                              <div className={`text-xs sm:text-sm font-bold ${isGoalAchieved ? 'text-green-600' : 'text-blue-600'}`}>
                                {isGoalAchieved ? '🎉 تم تحقيق الهدف' : '📚 قيد التحقيق'}
                              </div>
                            </div>
                            
                            {/* Current Position */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الموقع الحالي</div>
                              <div className="text-xs sm:text-sm font-bold text-purple-600">
                                {currentSurahId ? `سورة ${getCurrentSurahName(currentSurahId)} - آية ${currentAyah}` : 'لم يبدأ بعد'}
                              </div>
                            </div>
                            
                            {/* Target Position */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الهدف المطلوب</div>
                              <div className="text-xs sm:text-sm font-bold text-orange-600">
                                سورة {getCurrentSurahName(targetSurahId)} - آية {targetAyah}
                              </div>
                            </div>
                            
                            {/* Remaining Verses */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الآيات المتبقية</div>
                              <div className="text-xs sm:text-sm font-bold text-red-600">
                                {isGoalAchieved ? '0 آية' : `${progress.totalGoalVerses - progress.memorizedVerses} آية`}
                              </div>
                            </div>
                            
                            {/* Remaining Pages */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الصفحات المتبقية</div>
                              <div className="text-xs sm:text-sm font-bold text-indigo-600">
                                {isGoalAchieved ? '0 صفحة' : `${goalPagesInfo.remainingPages} صفحة`}
                              </div>
                            </div>
                            
                            {/* Total Goal Pages */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">إجمالي صفحات الهدف</div>
                              <div className="text-xs sm:text-sm font-bold text-cyan-600">
                                {goalPagesInfo.goalPages} صفحة
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Goal Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>تقدم الهدف:</span>
                          <span className="font-bold">
                            {(() => {
                              const progress = calculateStudentGoalProgress(studentData);
                              return `${progress.memorizedVerses} من ${progress.totalGoalVerses} آية`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full transition-all duration-500 ${
                              (() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return progress.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500';
                              })()
                            }`}
                            style={{ 
                              width: `${(() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return Math.min(100, progress.percentage);
                              })()}%` 
                            }}
                          >
                            <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                              {(() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return Math.min(100, progress.percentage);
                              })()}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!studentData.goal?.target_surah_id && (
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

            {/* Goal Setting Form */}
            {showGoalForm && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4">
                  {studentData.goal?.target_surah_id ? 'تعديل الهدف' : 'تحديد هدف جديد'}
                </h3>
                
                <div className="space-y-4">
                  {/* Surah Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">السورة المستهدفة:</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={goalInput.target_surah}
                      onChange={(e) => {
                        const selectedSurah = e.target.value;
                        let defaultAyah = "";
                        
                        // Set last ayah as default when selecting a surah
                        if (selectedSurah) {
                          defaultAyah = getMaxVerse(selectedSurah).toString();
                        }
                        
                        setGoalInput({
                          ...goalInput, 
                          target_surah: selectedSurah, 
                          target_ayah_number: defaultAyah
                        });
                      }}
                    >
                      <option value="">اختر السورة</option>
                      {[...QURAN_SURAHS].reverse().map(surah => (
                        <option key={surah.id} value={surah.name}>
                          {surah.id}. {surah.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Verse */}
                  {goalInput.target_surah && (
                    <div>
                      <label className="block text-sm font-medium mb-1">الآية المستهدفة (من الآية 1 إلى الآية المحددة):</label>
                      <input
                        type="number"
                        min="1"
                        max={getMaxVerse(goalInput.target_surah)}
                        className="w-full p-2 border rounded"
                        value={goalInput.target_ayah_number}
                        onChange={(e) => {
                          const verse = parseInt(e.target.value);
                          const maxVerse = getMaxVerse(goalInput.target_surah);
                          if (verse <= maxVerse || !verse) {
                            setGoalInput({...goalInput, target_ayah_number: e.target.value});
                          }
                        }}
                        placeholder={`1 - ${getMaxVerse(goalInput.target_surah)}`}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                        saveGoal();
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={savingGoal}
                    >
                      حفظ الهدف
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Courses and Grade Entry Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-3">المواد الدراسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentData.courses?.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleAddGrade(course)}
                    className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-center font-medium"
                  >
                    {course.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade Entry Form */}
            {selectedCourse && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4">
                  إضافة درجة جديدة - {selectedCourse.name}
                </h3>

                <div className="space-y-4">
                  {/* Grade Input */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">الدرجة:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="الدرجة"
                        className="w-20 p-2 border rounded"
                        value={gradeInput.grade_value}
                        onChange={(e) => setGradeInput({...gradeInput, grade_value: e.target.value})}
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="w-20 p-2 border rounded"
                        value={gradeInput.max_grade}
                        onChange={(e) => setGradeInput({...gradeInput, max_grade: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Quran Reference Fields - Only show for courses that require Quran references */}
                  {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">من (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.start_surah}
                            onChange={(e) => setGradeInput({...gradeInput, start_surah: e.target.value, start_verse: ''})}
                          >
                            <option value="">اختر السورة</option>
                            {surahGroups.map((group, groupIndex) => (
                              <optgroup key={groupIndex} label={group.title}>
                                {group.surahs.map((surah, surahIndex) => (
                                  <option key={surahIndex} value={surah}>
                                    {surah}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.start_surah ? getMaxVerse(gradeInput.start_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.start_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.start_surah);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, start_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.start_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.start_surah)} آية` : ''}
                          />
                          {gradeInput.start_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.start_surah)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">إلى (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.end_surah}
                            onChange={(e) => setGradeInput({...gradeInput, end_surah: e.target.value, end_verse: ''})}
                          >
                            <option value="">اختر السورة</option>
                            {surahGroups.map((group, groupIndex) => (
                              <optgroup key={groupIndex} label={group.title}>
                                {group.surahs.map((surah, surahIndex) => (
                                  <option key={surahIndex} value={surah}>
                                    {surah}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.end_surah ? getMaxVerse(gradeInput.end_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.end_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.end_surah);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, end_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.end_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.end_surah)} آية` : ''}
                          />
                          {gradeInput.end_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.end_surah)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="ملاحظات (اختياري)"
                      className="flex-1 p-2 border rounded"
                      value={gradeInput.notes}
                      onChange={(e) => setGradeInput({...gradeInput, notes: e.target.value})}
                    />
                    <button
                      onClick={saveGrade}
                      className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={saving}
                    >
                      {saving ? 'حفظ...' : 'حفظ الدرجة'}
                    </button>
                    <button
                      onClick={() => setSelectedCourse(null)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>

                {/* Course Grade History */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-3">تاريخ درجات {selectedCourse.name}</h4>
                  <div className="bg-white rounded-lg border max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-center text-sm border">الدرجة</th>
                          {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                            <th className="p-2 text-center text-sm border">المرجع القرآني</th>
                          )}
                          <th className="p-2 text-center text-sm border">التاريخ</th>
                          <th className="p-2 text-right text-sm border">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).map(grade => (
                          <tr key={grade.id} className="hover:bg-gray-50">
                            <td className="p-2 text-center font-medium border text-sm">
                              {grade.grade_value}/{grade.max_grade}
                              <div className="text-xs text-gray-600">
                                ({((parseFloat(grade.grade_value) / parseFloat(grade.max_grade)) * 100).toFixed(1)}%)
                              </div>
                            </td>
                            {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                              <td className="p-2 text-center text-xs border">
                                {grade.start_reference && grade.end_reference 
                                  ? `${grade.start_reference} - ${grade.end_reference}`
                                  : grade.start_reference || '-'
                                }
                              </td>
                            )}
                            <td className="p-2 text-center text-xs border">
                              {new Date(grade.date_graded || grade.created_at).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-2 text-xs border">
                              {grade.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {(!studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).length) && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        لا توجد درجات سابقة لهذه المادة
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            العودة لقائمة الطلاب
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;