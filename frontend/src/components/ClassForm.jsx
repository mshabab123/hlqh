import { useState, useEffect } from "react";
import SchoolLevelSelect from "./SchoolLevelSelect";

const ClassForm = ({ classData, onSubmit, onCancel, isEditing = false, onClassChange, schools, teachers, semesters, getFilteredSchools, getFilteredTeachers }) => {
  // State to track primary teacher
  const [primaryTeacherId, setPrimaryTeacherId] = useState(classData.primary_teacher_id || null);

  // When classData changes, update primary teacher
  useEffect(() => {
    if (classData.primary_teacher_id) {
      setPrimaryTeacherId(classData.primary_teacher_id);
    } else if (classData.teacher_ids?.length > 0) {
      setPrimaryTeacherId(classData.teacher_ids[0]);
    }
  }, [classData]);

  const handleTeacherToggle = (teacherId, checked) => {
    const currentIds = classData.teacher_ids || [];
    let newIds;
    
    if (checked) {
      newIds = [...currentIds, teacherId];
      // If this is the first teacher, make them primary
      if (newIds.length === 1) {
        setPrimaryTeacherId(teacherId);
      }
    } else {
      newIds = currentIds.filter(id => id !== teacherId);
      // If we're removing the primary teacher, assign a new one
      if (teacherId === primaryTeacherId && newIds.length > 0) {
        setPrimaryTeacherId(newIds[0]);
      } else if (newIds.length === 0) {
        setPrimaryTeacherId(null);
      }
    }
    
    onClassChange({...classData, teacher_ids: newIds, primary_teacher_id: primaryTeacherId});
  };

  const handlePrimaryChange = (teacherId) => {
    setPrimaryTeacherId(teacherId);
    onClassChange({...classData, primary_teacher_id: teacherId});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure primary_teacher_id is included in submission
    const dataToSubmit = {
      ...classData,
      primary_teacher_id: primaryTeacherId
    };
    onSubmit(e, dataToSubmit);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
          {isEditing ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {semesters && semesters.map ? semesters
                  .filter(semester => !classData.school_id || semester.school_id == classData.school_id)
                  .map(semester => (
                  <option key={semester.id} value={semester.id}>
                    الفصل {semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} {semester.year}
                  </option>
                )) : null}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">مجمع الحلقات *</label>
              <select
                value={classData.school_id}
                onChange={(e) => onClassChange({...classData, school_id: e.target.value, semester_id: ""})}
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
              <SchoolLevelSelect
                name="school_level"
                value={classData.school_level}
                onChange={(e) => onClassChange({...classData, school_level: e.target.value})}
                placeholder="اختر المستوى"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المعلمون</label>
            {!classData.school_id ? (
              <div className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500">
                يرجى اختيار مجمع الحلقات أولاً
              </div>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                  {getFilteredTeachers(classData.school_id).length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">لا توجد معلمون متاحون</p>
                  ) : (
                    getFilteredTeachers(classData.school_id).map(teacher => {
                      const isSelected = classData.teacher_ids?.includes(teacher.id) || false;
                      const isPrimary = teacher.id === primaryTeacherId;
                      
                      return (
                        <div key={teacher.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleTeacherToggle(teacher.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="flex-1 text-sm">
                            {teacher.first_name} {teacher.last_name}
                            {teacher.specialization && (
                              <span className="text-gray-500"> - {teacher.specialization}</span>
                            )}
                          </span>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="primaryTeacher"
                                checked={isPrimary}
                                onChange={() => handlePrimaryChange(teacher.id)}
                                className="w-4 h-4 text-green-600"
                              />
                              <label className={`text-xs ${isPrimary ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                                {isPrimary ? 'أساسي' : 'مساعد'}
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {classData.teacher_ids?.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>ملاحظة:</strong> المعلم الأساسي له الصلاحية الكاملة على الحلقة، بينما المعلمون المساعدون لديهم صلاحيات محدودة
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={classData.is_active}
                onChange={(e) => onClassChange({...classData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">حلقة نشطة</label>
            </div>
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
};

export default ClassForm;