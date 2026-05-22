import React from 'react';

const CircularProgressChart = ({
  chartData,
  size = 320,
  strokeWidth = 24,
  showLabels = true,
  showPercentages = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const totalPages = chartData.totalPages || 604;

  const sortedUnique = (values = []) => (
    [...new Set(values)]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= totalPages)
      .sort((a, b) => a - b)
  );

  const memorizedPageNumbers = Array.isArray(chartData.memorizedPageNumbers)
    ? sortedUnique(chartData.memorizedPageNumbers)
    : null;
  const gradedPageNumbers = sortedUnique(chartData.gradedPageNumbers || []);
  const targetPageNumbers = sortedUnique(chartData.targetPageNumbers || []);

  const memorizedSource = chartData.memorizedPages ?? chartData.totalProgressPages ?? chartData.pageRanges?.memorized?.end ?? 0;
  const memorizedPages = memorizedPageNumbers
    ? memorizedPageNumbers.length
    : Math.max(0, Math.min(totalPages, Math.round(memorizedSource)));

  const memorizedSet = new Set(memorizedPageNumbers || []);
  const gradedSet = new Set(gradedPageNumbers);
  const targetSet = new Set(targetPageNumbers);

  const completedTargetPages = targetPageNumbers.filter((page) => memorizedSet.has(page) || gradedSet.has(page));
  const completedTargetSet = new Set(completedTargetPages);
  const remainingTargetPages = targetPageNumbers.filter((page) => !completedTargetSet.has(page));
  const memorizedOnlyPages = (memorizedPageNumbers || []).filter((page) => !targetSet.has(page));
  const knownPages = new Set([...(memorizedPageNumbers || []), ...targetPageNumbers]);

  const memorizedCount = memorizedPageNumbers ? memorizedPageNumbers.length : memorizedPages;
  const memorizedOnlyCount = memorizedPageNumbers
    ? memorizedOnlyPages.length
    : Math.max(0, memorizedPages - completedTargetPages.length);
  const completedTargetCount = completedTargetPages.length;
  const remainingTargetCount = remainingTargetPages.length;
  const notMemorizedCount = Math.max(0, totalPages - knownPages.size);

  const segmentGap = 1.2;
  const segmentLength = circumference / totalPages;
  const segmentStroke = Math.max(1, Math.floor(strokeWidth * 0.9));
  const revealEndPage = Math.max(
    1,
    targetPageNumbers.length ? Math.max(...targetPageNumbers) : 0,
    memorizedPageNumbers?.length ? Math.max(...memorizedPageNumbers) : 0,
    1
  );
  const revealDurationMs = 1400;

  const getColorConfig = (color) => {
    switch (color) {
      case 'blue':
        return { primary: '#2563EB' };
      case 'green':
        return { primary: '#10B981' };
      case 'red':
        return { primary: '#EF4444' };
      case 'lightgray':
        return { primary: '#E5E7EB' };
      default:
        return { primary: '#9CA3AF' };
    }
  };

  const percentOfTotal = (pages) => totalPages > 0 ? (pages / totalPages) * 100 : 0;
  const memorizedPercent = percentOfTotal(memorizedCount);
  const targetPageList = targetPageNumbers.join(', ');
  const completedTargetPageList = completedTargetPages.join(', ');
  const memorizedPageList = memorizedPageNumbers
    ? memorizedPageNumbers.join(', ')
    : memorizedPages > 0
      ? Array.from({ length: memorizedPages }, (_, idx) => idx + 1).join(', ')
      : '';

  const legendSections = [
    {
      key: 'not-memorized',
      label: 'غير محفوظ',
      color: 'lightgray',
      pages: notMemorizedCount
    },
    {
      key: 'memorized',
      label: 'محفوظ فقط',
      color: 'green',
      pages: memorizedOnlyCount
    },
    {
      key: 'target-remaining',
      label: 'هدف متبقٍ',
      color: 'red',
      pages: remainingTargetCount
    },
    {
      key: 'target-completed',
      label: 'هدف محفوظ / مقيّم',
      color: 'blue',
      pages: completedTargetCount
    }
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative drop-shadow-lg" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          viewBox={`0 0 ${size} ${size}`}
        >
          {Array.from({ length: totalPages }, (_, idx) => {
            const pageNumber = idx + 1;
            const isMemorized = memorizedPageNumbers
              ? memorizedSet.has(pageNumber)
              : pageNumber <= memorizedPages;
            const isTarget = targetSet.has(pageNumber);
            const isCompletedTarget = isTarget && (isMemorized || gradedSet.has(pageNumber));
            const isRemainingTarget = isTarget && !isCompletedTarget;
            const dash = Math.max(0.5, segmentLength - segmentGap);
            const offset = circumference * 0.25 - idx * segmentLength;
            const revealRatio = revealEndPage > 1
              ? Math.min(1, (pageNumber - 1) / (revealEndPage - 1))
              : 0;
            const revealDelay = Math.round(revealDurationMs * revealRatio);

            return (
              <circle
                key={`page-seg-${pageNumber}`}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={isCompletedTarget ? '#2563EB' : isRemainingTarget ? '#EF4444' : isMemorized ? '#10B981' : '#E5E7EB'}
                strokeWidth={segmentStroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                title={`صفحة ${pageNumber}`}
                className="ring-reveal"
                style={{ animationDelay: `${revealDelay}ms` }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-full p-6 shadow-lg border border-white/20">
            <div className="text-4xl font-black transition-all duration-700">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(memorizedPercent)}%
              </span>
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              من إجمالي المصحف
            </div>
            <div className="text-xl font-bold text-blue-600 mt-2">
              {memorizedCount}
            </div>
            <div className="text-xs text-gray-500 font-medium">صفحة محفوظة</div>
          </div>
        </div>
      </div>

      {showLabels && (
        <div className="mt-6 space-y-3 w-full max-w-md">
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">الصفحات المحفوظة:</span>{' '}
            {memorizedPageList || 'لا توجد صفحات محفوظة'}
          </div>
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">صفحات الهدف:</span>{' '}
            {targetPageList || 'لا يوجد هدف'}
          </div>
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">صفحات من الهدف تم حفظها أو تقييمها:</span>{' '}
            {completedTargetPageList || 'لا توجد صفحات منجزة في الهدف'}
          </div>

          {legendSections.map((section) => {
            const colorConfig = getColorConfig(section.color);
            const percentage = percentOfTotal(section.pages);

            return (
              <div
                key={`legend-${section.key}`}
                className="flex items-center justify-between p-3 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full shadow-md"
                    style={{ backgroundColor: colorConfig.primary }}
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    {section.label}
                  </span>
                </div>
                <div className="text-right">
                  {showPercentages && (
                    <div className="text-lg font-bold" style={{ color: colorConfig.primary }}>
                      {Math.round(percentage * 100) / 100}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500 font-medium">
                    {section.pages} صفحة
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CircularProgressChart;
