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
  AiOutlineTeam,
  AiOutlineNumber
} from 'react-icons/ai';
import { FaUsers, FaChalkboardTeacher } from 'react-icons/fa';
import StudentListModal from '../components/StudentListModal';

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function MyClasses() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [selectedClassForCourses, setSelectedClassForCourses] = useState(null);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState(null);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Fetch all classes and filter for current teacher
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allClasses = Array.isArray(response.data) ? response.data : [];
      
      console.log('Current user:', user);
      console.log('All classes:', allClasses);
      
      // Filter classes where current user is assigned as teacher
      const myClasses = allClasses.filter(classItem => {
        console.log(`Class ${classItem.name} (ID: ${classItem.id}):`, {
          assigned_teacher_ids: classItem.assigned_teacher_ids,
          teacher_id: classItem.teacher_id,
          teacher_ids: classItem.teacher_ids,
          teachers: classItem.teachers
        });
        
        // Check multiple possible ways teacher might be assigned
        const userId = user.id;
        const userIdInt = parseInt(user.id);
        const userIdStr = String(user.id);
        
        const isAssigned = 
          // Method 1: assigned_teacher_ids array
          (classItem.assigned_teacher_ids && (
            classItem.assigned_teacher_ids.includes(userId) ||
            classItem.assigned_teacher_ids.includes(userIdInt) ||
            classItem.assigned_teacher_ids.includes(userIdStr)
          )) ||
          // Method 2: teacher_id field
          (classItem.teacher_id && (
            classItem.teacher_id === userId ||
            classItem.teacher_id === userIdInt ||
            classItem.teacher_id === userIdStr
          )) ||
          // Method 3: teacher_ids array
          (classItem.teacher_ids && (
            classItem.teacher_ids.includes(userId) ||
            classItem.teacher_ids.includes(userIdInt) ||
            classItem.teacher_ids.includes(userIdStr)
          )) ||
          // Method 4: teachers array with id property
          (classItem.teachers && Array.isArray(classItem.teachers) && 
            classItem.teachers.some(teacher => 
              teacher.id === userId || 
              teacher.id === userIdInt || 
              teacher.id === userIdStr
            ));
            
        console.log(`User ${userId} assigned to class ${classItem.name}:`, isAssigned);
        return isAssigned;
      });
      
      console.log('My classes found:', myClasses);
      setClasses(myClasses);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('خطأ في جلب بيانات الحلقات');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async (classId) => {
    try {
      setDetailsLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch class details and students using existing endpoints
      const [classResponse, studentsResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/classes/${classId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setClassDetails({
        class: classResponse.data,
        students: studentsResponse.data || [],
        courses: classResponse.data.courses || []
      });
    } catch (err) {
      console.error('Error fetching class details:', err);
      setError('خطأ في جلب تفاصيل الحلقة');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = async (classItem) => {
    setSelectedClass(classItem);
    setShowDetailsModal(true);
    await fetchClassDetails(classItem.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <FaChalkboardTeacher className="text-blue-600 text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">حلقاتي</h1>
            <p className="text-gray-600">عرض ومتابعة الحلقات التي تدرّسها</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Classes List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <AiOutlineLoading className="animate-spin text-3xl text-gray-400 mr-2" />
          <span className="text-gray-600">جاري تحميل البيانات...</span>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12">
          <FaUsers className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد حلقات مُكلّف بها</h3>
          <p className="text-gray-500">لا توجد حلقات دراسية مخصصة لك حالياً</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <div key={classItem.id} className="bg-white rounded-xl shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{classItem.name}</h3>
                    <p className="text-green-100 text-sm">{classItem.school_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    classItem.is_active 
                      ? 'bg-green-400 text-white' 
                      : 'bg-red-400 text-white'
                  }`}>
                    {classItem.is_active ? '✓ نشط' : '✗ غير نشط'}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Level */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">📚 المستوى</div>
                    <div className="text-sm font-medium">{classItem.level || 'غير محدد'}</div>
                  </div>
                  
                  {/* Students */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">🎓 الطلاب</div>
                    <div className="text-sm font-medium">حتى {classItem.max_students || 'غير محدود'} طالب</div>
                  </div>
                </div>

                {/* Description */}
                {classItem.description && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">📝 الوصف</div>
                    <div className="text-sm">{classItem.description}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => setSelectedClassForStudents(classItem)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    <AiOutlineUser /> الطلاب
                  </button>
                  
                  <button
                    onClick={() => handleViewDetails(classItem)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    <AiOutlineEye /> التفاصيل
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedClassForCourses(classItem)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                  >
                    <AiOutlineBook /> المقررات
                  </button>
                  
                  <button
                    onClick={() => setSelectedClassForAttendance(classItem)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                  >
                    <AiOutlineCalendar /> الحضور
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class Details Modal */}
      {showDetailsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                تفاصيل الحلقة - {selectedClass.name}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClass(null);
                  setClassDetails(null);
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
              ) : classDetails ? (
                <div className="space-y-6">
                  {/* Class Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineHome className="text-blue-600" />
                      معلومات الحلقة
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">اسم الحلقة:</span>
                        <p className="font-medium">{classDetails.class.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">الرمز:</span>
                        <p className="font-medium">{classDetails.class.class_code || classDetails.class.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">المستوى:</span>
                        <p className="font-medium">{classDetails.class.level || 'غير محدد'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">السعة القصوى:</span>
                        <p className="font-medium">{classDetails.class.max_students || 'غير محدود'}</p>
                      </div>
                      {classDetails.class.school_name && (
                        <div>
                          <span className="text-sm text-gray-600">المجمع:</span>
                          <p className="font-medium">{classDetails.class.school_name}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-600">الحالة:</span>
                        <p className="font-medium">{classDetails.class.is_active ? 'نشط' : 'غير نشط'}</p>
                      </div>
                    </div>
                    {classDetails.class.description && (
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">الوصف:</span>
                        <p className="font-medium">{classDetails.class.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Students List */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <AiOutlineUser className="text-blue-600" />
                      قائمة الطلاب ({classDetails.students.length})
                    </h4>
                    {classDetails.students.length === 0 ? (
                      <p className="text-gray-600">لا يوجد طلاب مسجلين في هذه الحلقة</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-right py-2">الاسم</th>
                              <th className="text-right py-2">رقم الهوية</th>
                              <th className="text-right py-2">المرحلة</th>
                              <th className="text-right py-2">الحالة</th>
                              <th className="text-right py-2">تاريخ الالتحاق</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classDetails.students.map((student) => (
                              <tr key={student.id} className="border-b">
                                <td className="py-2 font-medium">
                                  {student.first_name} {student.last_name}
                                </td>
                                <td className="py-2">{student.id}</td>
                                <td className="py-2">{student.school_level || 'غير محدد'}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {student.is_active ? 'نشط' : 'غير نشط'}
                                  </span>
                                </td>
                                <td className="py-2">{formatDate(student.enrollment_date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Courses */}
                  {classDetails.courses && classDetails.courses.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <AiOutlineBook className="text-green-600" />
                        المقررات الدراسية
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {classDetails.courses.map((course) => (
                          <div key={course.id} className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-gray-800">{course.name}</h5>
                            <p className="text-sm text-gray-600">{course.description || 'لا يوجد وصف'}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>الوحدات: {course.credit_hours || 0}</span>
                              <span className={`px-2 py-1 rounded ${
                                course.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {course.is_active ? 'نشط' : 'غير نشط'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Student List Modal */}
      {selectedClassForStudents && (
        <StudentListModal
          classItem={selectedClassForStudents}
          onClose={() => setSelectedClassForStudents(null)}
        />
      )}

      {/* Course Management Modal - Simple placeholder for now */}
      {selectedClassForCourses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">مقررات الحلقة - {selectedClassForCourses.name}</h3>
              <button
                onClick={() => setSelectedClassForCourses(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <AiOutlineClose />
              </button>
            </div>
            <div className="text-center py-8">
              <AiOutlineBook className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600">إدارة المقررات متاحة قريباً</p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Management Modal - Simple placeholder for now */}
      {selectedClassForAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">إدارة الحضور - {selectedClassForAttendance.name}</h3>
              <button
                onClick={() => setSelectedClassForAttendance(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <AiOutlineClose />
              </button>
            </div>
            <div className="text-center py-8">
              <AiOutlineCalendar className="mx-auto text-4xl text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">إدارة الحضور متاحة قريباً</p>
              <button
                onClick={() => {
                  setSelectedClassForAttendance(null);
                  // Navigate to attendance system
                  window.location.href = '/attendance-system';
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                الذهاب إلى نظام الحضور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}