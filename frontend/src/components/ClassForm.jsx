const ClassForm = ({ classData, onSubmit, onCancel, isEditing = false, onClassChange, schools, teachers, semesters, getFilteredSchools, getFilteredTeachers }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الحلقة *</label>
            <input
              type="text"
              value={classData.name}
              onChange={(e) => onClassChange({...classData, name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الفصل الدراسي *</label>
            <select
              value={classData.semester_id || ""}
              onChange={(e) => onClassChange({...classData, semester_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر الفصل الدراسي</option>
              {semesters && semesters.map ? semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  الفصل {semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} {semester.year}
                </option>
              )) : null}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات *</label>
            <select
              value={classData.school_id}
              onChange={(e) => onClassChange({...classData, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر مجمع الحلقات</option>
              {getFilteredSchools().map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المستوى الدراسي *</label>
            <select
              value={classData.school_level}
              onChange={(e) => onClassChange({...classData, school_level: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر المستوى</option>
              <option value="الأول الابتدائي">الأول الابتدائي</option>
              <option value="الثاني الابتدائي">الثاني الابتدائي</option>
              <option value="الثالث الابتدائي">الثالث الابتدائي</option>
              <option value="الرابع الابتدائي">الرابع الابتدائي</option>
              <option value="الخامس الابتدائي">الخامس الابتدائي</option>
              <option value="السادس الابتدائي">السادس الابتدائي</option>
              <option value="الأول المتوسط">الأول المتوسط</option>
              <option value="الثاني المتوسط">الثاني المتوسط</option>
              <option value="الثالث المتوسط">الثالث المتوسط</option>
              <option value="الأول الثانوي">الأول الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
              <option value="جامعة">جامعة</option>
              <option value="دراسات عليا">دراسات عليا</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">المعلم</label>
            <select
              value={classData.teacher_id || ""}
              onChange={(e) => onClassChange({...classData, teacher_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!classData.school_id}
            >
              <option value="">اختر المعلم</option>
              {getFilteredTeachers(classData.school_id).map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name}
                </option>
              ))}
            </select>
            {!classData.school_id && (
              <p className="text-sm text-gray-500 mt-1">يرجى اختيار مجمع الحلقات أولاً</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحد الأقصى للطلاب</label>
            <input
              type="number"
              min="1"
              max="50"
              value={classData.max_students}
              onChange={(e) => onClassChange({...classData, max_students: parseInt(e.target.value) || 0})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-4">
          <input
            type="checkbox"
            checked={classData.is_active}
            onChange={(e) => onClassChange({...classData, is_active: e.target.checked})}
            className="w-4 h-4"
          />
          <label className="text-sm font-medium">حلقة نشطة</label>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)]"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default ClassForm;