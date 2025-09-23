import { useState, useEffect } from "react";
import { AiOutlineBook, AiOutlineCheck } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import { calculateQuranProgress, calculateStudentGoalProgress, calculateGoalProgressBar, getProgressColor, getProgressBgColor, generateAyahOptions, formatMemorizationDisplay, calculatePageNumber, calculateCircularChartData } from "../utils/studentUtils";
import CircularProgressChart from "./CircularProgressChart";

const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showForms, setShowForms] = useState(false);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);

  // Debug logging
  console.log('QuranProgressModal - Received student data:', student);
  console.log('QuranProgressModal - Student grades:', studentGrades);
  console.log('QuranProgressModal - Target data analysis:', {
    target_surah_id: student.target_surah_id,
    target_ayah_number: student.target_ayah_number,
    memorized_surah_id: student.memorized_surah_id,
    memorized_ayah_number: student.memorized_ayah_number
  });

  // Calculate progress
  const progress = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number);
  const targetProgress = calculateQuranProgress(student.target_surah_id, student.target_ayah_number);

  // Calculate circular chart data with grades
  const circularChartData = calculateCircularChartData(student, studentGrades);

  console.log('QuranProgressModal - Progress calculation:', progress);
  console.log('QuranProgressModal - Circular chart data:', circularChartData);


  // Helper function to get memorization position (1-114) from surah ID
  const getMemorizationPosition = (surahId) => {
    const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
    return index !== -1 ? index + 1 : 0;
  };

  // Fetch student grades on component mount
  useEffect(() => {
    const fetchStudentGrades = async () => {
      console.log('QuranProgressModal - Attempting to fetch grades for student_id:', student.id);

      if (!student.id) {
        console.log('QuranProgressModal - Missing student ID for grade fetching');
        setLoadingGrades(false);
        return;
      }

      try {
        setLoadingGrades(true);
        const token = localStorage.getItem('token');

        // Use simple API endpoint with just student_id
        const apiUrl = `/api/grades/student/${student.id}`;

        console.log('QuranProgressModal - Fetching grades from:', apiUrl);

        const response = await fetch(apiUrl,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('QuranProgressModal - Grade API response:', data);

          if (data.success && data.courseGrades) {
            // Extract all grades from all courses
            const allGrades = [];
            data.courseGrades.forEach(course => {
              if (course.grades) {
                allGrades.push(...course.grades);
              }
            });
            console.log('QuranProgressModal - Extracted grades:', allGrades);
            setStudentGrades(allGrades);
          }
        } else {
          console.warn('QuranProgressModal - Could not fetch student grades:', response.status);
        }
      } catch (error) {
        console.error('Error fetching student grades:', error);
      } finally {
        setLoadingGrades(false);
      }
    };

    fetchStudentGrades();
  }, [student.id]);

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

                    {/* الهدف والتقدم - إحصائيات الحفظ */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <h6 className="font-semibold text-gray-800 mb-4 text-center">الهدف والتقدم - إحصائيات الحفظ</h6>

                      {/* Overall Progress Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h7 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            📚 إجمالي التقدم
                          </h7>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">الآيات المحفوظة:</span>
                              <span className="font-bold text-green-600">{progress.memorizedAyahs.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">إجمالي الآيات:</span>
                              <span className="font-bold text-gray-800">{progress.totalAyahs.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">النسبة المئوية:</span>
                              <span className="font-bold text-blue-600">{progress.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h7 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            🎯 تقدم الهدف
                          </h7>
                          <div className="space-y-2 text-sm">
                            {(() => {
                              console.log('TARGET SURAH CHECK:', {
                                target_surah_id: student.target_surah_id,
                                target_surah_id_type: typeof student.target_surah_id,
                                target_surah_id_truthy: !!student.target_surah_id,
                                target_ayah_number: student.target_ayah_number
                              });
                              return student.target_surah_id && student.target_surah_id !== "" && student.target_surah_id !== "0";
                            })() ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">الهدف المحدد:</span>
                                  <span className="font-bold text-purple-600">
                                    {QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.name || 'غير محدد'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">نسبة إنجاز الهدف:</span>
                                  <span className="font-bold text-red-600">
                                    {circularChartData.targetCompletionPercentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">صفحات متبقية:</span>
                                  <span className="font-bold text-orange-600">
                                    {Math.max(0, circularChartData.targetPages - circularChartData.gradedPages)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="text-center text-gray-500 py-2">
                                <span>السورة المستهدفة: لم يتم تحديد هدف بعد</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Quran Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-green-600">{progress.memorizedPages.toFixed(1)}</div>
                          <div className="text-xs text-green-700">صفحة محفوظة</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-blue-600">{progress.completedSurahs}</div>
                          <div className="text-xs text-blue-700">سورة مكتملة</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-purple-600">{(progress.memorizedPages / 20).toFixed(1)}</div>
                          <div className="text-xs text-purple-700">جزء تقريبي</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-orange-600">{progress.remainingAyahs.toLocaleString()}</div>
                          <div className="text-xs text-orange-700">آية متبقية</div>
                        </div>
                      </div>

                      {/* Grade Activity Summary */}
                      {circularChartData.gradedPages > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h7 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            📝 ملخص التقييمات
                          </h7>
                          <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div>
                              <div className="text-lg font-bold text-blue-600">{circularChartData.gradedPages}</div>
                              <div className="text-xs text-gray-600">صفحة مُقيّمة</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                {((circularChartData.gradedPages / circularChartData.memorizedPages) * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">من المحفوظ</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">{studentGrades.length}</div>
                              <div className="text-xs text-gray-600">عدد التقييمات</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Position Information */}
                      <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
                        <h7 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          📍 الموقع الحالي
                        </h7>
                        <div className="text-sm space-y-2">
                          {student.memorized_surah_id ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">السورة الحالية:</span>
                                <span className="font-bold text-green-600">
                                  {QURAN_SURAHS.find(s => s.id == student.memorized_surah_id)?.name || 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">آخر آية محفوظة:</span>
                                <span className="font-bold text-green-600">{student.memorized_ayah_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">رقم الصفحة:</span>
                                <span className="font-bold text-blue-600">{progress.currentPageNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">ترتيب الحفظ:</span>
                                <span className="font-bold text-purple-600">
                                  {getMemorizationPosition(student.memorized_surah_id)} من 114
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-gray-500 py-2">
                              <span>لم يبدأ الحفظ بعد</span>
                            </div>
                          )}
                        </div>
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
                      <p className="text-xs text-gray-600 mt-1">
                        * الترقيم حسب ترتيب الحفظ (الفاتحة→الناس→الفلق...)
                      </p>
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
                        <option value="">
                          {student.memorized_surah_id ? "اختر السورة المستهدفة" : "اختر السورة"}
                        </option>
                        {(() => {
                          const availableSurahs = QURAN_SURAHS.filter(surah => {
                            // Always include the current target surah if it's set
                            if (student.target_surah_id && surah.id == student.target_surah_id) {
                              return true;
                            }

                            // If no current memorization, show all surahs except the last ones
                            if (!student.memorized_surah_id) {
                              return getMemorizationPosition(surah.id) <= 110; // Show first 110 surahs as potential targets
                            }

                            const currentPosition = getMemorizationPosition(student.memorized_surah_id);
                            const surahPosition = getMemorizationPosition(surah.id);

                            // Target should be before current in memorization order
                            return surahPosition < currentPosition;
                          });

                          if (availableSurahs.length === 0 && student.memorized_surah_id) {
                            return (
                              <option value="" disabled className="text-gray-500">
                                🏆 مبروك! وصلت للفاتحة - لا توجد أهداف إضافية
                              </option>
                            );
                          }

                          // Sort by memorization position for consistent ordering
                          const sortedSurahs = availableSurahs.sort((a, b) =>
                            getMemorizationPosition(a.id) - getMemorizationPosition(b.id)
                          );

                          return sortedSurahs.map((surah, index) => (
                            <option key={surah.id} value={surah.id}>
                                {getMemorizationPosition(surah.id)}. {surah.name}
                              {student.target_surah_id && surah.id == student.target_surah_id ? ' (الهدف الحالي)' : ''}
                            </option>
                          ));
                        })()}
                      </select>
                      {student.memorized_surah_id ? (
                        <p className="text-xs text-gray-600 mt-1">
                          * يجب أن يكون الهدف قبل الموضع الحالي (ترتيب {getMemorizationPosition(student.memorized_surah_id)}) في ترتيب الحفظ
                        </p>
                      ) : (
                        <p className="text-xs text-blue-600 mt-1">
                          💡 يمكنك اختيار أي سورة كهدف. ننصح بالبدء بهدف قريب مثل سور الجزء الثلاثين
                        </p>
                      )}

                      {/* Show count of available targets */}
                      {(() => {
                        const availableCount = QURAN_SURAHS.filter(surah => {
                          if (!student.memorized_surah_id) {
                            return getMemorizationPosition(surah.id) <= 110;
                          }
                          const currentPosition = getMemorizationPosition(student.memorized_surah_id);
                          const surahPosition = getMemorizationPosition(surah.id);
                          return surahPosition < currentPosition;
                        }).length;

                        if (availableCount > 0) {
                          return (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ {availableCount} سورة متاحة كأهداف
                            </p>
                          );
                        } else if (student.memorized_surah_id) {
                          return (
                            <p className="text-xs text-orange-600 mt-1">
                              🏆 تم إكمال جميع الأهداف الممكنة - أنت في المقدمة!
                            </p>
                          );
                        }
                        return null;
                      })()}
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
                        <div className="mt-2 text-xs text-blue-700">
                          📍 ترتيب الحفظ: {getMemorizationPosition(student.target_surah_id)} من 114
                        </div>
                      </div>
                    )}

                    {/* Goal Progress Information */}
                    {student.memorized_surah_id && student.target_surah_id && (
                      <div className="p-3 bg-yellow-50 rounded-lg text-sm border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-yellow-600">🎯</span>
                          <strong className="text-yellow-800">مسافة الهدف:</strong>
                        </div>
                        <div className="text-xs space-y-1">
                          <div>من: ترتيب {getMemorizationPosition(student.memorized_surah_id)} ({QURAN_SURAHS.find(s => s.id == student.memorized_surah_id)?.name})</div>
                          <div>إلى: ترتيب {getMemorizationPosition(student.target_surah_id)} ({QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.name})</div>
                          <div className="font-medium text-yellow-700">
                            المسافة: {getMemorizationPosition(student.memorized_surah_id) - getMemorizationPosition(student.target_surah_id)} موضع في ترتيب الحفظ
                          </div>
                        </div>
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