import { useState } from "react";
import { AiOutlineUser, AiOutlineEye, AiOutlineEdit, AiOutlineBook, AiOutlineCheck, AiOutlineClose, AiOutlineWarning, AiOutlineDelete, AiOutlineUserDelete, AiOutlineUserAdd, AiOutlineSchedule, AiOutlineStop } from "react-icons/ai";
import { BsFillGridFill } from "react-icons/bs";
import { calculateQuranProgress, getProgressColor, getProgressBgColor, calculateQuranBlocks } from "../utils/studentUtils";
import QuranBlocksModal from "./QuranBlocksModal";

const StudentCard = ({
  student,
  onView,
  onEdit,
  onToggleStatus,
  onQuranProgress,
  onDelete,
  onRemoveFromClass,
  onAssignClass,
  onRegisterSemester,
  onUnregisterSemester,
  features = {},
}) => {
  const hasSchoolAssignment = student.school_id;
  const [showBlocksModal, setShowBlocksModal] = useState(false);

  // Placement state for the current semester (fields come from the students list API).
  const hasCurrentSemester = Boolean(student.current_semester_id);
  const isRegisteredInCurrentSemester = Boolean(student.registration_status);
  const isEnrolledInCurrentSemester =
    Boolean(student.class_id) && String(student.semester_id) === String(student.current_semester_id);
  const isWaitingForClass = isRegisteredInCurrentSemester && !isEnrolledInCurrentSemester;

  const handleShowBlocks = async () => {
    console.log('Fetching grades for Quran blocks:', student.id);

    // Fetch student grades using simple endpoint
    let grades = [];

    if (student.id) {
      try {
        const token = localStorage.getItem('token');

        // Use simple API endpoint (no class_id or semester_id)
        const apiUrl = `/api/grades/student/${student.id}`;

        const response = await fetch(apiUrl, {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();

          // Extract grades array from the response object
          if (Array.isArray(data)) {
            // Direct array (old format)
            grades = data;
          } else if (data.grades && Array.isArray(data.grades)) {
            // Object with grades property (new format)
            grades = data.grades;
          } else {
            console.log('Unexpected grades response format in StudentCard:', typeof data);
            grades = [];
          }

          console.log('Grades fetched for blocks:', grades.length, 'grades');
        } else {
          console.log('Failed to fetch grades for blocks. Status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching grades for blocks:', error);
      }
    }

    const blocksData = calculateQuranBlocks(student, grades);
    setShowBlocksModal(blocksData);
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
            <AiOutlineUser className="text-[var(--color-primary-700)] text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h3>
            <p className="text-sm text-gray-600">رقم الهوية: {student.id}</p>
            <p className="text-sm text-gray-600">المستوى: {student.school_level}</p>
            
            {/* Quick Quran Progress */}
            {student.memorized_surah_id && student.memorized_ayah_number && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">تقدم الحفظ:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage)}`}
                      style={{ 
                        width: `${Math.min(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className={`text-xs font-bold ${getProgressColor(calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage)}`}>
                    {calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).percentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  <span>
                    {calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).memorizedAyahs.toLocaleString()} آية محفوظة
                  </span>
                  <span>📄 {calculateQuranProgress(student.memorized_surah_id, student.memorized_ayah_number).memorizedPages} صفحة</span>
                </div>
              </div>
            )}
            
            {!hasSchoolAssignment && (
              <div className="flex items-center gap-1 mt-1 text-orange-600">
                <AiOutlineWarning className="text-sm" />
                <span className="text-xs">               لا يسمح بتنشيط حساب الطالب لان الطالب غير مسجل في مجمع حلقات، لتسجيل الطالب يجب الدخول على تعديل ومن ثم تعديل بينات الطالب وتعيينه في مجمع حلقات وبعد ذلك اضغط على تفعيل لتنشيط الحساب.</span>
              </div>
            )}
          </div>
        </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
        student.status === 'active' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        {student.status === 'active' ? 'نشط' : 'غير نشط'}
      </div>
    </div>
    
    <div className="space-y-2 text-sm text-gray-600 mb-4">
      {student.email && <p>البريد: {student.email}</p>}
      {student.phone && <p>الهاتف: {student.phone}</p>}
      {student.school_name && <p>مجمع الحلقات: {student.school_name}</p>}
      {student.class_name && (
        <p>الحلقة: {student.class_name}
          {student.semester_name && <span className="text-xs text-gray-500"> - {student.semester_name}</span>}
        </p>
      )}
      {student.enrollment_date && (
        <p>تاريخ التسجيل: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}</p>
      )}
      {hasCurrentSemester && (
        <p>
          {student.current_semester_name && <span>الفصل الحالي: {student.current_semester_name} — </span>}
          {!isRegisteredInCurrentSemester ? (
            <span className="text-red-600 font-semibold">غير مسجل في الفصل</span>
          ) : isWaitingForClass ? (
            <span className="text-amber-600 font-semibold">بانتظار الحلقة</span>
          ) : (
            <span className="text-green-600 font-semibold">تم التسكين</span>
          )}
        </p>
      )}
    </div>
    
    <div className="grid grid-cols-4 gap-2">
      <button
        onClick={() => onView(student)}
        className="bg-blue-500 text-white py-2 px-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineEye /> عرض المعلومات
      </button>
      <button
        onClick={() => onEdit(student)}
        className="bg-yellow-500 text-white py-2 px-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineEdit /> تعديل الملف
      </button>
      <button
        onClick={() => onQuranProgress(student)}
        className="bg-green-600 text-white py-2 px-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <AiOutlineBook /> خطة الحفظ
      </button>
      <button
        onClick={handleShowBlocks}
        className="bg-purple-600 text-white py-2 px-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <BsFillGridFill /> متابعة المراجعة
      </button>
      <button
        onClick={() => onToggleStatus(student)}
        disabled={student.status !== 'active' && !hasSchoolAssignment}
        className={`py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm ${
          student.status === 'active' 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : hasSchoolAssignment
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 cursor-not-allowed text-white'
        }`}
        title={student.status !== 'active' && !hasSchoolAssignment 
          ? 'يجب تعيين الطالب إلى مدرسة أولاً' 
          : ''
        }
      >
        {student.status === 'active' ? (
          <><AiOutlineClose /> إيقاف</>
        ) : hasSchoolAssignment ? (
          <><AiOutlineCheck /> تفعيل</>
        ) : (
          <><AiOutlineWarning /> تفعيل</>
        )}
      </button>
      {student.class_id && onRemoveFromClass && features.remove_student_class !== false && (
        <button
          onClick={() => onRemoveFromClass(student)}
          className="bg-orange-500 text-white py-2 px-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-1 text-sm"
          title="إزالة الطالب من الحلقة وإعادته إلى قائمة بانتظار الحلقة"
        >
          <AiOutlineUserDelete /> إزالة من الحلقة
        </button>
      )}
      {hasCurrentSemester && isWaitingForClass && onAssignClass && features.assign_student_class !== false && (
        <button
          onClick={() => onAssignClass(student)}
          className="bg-teal-600 text-white py-2 px-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1 text-sm"
          title="تسكين الطالب في حلقة من حلقات الفصل الحالي"
        >
          <AiOutlineUserAdd /> تسكين في حلقة
        </button>
      )}
      {hasCurrentSemester && !isRegisteredInCurrentSemester && onRegisterSemester && features.register_student_semester !== false && (
        <button
          onClick={() => onRegisterSemester(student)}
          className="bg-emerald-600 text-white py-2 px-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 text-sm"
          title="تسجيل الطالب في الفصل الدراسي الحالي"
        >
          <AiOutlineSchedule /> تسجيل في الفصل
        </button>
      )}
      {hasCurrentSemester && isRegisteredInCurrentSemester && onUnregisterSemester && features.unregister_student_semester !== false && (
        <button
          onClick={() => onUnregisterSemester(student)}
          className="bg-rose-500 text-white py-2 px-2 rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-1 text-sm"
          title="إلغاء تسجيل الطالب في الفصل الدراسي الحالي"
        >
          <AiOutlineStop /> إزالة من الفصل
        </button>
      )}
      {features.delete_student !== false && (
        <button
          onClick={() => onDelete(student)}
          className="bg-red-600 text-white py-2 px-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1 text-sm col-span-2"
        >
          <AiOutlineDelete /> حذف الطالب
        </button>
      )}
    </div>

    {/* Quran Blocks Modal */}
    {showBlocksModal && (
      <QuranBlocksModal
        student={student}
        blocksData={showBlocksModal}
        onClose={() => setShowBlocksModal(false)}
      />
    )}
  </div>
  );
};

export default StudentCard;
