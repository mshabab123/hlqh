import { useState, useEffect, useRef } from "react";
import { AiOutlineBook, AiOutlineCheck } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import { calculateQuranProgress, calculateStudentGoalProgress, calculateGoalProgressBar, getProgressColor, getProgressBgColor, generateAyahOptions, formatMemorizationDisplay, calculatePageNumber, calculateCircularChartData } from "../utils/studentUtils";
import CircularProgressChart from "./CircularProgressChart";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function jsonHeaders(token) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json'
  };
}

const QuranProgressModal = ({ student, onSubmit, onCancel, onStudentChange }) => {
  const [showForms, setShowForms] = useState(false);
  const [studentGrades, setStudentGrades] = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [selectedSurahId, setSelectedSurahId] = useState(student.target_surah_id || "");
  const [selectedAyahNumber, setSelectedAyahNumber] = useState(student.target_ayah_number || "");
  const [selectedMemorizedSurahId, setSelectedMemorizedSurahId] = useState(student.memorized_surah_id || "");
  const [selectedMemorizedAyahNumber, setSelectedMemorizedAyahNumber] = useState(student.memorized_ayah_number || "");
  const formRef = useRef(null);

  // Debug logging
  console.log('QuranProgressModal - Received student data:', student);
  console.log('QuranProgressModal - Student grades:', studentGrades);
  console.log('QuranProgressModal - Target data analysis:', {
    target_surah_id: student.target_surah_id,
    target_ayah_number: student.target_ayah_number,
    memorized_surah_id: student.memorized_surah_id,
    memorized_ayah_number: student.memorized_ayah_number
  });
  console.log('QuranProgressModal - onStudentChange function:', onStudentChange);
  console.log('QuranProgressModal - onStudentChange type:', typeof onStudentChange);

  // Calculate progress
  const progress = calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number);
  const targetProgress = calculateQuranProgress(student.target_surah_id, student.target_ayah_number);


  console.log('QuranProgressModal - Progress calculation:', progress);


  // Helper function to get memorization position (1-114) from surah ID
  const getMemorizationPosition = (surahId) => {
    const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
    return index !== -1 ? index + 1 : 0;
  };

  const fetchSemesterId = async (token) => {
    try {
      const listRes = await fetch(`${API_BASE}/api/semesters`, {
        credentials: "include",
        headers: jsonHeaders(token)
      });

      if (!listRes.ok) return null;
      const listData = await listRes.json();
      const semesters = Array.isArray(listData?.semesters)
        ? listData.semesters
        : Array.isArray(listData?.data)
          ? listData.data
          : Array.isArray(listData)
            ? listData
            : [];

      if (!semesters.length) return null;

      const byDate = [...semesters].sort((a, b) => {
        const aTime = new Date(a.end_date || a.start_date || 0).getTime();
        const bTime = new Date(b.end_date || b.start_date || 0).getTime();
        return (bTime || 0) - (aTime || 0);
      });

      const datePick = byDate.find(s => s.end_date || s.start_date);
      if (datePick?.id) return datePick.id;

      const byId = [...semesters].sort((a, b) => (b.id || 0) - (a.id || 0));
      return byId[0]?.id || null;
    } catch {
      return null;
    }
  };

  const fetchAllSemestersGrades = async (token) => {
    const listRes = await fetch(`${API_BASE}/api/semesters`, {
      credentials: "include",
      headers: jsonHeaders(token)
    });

    if (!listRes.ok) return [];

    const listData = await listRes.json();
    const semesters = Array.isArray(listData?.semesters)
      ? listData.semesters
      : Array.isArray(listData?.data)
        ? listData.data
        : Array.isArray(listData)
          ? listData
          : [];

    const ids = semesters.map((s) => s.id).filter(Boolean);
    if (!ids.length) return [];

    const requests = ids.map((semesterId) =>
      fetch(`${API_BASE}/api/grades/student/${student.id}?semester_id=${semesterId}`, {
        credentials: "include",
        headers: jsonHeaders(token)
      }).then(async (res) => (res.ok ? res.json() : null))
    );

    const results = await Promise.all(requests);
    const allGrades = [];
    results.forEach((data) => {
      if (!data) return;
      if (Array.isArray(data)) {
        allGrades.push(...data);
      } else if (Array.isArray(data?.grades)) {
        allGrades.push(...data.grades);
      } else if (Array.isArray(data?.data)) {
        allGrades.push(...data.data);
      } else if (Array.isArray(data?.courseGrades)) {
        data.courseGrades.forEach((course) => {
          if (Array.isArray(course.grades)) {
            allGrades.push(...course.grades);
          }
        });
      }
    });

    const seen = new Set();
    return allGrades.filter((grade) => {
      const key = grade?.id ?? JSON.stringify(grade);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

        const semesterId = await fetchSemesterId(token);
        const apiUrl = semesterId
          ? `${API_BASE}/api/grades/student/${student.id}?semester_id=${semesterId}`
          : `${API_BASE}/api/grades/student/${student.id}`;

        console.log('QuranProgressModal - Fetching grades from:', apiUrl);

        const response = await fetch(apiUrl,
          {
            credentials: "include",
            headers: jsonHeaders(token)
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('QuranProgressModal - Grade API response:', data);

          let allGrades = [];
          if (Array.isArray(data)) {
            allGrades = data;
          } else if (Array.isArray(data?.grades)) {
            allGrades = data.grades;
          } else if (Array.isArray(data?.data)) {
            allGrades = data.data;
          } else if (Array.isArray(data?.courseGrades)) {
            data.courseGrades.forEach(course => {
              if (Array.isArray(course.grades)) {
                allGrades.push(...course.grades);
              }
            });
          }

          if (!allGrades.length) {
            const mergedGrades = await fetchAllSemestersGrades(token);
            console.log('QuranProgressModal - Extracted grades across semesters:', mergedGrades);
            setStudentGrades(mergedGrades);
          } else {
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

  useEffect(() => {
    if (showForms && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForms]);


  const memorizationCourseKeywords = [
    "تحفيظ القرآن",
    "تحفيظ",
    "حفظ القرآن",
    "الحفظ",
    "قرآن"
  ];

  const getGradeTimestamp = (grade) => {
    const raw = grade?.date_graded || grade?.created_at || grade?.updated_at || null;
    const ts = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  };

  const latestGrade = [...studentGrades].sort((a, b) => getGradeTimestamp(b) - getGradeTimestamp(a))[0] || null;

  const getRefInfo = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'number') {
      return { page: ref };
    }
    if (typeof ref === 'string' && ref.includes(':')) {
      const [surahId, ayah] = ref.split(':').map(Number);
      if (!surahId || !ayah) return null;
      return { surahId, ayah };
    }
    const page = Number(ref);
    return Number.isFinite(page) && page > 0 ? { page } : null;
  };

  const getGradeStartRef = (grade) => {
    if (!grade) return null;
    if (grade.start_reference || grade.end_reference) {
      return getRefInfo(grade.start_reference || grade.end_reference);
    }
    if (grade.start_surah_id && grade.start_ayah_number) {
      return { surahId: Number(grade.start_surah_id), ayah: Number(grade.start_ayah_number) };
    }
    if (grade.end_surah_id && grade.end_ayah_number) {
      return { surahId: Number(grade.end_surah_id), ayah: Number(grade.end_ayah_number) };
    }
    return null;
  };

  const getGradeEndRef = (grade) => {
    if (!grade) return null;
    if (grade.end_reference || grade.start_reference) {
      return getRefInfo(grade.end_reference || grade.start_reference);
    }
    if (grade.end_surah_id && grade.end_ayah_number) {
      return { surahId: Number(grade.end_surah_id), ayah: Number(grade.end_ayah_number) };
    }
    if (grade.start_surah_id && grade.start_ayah_number) {
      return { surahId: Number(grade.start_surah_id), ayah: Number(grade.start_ayah_number) };
    }
    return null;
  };

  const getSurahName = (surahId) => {
    const surah = QURAN_SURAHS.find(s => s.id == surahId);
    return surah ? surah.name : null;
  };

  const getPageFromRef = (refInfo) => {
    if (!refInfo) return null;
    if (refInfo.page) return refInfo.page;
    if (refInfo.surahId && refInfo.ayah) {
      return calculatePageNumber(refInfo.surahId, refInfo.ayah);
    }
    return null;
  };

  const memorizationGrades = studentGrades.filter((grade) => {
    if (grade?.grade_type === 'memorization') return true;
    const name = (grade?.course_name || '').toLowerCase();
    return memorizationCourseKeywords.some((keyword) => name.includes(keyword.toLowerCase()));
  });

  const getRefRank = (ref) => {
    if (!ref?.surahId || !ref?.ayah) return null;
    const position = QURAN_SURAHS.findIndex((s) => s.id == ref.surahId) + 1;
    if (!position) return null;
    return { position, ayah: Number(ref.ayah) || 0 };
  };

  const pickLastMemorizedRef = (grade) => {
    const startRef = getGradeEndRef({ ...grade, end_reference: grade.start_reference });
    const endRef = getGradeEndRef(grade);
    if (!startRef && !endRef) return null;

    if (startRef?.surahId && endRef?.surahId && startRef.surahId === endRef.surahId) {
      return Number(endRef.ayah) >= Number(startRef.ayah) ? endRef : startRef;
    }

    const startRank = getRefRank(startRef);
    const endRank = getRefRank(endRef);

    if (startRank && endRank) {
      if (startRank.position !== endRank.position) {
        return startRank.position > endRank.position ? startRef : endRef;
      }
      return startRank.ayah >= endRank.ayah ? startRef : endRef;
    }

    return endRef || startRef;
  };

  const getGradeRangePages = (grade) => {
    const startRef = getGradeEndRef({ ...grade, end_reference: grade.start_reference });
    const endRef = getGradeEndRef(grade);
    const startPage = getPageFromRef(startRef);
    const endPage = getPageFromRef(endRef);
    if (startPage && endPage) {
      return { minPage: Math.min(startPage, endPage), maxPage: Math.max(startPage, endPage) };
    }
    if (startPage) return { minPage: startPage, maxPage: startPage };
    if (endPage) return { minPage: endPage, maxPage: endPage };
    return null;
  };

  const lastMemorizedGrade = memorizationGrades
    .map((grade) => ({
      grade,
      range: getGradeRangePages(grade),
      timestamp: getGradeTimestamp(grade)
    }))
    .sort((a, b) => {
      if (a.range && b.range) return a.range.minPage - b.range.minPage;
      if (a.range) return -1;
      if (b.range) return 1;
      return b.timestamp - a.timestamp;
    })[0]?.grade || latestGrade;

  const lastMemorizedRef = memorizationGrades
    .map((grade) => pickLastMemorizedRef(grade))
    .filter(Boolean)
    .sort((a, b) => {
      const aRank = getRefRank(a);
      const bRank = getRefRank(b);
      if (!aRank && !bRank) return 0;
      if (!aRank) return 1;
      if (!bRank) return -1;
      if (aRank.position !== bRank.position) return bRank.position - aRank.position;
      return bRank.ayah - aRank.ayah;
    })[0] || null;

  // Calculate circular chart data with grades (use last memorized ref when available)
  const chartStudent = lastMemorizedRef
    ? {
        ...student,
        memorized_surah_id: lastMemorizedRef.surahId || student.memorized_surah_id,
        memorized_ayah_number: lastMemorizedRef.ayah || student.memorized_ayah_number
      }
    : student;
  const baseCircularChartData = calculateCircularChartData(chartStudent, studentGrades);
  const memorizedPageNumbers = Array.isArray(baseCircularChartData.memorizedPageNumbers)
    ? baseCircularChartData.memorizedPageNumbers
    : [];
  const gradedPageNumbers = (() => {
    const pages = new Set();
    studentGrades.forEach((grade) => {
      const startRef = getGradeStartRef(grade);
      const endRef = getGradeEndRef(grade);
      const startPage = getPageFromRef(startRef);
      const endPage = getPageFromRef(endRef);
      if (!startPage && !endPage) return;
      const minPage = Math.min(startPage || endPage, endPage || startPage);
      const maxPage = Math.max(startPage || endPage, endPage || startPage);
      for (let page = Math.round(minPage); page <= Math.round(maxPage); page += 1) {
        pages.add(page);
      }
    });
    return Array.from(pages);
  })();
  const circularChartData = {
    ...baseCircularChartData,
    memorizedPageNumbers,
    gradedPageNumbers
  };
  const totalPagesCount = circularChartData.totalPages || 604;
  const memorizedCount = memorizedPageNumbers.length;
  const memorizedPercent = totalPagesCount ? (memorizedCount / totalPagesCount) * 100 : 0;
  const targetPageNumbers = Array.isArray(circularChartData.targetPageNumbers)
    ? circularChartData.targetPageNumbers
    : [];
  const memorizedSet = new Set(memorizedPageNumbers);
  const gradedSet = new Set(gradedPageNumbers);
  const targetPagesCount = targetPageNumbers.length;
  const gradedCountInTarget = targetPageNumbers.filter((page) => memorizedSet.has(page) || gradedSet.has(page)).length;
  const remainingTargetPages = Math.max(0, targetPagesCount - gradedCountInTarget);
  const targetCompletionPercent = targetPagesCount ? (gradedCountInTarget / targetPagesCount) * 100 : 0;
  const gradedPercentOfMemorized = memorizedCount ? (gradedCountInTarget / memorizedCount) * 100 : 0;
  const lastMemorizedPage = memorizedPageNumbers.length
    ? Math.max(...memorizedPageNumbers)
    : 0;

  useEffect(() => {
    if (!showForms || !lastMemorizedRef) return;
    if (lastMemorizedRef.surahId) {
      setSelectedMemorizedSurahId(String(lastMemorizedRef.surahId));
    }
    if (lastMemorizedRef.ayah) {
      setSelectedMemorizedAyahNumber(String(lastMemorizedRef.ayah));
    }
  }, [showForms, lastMemorizedRef]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto relative">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-lg mb-6 relative">
          <button
            onClick={() => setShowForms(true)}
            disabled={showForms}
            className={`absolute top-4 right-4 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showForms ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} text-white`}
          >
            <AiOutlineBook className="w-4 h-4" />
            تعديل الهدف
          </button>
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

          {/* Forms and Buttons Section */}
          {/* Forms Section - Conditional Display */}
          {showForms && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setShowForms(false)}
            >
              <div
                ref={formRef}
                className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-y-auto p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowForms(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="إغلاق"
                >
                  ×
                </button>
                <div className="space-y-6">
                  <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
                {/* Current Memorization */}
                <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                  <h5 className="font-semibold text-lg text-green-700 flex items-center gap-2">
                    <AiOutlineCheck className="text-green-600" />
                  اخر سورة تم حفظها سابقا ( الترم الماضي ان وجد)
                  </h5>


                   <p className="text-xs text-gray-600 mt-1">
                        * ان لم يكن متواجد الترم الماضي فيحدد المعلم اخر سورة حفظها ومن الافضل اختبار الطالب قبل هذا الاجراء 
                      </p>


                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">السورة المحفوظة</label>
                      <select
                        value={selectedMemorizedSurahId}
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

                          setSelectedMemorizedSurahId(newSurahId);
                          setSelectedMemorizedAyahNumber(defaultAyah);

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
                        value={selectedMemorizedAyahNumber}
                        onChange={(e) => {
                          const newAyahNumber = e.target.value;
                          setSelectedMemorizedAyahNumber(newAyahNumber);

                          if (onStudentChange && typeof onStudentChange === 'function') {
                            onStudentChange({
                              ...student,
                              memorized_ayah_number: newAyahNumber
                            });
                          }
                        }}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={!selectedMemorizedSurahId}
                      >
                        <option value="">اختر الآية</option>
                        {generateAyahOptions(selectedMemorizedSurahId).map(ayahNum => (
                          <option key={ayahNum} value={ayahNum}>الآية {ayahNum}</option>
                        ))}
                      </select>
                    </div>

                    

                    {lastMemorizedGrade ? (
                      (() => {
                        const chosenRef = lastMemorizedRef || pickLastMemorizedRef(lastMemorizedGrade);

                        const pageNumber = getPageFromRef(chosenRef);
                        const surahName = chosenRef?.surahId ? getSurahName(chosenRef.surahId) : null;
                        const ayahNumber = chosenRef?.ayah || null;

                        return (
                          <div className="p-3 bg-white rounded-lg border border-green-200 text-sm">
                            <div className="font-semibold text-green-700 mb-1">{"آخر حفظ مسجل"}</div>
                            <div>{"السورة"}: {surahName || "-"}</div>
                            <div>{"الآية"}: {ayahNumber || "-"}</div>
                            <div>{"الصفحة"}: {pageNumber || "-"}</div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-green-200 text-sm text-gray-600">
                        {"لا توجد بيانات حفظ مسجلة"}
                      </div>
                    )}
                    {latestGrade ? (
                      (() => {
                        const endRef = getGradeEndRef(latestGrade);
                        const pageNumber = getPageFromRef(endRef);
                        const surahName = endRef?.surahId ? getSurahName(endRef.surahId) : null;
                        const ayahNumber = endRef?.ayah || null;

                        return (
                          <div className="p-3 bg-white rounded-lg border border-blue-200 text-sm">
                            <div className="font-semibold text-blue-700 mb-1">{"\u0622\u062e\u0631 \u062a\u0642\u064a\u064a\u0645 \u0645\u0633\u062c\u0644"}</div>
                            <div>{"\u0627\u0644\u0633\u0648\u0631\u0629"}: {surahName || "-"}</div>
                            <div>{"\u0627\u0644\u0622\u064a\u0629"}: {ayahNumber || "-"}</div>
                            <div>{"\u0627\u0644\u0635\u0641\u062d\u0629"}: {pageNumber || "-"}</div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-blue-200 text-sm text-gray-600">
                        {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u062a\u0642\u064a\u064a\u0645 \u0645\u0633\u062c\u0644\u0629"}
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
                        value={selectedSurahId}
                        onChange={(e) => {
                          const newSurahId = e.target.value;
                          const surah = QURAN_SURAHS.find(s => s.id == newSurahId);
                          const defaultAyah = surah ? surah.ayahCount.toString() : "";

                          setSelectedSurahId(newSurahId);
                          setSelectedAyahNumber(defaultAyah);

                          if (onStudentChange && typeof onStudentChange === 'function') {
                            onStudentChange({
                              ...student,
                              target_surah_id: newSurahId,
                              target_ayah_number: defaultAyah
                            });
                          }
                        }}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر السورة المستهدفة</option>
                        {QURAN_SURAHS.map(surah => (
                          <option key={surah.id} value={String(surah.id)}>
                            {surah.id}. {surah.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 يمكنك اختيار أي سورة كهدف من القرآن الكريم
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">الآية المستهدفة</label>
                      <select
                        value={selectedAyahNumber}
                        onChange={(e) => {
                          const newAyahNumber = e.target.value;
                          setSelectedAyahNumber(newAyahNumber);

                          if (onStudentChange && typeof onStudentChange === 'function') {
                            onStudentChange({
                              ...student,
                              target_ayah_number: newAyahNumber
                            });
                          }
                        }}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!selectedSurahId}
                      >
                        <option value="">اختر الآية</option>
                        {generateAyahOptions(selectedSurahId).map(ayahNum => (
                          <option key={ayahNum} value={ayahNum}>الآية {ayahNum}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Goal Display - Updates immediately when dropdowns change */}
                    {(selectedSurahId || student.target_surah_id) && (selectedAyahNumber || student.target_ayah_number) && (
                      <div className="p-4 bg-blue-100 rounded-lg border border-blue-300">
                        <div className="text-sm font-medium text-blue-800 mb-2">
                          <strong>الهدف المحدد:</strong> سورة {QURAN_SURAHS.find(s => s.id == (selectedSurahId || student.target_surah_id))?.name} حتى الآية {selectedAyahNumber || student.target_ayah_number}
                        </div>
                        {(() => {
                          // Calculate pages using current local state values for dynamic updates
                          const currentSurahId = selectedMemorizedSurahId || student.memorized_surah_id;
                          const currentAyahNumber = selectedMemorizedAyahNumber || student.memorized_ayah_number;
                          const targetSurahId = selectedSurahId || student.target_surah_id;
                          const targetAyahNumber = selectedAyahNumber || student.target_ayah_number;

                          if (currentSurahId && currentAyahNumber && targetSurahId && targetAyahNumber) {
                            const currentProgress = calculateQuranProgress(currentSurahId, currentAyahNumber);
                            const targetProgress = calculateQuranProgress(targetSurahId, targetAyahNumber);
                            const currentPages = currentProgress.memorizedPages;
                            const targetPages = targetProgress.memorizedPages;
                            const pagesToGoal = Math.max(0, targetPages - currentPages);

                            if (pagesToGoal > 0) {
                              return (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">📖</span>
                                    <div>
                                      <div className="text-lg font-bold text-blue-700">
                                        عدد الصفحات للهدف: {pagesToGoal.toFixed(1)} صفحة
                                      </div>
                                      <div className="text-xs text-blue-600 mt-1">
                                        يتم التحديث تلقائياً عند تغيير الاختيار
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else if (pagesToGoal === 0) {
                              return (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">🎉</span>
                                    <div className="text-lg font-bold text-green-700">
                                      تم تحقيق الهدف!
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    )}

                  </div>
                </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();

                      // Create updated student object with local state values
                      const updatedStudent = {
                        ...student,
                        target_surah_id: selectedSurahId,
                        target_ayah_number: selectedAyahNumber,
                        memorized_surah_id: selectedMemorizedSurahId,
                        memorized_ayah_number: selectedMemorizedAyahNumber
                      };

                      onSubmit(e, updatedStudent);
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
                    إغلاق
                  </button>
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


          {/* Combined Progress Display with Goal */}
          <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <AiOutlineCheck className="text-green-600" />
              الهدف والتقدم - إحصائيات الحفظ
            </h4>
            {/* Goal Information */}
            {student.target_surah_id && (
              <div className="mb-6 p-4 bg-white/80 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">الهدف المطلوب:</h5>
                    <p className="text-base font-bold text-blue-700">
                      سورة {QURAN_SURAHS.find(s => s.id == student.target_surah_id)?.name || "غير محدد"} - الآية {student.target_ayah_number || "-"}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">نطاق صفحات الهدف:</h5>
                    <p className="text-base font-bold text-blue-700">
                      {targetPagesCount > 0
                        ? `من صفحة ${targetPageNumbers[targetPageNumbers.length - 1]} إلى صفحة ${targetPageNumbers[0]}`
                        : "لا يوجد هدف محدد"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-700">
                  <span className="font-semibold">إجمالي صفحات الهدف:</span> {targetPagesCount} صفحة، 
                  <span className="font-semibold text-blue-700">منجز:</span> {gradedCountInTarget} صفحة، 
                  <span className="font-semibold text-red-700">متبقٍ:</span> {remainingTargetPages} صفحة.
                </div>
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
                    <div className="flex items-center justify-center">
                      <CircularProgressChart
                        chartData={circularChartData}
                        size={280}
                        strokeWidth={24}
                        showLabels={true}
                        showPercentages={true}
                      />
                    </div>

                    {/* الهدف والتقدم - إحصائيات الحفظ */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <h6 className="font-semibold text-gray-800 mb-4 text-center">الهدف والتقدم - إحصائيات الحفظ</h6>

                      {/* Overall Progress Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h6 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            📚 إجمالي التقدم
                          </h6>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">الصفحات المحفوظة:</span>
                              <span className="font-bold text-green-600">{memorizedCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">إجمالي الصفحات:</span>
                              <span className="font-bold text-gray-800">{totalPagesCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">النسبة المئوية:</span>
                              <span className="font-bold text-blue-600">{memorizedPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h6 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            🎯 تقدم الهدف
                          </h6>
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
                                    {targetCompletionPercent.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">صفحات متبقية:</span>
                                  <span className="font-bold text-orange-600">
                                    {remainingTargetPages}
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
                          <div className="text-lg font-bold text-green-600">{memorizedCount}</div>
                          <div className="text-xs text-green-700">إجمالي الصفحات المحفوظة</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-blue-600">{targetPagesCount}</div>
                          <div className="text-xs text-blue-700">صفحات الهدف</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-purple-600">{gradedCountInTarget}</div>
                          <div className="text-xs text-purple-700">منجز من الهدف</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-orange-600">{remainingTargetPages}</div>
                          <div className="text-xs text-orange-700">متبقي من الهدف</div>
                        </div>
                      </div>

                      {targetPagesCount > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-medium text-gray-700">مخطط صفحات الهدف</h6>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
                                منجز
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                                متبقٍ
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-end" dir="ltr">
                            {targetPageNumbers.map((page) => {
                              const isCompleted = memorizedSet.has(page) || gradedSet.has(page);
                              return (
                                <div
                                  key={`target-page-${page}`}
                                  title={`صفحة ${page} - ${isCompleted ? 'منجز' : 'متبقٍ'}`}
                                  className={`w-8 h-8 rounded border flex items-center justify-center text-[10px] font-bold ${
                                    isCompleted
                                      ? 'bg-blue-600 border-blue-700 text-white'
                                      : 'bg-red-50 border-red-300 text-red-700'
                                  }`}
                                >
                                  {page}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Grade Activity Summary */}
                      {gradedCountInTarget > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h6 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            📝 ملخص التقييمات
                          </h6>
                          <div className="grid grid-cols-3 gap-3 text-center text-sm">
                            <div>
                              <div className="text-lg font-bold text-blue-600">{gradedCountInTarget}</div>
                              <div className="text-xs text-gray-600">صفحة مُقيّمة</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                {targetCompletionPercent.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">من الهدف</div>
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
                        <h6 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          📍 الموقع الحالي
                        </h6>
                        <div className="text-sm space-y-2">
                          {lastMemorizedRef?.surahId || student.memorized_surah_id ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">السورة الحالية:</span>
                                <span className="font-bold text-green-600">
                                  {QURAN_SURAHS.find(s => s.id == (lastMemorizedRef?.surahId || student.memorized_surah_id))?.name || 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">آخر آية محفوظة:</span>
                                <span className="font-bold text-green-600">{lastMemorizedRef?.ayah || student.memorized_ayah_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">رقم الصفحة:</span>
                                <span className="font-bold text-blue-600">{lastMemorizedPage || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">رقم السورة:</span>
                                <span className="font-bold text-purple-600">
                                  {(lastMemorizedRef?.surahId || student.memorized_surah_id)} من 114
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



      </div>
    </div>
  );
};

export default QuranProgressModal;
