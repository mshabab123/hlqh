import React from 'react';
import { QURAN_SURAHS } from '../utils/quranData';

const getPageSurahDetails = (pageNumber) => (
  QURAN_SURAHS
    .filter((surah) => pageNumber >= surah.startPage && pageNumber <= surah.endPage)
    .map((surah) => {
      const pageSpan = surah.endPage - surah.startPage + 1;
      const pageOffset = pageNumber - surah.startPage;
      const firstAyah = Math.floor((pageOffset / pageSpan) * surah.ayahCount) + 1;
      const lastAyah = pageNumber === surah.endPage
        ? surah.ayahCount
        : Math.floor(((pageOffset + 1) / pageSpan) * surah.ayahCount);

      return {
        ...surah,
        firstAyah,
        lastAyah: Math.max(firstAyah, lastAyah)
      };
    })
);

const QuranBlocksGrid = ({ blocksData }) => {
  const { blocks, totalBlocks, memorizedBlocks, recentActivityBlocks } = blocksData;

  // Color mapping for block status
  const getBlockColor = (status) => {
    switch (status) {
      case 'memorized':
        return 'bg-red-500 hover:bg-red-600 text-white'; // Red for memorized
      case 'recent':
        return 'bg-green-500 hover:bg-green-600 text-white'; // Green for recent activity
      default:
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700'; // Gray for not memorized
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with statistics */}
      <div className="flex justify-between items-center">
        <h5 className="font-semibold text-gray-800">خريطة القرآن الكريم</h5>
        <div className="text-sm text-gray-600">
          {memorizedBlocks} من {totalBlocks} جزء محفوظ
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 text-xs mb-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span className="text-[10px]">غير محفوظ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-700 rounded"></div>
          <span className="text-[10px]">جديد (&lt; أسبوع)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-400 rounded"></div>
          <span className="text-[10px]">أسبوع - شهر</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-300 rounded"></div>
          <span className="text-[10px]">شهر - شهرين</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-[10px]">شهرين - 6 أشهر</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-800 rounded"></div>
          <span className="text-[10px]">&gt; 6 أشهر</span>
        </div>
      </div>

      {/* Blocks Grid - Horizontal layout starting with Juz 30 */}
      <div className="space-y-1">
        {blocks.map((block) => (
          <div
            key={block.blockNumber}
            className="bg-white p-2 rounded-md border border-gray-200 shadow-sm"
          >
            {/* Juz Header - Horizontal layout */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="font-bold text-sm text-gray-800">الجزء {block.blockNumber}</div>
                <div className="text-xs text-gray-600 truncate">{block.juzName}</div>
              </div>
              <div className="text-xs text-gray-500">صفحة {block.startPage} - {block.endPage}</div>
            </div>

            {/* Pages Row - Show individual pages in a horizontal line */}
            <div className="flex flex-wrap gap-1">
              {block.pages ? block.pages.map((page) => {
                const surahDetails = getPageSurahDetails(page.pageNumber);
                const getPageColor = (status) => {
                  switch (status) {
                    case 'dark_green':
                      return 'bg-green-700 hover:bg-green-800'; // New memorized (< 1 week)
                    case 'light_green':
                      return 'bg-green-400 hover:bg-green-500'; // Recent activity (1 week - 1 month)
                    case 'light_red':
                      return 'bg-red-300 hover:bg-red-400'; // 1-2 months
                    case 'red':
                      return 'bg-red-500 hover:bg-red-600'; // 2-6 months
                    case 'dark_red':
                      return 'bg-red-800 hover:bg-red-900'; // > 6 months
                    default:
                      return 'bg-gray-200 hover:bg-gray-300'; // Not memorized
                  }
                };

                const getStatusLabel = (status) => {
                  switch (status) {
                    case 'dark_green':
                      return 'حفظ جديد (أقل من أسبوع)';
                    case 'light_green':
                      return 'نشاط حديث (أسبوع - شهر)';
                    case 'light_red':
                      return 'شهر - شهرين';
                    case 'red':
                      return 'شهرين - ستة أشهر';
                    case 'dark_red':
                      return 'أكثر من ستة أشهر';
                    default:
                      return 'غير محفوظ';
                  }
                };

                const pageStatusLabel = page.partial
                  ? `${getStatusLabel(page.status)} / ${getStatusLabel(page.secondaryStatus)}`
                  : getStatusLabel(page.status);

                return (
                  <button
                    type="button"
                    key={page.pageNumber}
                    className={`
                      group w-10 h-10 rounded-md transition-all duration-200 cursor-pointer
                      ${page.partial ? getPageColor(page.secondaryStatus) : getPageColor(page.status)}
                      flex items-center justify-center relative
                      border border-gray-300 hover:z-30 focus:z-30
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    `}
                    aria-label={`صفحة ${page.pageNumber} - ${pageStatusLabel}`}
                  >
                    {/* بلاطة منقسمة: النصف الأعلى بلون النشاط الجديد، والأسفل بلون الحالة السابقة */}
                    {page.partial && (
                      <div className={`absolute inset-x-0 top-0 h-1/2 ${getPageColor(page.status)}`}></div>
                    )}
                    {/* Recent activity indicator */}
                    {page.hasRecentActivity && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full border border-white"></div>
                      </div>
                    )}
                    <span className={`relative z-10 text-xs font-bold opacity-80 ${
                      page.partial && page.secondaryStatus === 'not_memorized' ? 'text-gray-700' : 'text-white'
                    }`}>
                      {page.pageNumber}
                    </span>

                    <span
                      className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-right text-xs font-normal leading-5 text-white shadow-lg group-hover:block group-focus:block"
                      dir="rtl"
                    >
                      <span className="block font-bold">صفحة {page.pageNumber}</span>
                      <span className="mb-1 block text-gray-300">{pageStatusLabel}</span>
                      {surahDetails.map((surah) => (
                        <span key={surah.id} className="block whitespace-nowrap">
                          سورة {surah.name}: الآيات {surah.firstAyah}–{surah.lastAyah}
                        </span>
                      ))}
                      <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </span>
                  </button>
                );
              }) : (
                <div className="text-xs text-gray-500 p-2">
                  بيانات الصفحات غير متوفرة
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats - Updated for page-based coloring */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-center">
        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-800">{totalBlocks}</div>
          <div className="text-xs text-gray-600">إجمالي الأجزاء</div>
        </div>
        <div className="p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {blocks.reduce((total, block) => {
              return total + (block.pages ? block.pages.filter(p => p.status !== 'not_memorized').length : 0);
            }, 0)}
          </div>
          <div className="text-xs text-red-600">صفحات محفوظة</div>
        </div>
        <div className="p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {blocks.reduce((total, block) => {
              return total + (block.pages ? block.pages.filter(p => p.status === 'dark_green' || p.status === 'light_green').length : 0);
            }, 0)}
          </div>
          <div className="text-xs text-green-600">نشاط حديث</div>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">604</div>
          <div className="text-xs text-blue-600">إجمالي الصفحات</div>
        </div>
      </div>
    </div>
  );
};

export default QuranBlocksGrid;
