import React from 'react';

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
            <div className="flex flex-wrap gap-0.5">
              {(block.pages || Array.from({ length: block.totalPages }, (_, pageIndex) => ({
                pageNumber: block.startPage + pageIndex,
                status: (block.startPage + pageIndex) >= blocksData.memorizedPageNumber ? 'red' : 'not_memorized',
                hasRecentActivity: false
              }))).map((page) => {
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

                return (
                  <div
                    key={page.pageNumber}
                    className={`
                      w-6 h-6 rounded-sm transition-all duration-200 cursor-pointer
                      ${getPageColor(page.status)}
                      flex items-center justify-center relative
                      border border-gray-300
                    `}
                    title={`صفحة ${page.pageNumber} - ${getStatusLabel(page.status)}`}
                  >
                    {/* Recent activity indicator */}
                    {page.hasRecentActivity && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full border border-white"></div>
                      </div>
                    )}
                    <span className="text-xs text-white font-bold opacity-80">
                      {page.pageNumber}
                    </span>
                  </div>
                );
              })}
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