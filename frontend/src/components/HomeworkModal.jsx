import { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";

const HomeworkModal = ({ student, classItem, courses = [], onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    start_surah: "",
    start_ayah: "",
    end_surah: "",
    end_ayah: "",
    due_date: ""
  });

  const [surahs] = useState([
    { number: 1, name: "الفاتحة", ayahs: 7 },
    { number: 2, name: "البقرة", ayahs: 286 },
    { number: 3, name: "آل عمران", ayahs: 200 },
    { number: 4, name: "النساء", ayahs: 176 },
    { number: 5, name: "المائدة", ayahs: 120 },
    // Add more surahs as needed or fetch from API
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.start_surah || !formData.end_surah) {
      alert("يرجى تحديد نطاق القرآن");
      return;
    }

    const homeworkData = {
      student_id: student.id,
      class_id: classItem.id,
      ...formData
    };

    if (onSave) {
      await onSave(homeworkData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">تكليف واجب قرآني</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">عنوان التلاوة الجديدة *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="مثال: حفظ سورة الفاتحة"
              required
            />
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">المقرر (اختياري)</label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">بدون مقرر</option>
              {courses.filter(c => c.requires_surah).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quran Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">من سورة *</label>
              <select
                value={formData.start_surah}
                onChange={(e) => setFormData({ ...formData, start_surah: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">اختر السورة</option>
                {surahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">من آية *</label>
              <input
                type="number"
                min="1"
                value={formData.start_ayah}
                onChange={(e) => setFormData({ ...formData, start_ayah: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">إلى سورة *</label>
              <select
                value={formData.end_surah}
                onChange={(e) => setFormData({ ...formData, end_surah: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">اختر السورة</option>
                {surahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number}. {surah.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى آية *</label>
              <input
                type="number"
                min="1"
                value={formData.end_ayah}
                onChange={(e) => setFormData({ ...formData, end_ayah: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="7"
                required
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium mb-2">تاريخ التسليم (اختياري)</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows="3"
              placeholder="أي ملاحظات إضافية حول الواجب..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              تكليف الواجب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeworkModal;
