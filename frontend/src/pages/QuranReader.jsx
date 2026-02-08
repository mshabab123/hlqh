import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosConfig";

export default function QuranReader() {
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
  const [rangeMode, setRangeMode] = useState(false);
  const [fromSurah, setFromSurah] = useState("");
  const [toSurah, setToSurah] = useState("");
  const [rangeFromAyah, setRangeFromAyah] = useState("");
  const [rangeToAyah, setRangeToAyah] = useState("");
  const [boxTheme, setBoxTheme] = useState("light");
  const [errorWords, setErrorWords] = useState({});
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [error, setError] = useState("");

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
        setError("Failed to load surah list.");
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
        setError("Failed to load ayahs.");
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
    setErrorWords({});
  }, [ayahs]);

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
          setError("Failed to load ayahs.");
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
        setError("Failed to load ayahs.");
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

  return (
    <div className="p-3 sm:p-6" dir="rtl">
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-primary-700)] mb-4">القرآن الكريم</h1>
      <div className="max-w-2xl bg-white rounded-xl shadow-sm border p-4 sm:p-6 space-y-4">
        {/* Source + Mode + Theme row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="source-select">
              مصدر النص
            </label>
            <select
              id="source-select"
              className="w-full border rounded-lg px-3 py-2"
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
              <option value="uthmani">المصحف العثماني</option>
              <option value="hafs">مصحف المدينة (حفص)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع العرض</label>
            <div className="flex gap-4 border rounded-lg px-3 py-2 bg-gray-50">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={!rangeMode}
                  onChange={() => setRangeMode(false)}
                />
                سورة واحدة
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">المظهر</label>
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
                كلاسيكي
              </button>
            </div>
          </div>
        </div>

        {!rangeMode && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="surah-select">
                اختر السورة
              </label>
              <select
                id="surah-select"
                className="w-full border rounded-lg px-3 py-2"
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
                <label className="block text-xs font-medium mb-1" htmlFor="from-ayah">
                  من آية
                </label>
                <select
                  id="from-ayah"
                  className="w-full border rounded-lg px-3 py-2"
                  value={fromAyah}
                  onChange={(e) => setFromAyah(e.target.value)}
                  disabled={!selectedSurah}
                >
                  <option value="">اختر...</option>
                  {buildAyahOptions(selectedSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>{ayah}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" htmlFor="to-ayah">
                  إلى آية
                </label>
                <select
                  id="to-ayah"
                  className="w-full border rounded-lg px-3 py-2"
                  value={toAyah}
                  onChange={(e) => setToAyah(e.target.value)}
                  disabled={!selectedSurah}
                >
                  <option value="">اختر...</option>
                  {buildAyahOptions(selectedSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>{ayah}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {rangeMode && (
          <>
            {/* From: surah + ayah on same row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" htmlFor="from-surah">
                  من سورة
                </label>
                <select
                  id="from-surah"
                  className="w-full border rounded-lg px-3 py-2"
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
                <label className="block text-xs font-medium mb-1" htmlFor="range-from-ayah">
                  من آية
                </label>
                <select
                  id="range-from-ayah"
                  className="w-full border rounded-lg px-3 py-2"
                  value={rangeFromAyah}
                  onChange={(e) => setRangeFromAyah(e.target.value)}
                  disabled={!fromSurah}
                >
                  <option value="">اختر...</option>
                  {buildAyahOptions(fromSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>{ayah}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* To: surah + ayah on same row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" htmlFor="to-surah">
                  إلى سورة
                </label>
                <select
                  id="to-surah"
                  className="w-full border rounded-lg px-3 py-2"
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
              <div>
                <label className="block text-xs font-medium mb-1" htmlFor="range-to-ayah">
                  إلى آية
                </label>
                <select
                  id="range-to-ayah"
                  className="w-full border rounded-lg px-3 py-2"
                  value={rangeToAyah}
                  onChange={(e) => setRangeToAyah(e.target.value)}
                  disabled={!toSurah}
                >
                  <option value="">اختر...</option>
                  {buildAyahOptions(toSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>{ayah}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        <button
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white font-medium transition-colors disabled:opacity-60"
          onClick={applyFilter}
          disabled={
            loadingAyahs || (!rangeMode && !selectedSurah) || (rangeMode && (!fromSurah || !toSurah))
          }
        >
          عرض الآيات
        </button>
        {loadingSurahs && <p className="text-sm text-gray-500">جاري تحميل السور...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <div className="mt-6">
        {loadingAyahs && <p className="text-sm text-gray-500">جاري تحميل الآيات...</p>}
        {!loadingAyahs && ayahs.length > 0 && (
          <div className={`quran-box quran-box--${boxTheme}`}>
            <div className="quran-total-errors">
              <div className="quran-total-label">عدد الاخطاء</div>
              <div className="quran-total-count">{totalErrors}</div>
            </div>
            <div
              dir="rtl"
              lang="ar"
              className="quran-box__content space-y-4 text-2xl leading-relaxed font-quran"
            >
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
                      <h2 className="text-lg font-semibold mb-2">
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
        )}
      </div>
    </div>
  );
}
