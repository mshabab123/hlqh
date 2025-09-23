import { useState, useEffect } from "react";
import { AiOutlineBook, AiOutlineCheck } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import { calculateQuranProgress, calculateStudentGoalProgress, calculateGoalProgressBar, getProgressColor, getProgressBgColor, generateAyahOptions, formatMemorizationDisplay, calculatePageNumber, calculateCircularChartData } from "../utils/studentUtils";
import CircularProgressChart from "./CircularProgressChart";

const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showForms, setShowForms] = useState(false);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);

  // Calculate progress
  const progress = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number);
  const targetProgress = calculateQuranProgress(student.target_surah_id, student.target_ayah_number);

  // Calculate circular chart data with grades
  const circularChartData = calculateCircularChartData(student, studentGrades);


  // Helper function to get memorization position (1-114) from surah ID
  const getMemorizationPosition = (surahId) => {
    const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
    return index !== -1 ? index + 1 : 0;
  };

  // Fetch student grades on component mount
  useEffect(() => {
    const fetchStudentGrades = async () => {
      if (!student.id || !student.class_id) {
        setLoadingGrades(false);
        return;
      }

      try {
        setLoadingGrades(true);
        const token = localStorage.getItem('token');

        // Try to get current semester ID - we'll use a reasonable default if not available
        let semesterId = student.semester_id || 1; // Default to semester 1

        const response = await fetch(
          `/api/grading/student/${student.id}/class/${student.class_id}/semester/${semesterId}/grades`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.courseGrades) {
            // Extract all grades from all courses
            const allGrades = [];
            data.courseGrades.forEach(course => {
              if (course.grades) {
                allGrades.push(...course.grades);
              }
            });
            setStudentGrades(allGrades);
          }
        } else {
          console.warn('Could not fetch student grades:', response.status);
        }
      } catch (error) {
        console.error('Error fetching student grades:', error);
      } finally {
        setLoadingGrades(false);
      }
    };

    fetchStudentGrades();
  }, [student.id, student.class_id, student.semester_id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-lg mb-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
              <AiOutlineBook className="text-xl" />
              الهدف والتقدم
            </h3>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {student.first_name} {student.second_name} {student.last_name}
            </div>
          </div>
        </div>

        <>
          {/* Combined Progress Display with Goal */}
          <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <AiOutlineCheck className="text-green-600" />
              الهدف والتقدم - إحصائيات الحفظ
            </h4>

            {/* Goal Information */}
            {student.target_surah_id && (
              <div className="mb-6 p-4 bg-white/80 rounded-lg border border-blue-200">
                <h5 className="text-sm font-medium text-gray-700 mb-2">الهدف المحدد:</h5>
                <p className="text-base font-bold text-blue-700">
                  {(() => {
                    const currentSurahId = parseInt(student.memorized_surah_id) || 0;
                    const currentAyah = parseInt(student.memorized_ayah_number) || 0;
                    const targetSurahId = parseInt(student.target_surah_id) || 0;
                    const targetAyah = parseInt(student.target_ayah_number) || 0;

                    const getCurrentSurahName = (surahId) => {
                      const surah = QURAN_SURAHS.find(s => s.id == surahId);
                      return surah ? surah.name : '';
                    };

                    const getCurrentSurahWithPosition = (surahId) => {
                      const position = getMemorizationPosition(surahId);
                      const name = getCurrentSurahName(surahId);
                      return position > 0 ? `سورة ${name} (${position})` : `سورة ${name}`;
                    };

                    // Calculate page information for display
                    const targetDisplay = formatMemorizationDisplay(targetSurahId, targetAyah);
                    const currentDisplay = currentSurahId ?
                      formatMemorizationDisplay(currentSurahId, currentAyah) :
                      { display: 'سورة الفاتحة (صفحة 1)', pageNumber: 1 };

                    if (!currentSurahId || currentSurahId === 0) {
                      // No current memorization - start from الفاتحة (position 1)
                      const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);
                      return `من سورة الفاتحة آية 1 إلى ${targetSurahWithPos} آية ${targetAyah} (من صفحة 1 إلى صفحة ${targetDisplay.pageNumber})`;
                    } else {
                      const currentPosition = getMemorizationPosition(currentSurahId);
                      const targetPosition = getMemorizationPosition(targetSurahId);

                      if (currentSurahId === targetSurahId) {
                        // Same surah
                        const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                        if (currentAyah >= targetAyah) {
                          return `🎉 تم تحقيق الهدف - ${currentSurahWithPos} آية ${currentAyah} (صفحة ${currentDisplay.pageNumber})`;
                        } else {
                          return `من ${currentSurahWithPos} آية ${currentAyah + 1} إلى آية ${targetAyah} (من صفحة ${currentDisplay.pageNumber} إلى صفحة ${targetDisplay.pageNumber})`;
                        }
                      } else {
                        // Different surahs - check memorization positions
                        const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                        const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);

                        if (currentPosition > targetPosition) {
                          return `🎉 تم تجاوز الهدف - الحالي: ${currentSurahWithPos} آية ${currentAyah} (صفحة ${currentDisplay.pageNumber})`;
                        } else {
                          return `من ${currentSurahWithPos} آية ${currentAyah + 1} إلى ${targetSurahWithPos} آية ${targetAyah} (من صفحة ${currentDisplay.pageNumber} إلى صفحة ${targetDisplay.pageNumber})`;
                        }
                      }
                    }
                  })()}
                </p>
              </div>
            )}

            <div className="flex justify-center">
              {/* Current Progress Chart */}
              <div className="space-y-4 max-w-lg w-full">
                <h5 className="font-medium text-gray-700">التقدم الحالي مع التقييمات</h5>

                {loadingGrades ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>جاري تحميل بيانات التقييم...</p>
                  </div>
                ) : circularChartData.totalProgressPages > 0 ? (
                  <>
                    {/* New Circular Progress Chart */}
                    <div className="flex items-center justify-center">
                      <CircularProgressChart
                        chartData={circularChartData}
                        size={280}
                        strokeWidth={24}
                        showLabels={true}
                        showPercentages={true}
                      />
                    </div>

                    {/* Progress Stats - Enhanced with grading info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-600 mb-1">الصفحات المحفوظة</div>
                        <div className="font-bold text-green-600">{circularChartData.memorizedPages}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-600 mb-1">صفحات الهدف</div>
                        <div className="font-bold text-red-600">{circularChartData.targetPages}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-600 mb-1">الصفحات المُقيّمة</div>
                        <div className="font-bold text-blue-600">{circularChartData.gradedPages}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-gray-600 mb-1">السور المكتملة</div>
                        <div className="font-bold text-purple-600">{progress.completedSurahs}</div>
                      </div>
                    </div>

                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <AiOutlineBook className="mx-auto text-4xl mb-2 opacity-50" />
                    <p>لم يبدأ الحفظ بعد</p>
                  </div>
                )}
              </div>

            </div>
          </div>


          {/* Edit Target Button or Action Buttons */}
        <div className="mb-6 text-center">
          {!showForms ? (
            <button
              onClick={() => setShowForms(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <AiOutlineBook className="w-4 h-4" />
              تعديل الهدف
            </button>
          ) : (
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onSubmit(e, student);
                  setShowForms(false);
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <AiOutlineCheck className="w-4 h-4" />
                حفظ التغييرات
              </button>
              <button
                type="button"
                onClick={() => setShowForms(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
        </>

        {/* Forms and Buttons Section */}
        <>
          {/* Forms Section - Conditional Display */}
          {showForms && (
            <div className="space-y-6">
              <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
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
                          let defaultAyah = "";

                          // Set last ayah as default when selecting a surah
                          if (newSurahId) {
                            const surah = QURAN_SURAHS.find(s => s.id == newSurahId);
                            if (surah) {
                              defaultAyah = surah.ayahCount.toString();
                            }
                          }

                          onStudentChange({
                            ...student,
                            memorized_surah_id: newSurahId,
                            memorized_ayah_number: defaultAyah
                          });
                        }}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">اختر السورة</option>
                        {QURAN_SURAHS.map((surah, index) => (
                          <option key={surah.id} value={surah.id}>
                            {index + 1}. {surah.name}
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
                    الهدف
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">السورة المستهدفة</label>
                      <select
                        value={student.target_surah_id || ""}
                        onChange={(e) => {
                          const newSurahId = e.target.value;
                          let defaultAyah = "";

                          // Set last ayah as default when selecting a surah
                          if (newSurahId) {
                            const surah = QURAN_SURAHS.find(s => s.id == newSurahId);
                            if (surah) {
                              defaultAyah = surah.ayahCount.toString();
                            }
                          }

                          onStudentChange({
                            ...student,
                            target_surah_id: newSurahId,
                            target_ayah_number: defaultAyah
                          });
                        }}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر السورة</option>
                        {QURAN_SURAHS.map((surah, index) => (
                          <option key={surah.id} value={surah.id}>
                            {index + 1}. {surah.name}
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

            </div>
          )}

          {/* Always visible close button when forms are hidden */}
          {!showForms && (
            <div className="flex justify-center pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                إغلاق
              </button>
            </div>
          )}
        </>

      </div>
    </div>
  );
};

export default QuranProgressModal;