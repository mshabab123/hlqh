import { useState, useEffect } from "react";
import axios from "axios";
import AttendanceCalendar from "../components/AttendanceCalendar";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceManagement = () => {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showAttendanceCalendar, setShowAttendanceCalendar] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: ""
  });

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadSemesters();
      loadClasses();
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      loadAttendanceStats();
    }
  }, [selectedClass, selectedSemester, dateRange]);

  const loadSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error("Error loading schools:", error);
      setSchools([]);
    }
  };

  const loadSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSemesters(response.data || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
      setSemesters([]);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes?school_id=${selectedSchool}&is_active=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      setClasses([]);
    }
  };

  const loadAttendanceStats = async () => {
    if (!selectedClass || !selectedSemester) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);
      
      const response = await axios.get(
        `${API_BASE}/api/attendance/summary/semester/${selectedSemester.id}/class/${selectedClass.id}?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setAttendanceStats(response.data || []);
    } catch (error) {
      console.error("Error loading attendance stats:", error);
      setError("فشل في تحميل إحصائيات الحضور");
    } finally {
      setLoading(false);
    }
  };

  const autoMarkAttendanceFromGrades = async (date) => {
    if (!selectedClass || !selectedSemester) return;
    
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/api/attendance/auto-mark-from-grades`, {
        semester_id: selectedSemester.id,
        class_id: selectedClass.id,
        date: date
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      await loadAttendanceStats();
      alert("تم تحديث الحضور تلقائياً بناءً على الدرجات");
    } catch (error) {
      console.error("Error auto-marking attendance:", error);
      setError("فشل في التحديث التلقائي للحضور");
    } finally {
      setLoading(false);
    }
  };

  const exportAttendanceReport = () => {
    if (!attendanceStats.length) return;
    
    const csvData = attendanceStats.map(student => ({
      'اسم الطالب': `${student.first_name} ${student.second_name} ${student.third_name} ${student.last_name}`,
      'إجمالي الأيام': student.total_days || 0,
      'أيام الحضور': student.present_days || 0,
      'أيام الغياب': student.absent_days || 0,
      'نسبة الحضور': `${student.attendance_percentage || 0}%`,
      'الأيام المسجلة يدوياً': student.explicitly_marked_days || 0,
      'الأيام بناءً على الدرجات': student.grade_based_days || 0
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الحضور_${selectedClass?.name}_${selectedSemester?.display_name}.csv`;
    link.click();
  };

  const calculateWorkingDays = (semester) => {
    if (!semester.start_date || !semester.end_date) return 0;
    
    const start = new Date(semester.start_date);
    const end = new Date(semester.end_date);
    const today = new Date();
    const maxDate = end < today ? end : today;
    
    const weekendDays = semester.weekend_days || [5, 6];
    const vacationDays = semester.vacation_days || [];
    
    let workingDays = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      const isWeekend = weekendDays.includes(isoDayOfWeek);
      const isVacation = vacationDays.includes(dateStr);
      
      if (!isWeekend && !isVacation) {
        workingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600 bg-green-100';
    if (rate >= 75) return 'text-blue-600 bg-blue-100';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Check permissions
  const canManage = user && (user.role === 'admin' || user.role === 'administrator' || user.role === 'teacher');

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة مخصصة للمعلمين والمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">إدارة الحضور والغياب</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* School Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">المجمع:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر المجمع</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            {/* Semester Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester?.id || ""}
                onChange={(e) => {
                  const semester = semesters.find(s => s.id === e.target.value);
                  setSelectedSemester(semester);
                  if (semester) {
                    setDateRange({
                      start_date: semester.start_date?.split('T')[0] || "",
                      end_date: semester.end_date?.split('T')[0] || ""
                    });
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSchool}
              >
                <option value="">اختر الفصل الدراسي</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name || `الفصل ${semester.type} ${semester.year}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">الحلقة:</label>
              <select
                value={selectedClass?.id || ""}
                onChange={(e) => {
                  const classItem = classes.find(c => c.id === e.target.value);
                  setSelectedClass(classItem);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSchool}
              >
                <option value="">اختر الحلقة</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Filter */}
          {selectedSemester && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-3">تصفية التاريخ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">من تاريخ:</label>
                  <input
                    type="date"
                    value={dateRange.start_date}
                    onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                    min={selectedSemester.start_date?.split('T')[0]}
                    max={selectedSemester.end_date?.split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={dateRange.end_date}
                    onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded"
                    min={selectedSemester.start_date?.split('T')[0]}
                    max={selectedSemester.end_date?.split('T')[0]}
                  />
                </div>
              </div>
              
              {/* Semester Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">أيام العمل المتوقعة:</span>
                    <span className="font-bold ml-2">{calculateWorkingDays(selectedSemester)} يوم</span>
                  </div>
                  <div>
                    <span className="text-gray-600">أيام نهاية الأسبوع:</span>
                    <span className="font-bold ml-2">
                      {(selectedSemester.weekend_days || [5, 6]).map(day => {
                        const days = {1: 'اثنين', 2: 'ثلاثاء', 3: 'أربعاء', 4: 'خميس', 5: 'جمعة', 6: 'سبت', 7: 'أحد'};
                        return days[day];
                      }).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">أيام العطل:</span>
                    <span className="font-bold ml-2">{(selectedSemester.vacation_days || []).length} يوم</span>
                  </div>
                  <div>
                    <span className="text-gray-600">إجمالي أيام الفصل:</span>
                    <span className="font-bold ml-2">{selectedSemester.total_days_count || 0} يوم</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedClass && selectedSemester && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setShowAttendanceCalendar(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📅 فتح سجل الحضور
              </button>
              <button
                onClick={() => autoMarkAttendanceFromGrades(new Date().toISOString().split('T')[0])}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={loading}
              >
                🔄 تحديث تلقائي من الدرجات
              </button>
              <button
                onClick={exportAttendanceReport}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                disabled={!attendanceStats.length}
              >
                📊 تصدير التقرير
              </button>
            </div>
          )}

          {/* Attendance Statistics Table */}
          {selectedClass && selectedSemester && (
            <div className="bg-white border rounded-lg">
              <div className="bg-gray-100 p-4 border-b">
                <h3 className="text-lg font-semibold">
                  إحصائيات الحضور - {selectedClass.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  الفترة: {dateRange.start_date || selectedSemester.start_date?.split('T')[0]} إلى {dateRange.end_date || selectedSemester.end_date?.split('T')[0]}
                </p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">جاري تحميل الإحصائيات...</div>
              ) : attendanceStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">#</th>
                        <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">اسم الطالب</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">إجمالي الأيام</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">أيام الحضور</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">أيام الغياب</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">نسبة الحضور</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">تسجيل يدوي</th>
                        <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">بناءً على الدرجات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attendanceStats.map((student, index) => (
                        <tr key={student.student_id} className="hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="p-3 text-sm font-medium text-gray-900">
                            {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                          </td>
                          <td className="p-3 text-center text-sm text-gray-700">
                            {student.total_days || 0}
                          </td>
                          <td className="p-3 text-center text-sm font-medium text-green-600">
                            {student.present_days || 0}
                          </td>
                          <td className="p-3 text-center text-sm font-medium text-red-600">
                            {student.absent_days || 0}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getAttendanceRateColor(student.attendance_percentage || 0)
                            }`}>
                              {student.attendance_percentage || 0}%
                            </span>
                          </td>
                          <td className="p-3 text-center text-sm text-blue-600">
                            {student.explicitly_marked_days || 0}
                          </td>
                          <td className="p-3 text-center text-sm text-purple-600">
                            {student.grade_based_days || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد بيانات حضور</h3>
                  <p className="text-gray-500">
                    {!selectedClass || !selectedSemester 
                      ? "يرجى اختيار الحلقة والفصل الدراسي أولاً"
                      : "لم يتم تسجيل أي بيانات حضور بعد"
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Calendar Modal */}
      {showAttendanceCalendar && selectedClass && selectedSemester && (
        <AttendanceCalendar
          classItem={selectedClass}
          semester={selectedSemester}
          onClose={() => setShowAttendanceCalendar(false)}
        />
      )}
    </div>
  );
};

export default AttendanceManagement;