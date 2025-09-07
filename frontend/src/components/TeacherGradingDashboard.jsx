import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlineBook, 
  AiOutlineUser, 
  AiOutlineEdit,
  AiOutlineEye
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const TeacherGradingDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  const loadTeacherClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/api/grading/teacher/my-classes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setClasses(response.data.classes || []);
      }
    } catch (error) {
      console.error("Error loading teacher classes:", error);
      setError("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return "text-green-600 bg-green-100";
    if (grade >= 80) return "text-blue-600 bg-blue-100";
    if (grade >= 70) return "text-yellow-600 bg-yellow-100";
    if (grade >= 60) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-yellow-600";
    if (rate >= 75) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AiOutlineBook className="text-blue-600" />
          نظام الدرجات - حلقاتي
        </h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AiOutlineBook className="text-blue-600" />
          نظام الدرجات - حلقاتي
        </h3>
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AiOutlineBook className="text-blue-600" />
          نظام الدرجات - حلقاتي
        </h3>
        <div className="text-center py-8 text-gray-500">
          <AiOutlineUser className="text-4xl mx-auto mb-2" />
          <p>لا توجد حلقات مُعيّنة لك حالياً</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <AiOutlineBook className="text-blue-600" />
          نظام الدرجات - حلقاتي ({classes.length} حلقات)
        </h3>
        <a
          href="/comprehensive-grading"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          <AiOutlineEye />
          عرض مفصل
        </a>
      </div>

      <div className="space-y-4">
        {classes.map((classItem) => (
          <div key={classItem.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-gray-800">{classItem.name}</h4>
                <p className="text-sm text-gray-600">
                  {classItem.school_name} • {classItem.semester_name}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>الطلاب: {classItem.student_count}</span>
                  <span className={`px-2 py-1 rounded-full ${
                    classItem.teacher_role === 'primary' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {classItem.teacher_role === 'primary' ? 'معلم أساسي' : 'معلم مساعد'}
                  </span>
                </div>
              </div>
            </div>

            {/* Students Preview - Show first 3 students */}
            <div className="space-y-2">
              {classItem.students.slice(0, 3).map((student) => (
                <div key={student.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <AiOutlineUser className="text-white text-xs" />
                    </div>
                    <span className="font-medium">{student.fullName}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(student.averageGrade)}`}>
                      {student.averageGrade.toFixed(1)}%
                    </div>
                    <div className={`text-xs ${getAttendanceColor(student.attendanceRate)}`}>
                      حضور: {student.attendanceRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {student.totalPoints} نقطة
                    </div>
                  </div>
                </div>
              ))}
              
              {classItem.students.length > 3 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  و {classItem.students.length - 3} طلاب آخرين...
                </div>
              )}
            </div>

            {/* Class Summary */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="font-semibold text-gray-700">المتوسط العام</div>
                  <div className={`text-sm font-bold ${
                    classItem.students.length > 0
                      ? getGradeColor(
                          classItem.students.reduce((sum, s) => sum + s.averageGrade, 0) / classItem.students.length
                        ).replace('bg-', 'text-')
                      : 'text-gray-400'
                  }`}>
                    {classItem.students.length > 0
                      ? (classItem.students.reduce((sum, s) => sum + s.averageGrade, 0) / classItem.students.length).toFixed(1)
                      : '0'}%
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">متوسط الحضور</div>
                  <div className={`text-sm font-bold ${
                    classItem.students.length > 0
                      ? getAttendanceColor(
                          classItem.students.reduce((sum, s) => sum + s.attendanceRate, 0) / classItem.students.length
                        )
                      : 'text-gray-400'
                  }`}>
                    {classItem.students.length > 0
                      ? (classItem.students.reduce((sum, s) => sum + s.attendanceRate, 0) / classItem.students.length).toFixed(1)
                      : '0'}%
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">مجموع النقاط</div>
                  <div className="text-sm font-bold text-purple-600">
                    {classItem.students.reduce((sum, s) => sum + s.totalPoints, 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherGradingDashboard;