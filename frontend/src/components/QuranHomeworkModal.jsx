import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosConfig";
import { AiOutlineClose } from "react-icons/ai";

const QuranHomeworkModal = ({ student, classItem, onClose, onSave }) => {
  const toArabicIndic = (value) =>
    value
      .toString()
      .replace(/\d/g, (digit) => String.fromCharCode(1632 + Number(digit)));

  const [source, setSource] = useState("hafs");
  const [surahs, setSurahs] = useState([]);
  const [ayahs, setAyahs] = useState([]);
  const [fromSurah, setFromSurah] = useState("");
  const [toSurah, setToSurah] = useState("");
  const [rangeFromAyah, setRangeFromAyah] = useState("");
  const [rangeToAyah, setRangeToAyah] = useState("");
  const [boxTheme, setBoxTheme] = useState("light");
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(null);

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
        setError("فشل في تحميل السور");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingSurahs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [source]);

  const applyFilter = () => {
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

        // Calculate page count from the ayahs
        if (response.data.ayahs && response.data.ayahs.length > 0) {
          const pages = new Set();
          response.data.ayahs.forEach(ayah => {
            if (ayah.page) {
              pages.add(ayah.page);
            }
          });
          setPageCount(pages.size);
        } else {
          setPageCount(null);
        }

        setError("");
      })
      .catch(() => {
        setError("فشل في تحميل الآيات");
      })
      .finally(() => {
        setLoadingAyahs(false);
      });
  };

  const buildAyahOptions = (surahNumber) => {
    const surah = surahs.find((item) => item.number === Number(surahNumber));
    if (!surah) return [];
    return Array.from({ length: surah.ayah_count }, (_, i) => String(i + 1));
  };

  const handleSave = async () => {
    if (!fromSurah || !toSurah) {
      setError("يرجى تحديد نطاق القرآن");
      return;
    }

    const homeworkData = {
      student_id: student.id,
      class_id: classItem.id,
      start_surah: fromSurah,
      start_ayah: rangeFromAyah || "1",
      end_surah: toSurah,
      end_ayah: rangeToAyah || buildAyahOptions(toSurah).pop() || "1",
    };

    if (onSave) {
      await onSave(homeworkData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">المهمة الجديدة (تلاوة جديدة)</h2>
            <p className="text-sm text-gray-600 mt-1">
              الطالب: {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </p>
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
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Range Selection */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-3">اختر نطاق الحفظ المطلوب</h3>

            {/* Source and Theme Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">مصدر النص:</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="uthmani">عثماني</option>
                  <option value="hafs">مصحف المدينة (حفص)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المظهر:</label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">من سورة</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  value={fromSurah}
                  onChange={(e) => setFromSurah(e.target.value)}
                  disabled={loadingSurahs}
                >
                  <option value="">اختر السورة</option>
                  {surahs.length === 0 && !loadingSurahs && (
                    <option disabled>جاري التحميل...</option>
                  )}
                  {surahs.map((surah) => (
                    <option key={surah.number} value={surah.number}>
                      {surah.number}. {surah.name_arabic}
                    </option>
                  ))}
                </select>
                {loadingSurahs && <div className="text-xs text-gray-500 mt-1">جاري تحميل السور...</div>}
                {!loadingSurahs && surahs.length === 0 && <div className="text-xs text-red-500 mt-1">فشل في تحميل السور</div>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">من آية</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={rangeFromAyah}
                  onChange={(e) => setRangeFromAyah(e.target.value)}
                  disabled={!fromSurah}
                >
                  <option value="">من البداية</option>
                  {buildAyahOptions(fromSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">إلى سورة</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900 bg-white"
                  value={toSurah}
                  onChange={(e) => setToSurah(e.target.value)}
                  disabled={loadingSurahs}
                >
                  <option value="">اختر السورة</option>
                  {surahs.length === 0 && !loadingSurahs && (
                    <option disabled>جاري التحميل...</option>
                  )}
                  {surahs.map((surah) => (
                    <option key={surah.number} value={surah.number}>
                      {surah.number}. {surah.name_arabic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">إلى آية</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={rangeToAyah}
                  onChange={(e) => setRangeToAyah(e.target.value)}
                  disabled={!toSurah}
                >
                  <option value="">حتى النهاية</option>
                  {buildAyahOptions(toSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={applyFilter}
              disabled={!fromSurah || !toSurah || loadingAyahs}
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAyahs ? "جاري التحميل..." : "عرض النطاق"}
            </button>
          </div>

          {/* Quran Display */}
          {loadingAyahs && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600">جاري تحميل الآيات...</p>
            </div>
          )}

          {!loadingAyahs && ayahs.length > 0 && (
            <div>
              <div className="flex justify-center items-center gap-4 mb-4">
                <h3 className="font-semibold text-center">معاينة النطاق المحدد</h3>
                {pageCount !== null && (
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {toArabicIndic(pageCount)} صفحة
                  </span>
                )}
              </div>

              <div className={`quran-box quran-box--${boxTheme}`}>
                <div className="quran-box__content space-y-4 text-2xl leading-relaxed font-quran" lang="ar" dir="rtl">
                  {ayahs.map((ayah, index) => {
                    const showHeader = index === 0 || ayah.surah_number !== ayahs[index - 1]?.surah_number;
                    return (
                      <div key={`${ayah.surah_number}-${ayah.ayah_number}`}>
                        {showHeader && (
                          <h2 className="text-lg font-semibold mb-2 mt-4 font-sans">
                            {ayah.surah_number}. {ayah.surah_name_ar}
                          </h2>
                        )}
                        <p className="quran-text mb-2">
                          {ayah.text}{" "}
                          <span className="font-sans text-base align-middle" dir="ltr">
                            ({toArabicIndic(ayah.ayah_number)})
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={!fromSurah || !toSurah}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              حفظ المهمة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuranHomeworkModal;
