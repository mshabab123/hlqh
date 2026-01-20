import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosConfig";
import { AiOutlineClose } from "react-icons/ai";

const QuranTestingModal = ({ student, courses = [], onClose, onSave, initialTestData = null, viewMode = false }) => {
  const toArabicIndic = (value) =>
    value
      .toString()
      .replace(/\d/g, (digit) => String.fromCharCode(1632 + Number(digit)));

  const [source, setSource] = useState("hafs");
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState("");
  const [ayahs, setAyahs] = useState([]);
  const [fromAyah, setFromAyah] = useState("");
  const [toAyah, setToAyah] = useState("");
  const [rangeMode, setRangeMode] = useState(true);
  const [fromSurah, setFromSurah] = useState("");
  const [toSurah, setToSurah] = useState("");
  const [rangeFromAyah, setRangeFromAyah] = useState("");
  const [rangeToAyah, setRangeToAyah] = useState("");
  const [boxTheme, setBoxTheme] = useState("light");
  const [errorWords, setErrorWords] = useState({});
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [error, setError] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Grade-related states
  const [selectedCourse, setSelectedCourse] = useState("");
  const [maxGrade, setMaxGrade] = useState(100);
  const [gradePerError, setGradePerError] = useState(1);
  const [finalGrade, setFinalGrade] = useState(100);
  const [isGradeManual, setIsGradeManual] = useState(false);

  const buildAyahOptions = (surahNumber) => {
    const surah = surahs.find((item) => item.number === Number(surahNumber));
    if (!surah) return [];
    return Array.from({ length: surah.ayah_count }, (_, i) => String(i + 1));
  };

  useEffect(() => {
    let isMounted = true;
    setLoadingSurahs(true);
    axiosInstance
      .get(`/api/quran/surahs?source=${source}`)
      .then((response) => {
        if (!isMounted) return;
        setSurahs(response.data.surahs || []);
        setError("");
      })
      .catch(() => {
        if (!isMounted) return;
        setError("فشل في تحميل قائمة السور");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingSurahs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [source]);

  useEffect(() => {
    if (!selectedSurah) {
      setAyahs([]);
      setFromAyah("");
      setToAyah("");
      return;
    }

    const selected = surahs.find(
      (surah) => surah.number === Number(selectedSurah)
    );
    if (selected) {
      setFromAyah("1");
      setToAyah(String(selected.ayah_count));
    }

    let isMounted = true;
    setLoadingAyahs(true);
    const params = new URLSearchParams({ source });
    axiosInstance
      .get(`/api/quran/surah/${selectedSurah}?${params.toString()}`)
      .then((response) => {
        if (!isMounted) return;
        setAyahs(response.data.ayahs || []);
        setError("");
      })
      .catch(() => {
        if (!isMounted) return;
        setError("فشل في تحميل الآيات");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingAyahs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSurah, source, surahs]);

  useEffect(() => {
    // Don't clear errorWords if we're in view mode
    if (!viewMode) {
      setErrorWords({});
    }
  }, [ayahs, viewMode]);

  // Initialize with test data when viewing an existing test
  useEffect(() => {
    if (initialTestData && surahs.length > 0) {
      console.log('Initializing with test data:', initialTestData);
      console.log('Error details:', initialTestData.error_details);
      setRangeMode(true);
      setFromSurah(initialTestData.start_surah);
      setToSurah(initialTestData.end_surah);
      setRangeFromAyah(initialTestData.start_ayah);
      setRangeToAyah(initialTestData.end_ayah);
      setSelectedCourse(initialTestData.course_id);
      setMaxGrade(initialTestData.max_grade);
      setGradePerError(initialTestData.grade_per_error || 1);
      setTestNotes(initialTestData.notes);

      // Auto-load the ayahs for the range
      if (initialTestData.start_surah && initialTestData.end_surah) {
        const params = new URLSearchParams({
          source,
          fromSurah: initialTestData.start_surah,
          toSurah: initialTestData.end_surah,
        });
        if (initialTestData.start_ayah) params.set("fromAyah", initialTestData.start_ayah);
        if (initialTestData.end_ayah) params.set("toAyah", initialTestData.end_ayah);

        setLoadingAyahs(true);
        axiosInstance
          .get(`/api/quran/range?${params.toString()}`)
          .then((response) => {
            setAyahs(response.data.ayahs || []);
            // Set error words AFTER ayahs are loaded
            setErrorWords(initialTestData.error_details || {});
            setError("");
          })
          .catch(() => {
            setError("فشل في تحميل الآيات");
          })
          .finally(() => {
            setLoadingAyahs(false);
          });
      }
    }
  }, [initialTestData, surahs, source, viewMode]);

  const applyFilter = () => {
    if (rangeMode) {
      if (!fromSurah || !toSurah) return;
      const params = new URLSearchParams({
        source,
        fromSurah,
        toSurah,
      });
      if (rangeFromAyah) params.set("fromAyah", rangeFromAyah);
      if (rangeToAyah) params.set("toAyah", rangeToAyah);
      setLoadingAyahs(true);
      axiosInstance
        .get(`/api/quran/range?${params.toString()}`)
        .then((response) => {
          setAyahs(response.data.ayahs || []);
          setError("");
        })
        .catch(() => {
          setError("فشل في تحميل الآيات");
        })
        .finally(() => {
          setLoadingAyahs(false);
        });
      return;
    }

    if (!selectedSurah) return;
    const params = new URLSearchParams({ source });
    if (fromAyah) params.set("from", fromAyah);
    if (toAyah) params.set("to", toAyah);

    setLoadingAyahs(true);
    axiosInstance
      .get(`/api/quran/surah/${selectedSurah}?${params.toString()}`)
      .then((response) => {
        setAyahs(response.data.ayahs || []);
        setError("");
      })
      .catch(() => {
        setError("فشل في تحميل الآيات");
      })
      .finally(() => {
        setLoadingAyahs(false);
      });
  };

  const getAyahKey = (ayah) => {
    const surahPart = ayah.surah_number || selectedSurah || "0";
    return `${surahPart}-${ayah.ayah_number}`;
  };

  const toggleWordError = (ayahKey, wordIndex) => {
    // Don't allow editing in view mode
    if (viewMode) return;

    setErrorWords((prev) => {
      const next = { ...prev };
      const current = new Set(next[ayahKey] || []);
      if (current.has(wordIndex)) {
        current.delete(wordIndex);
      } else {
        current.add(wordIndex);
      }
      next[ayahKey] = Array.from(current);
      return next;
    });
  };

  const totalErrors = Object.values(errorWords).reduce(
    (sum, words) => sum + (words?.length || 0),
    0
  );

  // Calculate final grade: max_grade - (errors * grade per error)
  const calculatedGrade = Math.max(0, maxGrade - (totalErrors * gradePerError));

  useEffect(() => {
    if (!isGradeManual) {
      setFinalGrade(calculatedGrade);
    }
  }, [calculatedGrade, isGradeManual]);

  // Generate HTML representation of Quran text with errors highlighted
  const generateQuranErrorDisplay = () => {
    if (ayahs.length === 0) return '';

    let html = '<div dir="rtl" style="font-family: \'Amiri\', \'Traditional Arabic\', serif; font-size: 18px; line-height: 2; text-align: right;">';

    ayahs.forEach((ayah, index) => {
      const ayahKey = getAyahKey(ayah);
      const errorSet = new Set(errorWords[ayahKey] || []);
      const showHeader = rangeMode && (index === 0 || ayah.surah_number !== ayahs[index - 1]?.surah_number);
      const words = ayah.text.split(/\s+/).filter(Boolean);

      if (showHeader) {
        html += `<div style="font-weight: bold; margin: 10px 0; font-family: sans-serif; font-size: 16px;">${ayah.surah_name_ar}</div>`;
      }

      html += '<span>';
      words.forEach((word, wordIndex) => {
        const hasError = errorSet.has(wordIndex);
        html += `<span style="${hasError ? 'color: #dc2626; font-weight: bold;' : ''}">${word} </span>`;
      });
      html += `<span style="font-family: sans-serif; font-size: 14px;">(${toArabicIndic(ayah.ayah_number)})</span>`;
      html += '</span><br/>';
    });

    html += '</div>';
    return html;
  };

  const handleSaveTest = async () => {
    if (ayahs.length === 0) {
      setError("لا توجد آيات للحفظ");
      return;
    }

    if (!selectedCourse) {
      setError("يرجى اختيار المقرر");
      return;
    }

    setIsSaving(true);
    try {
      // Generate Quran error display HTML
      const quranErrorDisplay = generateQuranErrorDisplay();

      // Prepare test data
      const testData = {
        student_id: student.id,
        course_id: selectedCourse,
        test_date: new Date().toISOString().split('T')[0],
        total_errors: totalErrors,
        max_grade: maxGrade,
        grade_per_error: gradePerError,
        calculated_grade: Number(finalGrade) || 0,
        computed_grade: calculatedGrade,
        error_details: errorWords,
        quran_error_display: quranErrorDisplay,
        start_surah: rangeMode ? fromSurah : selectedSurah,
        start_ayah: rangeMode ? rangeFromAyah : fromAyah,
        end_surah: rangeMode ? toSurah : selectedSurah,
        end_ayah: rangeMode ? rangeToAyah : toAyah,
        notes: testNotes
      };

      // Call the onSave callback if provided
      if (onSave) {
        await onSave(testData);
      }

      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error saving test:", error);
      setError("فشل في حفظ نتيجة الاختبار");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {viewMode ? "عرض نتيجة اختبار القرآن" : "اختبار القرآن"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              الطالب: {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </p>
            {viewMode && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                (وضع العرض فقط - لا يمكن التعديل)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <AiOutlineClose className="text-2xl text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-4 rounded-lg space-y-4 sticky top-20">
                <div>
                  <label className="block text-sm font-medium mb-2">مصدر النص</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setSelectedSurah("");
                      setAyahs([]);
                      setFromSurah("");
                      setToSurah("");
                      setRangeFromAyah("");
                      setRangeToAyah("");
                    }}
                    disabled={loadingSurahs}
                  >
                    <option value="uthmani">عثماني</option>
                    <option value="hafs">حفص الذكي V8</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="mode"
                      checked={!rangeMode}
                      onChange={() => setRangeMode(false)}
                    />
                    سورة واحدة
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="mode"
                      checked={rangeMode}
                      onChange={() => {
                        setRangeMode(true);
                        setSelectedSurah("");
                        setAyahs([]);
                      }}
                    />
                    نطاق سور
                  </label>
                </div>

                {!rangeMode && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">اختر سورة</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedSurah}
                        onChange={(e) => setSelectedSurah(e.target.value)}
                        disabled={loadingSurahs}
                      >
                        <option value="">اختر سورة...</option>
                        {surahs.map((surah) => (
                          <option key={surah.number} value={surah.number}>
                            {surah.number}. {surah.name_arabic}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">من آية</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={fromAyah}
                          onChange={(e) => setFromAyah(e.target.value)}
                          disabled={!selectedSurah}
                        >
                          <option value="">اختر...</option>
                          {buildAyahOptions(selectedSurah).map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">إلى آية</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={toAyah}
                          onChange={(e) => setToAyah(e.target.value)}
                          disabled={!selectedSurah}
                        >
                          <option value="">اختر...</option>
                          {buildAyahOptions(selectedSurah).map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {rangeMode && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">من سورة</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={fromSurah}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFromSurah(value);
                            const options = buildAyahOptions(value);
                            setRangeFromAyah(options[0] || "");
                          }}
                          disabled={loadingSurahs}
                        >
                          <option value="">اختر...</option>
                          {surahs.map((surah) => (
                            <option key={surah.number} value={surah.number}>
                              {surah.number}. {surah.name_arabic}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">إلى سورة</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={toSurah}
                          onChange={(e) => {
                            const value = e.target.value;
                            setToSurah(value);
                            const options = buildAyahOptions(value);
                            setRangeToAyah(options[options.length - 1] || "");
                          }}
                          disabled={loadingSurahs}
                        >
                          <option value="">اختر...</option>
                          {surahs.map((surah) => (
                            <option key={surah.number} value={surah.number}>
                              {surah.number}. {surah.name_arabic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">من آية</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={rangeFromAyah}
                          onChange={(e) => setRangeFromAyah(e.target.value)}
                          disabled={!fromSurah}
                        >
                          <option value="">اختر...</option>
                          {buildAyahOptions(fromSurah).map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">إلى آية</label>
                        <select
                          className="w-full border rounded px-3 py-2"
                          value={rangeToAyah}
                          onChange={(e) => setRangeToAyah(e.target.value)}
                          disabled={!toSurah}
                        >
                          <option value="">اختر...</option>
                          {buildAyahOptions(toSurah).map((ayah) => (
                            <option key={ayah} value={ayah}>
                              {ayah}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <button
                  className="w-full px-4 py-2 rounded bg-[#06bfbf] text-white disabled:opacity-60 hover:bg-[#05a5a5] transition-colors"
                  onClick={applyFilter}
                  disabled={
                    loadingAyahs || (!rangeMode && !selectedSurah) || (rangeMode && (!fromSurah || !toSurah))
                  }
                >
                  عرض الآيات
                </button>

                {loadingSurahs && <p className="text-sm text-gray-600">جاري تحميل السور...</p>}
                {error && <p className="text-red-600 text-sm">{error}</p>}

                {/* Theme Selection */}
                <div className="pt-4 border-t">
                  <span className="text-sm font-medium block mb-2">المظهر:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`quran-theme-btn flex-1 ${boxTheme === "light" ? "active" : ""}`}
                      onClick={() => setBoxTheme("light")}
                    >
                      فاتح
                    </button>
                    <button
                      type="button"
                      className={`quran-theme-btn flex-1 ${boxTheme === "dark" ? "active" : ""}`}
                      onClick={() => setBoxTheme("dark")}
                    >
                      داكن
                    </button>
                    <button
                      type="button"
                      className={`quran-theme-btn flex-1 ${boxTheme === "parchment" ? "active" : ""}`}
                      onClick={() => setBoxTheme("parchment")}
                    >
                      رق
                    </button>
                  </div>
                </div>

                {/* Course and Grade Section */}
                {ayahs.length > 0 && (
                  <>
                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2">اختر المقرر *</label>
                        <select
                          className="w-full border rounded px-3 py-2 text-sm"
                          value={selectedCourse}
                          onChange={(e) => {
                            const courseId = e.target.value;
                            setSelectedCourse(courseId);
                            setIsGradeManual(false);
                          }}
                        >
                          <option value="">اختر المقرر...</option>
                          {courses
                            .filter(course => course.requires_surah)
                            .map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">الدرجة المخصومة لكل خطأ</label>
                        <input
                          type="number"
                          className="w-full border rounded px-3 py-2 text-sm"
                          value={gradePerError}
                          onChange={(e) => setGradePerError(Number(e.target.value))}
                          min="0"
                          max="100"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">الدرجة النهائية</label>
                        <input
                          type="number"
                          className="w-full border rounded px-3 py-2 text-sm"
                          value={finalGrade}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setIsGradeManual(true);
                            if (raw === "") {
                              setFinalGrade("");
                              return;
                            }
                            const next = Math.max(0, Math.min(maxGrade, Number(raw)));
                            setFinalGrade(Number.isNaN(next) ? 0 : next);
                          }}
                          onBlur={() => {
                            if (finalGrade === "") {
                              setIsGradeManual(false);
                              setFinalGrade(calculatedGrade);
                            }
                          }}
                          min="0"
                          max={maxGrade}
                          step="0.5"
                          disabled={viewMode}
                        />
                        <p className="text-xs text-gray-500 mt-1">المحسوبة تلقائيا: {calculatedGrade} من {maxGrade}</p>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          الدرجة النهائية: {calculatedGrade} من {maxGrade}
                        </p>
                        <p className="text-xs text-blue-700">
                          الحساب: {maxGrade} - ({totalErrors} × {gradePerError}) = {calculatedGrade}
                        </p>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="pt-4 border-t">
                      <label className="block text-sm font-medium mb-2">ملاحظات</label>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm"
                        rows="3"
                        placeholder="أضف ملاحظات عن الاختبار..."
                        value={testNotes}
                        onChange={(e) => setTestNotes(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel - Quran Display */}
            <div className="lg:col-span-2">
              {loadingAyahs && <p className="text-center py-8">جاري تحميل الآيات...</p>}
              {!loadingAyahs && ayahs.length > 0 && (
                <div>
                  <div className={`quran-box quran-box--${boxTheme}`}>
                    <div className="flex gap-2" style={{ position: 'sticky', top: '72px', left: 0, zIndex: 2 }}>
                      <div className="quran-total-errors">
                        <div className="quran-total-label">عدد الأخطاء</div>
                        <div className="quran-total-count">{totalErrors}</div>
                      </div>
                      <div style={{
                        width: '120px',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '2px solid #3b82f6',
                        backgroundColor: '#dbeafe',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ fontSize: '9px', color: '#1e40af', marginBottom: '1px' }}>الدرجة</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e40af' }}>
                          {finalGrade}/{maxGrade}
                        </div>
                        <div style={{ fontSize: '7px', color: '#1e40af', marginTop: '1px' }}>
                          (-{gradePerError}×{totalErrors})
                        </div>
                      </div>
                    </div>
                    <div
                      dir="rtl"
                      lang="ar"
                      className="quran-box__content space-y-4 text-2xl leading-relaxed font-quran"
                    >
                      <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm font-sans">
                        <p className="text-blue-800">
                          💡 <strong>تعليمات:</strong> انقر نقرًا مزدوجًا على أي كلمة لتحديدها كخطأ
                        </p>
                      </div>
                      {ayahs.map((ayah, index) => {
                        const ayahKey = getAyahKey(ayah);
                        const errorSet = new Set(errorWords[ayahKey] || []);
                        const showHeader =
                          rangeMode &&
                          (index === 0 ||
                            ayah.surah_number !== ayahs[index - 1]?.surah_number);
                        const words = ayah.text.split(/\s+/).filter(Boolean);
                        const errorCount = errorSet.size;
                        return (
                          <div key={ayahKey}>
                            {showHeader && (
                              <h2 className="text-lg font-semibold mb-2 font-sans">
                                {ayah.surah_number}. {ayah.surah_name_ar}
                              </h2>
                            )}
                            <div className="quran-ayah-row">
                              <span
                                className={`quran-error-box ${
                                  errorCount ? "quran-error-box--active" : ""
                                }`}
                              >
                                {errorCount}
                              </span>
                              <p>
                                {words.map((word, wordIndex) => (
                                  <span
                                    key={`${ayahKey}-${wordIndex}`}
                                    className={`quran-word ${
                                      errorSet.has(wordIndex) ? "quran-word--error" : ""
                                    }`}
                                    onDoubleClick={() =>
                                      toggleWordError(ayahKey, wordIndex)
                                    }
                                  >
                                    {word}{" "}
                                  </span>
                                ))}
                                <span
                                  className="font-sans text-base align-middle"
                                  dir="ltr"
                                >
                                  ({toArabicIndic(ayah.ayah_number)})
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 flex gap-3 justify-end">
                    {!viewMode ? (
                      <>
                        <button
                          onClick={onClose}
                          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveTest}
                          disabled={isSaving || ayahs.length === 0 || !selectedCourse}
                          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? "جاري الحفظ..." : "حفظ نتيجة الاختبار"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={onClose}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        إغلاق
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!loadingAyahs && ayahs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>اختر سورة أو نطاق سور لبدء الاختبار</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuranTestingModal;
