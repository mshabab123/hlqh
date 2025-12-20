import { useState, useEffect } from "react";
import axios from "axios";
import {
  AiOutlineCalendar,
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineUser,
  AiOutlineLoading3Quarters,
  AiOutlineEye,
  AiOutlineEdit,
  AiOutlineSave,
  AiOutlineReload
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data states
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);

  // Selection states
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  // Edit mode
  const [editingCell, setEditingCell] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // First get accessible classes
      const classesRes = await axios.get(`${API_BASE}/api/attendance/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classesRes.data.classes);

      // Get unique school IDs from accessible classes
      const schoolIds = [...new Set(classesRes.data.classes
        .map(cls => cls.school_id)
        .filter(Boolean)
      )];

      // If user has access to classes, fetch semesters for those schools
      let semestersData = [];
      if (schoolIds.length > 0) {
        // For admins or if multiple schools, get all semesters
        // For other roles, filter by school
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (user.role === 'admin') {
          // Admins can see all semesters
          const semestersRes = await axios.get(`${API_BASE}/api/semesters`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          semestersData = semestersRes.data.semesters || semestersRes.data || [];
        } else {
          // For other roles, get semesters from accessible schools
          const semesterPromises = schoolIds.map(schoolId =>
            axios.get(`${API_BASE}/api/semesters?school_id=${schoolId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          );

          const semesterResponses = await Promise.all(semesterPromises);
          semestersData = semesterResponses
            .flatMap(res => res.data.semesters || res.data || [])
            .filter((semester, index, self) =>
              // Remove duplicates by id
              index === self.findIndex(s => s.id === semester.id)
            );
        }
      }

      setSemesters(semestersData);

      // Auto-select first available options
      if (classesRes.data.classes.length > 0) {
        setSelectedClass(classesRes.data.classes[0].id);
      }
      if (semestersData.length > 0) {
        // Find current semester (active or most recent)
        const currentDate = new Date();
        const currentSemester = semestersData.find(semester => {
          const startDate = new Date(semester.start_date);
          const endDate = new Date(semester.end_date);
          return currentDate >= startDate && currentDate <= endDate;
        });

        // Use current semester if found, otherwise use the first one
        setSelectedSemester(currentSemester ? currentSemester.id : semestersData[0].id);
      }

    } catch (err) {
      setError("فشل في تحميل البيانات الأولية");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!selectedClass || !selectedSemester) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_BASE}/api/attendance/semester/${selectedSemester}/class/${selectedClass}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAttendanceData(response.data);
      setPendingChanges({});

    } catch (err) {
      setError("فشل في تحميل بيانات الحضور");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetchAttendanceData();
    }
  }, [selectedClass, selectedSemester]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingCell && !event.target.closest('.attendance-cell')) {
        setEditingCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCell]);

  const handleCellClick = (studentId, date) => {
    const cellKey = `${studentId}_${date}`;
    // Toggle editing cell - if already editing this cell, close it
    setEditingCell(editingCell === cellKey ? null : cellKey);
  };

  const handleAttendanceChange = async (studentId, date, isPresent) => {
    const key = `${studentId}_${date}`;

    // Update local state immediately
    setPendingChanges(prev => ({
      ...prev,
      [key]: { studentId, date, isPresent }
    }));

    // Update attendance data locally for immediate UI feedback
    setAttendanceData(prev => {
      const updated = { ...prev };
      updated.students = updated.students.map(student => {
        if (student.student_id === studentId) {
          const updatedAttendance = student.attendance.map(day => {
            if (day.date === date) {
              return {
                ...day,
                is_present: isPresent,
                status: isPresent ? 'present' : 'absent',
                is_explicit: true
              };
            }
            return day;
          });

          // Recalculate statistics
          const recordedDays = updatedAttendance.filter(day => day.status !== 'unknown').length;
          const presentDays = updatedAttendance.filter(day => day.is_present === true).length;
          const absentDays = updatedAttendance.filter(day => day.is_present === false).length;
          const attendanceRate = recordedDays > 0 ? Math.round((presentDays / recordedDays) * 100) : 0;

          return {
            ...student,
            attendance: updatedAttendance,
            statistics: {
              ...student.statistics,
              recorded_days: recordedDays,
              present_days: presentDays,
              absent_days: absentDays,
              unrecorded_days: student.statistics.total_working_days - recordedDays,
              attendance_rate: attendanceRate
            }
          };
        }
        return student;
      });
      return updated;
    });

    setEditingCell(null);

    // Save to backend
    try {
      await axios.post(`${API_BASE}/api/attendance/mark`, {
        semester_id: selectedSemester,
        class_id: selectedClass,
        student_id: studentId,
        attendance_date: date,
        is_present: isPresent,
        notes: ""
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Remove from pending changes after successful save
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

    } catch (err) {
      setError("فشل في حفظ الحضور");
      // Revert local changes on error
      fetchAttendanceData();
    }
  };

  const getStatusColor = (day) => {
    if (day.status === 'present') return 'bg-green-100 text-green-800';
    if (day.status === 'absent') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-500';
  };

  const getStatusIcon = (day) => {
    if (day.status === 'present') return <AiOutlineCheck />;
    if (day.status === 'absent') return <AiOutlineClose />;
    return null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'تاريخ غير صحيح';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'تاريخ غير صحيح';

      // Use local date formatting to avoid timezone issues
      const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));

      // Format Hijri date (primary display)
      const hijriDate = localDate.toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        calendar: 'islamic-umalqura'
      });

      // Format Gregorian date (secondary display)
      const gregorianDate = localDate.toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        calendar: 'gregory'
      });

      return (
        <div className="text-xs text-center">
          <div className="font-semibold text-gray-800">{hijriDate} هـ</div>
          <div className="text-gray-600 mt-0.5">{gregorianDate} م</div>
        </div>
      );
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'تاريخ غير صحيح';
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
    <div className="p-6 max-w-full mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AiOutlineCalendar className="text-3xl text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">إدارة الحضور والغياب</h1>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">الحلقة:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الحلقة</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school_name} ({cls.student_count} طالب)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الفصل الدراسي</option>
                {Array.isArray(semesters) && semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name || semester.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchAttendanceData}
                disabled={!selectedClass || !selectedSemester}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AiOutlineReload />
                تحديث البيانات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Attendance Table */}
      {attendanceData && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">
              جدول الحضور - {attendanceData.semester.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              أيام العمل: {attendanceData.working_days.length} يوم
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky right-0 bg-gray-50 px-4 py-3 text-right font-medium border-l min-w-[200px]">
                    الطالب
                  </th>
                  <th className="px-2 py-3 text-center font-medium border-l min-w-[80px]">
                    المعدل
                  </th>
                  {attendanceData.working_days.map((dayInfo, index) => (
                    <th key={dayInfo.date} className="px-2 py-3 text-center font-medium border-l min-w-[80px] text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">{dayInfo.day_name}</span>
                        {formatDate(dayInfo.date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceData.students.map((student) => (
                  <tr key={student.student_id} className="border-b hover:bg-gray-50">
                    <td className="sticky right-0 bg-white px-4 py-3 border-l">
                      <div className="flex items-center gap-2">
                        <AiOutlineUser className="text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{student.name}</div>
                          <div className="text-xs text-gray-500">
                            ID: {student.student_id} | {classes.find(c => c.id === selectedClass)?.name || 'الحلقة'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center border-l">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        student.statistics.attendance_rate >= 80 ? 'bg-green-100 text-green-800' :
                        student.statistics.attendance_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.statistics.attendance_rate}%
                      </span>
                    </td>
                    {student.attendance.map((day) => (
                      <td key={day.date} className="px-1 py-3 text-center border-l">
                        <div className="attendance-cell relative">
                          <button
                            onClick={() => handleCellClick(student.student_id, day.date)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${getStatusColor(day)} hover:opacity-75`}
                            title={`${day.date} - ${day.status === 'present' ? 'حاضر' : day.status === 'absent' ? 'غائب' : 'غير محدد'}`}
                          >
                          {getStatusIcon(day)}
                          </button>
                          {editingCell === `${student.student_id}_${day.date}` && (
                            <div className="absolute z-50 bg-white border rounded-lg shadow-xl p-3 mt-1 -ml-8 min-w-[120px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAttendanceChange(student.student_id, day.date, true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                >
                                  <AiOutlineCheck className="w-3 h-3" />
                                  حاضر
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAttendanceChange(student.student_id, day.date, false);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                >
                                  <AiOutlineClose className="w-3 h-3" />
                                  غائب
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {attendanceData.students.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {attendanceData.students.length}
                  </div>
                  <div className="text-sm text-gray-600">إجمالي الطلاب</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(attendanceData.students.reduce((sum, s) => sum + s.statistics.attendance_rate, 0) / attendanceData.students.length)}%
                  </div>
                  <div className="text-sm text-gray-600">متوسط الحضور</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {attendanceData.working_days.length}
                  </div>
                  <div className="text-sm text-gray-600">أيام العمل</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(pendingChanges).length}
                  </div>
                  <div className="text-sm text-gray-600">تغييرات محفوظة</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!attendanceData && !loading && selectedClass && selectedSemester && (
        <div className="text-center py-12">
          <AiOutlineCalendar className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">لا توجد بيانات حضور</h3>
          <p className="text-gray-500">اختر الحلقة والفصل الدراسي لعرض بيانات الحضور</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;