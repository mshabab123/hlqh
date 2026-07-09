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

  const segmentLength = circumference / totalPages;
  const segmentStroke = Math.max(1, Math.floor(strokeWidth * 0.9));

  // Strong, high-contrast palette shared by the ring and the legend.
  const STATUS_COLORS = {
    'target-completed': '#2563EB', // أزرق: هدف محفوظ/مقيّم
    'target-remaining': '#DC2626', // أحمر: هدف متبقٍ
    memorized: '#059669',          // أخضر: محفوظ فقط
    none: '#E5E7EB'                // رمادي فاتح: غير محفوظ
  };

  const pageStatus = (pageNumber) => {
    const isMemorized = memorizedPageNumbers
      ? memorizedSet.has(pageNumber)
      : pageNumber <= memorizedPages;
    const isTarget = targetSet.has(pageNumber);
    if (isTarget && (isMemorized || gradedSet.has(pageNumber))) return 'target-completed';
    if (isTarget) return 'target-remaining';
    if (isMemorized) return 'memorized';
    return 'none';
  };

  // Merge consecutive pages with the same status into one solid arc. Drawing
  // one arc per run (instead of 604 gapped segments) keeps colors solid and
  // clearly readable.
  const arcs = [];
  for (let page = 1; page <= totalPages; page++) {
    const status = pageStatus(page);
    const last = arcs[arcs.length - 1];
    if (last && last.status === status) {
      last.length += 1;
    } else {
      arcs.push({ status, start: page, length: 1 });
    }
  }

  const getColorConfig = (color) => {
    switch (color) {
      case 'blue':
        return { primary: STATUS_COLORS['target-completed'] };
      case 'green':
        return { primary: STATUS_COLORS.memorized };
      case 'red':
        return { primary: STATUS_COLORS['target-remaining'] };
      case 'lightgray':
        return { primary: STATUS_COLORS.none };
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
          className="absolute inset-0 chart-reveal"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Base ring (unmemorized pages) drawn once as a full circle. */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={STATUS_COLORS.none}
            strokeWidth={segmentStroke}
          />
          {arcs
            .filter((arc) => arc.status !== 'none')
            .map((arc) => {
              const dash = arc.length * segmentLength;
              const offset = circumference * 0.25 - (arc.start - 1) * segmentLength;

              return (
                <circle
                  key={`arc-${arc.start}`}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={STATUS_COLORS[arc.status]}
                  strokeWidth={segmentStroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  title={`الصفحات ${arc.start} - ${arc.start + arc.length - 1}`}
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
