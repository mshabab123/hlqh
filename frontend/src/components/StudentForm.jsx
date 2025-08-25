import { generateAyahOptions } from "../utils/studentUtils";

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
            <select
              value={student.school_level || ""}
              onChange={(e) => onStudentChange({...student, school_level: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر الصف</option>
              <optgroup label="المرحلة الابتدائية">
                <option value="الأول الابتدائي">الأول الابتدائي</option>
                <option value="الثاني الابتدائي">الثاني الابتدائي</option>
                <option value="الثالث الابتدائي">الثالث الابتدائي</option>
                <option value="الرابع الابتدائي">الرابع الابتدائي</option>
                <option value="الخامس الابتدائي">الخامس الابتدائي</option>
                <option value="السادس الابتدائي">السادس الابتدائي</option>
              </optgroup>
              <optgroup label="المرحلة المتوسطة">
                <option value="الأول متوسط">الأول متوسط</option>
                <option value="الثاني متوسط">الثاني متوسط</option>
                <option value="الثالث متوسط">الثالث متوسط</option>
              </optgroup>
              <optgroup label="المرحلة الثانوية">
                <option value="الأول ثانوي">الأول ثانوي</option>
                <option value="الثاني ثانوي">الثاني ثانوي</option>
                <option value="الثالث ثانوي">الثالث ثانوي</option>
              </optgroup>
              <optgroup label="المرحلة الجامعية">
                <option value="السنة الأولى جامعي">السنة الأولى جامعي</option>
                <option value="السنة الثانية جامعي">السنة الثانية جامعي</option>
                <option value="السنة الثالثة جامعي">السنة الثالثة جامعي</option>
                <option value="السنة الرابعة جامعي">السنة الرابعة جامعي</option>
                <option value="دراسات عليا">دراسات عليا</option>
              </optgroup>
              <optgroup label="أخرى">
                <option value="لم يدخل المدرسة">لم يدخل المدرسة</option>
                <option value="خريج">خريج</option>
                <option value="غير محدد">غير محدد</option>
              </optgroup>
            </select>
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
              {classes && classes
                .filter(cls => !student.school_id || cls.school_id == student.school_id)
                .map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))
              }
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يمكن تغيير مجمع الحلقات بدون تحديد حلقة. سيتم إلحاق الطالب بحلقة لاحقاً.
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