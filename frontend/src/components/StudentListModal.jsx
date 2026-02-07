import { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { AiOutlineEye, AiOutlineSearch } from "react-icons/ai";
import StudentProfileModal from "./StudentProfileModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentListModal = ({ classItem, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (classItem) {
      fetchClassStudents();
    }
  }, [classItem]);

  const fetchClassStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/students`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudents(response.data || []);
    } catch (err) {
      setError("فشل في تحميل طلاب الحلقة");
    } finally {
      setLoading(false);
    }
  };

  if (!classItem) return null;

  // Filter students based on search term
  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name || ''} ${student.second_name || ''} ${student.third_name || ''} ${student.last_name || ''}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Show individual student profile if selected
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
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xl max-w-4xl w-full m-2 sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-2 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-primary-700)]">
            قائمة طلاب حلقة: {classItem.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
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
            
            {/* Search Input */}
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
              {filteredStudents.map(student => (
                <div key={student.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base sm:text-lg">
                      {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {student.school_level} • تاريخ التسجيل: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="self-start sm:self-auto">
                    <button
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