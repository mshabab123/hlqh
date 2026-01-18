import React, { useState, useEffect } from 'react';

const CircularProgressChart = ({
  chartData,
  size = 320,
  strokeWidth = 24,
  showLabels = true,
  showPercentages = true,
  animated = true
}) => {
  const [animatedValues, setAnimatedValues] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const totalPages = chartData.totalPages || 604;
  const memorizedPageNumbers = Array.isArray(chartData.memorizedPageNumbers)
    ? [...new Set(chartData.memorizedPageNumbers)].sort((a, b) => a - b)
    : null;
  const memorizedSource = chartData.memorizedPages ?? chartData.totalProgressPages ?? chartData.pageRanges?.memorized?.end ?? 0;
  const gradedPageNumbers = Array.isArray(chartData.gradedPageNumbers)
    ? [...new Set(chartData.gradedPageNumbers)].sort((a, b) => a - b)
    : [];
  const memorizedPages = memorizedPageNumbers
    ? memorizedPageNumbers.length
    : Math.max(0, Math.min(totalPages, Math.round(memorizedSource)));
  const memorizedSet = new Set(memorizedPageNumbers || []);
  const gradedSet = new Set(gradedPageNumbers);
  const targetRange = chartData.pageRanges?.target || null;
  const targetPageNumbers = targetRange
    ? (() => {
        const start = Math.round(targetRange.start);
        const end = Math.round(targetRange.end);
        const minPage = Math.min(start, end);
        const maxPage = Math.max(start, end);
        return Array.from({ length: Math.max(0, maxPage - minPage + 1) }, (_, idx) => minPage + idx);
      })()
    : [];
  const segmentGap = 1.2;
  const segmentLength = circumference / totalPages;
  const segmentStroke = Math.max(1, Math.floor(strokeWidth * 0.9));
  const memorizedPageList = memorizedPageNumbers
    ? memorizedPageNumbers.join(", ")
    : memorizedPages > 0
      ? Array.from({ length: memorizedPages }, (_, idx) => idx + 1).join(", ")
      : "";
  const targetPageList = targetPageNumbers.length > 0 ? targetPageNumbers.join(", ") : "";
  const targetSet = new Set(targetPageNumbers);
  const ungradedTargetPages = targetPageNumbers.filter((page) => !memorizedSet.has(page) && !gradedSet.has(page));
  const memorizedCount = memorizedPageNumbers ? memorizedPageNumbers.length : memorizedPages;
  const gradedCount = targetPageNumbers.length
    ? gradedPageNumbers.filter((page) => targetSet.has(page)).length
    : gradedPageNumbers.length;
  const gradedPageList = targetPageNumbers.length
    ? gradedPageNumbers.filter((page) => targetSet.has(page)).join(", ")
    : gradedPageNumbers.join(", ");
  const ungradedTargetCount = ungradedTargetPages.length;
  const memorizedPercent = totalPages > 0 ? (memorizedCount / totalPages) * 100 : 0;
  const gradedPercent = totalPages > 0 ? (gradedCount / totalPages) * 100 : 0;
  const ungradedTargetPercent = totalPages > 0 ? (ungradedTargetCount / totalPages) * 100 : 0;
  const lastMemorizedPage = memorizedPageNumbers?.length
    ? memorizedPageNumbers[memorizedPageNumbers.length - 1]
    : memorizedPages || 0;
  const targetEndPage = targetPageNumbers.length
    ? Math.max(...targetPageNumbers)
    : 0;
  const revealEndPage = Math.max(1, targetEndPage || lastMemorizedPage || memorizedCount || 1);
  const revealDurationMs = 1400;

  // Enhanced color palette with gradients
  const getColorConfig = (color) => {
    switch (color) {
         case 'blue':
        return {
          primary: '#2563EB',    // Blue-600
          secondary: '#3B82F6',  // Blue-500
          shadow: 'rgba(37, 99, 235, 0.5)',
          gradient: 'url(#blueGradient)'
        };
      case 'green':
        return {
          primary: '#059669',    // Emerald-600
          secondary: '#10B981',  // Emerald-500
          shadow: 'rgba(5, 150, 105, 0.4)',
          gradient: 'url(#greenGradient)'
        };
    
      case 'red':
        return {
          primary: '#DC2626',    // Red-600
          secondary: '#EF4444',  // Red-500
          shadow: 'rgba(220, 38, 38, 0.3)',
          gradient: 'url(#redGradient)'
        };
      case 'gray':
        return {
          primary: '#9CA3AF',    // Gray-400
          secondary: '#D1D5DB',  // Gray-300
          shadow: 'rgba(156, 163, 175, 0.2)',
          gradient: 'url(#grayGradient)'
        };
     
      case 'lightgray':
        return {
          primary: '#F3F4F6',    // Gray-100 - very light
          secondary: '#E5E7EB',  // Gray-200
          shadow: 'rgba(243, 244, 246, 0.1)',
          gradient: 'url(#lightGrayGradient)'
        };
      default:
        return {
          primary: '#6B7280',    // Gray-500
          secondary: '#9CA3AF',  // Gray-400
          shadow: 'rgba(107, 114, 128, 0.3)',
          gradient: 'url(#grayGradient)'
        };
    }
  };



  // Use predefined positioning from calculation
  const sectionsWithPositions = chartData.sections.map((section, index) => {
    const usePercentage = section.percentage;
    const startPercentage = section.startPercentage || 0;
    const endPercentage = section.endPercentage || section.percentage;


    return {
      ...section,
      usePercentage,
      startPercentage,
      endPercentage,
      animatedPercentage: animatedValues[`section-${index}`] || 0
    };
  });

  // Animation setup
  useEffect(() => {
    if (!animated) return;

    setIsAnimating(true);
    const animations = {};

    sectionsWithPositions.forEach((section, index) => {
      animations[`section-${index}`] = 0;
    });
    setAnimatedValues(animations);

    // Staggered animation for each section
    const animateSection = (index) => {
      if (index >= sectionsWithPositions.length) {
        setIsAnimating(false);
        return;
      }

      const section = sectionsWithPositions[index];
      const duration = 1000 + (index * 200); // Stagger by 200ms
      const steps = 60;
      const stepValue = section.usePercentage / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const currentValue = Math.min(stepValue * currentStep, section.usePercentage);

        setAnimatedValues(prev => ({
          ...prev,
          [`section-${index}`]: currentValue
        }));

        if (currentStep >= steps) {
          clearInterval(interval);
          setTimeout(() => animateSection(index + 1), 100);
        }
      }, duration / steps);
    };

    setTimeout(() => animateSection(0), 300);
  }, [chartData, animated]);

  // Function to convert percentage to stroke dash array
  const getStrokeDashArray = (percentage) => {
    const dashLength = (percentage / 100) * circumference;
    return `${dashLength} ${circumference - dashLength}`;
  };

  // Function to get stroke dash offset for positioning
  const getStrokeDashOffset = (startPercentage) => {
    // Rotate to start from top (12 o'clock position) and go clockwise
    return circumference * (0.25 - startPercentage / 100);
  };

  // Calculate dynamic center content
  const displayPercentage = memorizedPercent;

  return (
    <div className="flex flex-col items-center">
      <div className="relative drop-shadow-lg" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Base ring removed to emphasize memorized/target only */}

          {/* Page-by-page ring */}
          {Array.from({ length: totalPages }, (_, idx) => {
            const pageNumber = idx + 1;
            const isMemorized = memorizedPageNumbers
              ? memorizedPageNumbers.includes(pageNumber)
              : pageNumber <= memorizedPages;
            const isGraded = gradedPageNumbers.includes(pageNumber);
            const isTarget = !isMemorized && !isGraded && targetPageNumbers.includes(pageNumber);
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
                stroke={isMemorized ? '#10B981' : isGraded ? '#2563EB' : isTarget ? '#EF4444' : '#E5E7EB'}
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

        {/* Enhanced center content with animations */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-full p-6 shadow-lg border border-white/20">
            <div className="text-4xl font-black transition-all duration-700">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(displayPercentage)}%
              </span>
            </div>
            <div className="text-sm font-medium text-gray-600 mt-1">
              من إجمالي المصحف
            </div>
            <div className="text-xl font-bold text-blue-600 mt-2">
              {memorizedCount}
            </div>
            <div className="text-xs text-gray-500 font-medium">صفحة محفوظة</div>

            {/* Accuracy indicator */}
            {/* {chartData.accuracy && (
              <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                دقة {chartData.accuracy.decimal_places} خانات
              </div>
            )} */}
          </div>
        </div>

        {/* Floating progress indicators removed */}
      </div>

      {/* Enhanced Legend with modern design */}
      {showLabels && (
        <div className="mt-6 space-y-3 w-full max-w-md">
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">الصفحات المحفوظة:</span>{" "}
            {memorizedPageList || "لا توجد صفحات محفوظة"}
          </div>
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">صفحات الهدف:</span>{" "}
            {targetPageList || "لا يوجد هدف"}
          </div>
          <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100 text-xs text-gray-700 leading-5">
            <span className="font-semibold text-gray-900">صفحات من الهدف تم حفظها او مراجعتها عند المعلم :</span>{" "}
            {gradedPageList || "لا توجد صفحات مُقيّمة"}
          </div>
          {[
            { key: "memorized", label: "محفوظ", color: "green", percent: memorizedPercent, pages: memorizedCount },
            { key: "target", label: "هدف غير مُقيّم", color: "red", percent: ungradedTargetPercent, pages: ungradedTargetCount },
            { key: "graded", label: "مُقيّم", color: "blue", percent: gradedPercent, pages: gradedCount }
          ].map((section) => {
            const colorConfig = getColorConfig(section.color);
            const percentage = section.percent;

            return (
              <div
                key={`legend-${section.key}`}
                className="flex items-center justify-between p-3 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-5 h-5 rounded-full shadow-md"
                      style={{ backgroundColor: colorConfig.primary }}
                    />
                  </div>
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
