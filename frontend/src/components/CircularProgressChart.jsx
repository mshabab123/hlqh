import React, { useState, useEffect } from 'react';

const CircularProgressChart = ({
  chartData,
  size = 240,
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

  // Enhanced color palette with gradients
  const getColorConfig = (color) => {
    switch (color) {
      case 'green':
        return {
          primary: '#059669',    // Emerald-600
          secondary: '#10B981',  // Emerald-500
          shadow: 'rgba(5, 150, 105, 0.4)',
          gradient: 'url(#greenGradient)'
        };
      case 'blue':
        return {
          primary: '#2563EB',    // Blue-600
          secondary: '#3B82F6',  // Blue-500
          shadow: 'rgba(37, 99, 235, 0.5)',
          gradient: 'url(#blueGradient)'
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
  const displayPercentage = chartData.targetCompletionPercentage > 0
    ? chartData.targetCompletionPercentage
    : chartData.totalProgressPercentage;

  return (
    <div className="flex flex-col items-center">
      <div className="relative drop-shadow-lg" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#2563EB', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#EF4444', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#DC2626', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="grayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#D1D5DB', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#9CA3AF', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="lightGrayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#F3F4F6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#E5E7EB', stopOpacity: 1 }} />
            </linearGradient>

            {/* Shadow filters */}
            <filter id="dropshadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
            </filter>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background circle with subtle pattern */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#F3F4F6"
            strokeWidth={strokeWidth}
            strokeDasharray="2 4"
            opacity="0.5"
          />

          {/* Main background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth - 2}
          />

          {/* Progress sections with enhanced styling */}
          {sectionsWithPositions.map((section, index) => {
            const colorConfig = getColorConfig(section.color);
            const animatedPercentage = animated ? section.animatedPercentage : section.usePercentage;

            return (
              <g key={`section-${section.color}-${index}`}>
                {/* Shadow/glow effect */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={colorConfig.shadow}
                  strokeWidth={strokeWidth + 4}
                  strokeDasharray={getStrokeDashArray(animatedPercentage)}
                  strokeDashoffset={getStrokeDashOffset(section.startPercentage)}
                  strokeLinecap="round"
                  opacity="0.3"
                  filter="url(#dropshadow)"
                />

                {/* Main progress circle */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={colorConfig.gradient}
                  strokeWidth={strokeWidth}
                  strokeDasharray={getStrokeDashArray(animatedPercentage)}
                  strokeDashoffset={getStrokeDashOffset(section.startPercentage)}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                  style={{
                    filter: section.color === 'blue' ? 'url(#glow)' : 'url(#dropshadow)'
                  }}
                />

                {/* Highlight effect for blue sections */}
                {section.color === 'blue' && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="2"
                    strokeDasharray={getStrokeDashArray(animatedPercentage)}
                    strokeDashoffset={getStrokeDashOffset(section.startPercentage)}
                    strokeLinecap="round"
                  />
                )}
              </g>
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
              {chartData.targetCompletionPercentage > 0 ? 'تقدم الهدف' : 'من القرآن'}
            </div>
            <div className="text-xl font-bold text-blue-600 mt-2">
              {chartData.totalProgressPages}
            </div>
            <div className="text-xs text-gray-500 font-medium">صفحة</div>

            {/* Accuracy indicator */}
            {chartData.accuracy && (
              <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                دقة {chartData.accuracy.decimal_places} خانات
              </div>
            )}
          </div>
        </div>

        {/* Floating progress indicators */}
        {sectionsWithPositions.map((section, index) => {
          if (section.usePercentage === 0) return null;

          const angle = (section.startPercentage + section.usePercentage / 2) * 3.6; // Convert to degrees
          const indicatorRadius = radius + strokeWidth / 2 + 15;
          const x = center + indicatorRadius * Math.cos((angle - 90) * Math.PI / 180);
          const y = center + indicatorRadius * Math.sin((angle - 90) * Math.PI / 180);

          return (
            <div
              key={`indicator-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
              style={{ left: x, top: y }}
            >
              <div className={`w-2 h-2 rounded-full ${
                section.color === 'green' ? 'bg-green-500' :
                section.color === 'blue' ? 'bg-blue-500' :
                section.color === 'red' ? 'bg-red-500' :
                section.color === 'lightgray' ? 'bg-gray-200' :
                'bg-gray-400'
              } shadow-lg`} />
            </div>
          );
        })}
      </div>

      {/* Enhanced Legend with modern design */}
      {showLabels && (
        <div className="mt-6 space-y-3 w-full max-w-md">
          {chartData.sections.map((section, index) => {
            const colorConfig = getColorConfig(section.color);
            const percentage = section.percentage;

            return (
              <div
                key={`legend-${section.color}-${index}`}
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

      {/* Enhanced Page ranges info */}
      {chartData.pageRanges && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 w-full max-w-md">
          <div className="text-xs font-medium text-gray-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600">📚</span>
              <span>المحفوظ: صفحة {chartData.pageRanges.memorized.end} - {chartData.pageRanges.memorized.start}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600">🎯</span>
              <span>الهدف: صفحة {chartData.pageRanges.target.end} - {chartData.pageRanges.target.start}</span>
            </div>
            {chartData.gradedPages > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📝</span>
                <span>المُقيّم: {chartData.gradedPages} صفحة</span>
              </div>
            )}
            {chartData.targetCompletionPercentage > 0 && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="text-sm font-semibold text-blue-700">
                  تقدم نحو الهدف: {Math.round(chartData.targetCompletionPercentage)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularProgressChart;