import React from 'react';
import { AiOutlineBook, AiOutlineClose } from "react-icons/ai";
import QuranBlocksGrid from './QuranBlocksGrid';

const QuranBlocksModal = ({ student, blocksData, onClose }) => {
  if (!blocksData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <AiOutlineBook className="text-2xl text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">نظام المراجعة (المحفوظ والمراجع من صفحات القران الكريم)</h2>
                <p className="text-sm text-gray-600">
                  {student.first_name} {student.second_name} {student.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <AiOutlineClose className="text-xl text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">{blocksData.totalBlocks}</div>
              <div className="text-sm text-purple-600">إجمالي أجزاء القرآن</div>
              <div className="text-xs text-purple-500 mt-1">30 جزء (من الجزء الأول إلى عم)</div>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{blocksData.memorizedBlocks}</div>
              <div className="text-sm text-red-600">أجزاء محفوظة</div>
              <div className="text-xs text-red-500 mt-1">
                {Math.round((blocksData.memorizedBlocks / blocksData.totalBlocks) * 100)}% من القرآن
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{blocksData.recentActivityBlocks}</div>
              <div className="text-sm text-green-600">نشاط حديث</div>
              <div className="text-xs text-green-500 mt-1">آخر 30 يوم</div>
            </div>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">
                {blocksData.totalBlocks - blocksData.memorizedBlocks}
              </div>
              <div className="text-sm text-gray-600">متبقي للحفظ</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(((blocksData.totalBlocks - blocksData.memorizedBlocks) / blocksData.totalBlocks) * 100)}% من القرآن
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3">دليل الألوان (حسب آخر نشاط):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-gray-700">غير محفوظ</div>
                  <div className="text-xs text-gray-500">لم يتم حفظه بعد</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-700 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-green-800">جديد</div>
                  <div className="text-xs text-green-600">أقل من أسبوع</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-400 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-green-700">حديث</div>
                  <div className="text-xs text-green-500">أسبوع إلى شهر</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-300 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-red-600">قديم نسبياً</div>
                  <div className="text-xs text-red-500">شهر إلى شهرين</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-red-700">قديم</div>
                  <div className="text-xs text-red-600">شهرين إلى 6 أشهر</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-800 rounded-lg shadow-sm"></div>
                <div>
                  <div className="font-medium text-red-900">قديم جداً</div>
                  <div className="text-xs text-red-700">أكثر من 6 أشهر</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quran Blocks Grid */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <QuranBlocksGrid blocksData={blocksData} />
          </div>

          {/* Detailed Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Memorization Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-3">معلومات الحفظ الحالي</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-600">الصفحة الحالية:</span>
                  <span className="font-semibold text-blue-800">
                    صفحة {blocksData.memorizedPageNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">الجزء الحالي:</span>
                  <span className="font-semibold text-blue-800">
                    الجزء {blocksData.currentJuz}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">الصفحات المحفوظة:</span>
                  <span className="font-semibold text-blue-800">
                    {604 - blocksData.memorizedPageNumber} صفحة
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Info */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-800 mb-3">النشاط الحديث (30 يوم)</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">أجزاء بنشاط حديث:</span>
                  <span className="font-semibold text-green-800">
                    {blocksData.recentActivityBlocks} جزء
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">نوع النشاط:</span>
                  <span className="font-semibold text-green-800">تقييم/مراجعة</span>
                </div>
                <div className="text-xs text-green-600 mt-2">
                  * الأجزاء التي تم تقييمها أو مراجعتها في آخر 30 يوماً تظهر باللون الأخضر
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuranBlocksModal;