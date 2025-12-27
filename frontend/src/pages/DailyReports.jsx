import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineCalendar, AiOutlineBarChart, AiOutlineSave, AiOutlineClose } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const DailyReports = () => {
  const [reports, setReports] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [selectedSchool, setSelectedSchool] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create, edit, view
  const [selectedReport, setSelectedReport] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    school_id: "",
    report_date: new Date().toISOString().split('T')[0],
    report_notes: "",
    class_reports: []
  });

  // Statistics
  const [statistics, setStatistics] = useState(null);

  // Duplicate report warning
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedSchool, dateFrom, dateTo]);

  const loadInitialData = async () => {
    try {
      const [schoolsRes, classesRes, teachersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/schools`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_BASE}/api/classes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_BASE}/api/teachers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      // Handle different response formats
      const schoolsData = schoolsRes.data?.schools || schoolsRes.data || [];
      const classesData = classesRes.data?.classes || classesRes.data || [];
      const teachersData = teachersRes.data?.teachers || teachersRes.data || [];

      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      
      console.log('Loaded data:', { 
        schools: Array.isArray(schoolsData) ? schoolsData.length : 'not array',
        classes: Array.isArray(classesData) ? classesData.length : 'not array',
        teachers: Array.isArray(teachersData) ? teachersData.length : 'not array'
      });
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("فشل في تحميل البيانات الأساسية");
      // Set empty arrays as fallback
      setSchools([]);
      setClasses([]);
      setTeachers([]);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSchool) params.append('school_id', selectedSchool);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await axios.get(`${API_BASE}/api/daily-reports?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setReports(response.data.reports || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      setError("فشل في تحميل التقارير اليومية");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSchool) params.append('school_id', selectedSchool);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await axios.get(`${API_BASE}/api/daily-reports/statistics/summary?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setStatistics(response.data);
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  const openModal = async (mode, report = null) => {
    setModalMode(mode);
    setSelectedReport(report);
    
    if (mode === 'create') {
      setFormData({
        school_id: selectedSchool || "",
        report_date: new Date().toISOString().split('T')[0],
        report_notes: "",
        class_reports: []
      });
      setDuplicateWarning(false);
    } else if ((mode === 'edit' || mode === 'view') && report) {
      // For edit and view modes, fetch detailed report data from backend
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/api/daily-reports/${report.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        const detailedReport = response.data;
        setFormData({
          school_id: detailedReport.school_id,
          report_date: detailedReport.report_date.split('T')[0],
          report_notes: detailedReport.report_notes || "",
          class_reports: detailedReport.class_reports || []
        });
      } catch (error) {
        console.error("Error loading report details:", error);
        setError("فشل في تحميل تفاصيل التقرير");
        setTimeout(() => setError(""), 3000);
        return; // Don't open modal if failed to load data
      } finally {
        setLoading(false);
      }
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setDuplicateWarning(false);
    setFormData({
      school_id: "",
      report_date: new Date().toISOString().split('T')[0],
      report_notes: "",
      class_reports: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.school_id || !formData.report_date) {
      setError("مجمع الحلقات والتاريخ مطلوبان");
      return;
    }

    try {
      // Clean class_reports data to only include fields expected by backend
      const cleanedFormData = {
        ...formData,
        class_reports: formData.class_reports.map(report => ({
          class_id: report.class_id,
          teacher_id: report.teacher_id,
          students_enrolled: report.students_enrolled,
          students_present: report.students_present,
          students_absent: report.students_absent,
          pages_taught: report.pages_taught,
          lesson_topic: report.lesson_topic,
          class_notes: report.class_notes
        }))
      };

      if (modalMode === 'create') {
        await axios.post(`${API_BASE}/api/daily-reports`, cleanedFormData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuccess("تم إنشاء التقرير اليومي بنجاح");
      } else if (modalMode === 'edit') {
        await axios.put(`${API_BASE}/api/daily-reports/${selectedReport.id}`, cleanedFormData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuccess("تم تحديث التقرير اليومي بنجاح");
      }

      closeModal();
      loadReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving report:", error);
      setError(error.response?.data?.error || "فشل في حفظ التقرير");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقرير؟")) return;

    try {
      await axios.delete(`${API_BASE}/api/daily-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess("تم حذف التقرير بنجاح");
      loadReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting report:", error);
      setError("فشل في حذف التقرير");
      setTimeout(() => setError(""), 3000);
    }
  };

  const addClassReport = () => {
    const newClassReport = {
      class_id: "",
      teacher_id: "",
      students_enrolled: 0,
      students_present: 0,
      students_absent: 0,
      pages_taught: 0,
      lesson_topic: "",
      class_notes: ""
    };
    
    setFormData({
      ...formData,
      class_reports: [...formData.class_reports, newClassReport]
    });
  };

  const autoFillAttendanceData = async () => {
    if (!formData.school_id || !formData.report_date) {
      setError("يجب اختيار مجمع الحلقات والتاريخ أولاً");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.get(
        `${API_BASE}/api/daily-reports/auto-fill/${formData.school_id}/${formData.report_date}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const autoFillData = response.data;
      
      setFormData({
        ...formData,
        class_reports: autoFillData.class_reports || []
      });

      setSuccess(`تم تعبئة البيانات تلقائياً لـ ${autoFillData.class_reports?.length || 0} حلقة`);
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (error) {
      console.error("Error auto-filling data:", error);
      setError(error.response?.data?.error || "فشل في تعبئة البيانات تلقائياً");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const updateClassReport = (index, field, value) => {
    const updatedReports = [...formData.class_reports];
    updatedReports[index][field] = value;
    
    // Auto-calculate absent students
    if (field === 'students_enrolled' || field === 'students_present') {
      const enrolled = parseInt(updatedReports[index].students_enrolled) || 0;
      const present = parseInt(updatedReports[index].students_present) || 0;
      updatedReports[index].students_absent = Math.max(0, enrolled - present);
    }
    
    setFormData({
      ...formData,
      class_reports: updatedReports
    });
  };

  const removeClassReport = (index) => {
    const updatedReports = formData.class_reports.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      class_reports: updatedReports
    });
  };

  const checkForExistingReport = async (schoolId, reportDate) => {
    if (!schoolId || !reportDate || modalMode !== 'create') {
      setDuplicateWarning(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('school_id', schoolId);
      params.append('date_from', reportDate);
      params.append('date_to', reportDate);

      const response = await axios.get(`${API_BASE}/api/daily-reports?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setDuplicateWarning(response.data.reports && response.data.reports.length > 0);
    } catch (error) {
      console.error("Error checking for existing report:", error);
      setDuplicateWarning(false);
    }
  };

  // Check permissions
  const canManage = user && ['admin', 'administrator', 'supervisor'].includes(user.role);

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة مخصصة للإدارة والمشرفين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <AiOutlineCalendar className="text-blue-600" />
              التقارير اليومية
            </h1>
            <div className="flex gap-3">
              <button
                onClick={loadStatistics}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <AiOutlineBarChart size={16} />
                الإحصائيات
              </button>
              <button
                onClick={() => openModal('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <AiOutlinePlus size={16} />
                تقرير جديد
              </button>
            </div>
          </div>

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

          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">الفلاتر</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مجمع الحلقات</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">جميع المدارس</option>
                  {Array.isArray(schools) && schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Statistics Panel */}
          {statistics && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">الإحصائيات الإجمالية</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.total_reports}</div>
                  <div className="text-sm text-blue-700">تقرير</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.total_present}</div>
                  <div className="text-sm text-green-700">حاضر</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{statistics.total_absent}</div>
                  <div className="text-sm text-red-700">غائب</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{statistics.avg_attendance_rate}%</div>
                  <div className="text-sm text-purple-700">نسبة الحضور</div>
                </div>
              </div>
            </div>
          )}

          {/* Reports List */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <h2 className="text-xl font-semibold">التقارير اليومية ({reports.length} تقرير)</h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-blue-600 mb-2">جاري تحميل التقارير...</div>
              </div>
            ) : reports.length > 0 ? (
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">التاريخ</th>
                      <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">مجمع الحلقات</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">الحلقات</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">الحضور</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">الغياب</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">المقرر</th>
                      <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">المعد</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-900">{new Date(report.report_date).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3 text-sm text-gray-900">{report.school_name}</td>
                        <td className="p-3 text-center text-sm text-gray-900">{report.total_classes}</td>
                        <td className="p-3 text-center text-sm text-green-600 font-medium">{report.total_present}</td>
                        <td className="p-3 text-center text-sm text-red-600 font-medium">{report.total_absent}</td>
                        <td className="p-3 text-center text-sm text-blue-600 font-medium">{report.total_pages_taught}</td>
                        <td className="p-3 text-sm text-gray-600">{report.reporter_name}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openModal('view', report)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="عرض التفاصيل"
                            >
                              <AiOutlineEye size={16} />
                            </button>
                            <button
                              onClick={() => openModal('edit', report)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="تعديل"
                            >
                              <AiOutlineEdit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="حذف"
                            >
                              <AiOutlineDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد تقارير</h3>
                <p className="text-gray-500">لم يتم العثور على تقارير يومية للفترة المحددة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-100 p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold text-blue-800">
                {modalMode === 'create' ? 'إنشاء تقرير يومي جديد' : 
                 modalMode === 'edit' ? 'تعديل التقرير اليومي' : 'عرض التقرير اليومي'}
              </h3>
              <button
                onClick={closeModal}
                className="text-blue-600 hover:text-blue-800 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مجمع الحلقات *</label>
                    <select
                      value={formData.school_id}
                      onChange={(e) => {
                        const newFormData = {...formData, school_id: e.target.value};
                        setFormData(newFormData);
                        checkForExistingReport(e.target.value, formData.report_date);
                      }}
                      disabled={modalMode === 'view'}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      required
                    >
                      <option value="">اختر مجمع الحلقات</option>
                      {Array.isArray(schools) && schools.map(school => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ *</label>
                    <input
                      type="date"
                      value={formData.report_date}
                      onChange={(e) => {
                        const newFormData = {...formData, report_date: e.target.value};
                        setFormData(newFormData);
                        checkForExistingReport(formData.school_id, e.target.value);
                      }}
                      disabled={modalMode === 'view'}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      required
                    />
                  </div>
                </div>

                {/* Duplicate Report Warning */}
                {duplicateWarning && modalMode === 'create' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800 font-medium">يوجد تقرير سابق</p>
                        <p className="text-sm text-yellow-700 mt-1">يوجد تقرير مسجل مسبقاً لهذا المجمع في التاريخ المحدد</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Report Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات التقرير</label>
                  <textarea
                    value={formData.report_notes}
                    onChange={(e) => setFormData({...formData, report_notes: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    rows={3}
                    placeholder="اكتب الملاحظات العامة للتقرير..."
                  />
                </div>

                {/* Class Reports */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-700">تفاصيل الحلقات</h4>
                    {modalMode !== 'view' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={autoFillAttendanceData}
                          disabled={!formData.school_id || !formData.report_date || loading}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                          title="تعبئة البيانات تلقائياً من سجلات الحضور"
                        >
                          <AiOutlineBarChart size={14} />
                          {loading ? 'جاري التعبئة...' : 'تعبئة تلقائية'}
                        </button>
                        <button
                          type="button"
                          onClick={addClassReport}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                        >
                          <AiOutlinePlus size={14} />
                          إضافة حلقة
                        </button>
                      </div>
                    )}
                  </div>

                  {modalMode !== 'view' && formData.class_reports.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AiOutlineBarChart className="text-blue-600 mt-0.5" size={20} />
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-1">💡 نصيحة: استخدم التعبئة التلقائية</div>
                          <div className="text-blue-700">
                            اختر مجمع الحلقات والتاريخ، ثم انقر على "تعبئة تلقائية" لتحميل بيانات الحضور والغياب من النظام تلقائياً
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {formData.class_reports.map((classReport, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        classReport.students_enrolled > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {classReport.students_enrolled > 0 && (
                          <div className="flex items-center gap-2 mb-3 text-xs text-green-700">
                            <AiOutlineBarChart size={14} />
                            <span>تم تعبئة البيانات تلقائياً من سجلات الحضور</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الحلقة</label>
                            <select
                              value={classReport.class_id}
                              onChange={(e) => updateClassReport(index, 'class_id', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">اختر الحلقة</option>
                              {Array.isArray(classes) && classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المعلم</label>
                            <select
                              value={classReport.teacher_id}
                              onChange={(e) => updateClassReport(index, 'teacher_id', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">اختر المعلم</option>
                              {Array.isArray(teachers) && teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.first_name} {teacher.last_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {modalMode !== 'view' && (
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeClassReport(index)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">عدد الطلاب</label>
                            <input
                              type="number"
                              min="0"
                              value={classReport.students_enrolled}
                              onChange={(e) => updateClassReport(index, 'students_enrolled', parseInt(e.target.value) || 0)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الحضور</label>
                            <input
                              type="number"
                              min="0"
                              value={classReport.students_present}
                              onChange={(e) => updateClassReport(index, 'students_present', parseInt(e.target.value) || 0)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الغياب</label>
                            <input
                              type="number"
                              min="0"
                              value={classReport.students_absent}
                              disabled
                              className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الصفحات المقروءة</label>
                            <input
                              type="number"
                              min="0"
                              value={classReport.pages_taught}
                              onChange={(e) => updateClassReport(index, 'pages_taught', parseInt(e.target.value) || 0)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">موضوع الدرس</label>
                            <input
                              type="text"
                              value={classReport.lesson_topic}
                              onChange={(e) => updateClassReport(index, 'lesson_topic', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              placeholder="مثال: سورة البقرة من آية 1 إلى 10"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الحلقة</label>
                            <textarea
                              value={classReport.class_notes}
                              onChange={(e) => updateClassReport(index, 'class_notes', e.target.value)}
                              disabled={modalMode === 'view'}
                              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                              rows={2}
                              placeholder="ملاحظات خاصة بهذه الحلقة..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-gray-100 p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {modalMode === 'view' ? 'يمكنك استخدام "تعديل" لتحديث هذا التقرير' : 'املأ جميع البيانات المطلوبة'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <AiOutlineClose size={16} />
                  {modalMode === 'view' ? 'إغلاق' : 'إلغاء'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <AiOutlineSave size={16} />
                    {modalMode === 'create' ? 'إنشاء التقرير' : 'حفظ التغييرات'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReports;
