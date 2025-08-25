import { useState } from "react";
import { AiOutlineBook, AiOutlineCheck } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "./QuranData";
import { calculateQuranProgress, calculateStudentGoalProgress, getProgressColor, getProgressBgColor, generateAyahOptions } from "../utils/studentUtils";

const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showGoalForm, setShowGoalForm] = useState(false);

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
                    const currentSurahId = parseInt(student.memorized_surah_id) || 0;
                    const currentAyah = parseInt(student.memorized_ayah_number) || 0;
                    const targetSurahId = parseInt(student.target_surah_id) || 0;
                    const targetAyah = parseInt(student.target_ayah_number) || 0;
                    
                    const getCurrentSurahName = (surahId) => {
                      const surah = QURAN_SURAHS.find(s => s.id == surahId);
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
          <div className="text-sm text-gray-600 mb-4 bg-blue-100 p-3 rounded space-y-2">
            <p>📖 <strong>نظام الحفظ:</strong> يبدأ من سورة الناس (114) وينتهي بسورة البقرة (2) - الطريقة التقليدية للحفظ</p>
            <p>📄 <strong>صفحات المصحف:</strong> المصحف الكامل يحتوي على {TOTAL_QURAN_PAGES} صفحة، ويتم عرض تقدم الحفظ بالآيات والصفحات معاً</p>
          </div>
          
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
                    <div className="flex justify-between border-t pt-2">
                      <span>الصفحات المحفوظة:</span>
                      <span className="font-bold text-green-600">{progress.memorizedPages} صفحة</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي الصفحات:</span>
                      <span className="font-bold">{progress.totalPages} صفحة</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الصفحات المتبقية:</span>
                      <span className="font-bold text-orange-600">{progress.remainingPages} صفحة</span>
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
                        <div className="text-xs text-green-600 mt-1">
                          📖 {progress.pagesPercentage}% من صفحات المصحف
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
          
          {/* Goal Setting Form */}
          {showGoalForm && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4">
                {student.target_surah_id ? 'تعديل الهدف' : 'تحديد هدف جديد'}
              </h3>
              
              <div className="space-y-4">
                {/* Surah Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">السورة المستهدفة:</label>
                  <select
                    className="w-full p-2 border rounded"
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
                  >
                    <option value="">اختر السورة</option>
                    {[...QURAN_SURAHS].reverse().map(surah => (
                      <option key={surah.id} value={surah.id}>
                        {surah.id}. {surah.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Verse */}
                {student.target_surah_id && (
                  <div>
                    <label className="block text-sm font-medium mb-1">الآية المستهدفة (من الآية 1 إلى الآية المحددة):</label>
                    <input
                      type="number"
                      min="1"
                      max={QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.ayahCount || 1}
                      className="w-full p-2 border rounded"
                      value={student.target_ayah_number || ""}
                      onChange={(e) => {
                        const verse = parseInt(e.target.value);
                        const maxVerse = QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.ayahCount || 1;
                        if (verse <= maxVerse || !verse) {
                          onStudentChange({...student, target_ayah_number: e.target.value});
                        }
                      }}
                      placeholder={`1 - ${QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.ayahCount || 1}`}
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
                      onSubmit();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    حفظ الهدف
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default QuranProgressModal;