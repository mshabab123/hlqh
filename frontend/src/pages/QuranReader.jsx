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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Quran Reader</h1>
      <div className="max-w-xl">
        <label className="block text-sm font-medium mb-2" htmlFor="source-select">
          Text source
        </label>
        <select
          id="source-select"
          className="w-full border rounded px-3 py-2 mb-4"
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
          <option value="uthmani">Uthmani (quran_surahs/quran_ayahs)</option>
          <option value="hafs">Hafs Smart V8 (hafs_smart_v8)</option>
        </select>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              checked={!rangeMode}
              onChange={() => setRangeMode(false)}
            />
            Single surah
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
            Surah range
          </label>
        </div>

        {!rangeMode && (
          <>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="surah-select"
            >
              Select a surah
            </label>
            <select
              id="surah-select"
              className="w-full border rounded px-3 py-2 mb-4"
              value={selectedSurah}
              onChange={(e) => setSelectedSurah(e.target.value)}
              disabled={loadingSurahs}
            >
              <option value="">Choose a surah...</option>
              {surahs.map((surah) => (
                <option key={surah.number} value={surah.number}>
                  {surah.number}. {surah.name_arabic}
                </option>
              ))}
            </select>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="from-ayah"
                >
                  From ayah
                </label>
                <select
                  id="from-ayah"
                  className="w-full border rounded px-3 py-2"
                  value={fromAyah}
                  onChange={(e) => setFromAyah(e.target.value)}
                  disabled={!selectedSurah}
                >
                  <option value="">Choose...</option>
                  {buildAyahOptions(selectedSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="to-ayah"
                >
                  To ayah
                </label>
                <select
                  id="to-ayah"
                  className="w-full border rounded px-3 py-2"
                  value={toAyah}
                  onChange={(e) => setToAyah(e.target.value)}
                  disabled={!selectedSurah}
                >
                  <option value="">Choose...</option>
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
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="from-surah"
                >
                  From surah
                </label>
            <select
              id="from-surah"
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
                  <option value="">Choose...</option>
                  {surahs.map((surah) => (
                    <option key={surah.number} value={surah.number}>
                      {surah.number}. {surah.name_arabic}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="to-surah"
                >
                  To surah
                </label>
            <select
              id="to-surah"
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
                  <option value="">Choose...</option>
                  {surahs.map((surah) => (
                    <option key={surah.number} value={surah.number}>
                      {surah.number}. {surah.name_arabic}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="range-from-ayah"
                >
                  From ayah
                </label>
                <select
                  id="range-from-ayah"
                  className="w-full border rounded px-3 py-2"
                  value={rangeFromAyah}
                  onChange={(e) => setRangeFromAyah(e.target.value)}
                  disabled={!fromSurah}
                >
                  <option value="">Choose...</option>
                  {buildAyahOptions(fromSurah).map((ayah) => (
                    <option key={ayah} value={ayah}>
                      {ayah}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  className="block text-xs font-medium mb-1"
                  htmlFor="range-to-ayah"
                >
                  To ayah
                </label>
                <select
                  id="range-to-ayah"
                  className="w-full border rounded px-3 py-2"
                  value={rangeToAyah}
                  onChange={(e) => setRangeToAyah(e.target.value)}
                  disabled={!toSurah}
                >
                  <option value="">Choose...</option>
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
          className="px-4 py-2 rounded bg-[#06bfbf] text-white disabled:opacity-60"
          onClick={applyFilter}
          disabled={
            loadingAyahs || (!rangeMode && !selectedSurah) || (rangeMode && (!fromSurah || !toSurah))
          }
        >
          Apply filter
        </button>
        {loadingSurahs && <p>Loading surahs...</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium">Box theme:</span>
          <button
            type="button"
            className={`quran-theme-btn ${boxTheme === "light" ? "active" : ""}`}
            onClick={() => setBoxTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={`quran-theme-btn ${boxTheme === "dark" ? "active" : ""}`}
            onClick={() => setBoxTheme("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={`quran-theme-btn ${
              boxTheme === "parchment" ? "active" : ""
            }`}
            onClick={() => setBoxTheme("parchment")}
          >
            Parchment
          </button>
        </div>
        {loadingAyahs && <p>Loading ayahs...</p>}
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
