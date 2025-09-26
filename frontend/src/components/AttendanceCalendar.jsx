import { useState, useEffect } from "react";
import axios from "axios";
import { formatDateWithHijri, getShortHijriDate } from "../utils/hijriDate";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceCalendar = ({ classItem, semester, onClose }) => {
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (classItem && semester) {
      fetchStudentsAndAttendance();
    }
  }, [classItem, semester, selectedDate]);

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      
      // Fetch students in the class
      const studentsResponse = await axios.get(`${API_BASE}/api/classes/${classItem.id}/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(studentsResponse.data || []);
      
      // Fetch attendance data for the semester
      const attendanceResponse = await axios.get(
        `${API_BASE}/api/attendance/semester/${semester.id}/class/${classItem.id}`, 
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      // Organize attendance data by date and student
      const attendanceMap = {};
      attendanceResponse.data.forEach(record => {
        const date = record.attendance_date.split('T')[0];
        if (!attendanceMap[date]) attendanceMap[date] = {};
        attendanceMap[date][record.student_id] = record;
      });
      
      setAttendanceData(attendanceMap);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError("فشل في تحميل بيانات الحضور");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (studentId, date, isPresent) => {
    try {
      setSaving(true);
      
      await axios.post(`${API_BASE}/api/attendance`, {
        semester_id: semester.id,
        class_id: classItem.id,
        student_id: studentId,
        attendance_date: date,
        is_present: isPresent,
        is_explicit: true
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setAttendanceData(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [studentId]: {
            ...prev[date]?.[studentId],
            student_id: studentId,
            attendance_date: date,
            is_present: isPresent,
            is_explicit: true
          }
        }
      }));
      
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError("فشل في تحديث الحضور");
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = (studentId) => {
    const semesterStart = new Date(semester.start_date);
    const semesterEnd = new Date(semester.end_date);
    const today = new Date();
    
    let totalDays = 0;
    let presentDays = 0;
    let explicitDays = 0;
    
    // Calculate for working days only
    let currentDate = new Date(semesterStart);
    while (currentDate <= Math.min(today, semesterEnd)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      // Skip weekends (assuming Friday=5, Saturday=6)
      const weekendDays = semester.weekend_days || [5, 6];
      const vacationDays = semester.vacation_days || [];
      
      if (!weekendDays.includes(isoDayOfWeek) && !vacationDays.includes(dateStr)) {
        totalDays++;
        
        const attendance = attendanceData[dateStr]?.[studentId];
        if (attendance) {
          if (attendance.is_present) presentDays++;
          if (attendance.is_explicit) explicitDays++;
        } else {
          // Check if student had grades on this day (implicit attendance)
          // This would need to be fetched from grades API
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
    };
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const isWorkingDay = (date) => {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const dateStr = date.toISOString().split('T')[0];
    
    const weekendDays = semester.weekend_days || [5, 6];
    const vacationDays = semester.vacation_days || [];
    
    return !weekendDays.includes(isoDayOfWeek) && !vacationDays.includes(dateStr);
  };

  if (!classItem || !semester) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            سجل الحضور - {classItem.name} - {semester.display_name || `الفصل الدراسي ${semester.year}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl p-1">✕</button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">جاري تحميل بيانات الحضور...</div>
        ) : (
          <div className="space-y-6">
            {/* Date Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">تحديد التاريخ للحضور</h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 border border-gray-300 rounded"
                min={semester.start_date?.split('T')[0]}
                max={semester.end_date?.split('T')[0]}
              />
            </div>

            {/* Students Attendance List */}
            <div className="bg-white border rounded-lg">
              <div className="bg-gray-100 p-3 border-b">
                <h3 className="text-lg font-semibold">
                  حضور الطلاب ليوم {(() => {
                    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
                    const dateWithHijri = formatDateWithHijri(selectedDateObj);
                    return dateWithHijri.full;
                  })()}
                </h3>
                {!isWorkingDay(new Date(selectedDate + 'T00:00:00')) && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ هذا اليوم عطلة أو نهاية أسبوع
                  </p>
                )}
              </div>
              
              <div className="divide-y">
                {students.map(student => {
                  const attendance = attendanceData[selectedDate]?.[student.id];
                  const stats = getAttendanceStats(student.id);
                  
                  return (
                    <div key={student.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <h4 className="font-medium">
                            {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            نسبة الحضور: {stats.attendanceRate}% ({stats.presentDays}/{stats.totalDays})
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                          {attendance?.is_explicit ? 'تم تسجيله يدوياً' : 
                           attendance?.has_grade ? 'حاضر (له درجة)' : ''}
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => markAttendance(student.id, selectedDate, true)}
                            disabled={saving}
                            className={`px-4 py-2 rounded text-sm font-medium ${
                              attendance?.is_present
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            حاضر
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, selectedDate, false)}
                            disabled={saving}
                            className={`px-4 py-2 rounded text-sm font-medium ${
                              attendance && !attendance.is_present
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            غائب
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">عرض الشهر</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    ←
                  </button>
                  <span className="font-medium">
                    {currentMonth.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    →
                  </button>
                </div>
              </div>
              
              {/* Calendar Grid - Clean Weekly Layout */}
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-gray-100">
                  {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                    <div key={day} className="p-3 text-center font-semibold text-sm text-gray-700 border-r border-gray-300 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar weeks - each week in one row */}
                {(() => {
                  const allDays = generateCalendarDays();
                  const weeks = [];

                  // Group days into weeks of 7
                  for (let i = 0; i < allDays.length; i += 7) {
                    weeks.push(allDays.slice(i, i + 7));
                  }

                  return weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-200">
                      {week.map((date, dayIndex) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const isSelected = dateStr === selectedDate;
                        const isWorking = isWorkingDay(date);

                        // Calculate attendance for this date
                        const dateAttendance = attendanceData[dateStr] || {};
                        const presentCount = Object.values(dateAttendance).filter(a => a.is_present).length;
                        const totalStudents = students.length;

                        return (
                          <div
                            key={`week-${weekIndex}-day-${dayIndex}`}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`
                              min-h-20 p-2 text-center cursor-pointer border-r border-gray-200 last:border-r-0 flex flex-col justify-between transition-all duration-200
                              ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                              ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}
                              ${isSelected ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}
                              ${!isWorking ? 'bg-gray-50' : ''}
                              hover:bg-blue-50 hover:shadow-inner
                            `}
                          >
                            {/* Date display */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <span className={`text-lg font-bold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                {date.getDate()}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {getShortHijriDate(date).split('/')[0]}هـ
                              </div>
                            </div>

                            {/* Attendance indicator */}
                            {isWorking && totalStudents > 0 && (
                              <div className="mt-2">
                                <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                                  presentCount === totalStudents ? 'bg-green-500' :
                                  presentCount > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <span className="text-xs font-medium text-gray-600">
                                  {presentCount}/{totalStudents}
                                </span>
                              </div>
                            )}

                            {/* Today badge */}
                            {isToday && (
                              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-md">
                                اليوم
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
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

export default AttendanceCalendar;