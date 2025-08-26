import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlineCalendar, 
  AiOutlineCheck, 
  AiOutlineClose, 
  AiOutlineDownload,
  AiOutlinePrinter,
  AiOutlineUser,
  AiOutlineWarning,
  AiOutlineLoading3Quarters,
  AiOutlineFilter,
  AiOutlineEye
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceReports = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState([]);
  const [detailedRecords, setDetailedRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [semesters, setSemesters] = useState([]);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const [view, setView] = useState('summary'); // summary, detailed
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (view === 'summary') {
      fetchStatistics();
    } else {
      fetchDetailedRecords();
    }
  }, [view, selectedClass, selectedStudent, selectedSemester, dateFrom, dateTo, page, rowsPerPage]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      
      // Fetch available classes, students, and semesters based on user role
      const [classesRes, studentsRes, semestersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/attendance-system/classes`, { headers }),
        axios.get(`${API_BASE}/api/attendance-system/students`, { headers }),
        axios.get(`${API_BASE}/api/semesters`, { headers })
      ]);

      setClasses(classesRes.data.classes || []);
      setStudents(studentsRes.data.students || []);
      setSemesters(semestersRes.data || []);

    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedStudent) params.append('student_id', selectedStudent);
      if (selectedSemester) params.append('semester_id', selectedSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', page);
      params.append('limit', rowsPerPage);

      const response = await axios.get(
        `${API_BASE}/api/attendance-system/reports/statistics?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );

      setStatistics(response.data.statistics || []);
      setTotalCount(response.data.totalCount || 0);
      setError('');
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to load attendance statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedRecords = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedStudent) params.append('student_id', selectedStudent);
      if (selectedSemester) params.append('semester_id', selectedSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', page);
      params.append('limit', rowsPerPage);

      const response = await axios.get(
        `${API_BASE}/api/attendance-system/reports/detailed?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );

      setDetailedRecords(response.data.records || []);
      setTotalCount(response.data.totalCount || 0);
      setError('');
      
    } catch (error) {
      console.error('Error fetching detailed records:', error);
      setError('Failed to load detailed attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedStudent) params.append('student_id', selectedStudent);
      if (selectedSemester) params.append('semester_id', selectedSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('format', format);
      params.append('view', view);

      const response = await axios.get(
        `${API_BASE}/api/attendance-system/reports/export?${params}`,
        { 
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: format === 'csv' ? 'blob' : 'json'
        }
      );

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON export
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.json`);
        link.click();
      }
      
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <AiOutlineCheck className="mr-1" />
            حاضر
          </span>
        );
      case 'absent_excused':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AiOutlineWarning className="mr-1" />
            غياب بعذر
          </span>
        );
      case 'absent_unexcused':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AiOutlineClose className="mr-1" />
            غياب بدون عذر
          </span>
        );
      default:
        return null;
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 font-bold';
    if (percentage >= 75) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const resetFilters = () => {
    setSelectedClass('');
    setSelectedStudent('');
    setSelectedSemester('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  if (loading && statistics.length === 0 && detailedRecords.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <AiOutlineLoading3Quarters className="animate-spin text-4xl text-[var(--color-primary-500)]" />
        <span className="mr-3 text-lg">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">تقارير الحضور والغياب</h1>
        <p className="text-gray-600">
          {user?.role === 'teacher' && 'عرض تقارير الحضور لطلابك'}
          {user?.role === 'parent' && 'عرض تقارير الحضور لأطفالك'}
          {user?.role === 'student' && 'عرض تقرير حضورك'}
          {['admin', 'administrator', 'supervisor'].includes(user?.role) && 'عرض تقارير الحضور الشاملة'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-md mb-6 border">
        <div 
          className="p-4 border-b cursor-pointer flex justify-between items-center"
          onClick={() => setShowFilters(!showFilters)}
        >
          <h2 className="text-lg font-semibold text-gray-900">
            <AiOutlineFilter className="inline ml-2" />
            الفلاتر والخيارات
          </h2>
          <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
        
        {showFilters && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* View Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع العرض</label>
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                >
                  <option value="summary">إحصائيات ملخصة</option>
                  <option value="detailed">السجلات التفصيلية</option>
                </select>
              </div>

              {/* Class Filter */}
              {classes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحلقة</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                  >
                    <option value="">جميع الحلقات</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Student Filter */}
              {students.length > 0 && user?.role !== 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الطالب</label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                  >
                    <option value="">جميع الطلاب</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Semester Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الفصل الدراسي</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                >
                  <option value="">جميع الفصول</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                مسح الفلاتر
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <AiOutlineDownload className="ml-2" />
                تصدير CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
              >
                <AiOutlinePrinter className="ml-2" />
                طباعة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics View */}
      {view === 'summary' && (
        <>
          {statistics.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center border">
              <p className="text-xl text-gray-600 mb-2">لا توجد إحصائيات حضور</p>
              <p className="text-gray-500">جرب تعديل الفلاتر أو تحقق من تسجيل الحضور.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الطالب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحلقة
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          إجمالي الجلسات
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحضور
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          غياب بعذر
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          غياب بدون عذر
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          نسبة الحضور
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {statistics.map((stat, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <AiOutlineUser className="text-gray-400 ml-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {stat.student_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {stat.student_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.class_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                            {stat.total_sessions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {stat.present_count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {stat.absent_excused_count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {stat.absent_unexcused_count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={getAttendanceColor(stat.attendance_percentage)}>
                              {parseFloat(stat.attendance_percentage).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  عرض {((page - 1) * rowsPerPage) + 1} إلى {Math.min(page * rowsPerPage, totalCount)} من {totalCount} سجل
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  <span className="px-4 py-2">
                    الصفحة {page} من {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Detailed Records View */}
      {view === 'detailed' && (
        <>
          {detailedRecords.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center border">
              <p className="text-xl text-gray-600 mb-2">لا توجد سجلات حضور تفصيلية</p>
              <p className="text-gray-500">جرب تعديل الفلاتر أو تحقق من تسجيل الحضور.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          التاريخ
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الطالب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحلقة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          وقت الجلسة
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المسجل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ملاحظات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.session_date).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.student_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {record.student_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.class_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.start_time} - {record.end_time}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.marked_by_name || 'النظام'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  عرض {((page - 1) * rowsPerPage) + 1} إلى {Math.min(page * rowsPerPage, totalCount)} من {totalCount} سجل
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  <span className="px-4 py-2">
                    الصفحة {page} من {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceReports;