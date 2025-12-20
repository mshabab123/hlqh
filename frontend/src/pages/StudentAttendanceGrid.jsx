import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AiOutlineCalendar,
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineUser,
  AiOutlineLoading3Quarters,
  AiOutlineArrowLeft,
  AiOutlineBarChart,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentAttendanceGrid = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data states
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [semesters, setSemesters] = useState([]);

  // Selection states
  const [selectedSemester, setSelectedSemester] = useState("");

  // Edit mode
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [studentId]);

  useEffect(() => {
    if (selectedSemester && studentData) {
      fetchAttendanceData();
    }
  }, [selectedSemester, studentData]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Get student info
      const studentRes = await axios.get(`${API_BASE}/api/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudentData(studentRes.data);

      // Get semesters for the student's class
      if (studentRes.data.current_class_id) {
        const semestersRes = await axios.get(`${API_BASE}/api/semesters`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const semestersData = semestersRes.data.semesters || semestersRes.data || [];
        setSemesters(semestersData);

        // Auto-select current semester
        if (semestersData.length > 0) {
          const currentDate = new Date();
          const currentSemester = semestersData.find(semester => {
            const startDate = new Date(semester.start_date);
            const endDate = new Date(semester.end_date);
            return currentDate >= startDate && currentDate <= endDate;
          });

          setSelectedSemester(currentSemester ? currentSemester.id : semestersData[0].id);
        }
      }

    } catch (err) {
      setError("فشل في تحميل بيانات الطالب");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!selectedSemester || !studentData?.current_class_id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_BASE}/api/attendance/semester/${selectedSemester}/class/${studentData.current_class_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Filter for this specific student
      const studentAttendance = response.data.students.find(s => s.student_id === studentId);

      setAttendanceData({
        ...response.data,
        student: studentAttendance
      });

    } catch (err) {
      setError("فشل في تحميل بيانات الحضور");
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (date) => {
    const cellKey = `${studentId}_${date}`;
    setEditingCell(editingCell === cellKey ? null : cellKey);
  };

  const handleAttendanceChange = async (date, isPresent) => {
    const key = `${studentId}_${date}`;

    try {
      await axios.post(`${API_BASE}/api/attendance/mark`, {
        semester_id: selectedSemester,
        class_id: studentData.current_class_id,
        student_id: studentId,
        attendance_date: date,
        is_present: isPresent,
        notes: ""
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setEditingCell(null);
      fetchAttendanceData(); // Refresh data
      setSuccess(`تم تسجيل ${isPresent ? 'الحضور' : 'الغياب'} بنجاح`);
      setTimeout(() => setSuccess(""), 3000);

    } catch (err) {
      setError("فشل في حفظ الحضور");
    }
  };

  const getStatusColor = (day) => {
    if (day.status === 'present') return 'bg-emerald-500 text-white';
    if (day.status === 'absent') return 'bg-red-500 text-white';
    return 'bg-gray-200 text-gray-500';
  };

  const getStatusIcon = (day) => {
    if (day.status === 'present') return <AiOutlineCheck className="w-4 h-4" />;
    if (day.status === 'absent') return <AiOutlineClose className="w-4 h-4" />;
    return <AiOutlineClockCircle className="w-4 h-4" />;
  };

  const formatDualCalendarDate = (dateString) => {
    try {
      const date = new Date(dateString + 'T12:00:00.000Z');

      const hijriDate = date.toLocaleDateString('ar-SA', {
        calendar: 'islamic-umalqura',
        day: 'numeric',
        month: 'short'
      });

      const gregorianDate = date.toLocaleDateString('ar-SA', {
        calendar: 'gregory',
        day: 'numeric',
        month: 'short'
      });

      return (
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-800">{hijriDate} هـ</div>
          <div className="text-xs text-gray-600 mt-0.5">{gregorianDate} م</div>
        </div>
      );
    } catch (error) {
      return <span className="text-xs text-gray-500">تاريخ غير صحيح</span>;
    }
  };

  if (loading && !attendanceData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-3">
          <AiOutlineLoading3Quarters className="animate-spin text-2xl text-blue-500" />
          <span>جاري تحميل بيانات الحضور...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-gray-600 hover:text-blue-600"
            >
              <AiOutlineArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <AiOutlineUser className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">جدول الغياب</h1>
                {studentData && (
                  <p className="text-lg text-gray-600 mt-1">
                    {studentData.first_name} {studentData.last_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Student Info Card */}
          {studentData && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <AiOutlineUser className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الطالب</p>
                    <p className="text-lg font-semibold">{studentData.first_name} {studentData.last_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <AiOutlineCalendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">رقم الطالب</p>
                    <p className="text-lg font-semibold">{studentData.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <AiOutlineBarChart className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الحلقة</p>
                    <p className="text-lg font-semibold">{studentData.class_name || 'غير محدد'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Semester Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium mb-3 text-gray-700">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              >
                <option value="">اختر الفصل الدراسي</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name || semester.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AiOutlineCloseCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AiOutlineCheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Attendance Grid */}
        {attendanceData && attendanceData.student && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Statistics Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{attendanceData.student.statistics.total_working_days}</div>
                  <div className="text-sm opacity-90">إجمالي الأيام</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-300">{attendanceData.student.statistics.present_days}</div>
                  <div className="text-sm opacity-90">أيام الحضور</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">{attendanceData.student.statistics.absent_days}</div>
                  <div className="text-sm opacity-90">أيام الغياب</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">{attendanceData.student.statistics.attendance_rate}%</div>
                  <div className="text-sm opacity-90">نسبة الحضور</div>
                </div>
              </div>
            </div>

            {/* Attendance Calendar */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">التقويم الشهري</h3>

              <div className="grid grid-cols-7 gap-3">
                {/* Header Days */}
                {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
                  <div key={day} className="text-center p-3 font-semibold text-gray-600 text-sm">
                    {day}
                  </div>
                ))}

                {/* Working Days Grid */}
                {attendanceData.working_days.map((dayInfo, index) => {
                  const attendanceDay = attendanceData.student.attendance.find(a => a.date === dayInfo.date);
                  const dayOfWeek = new Date(dayInfo.date).getDay();

                  // Calculate grid position (empty cells for alignment)
                  const gridColumn = (dayOfWeek + 1) % 7 || 7;

                  return (
                    <div key={dayInfo.date} className="relative">
                      <button
                        onClick={() => handleCellClick(dayInfo.date)}
                        className={`w-full h-20 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg ${getStatusColor(attendanceDay)} ${
                          attendanceDay?.status === 'unknown' ? 'border-2 border-dashed border-gray-300' : 'shadow-md'
                        }`}
                        title={`${dayInfo.date} - ${attendanceDay?.status === 'present' ? 'حاضر' : attendanceDay?.status === 'absent' ? 'غائب' : 'غير محدد'}`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {getStatusIcon(attendanceDay)}
                        </div>
                        <div className="text-xs">
                          {formatDualCalendarDate(dayInfo.date)}
                        </div>

                        {editingCell === `${studentId}_${dayInfo.date}` && (
                          <div className="absolute z-20 top-full mt-2 bg-white border rounded-xl shadow-xl p-3 min-w-[120px]">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttendanceChange(dayInfo.date, true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
                              >
                                <AiOutlineCheck className="w-4 h-4" />
                                حاضر
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttendanceChange(dayInfo.date, false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                              >
                                <AiOutlineClose className="w-4 h-4" />
                                غائب
                              </button>
                            </div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                  <span className="text-sm text-gray-600">حاضر</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-600">غائب</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 border-2 border-dashed border-gray-300 rounded"></div>
                  <span className="text-sm text-gray-600">غير محدد</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!attendanceData && !loading && selectedSemester && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <AiOutlineCalendar className="mx-auto text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">لا توجد بيانات حضور</h3>
            <p className="text-gray-500">اختر الفصل الدراسي لعرض بيانات الحضور</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceGrid;