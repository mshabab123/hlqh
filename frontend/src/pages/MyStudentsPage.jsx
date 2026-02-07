import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AiOutlineUser, 
  AiOutlineEye,
  AiOutlineClose,
  AiOutlineLoading,
  AiOutlineBook,
  AiOutlineCalendar,
  AiOutlineInfoCircle,
  AiOutlineHome,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineHeart
} from 'react-icons/ai';

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function MyStudentsPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const fetchMyStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/parent-students/my-students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('خطأ في جلب بيانات الطلاب');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      setDetailsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/parent-students/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentDetails(response.data);
    } catch (err) {
      console.error('Error fetching student details:', err);
      setError('خطأ في جلب تفاصيل الطالب');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
    await fetchStudentDetails(student.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const getAttendanceColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'excused': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAttendanceText = (status) => {
    switch (status) {
      case 'present': return 'حاضر';
      case 'absent': return 'غائب';
      case 'late': return 'متأخر';
      case 'excused': return 'غياب بعذر';
      default: return status;
    }
  };

  const getRelationshipText = (relationshipType) => {
    switch (relationshipType) {
      case 'parent': return 'ابن/ابنة';
      case 'guardian': return 'وصي';
      case 'relative': return 'قريب';
      default: return relationshipType;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-pink-100 p-3 rounded-full">
            <AiOutlineHeart className="text-pink-600 text-2xl" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">معلومات أبنائي</h1>
            <p className="text-gray-600">عرض ومتابعة بيانات وأداء أبنائك الطلاب</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Students List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <AiOutlineLoading className="animate-spin text-3xl text-gray-400 mr-2" />
          <span className="text-gray-600">جاري تحميل البيانات...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12">
          <AiOutlineUser className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">لا يوجد أبناء مسجلين</h3>
          <p className="text-gray-500">لا توجد علاقة طلابية مسجلة بحسابك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {students.map((student) => (
            <div key={student.id} className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors shadow-sm hover:shadow-md">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <AiOutlineUser className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        الهوية: {student.id}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    student.is_primary ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {student.is_primary ? 'أساسي' : 'فرعي'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <AiOutlineBook className="text-gray-400" />
                    <span className="text-gray-600">المرحلة:</span>
                    <span className="font-medium">{student.school_level || 'غير محدد'}</span>
                  </div>
                  
                  {student.class_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <AiOutlineHome className="text-gray-400" />
                      <span className="text-gray-600">الحلقة:</span>
                      <span className="font-medium">{student.class_name}</span>
                    </div>
                  )}
                  
                  {student.school_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <AiOutlineInfoCircle className="text-gray-400" />
                      <span className="text-gray-600">المجمع:</span>
                      <span className="font-medium">{student.school_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.is_active ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {student.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                    <span className="text-xs text-gray-500">
                      العلاقة: {getRelationshipText(student.relationship_type)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleViewDetails(student)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <AiOutlineEye />
                  عرض التفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                تفاصيل الطالب - {selectedStudent.first_name} {selectedStudent.last_name}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStudent(null);
                  setStudentDetails(null);
                }}
                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
              >
                <AiOutlineClose />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <AiOutlineLoading className="animate-spin text-3xl text-gray-400 mr-2" />
                  <span className="text-gray-600">جاري تحميل التفاصيل...</span>
                </div>
              ) : studentDetails ? (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineUser className="text-blue-600" />
                      المعلومات الشخصية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">الاسم الكامل:</span>
                        <p className="font-medium">
                          {studentDetails.student.first_name} {studentDetails.student.second_name} {studentDetails.student.third_name} {studentDetails.student.last_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">رقم الهوية:</span>
                        <p className="font-medium">{studentDetails.student.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">تاريخ الميلاد:</span>
                        <p className="font-medium">{formatDate(studentDetails.student.date_of_birth)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">تاريخ الالتحاق:</span>
                        <p className="font-medium">{formatDate(studentDetails.student.enrollment_date)}</p>
                      </div>
                      {studentDetails.student.email && (
                        <div className="flex items-center gap-2">
                          <AiOutlineMail className="text-gray-400" />
                          <span className="text-sm text-gray-600">البريد:</span>
                          <p className="font-medium">{studentDetails.student.email}</p>
                        </div>
                      )}
                      {studentDetails.student.phone && (
                        <div className="flex items-center gap-2">
                          <AiOutlinePhone className="text-gray-400" />
                          <span className="text-sm text-gray-600">الهاتف:</span>
                          <p className="font-medium">{studentDetails.student.phone}</p>
                        </div>
                      )}
                    </div>
                    {studentDetails.student.address && (
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">العنوان:</span>
                        <p className="font-medium">{studentDetails.student.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Academic Information */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineBook className="text-blue-600" />
                      المعلومات الأكاديمية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">المرحلة الدراسية:</span>
                        <p className="font-medium">{studentDetails.student.school_level || 'غير محدد'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">الحالة:</span>
                        <p className="font-medium">{studentDetails.student.student_status || 'غير محدد'}</p>
                      </div>
                      {studentDetails.student.school_name && (
                        <div>
                          <span className="text-sm text-gray-600">المجمع:</span>
                          <p className="font-medium">{studentDetails.student.school_name}</p>
                        </div>
                      )}
                      {studentDetails.student.class_name && (
                        <div>
                          <span className="text-sm text-gray-600">الحلقة:</span>
                          <p className="font-medium">{studentDetails.student.class_name} - {studentDetails.student.class_level}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Grades */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineBook className="text-green-600" />
                      أحدث الدرجات
                    </h4>
                    {studentDetails.grades.length === 0 ? (
                      <p className="text-gray-600">لا توجد درجات مسجلة</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right py-2">المقرر</th>
                              <th className="text-right py-2">الدرجة</th>
                              <th className="text-right py-2">النوع</th>
                              <th className="text-right py-2">الفصل</th>
                              <th className="text-right py-2">التاريخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentDetails.grades.slice(0, 10).map((grade) => (
                              <tr key={grade.id} className="border-b">
                                <td className="py-2">{grade.course_name || 'غير محدد'}</td>
                                <td className="py-2 font-medium">{grade.grade_value}</td>
                                <td className="py-2">{grade.grade_type || 'غير محدد'}</td>
                                <td className="py-2">{grade.semester || 'غير محدد'}</td>
                                <td className="py-2">{formatDate(grade.grade_date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Attendance */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineCalendar className="text-yellow-600" />
                      سجل الحضور الأخير
                    </h4>
                    {studentDetails.attendance.length === 0 ? (
                      <p className="text-gray-600">لا يوجد سجل حضور</p>
                    ) : (
                      <div className="space-y-2">
                        {studentDetails.attendance.slice(0, 10).map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getAttendanceColor(record.status)}`}>
                                {getAttendanceText(record.status)}
                              </span>
                              <span className="text-sm text-gray-600">{record.class_name || 'غير محدد'}</span>
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(record.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}