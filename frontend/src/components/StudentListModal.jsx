import { useEffect, useState } from "react";
import { AiOutlineEye, AiOutlineSearch, AiOutlineUserAdd } from "react-icons/ai";
import axios from "../utils/axiosConfig";
import StudentProfileModal from "./StudentProfileModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentListModal = ({ classItem, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState("");
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [availableSearchTerm, setAvailableSearchTerm] = useState("");

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = storedUser.role || storedUser.user_type || "";
  const canAddStudents = Boolean(classItem?.semester_id) && (
    userRole !== "teacher" || classItem?.can_assign_registered_students !== false
  );

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };

  useEffect(() => {
    if (classItem) {
      fetchClassStudents();
    }
  }, [classItem]);

  const fetchClassStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/students`, {
        headers: authHeaders
      });
      setStudents(response.data || []);
      setError("");
    } catch (err) {
      setError("فشل في تحميل طلاب الحلقة");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    if (!classItem?.id) return;

    try {
      setAvailableLoading(true);
      setAvailableError("");
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/available-students`, {
        headers: authHeaders
      });
      setAvailableStudents(response.data || []);
    } catch (err) {
      setAvailableError(err.response?.data?.error || "تعذر تحميل قائمة الطلاب المتاحين للإضافة");
      setAvailableStudents([]);
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleOpenAddStudents = () => {
    setShowAddStudents(true);
    fetchAvailableStudents();
  };

  const handleAssignStudent = async (studentId) => {
    if (!classItem?.id) return;

    try {
      setAssigningStudentId(studentId);
      setAvailableError("");
      await axios.post(
        `${API_BASE}/api/classes/${classItem.id}/students`,
        { student_id: studentId },
        { headers: authHeaders }
      );
      await Promise.all([fetchClassStudents(), fetchAvailableStudents()]);
    } catch (err) {
      setAvailableError(err.response?.data?.error || "تعذر إضافة الطالب إلى الحلقة");
    } finally {
      setAssigningStudentId(null);
    }
  };

  if (!classItem) return null;

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name || ""} ${student.second_name || ""} ${student.third_name || ""} ${student.last_name || ""}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAvailableStudents = availableStudents.filter((student) => {
    const fullName = `${student.first_name || ""} ${student.second_name || ""} ${student.third_name || ""} ${student.last_name || ""}`;
    const studentId = String(student.student_id || student.id || "");
    const needle = availableSearchTerm.toLowerCase();
    return fullName.toLowerCase().includes(needle) || studentId.includes(needle);
  });

  if (selectedStudent) {
    return (
      <StudentProfileModal
        student={selectedStudent}
        classItem={classItem}
        onBack={() => setSelectedStudent(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl max-w-4xl w-full m-2 sm:m-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-start gap-2 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-primary-700)]">
            قائمة طلاب حلقة: {classItem.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            type="button"
          >
            x
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">جاري تحميل قائمة الطلاب...</div>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">الطلاب المسجلين ({filteredStudents.length})</h3>
            </div>

            {canAddStudents && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleOpenAddStudents}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <AiOutlineUserAdd />
                  إضافة طالب
                </button>
              </div>
            )}

            {showAddStudents && (
              <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-teal-900">إضافة طالب إلى هذه الحلقة</h4>
                    <p className="text-sm text-teal-700">
                      تظهر هنا أسماء الطلاب النشطين المتاحين للإضافة، ويمكن تحديد الهدف بعد إضافتهم.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStudents(false)}
                    className="rounded-lg bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    إخفاء
                  </button>
                </div>

                {availableError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {availableError}
                  </div>
                )}

                <div className="relative mb-3">
                  <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ابحث في الطلاب المتاحين للإضافة..."
                    value={availableSearchTerm}
                    onChange={(e) => setAvailableSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {availableLoading ? (
                  <p className="py-4 text-center text-gray-600">جاري تحميل القائمة...</p>
                ) : filteredAvailableStudents.length === 0 ? (
                  <p className="py-4 text-center text-gray-600">لا يوجد طلاب متاحون للإضافة</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {filteredAvailableStudents.map((student) => {
                      const studentId = student.student_id || student.id;

                      return (
                        <div key={studentId} className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{studentId}</p>
                            {student.has_goal !== true && (
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                بدون هدف حالياً، ويمكن للمعلم تحديده بعد الإضافة
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssignStudent(studentId)}
                            disabled={assigningStudentId === studentId}
                            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {assigningStudentId === studentId ? "جاري الإضافة..." : "إضافة للحلقة"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن طالب بالاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base sm:text-lg">
                      {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {student.school_level} - تاريخ التسجيل: {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString("ar-SA") : "غير محدد"}
                    </p>
                  </div>
                  <div className="self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                    >
                      <AiOutlineEye /> عرض الملف
                    </button>
                  </div>
                </div>
              ))}

              {filteredStudents.length === 0 && students.length > 0 && (
                <p className="text-gray-500 text-center py-8">لا توجد نتائج بحث مطابقة</p>
              )}

              {students.length === 0 && (
                <p className="text-gray-500 text-center py-8">لا يوجد طلاب في هذه الحلقة</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentListModal;
