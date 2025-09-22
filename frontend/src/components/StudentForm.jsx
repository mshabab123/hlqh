import { generateAyahOptions } from "../utils/studentUtils";
import SchoolLevelSelect from "./SchoolLevelSelect";

const StudentForm = ({ student, onSubmit, onCancel, isEditing = false, onStudentChange, schools, classes }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-5xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
          {isEditing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
        </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
            <input
              type="text"
              value={student.id || ""}
              onChange={(e) => onStudentChange({...student, id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength="10"
              pattern="[0-9]{10}"
              placeholder="1234567890"
              required
              disabled={isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={student.email || ""}
              onChange={(e) => onStudentChange({...student, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={student.first_name || ""}
              onChange={(e) => onStudentChange({...student, first_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم الأب *</label>
            <input
              type="text"
              value={student.second_name || ""}
              onChange={(e) => onStudentChange({...student, second_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الجد *</label>
            <input
              type="text"
              value={student.third_name || ""}
              onChange={(e) => onStudentChange({...student, third_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={student.last_name || ""}
              onChange={(e) => onStudentChange({...student, last_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={student.phone || ""}
              onChange={(e) => onStudentChange({...student, phone: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^05[0-9]{8}$"
              placeholder="05xxxxxxxx"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ الميلاد</label>
            <input
              type="date"
              value={student.date_of_birth || ""}
              onChange={(e) => onStudentChange({...student, date_of_birth: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={student.address || ""}
              onChange={(e) => onStudentChange({...student, address: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الصف الدراسي *</label>
            <SchoolLevelSelect
              name="school_level"
              value={student.school_level || ""}
              onChange={(e) => onStudentChange({...student, school_level: e.target.value})}
              placeholder="اختر الصف"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات</label>
            <select
              value={student.school_id || ""}
              onChange={(e) => onStudentChange({...student, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر مجمع الحلقات</option>
              {schools && schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحلقة (اختياري)</label>
            <select
              value={student.class_id || ""}
              onChange={(e) => onStudentChange({...student, class_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">لا يوجد - غير منتسب لحلقة</option>
              {classes && (() => {
                const filteredClasses = classes.filter(cls => !student.school_id || cls.school_id == student.school_id);
                
                // Group classes by semester
                const groupedClasses = filteredClasses.reduce((groups, cls) => {
                  const semester = cls.semester_name || 'بدون فصل دراسي';
                  if (!groups[semester]) {
                    groups[semester] = [];
                  }
                  groups[semester].push(cls);
                  return groups;
                }, {});
                
                // Sort semesters and classes within each semester
                const sortedSemesters = Object.keys(groupedClasses).sort((a, b) => 
                  a.localeCompare(b, 'ar')
                );
                
                return sortedSemesters.map(semesterName => (
                  <optgroup key={semesterName} label={semesterName}>
                    {groupedClasses[semesterName]
                      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
                      .map(cls => (
                        <option key={cls.id} value={cls.id} title={`المستوى: ${cls.school_level || 'غير محدد'}`}>
                          {cls.name}
                        </option>
                      ))
                    }
                  </optgroup>
                ));
              })()}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يتم تجميع الحلقات حسب الفصل الدراسي للتمييز بينها. يمكن تغيير مجمع الحلقات بدون تحديد حلقة.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ملاحظات</label>
          <textarea
            value={student.notes || ""}
            onChange={(e) => onStudentChange({...student, notes: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

export default StudentForm;