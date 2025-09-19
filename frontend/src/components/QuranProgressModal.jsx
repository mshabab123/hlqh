import { useState } from "react";
import { AiOutlineBook, AiOutlineCheck } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import { calculateQuranProgress, calculateStudentGoalProgress, getProgressColor, getProgressBgColor, generateAyahOptions } from "../utils/studentUtils";

const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showForms, setShowForms] = useState(false);

  // Calculate progress
  const progress = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number);
  const targetProgress = calculateQuranProgress(student.target_surah_id, student.target_ayah_number);

  // Helper function to get memorization position (1-114) from surah ID
  const getMemorizationPosition = (surahId) => {
    const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
    return index !== -1 ? index + 1 : 0;
  };

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

        {/* Goal and Progress Section */}
        {student.target_surah_id && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">الهدف والتقدم</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المحدد:</h4>
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

                    if (!currentSurahId || currentSurahId === 0) {
                      // No current memorization - start from الفاتحة (position 1)
                      const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);
                      return `من سورة الفاتحة (1) إلى ${targetSurahWithPos} الآية ${targetAyah}`;
                    } else {
                      const currentPosition = getMemorizationPosition(currentSurahId);
                      const targetPosition = getMemorizationPosition(targetSurahId);

                      if (currentSurahId === targetSurahId) {
                        // Same surah
                        const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                        if (currentAyah >= targetAyah) {
                          return `🎉 تم تحقيق الهدف - ${currentSurahWithPos} الآية ${currentAyah}`;
                        } else {
                          return `من ${currentSurahWithPos} الآية ${currentAyah + 1} إلى الآية ${targetAyah}`;
                        }
                      } else {
                        // Different surahs - check memorization positions
                        const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                        const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);

                        if (currentPosition > targetPosition) {
                          return `🎉 تم تجاوز الهدف - الحالي: ${currentSurahWithPos}`;
                        } else {
                          return `من ${currentSurahWithPos} الآية ${currentAyah + 1} إلى ${targetSurahWithPos} الآية ${targetAyah}`;
                        }
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

        {/* Button to toggle Forms */}
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowForms(!showForms)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <AiOutlineBook className="w-4 h-4" />
            {showForms ? 'إخفاء النماذج' : 'عرض نماذج التعديل'}
          </button>
        </div>

        {/* Progress Display */}
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
          <h4 className="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
            <AiOutlineCheck className="text-green-600" />
            إحصائيات الحفظ
          </h4>

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
                          <div className="text-xs text-gray-600">آيات</div>
                          <div className={`text-sm font-semibold ${getProgressColor(progress.pagesPercentage)}`}>
                            {progress.pagesPercentage}%
                          </div>
                          <div className="text-xs text-gray-600">صفحات</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-600 mb-1">الآيات المحفوظة</div>
                      <div className="font-bold text-green-600">{progress.memorizedAyahs.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-600 mb-1">الصفحات المحفوظة</div>
                      <div className="font-bold text-blue-600">{progress.memorizedPages}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-600 mb-1">السور المكتملة</div>
                      <div className="font-bold text-purple-600">{progress.completedSurahs}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-600 mb-1">المتبقي</div>
                      <div className="font-bold text-orange-600">{progress.remainingAyahs.toLocaleString()}</div>
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

            {/* Target Progress */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">تقدم الهدف</h5>

              {targetProgress.percentage > 0 ? (
                <>
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onSubmit(e, student);
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <AiOutlineCheck className="w-4 h-4" />
                  حفظ التغييرات
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  إغلاق
                </button>
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