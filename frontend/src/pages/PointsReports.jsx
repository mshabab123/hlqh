import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  AiOutlineStar,
  AiOutlineCalendar,
  AiOutlineSearch,
  AiOutlineUser,
  AiOutlineLoading3Quarters,
  AiOutlineTable,
  AiOutlineClose,
  AiOutlineEdit,
  AiOutlineDelete
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PointsReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [componentError, setComponentError] = useState(null);

  // Data states
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentsPoints, setStudentsPoints] = useState([]);
  const [currentClass, setCurrentClass] = useState(null);

  // Filter states
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal states
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointsRecords, setPointsRecords] = useState([]);

  // Points editing state (for the modal)
  const [editingPointRecord, setEditingPointRecord] = useState(null);
  const [editingPointForm, setEditingPointForm] = useState({ points: 0, notes: "", date: "" });

  // Safely get user role with error handling
  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.role || 'student';
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return 'student';
    }
  };

  const userRole = getUserRole();

  const location = useLocation();
  const classIdFromQuery = new URLSearchParams(location.search).get("class_id");

  useEffect(() => {
    fetchInitialData();
  }, [classIdFromQuery]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem('token');

      console.log("Fetching initial data...");
      console.log("User role:", userRole);
      console.log("Token exists:", !!token);

      // Get schools through accessible classes for all users
      const classesRes = await axios.get(`${API_BASE}/api/points/teacher/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Classes response:", classesRes.data);

      // Extract unique schools from classes
      const allClasses = classesRes.data.classes || [];
      console.log("All classes:", allClasses);

      if (allClasses.length === 0) {
        setError("لا توجد حلقات متاحة لك");
        setSchools([]);
        return;
      }

      if (classIdFromQuery) {
        const matchedClass = allClasses.find(
          (cls) => String(cls.id) === String(classIdFromQuery)
        );
        if (!matchedClass) {
          setError("لم يتم العثور على الحلقة المطلوبة.");
          setClasses([]);
          setCurrentClass(null);
        } else {
          setClasses([matchedClass]);
          setSelectedClass(String(matchedClass.id));
          setSelectedSchool(String(matchedClass.school_id || ""));
          setCurrentClass(matchedClass);
        }
        return;
      }

      const uniqueSchools = [];
      const seenSchoolIds = new Set();

      allClasses.forEach(cls => {
        console.log('Processing class:', cls);
        if (cls.school_id && cls.school_name && !seenSchoolIds.has(cls.school_id)) {
          seenSchoolIds.add(cls.school_id);
          uniqueSchools.push({
            id: cls.school_id,
            name: cls.school_name
          });
          console.log('Added school:', { id: cls.school_id, name: cls.school_name });
        } else {
          console.log('Skipped class - missing school data:', {
            has_school_id: !!cls.school_id,
            has_school_name: !!cls.school_name,
            already_seen: seenSchoolIds.has(cls.school_id)
          });
        }
      });

      setSchools(uniqueSchools);
      console.log("Unique schools found:", uniqueSchools);

      // Leave date range empty by default; user must choose.
      setDateTo("");
      setDateFrom("");

    } catch (err) {
      console.error("Error loading initial data:", err);
      console.error("Error details:", err.response?.data);
      setError(`فشل في تحميل البيانات الأولية: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (schoolId) => {
    if (classIdFromQuery) return;
    if (!schoolId) {
      setClasses([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/points/teacher/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filteredClasses = response.data.classes.filter(cls => String(cls.school_id) === String(schoolId));
      setClasses(filteredClasses);
      console.log(`Filtered classes for school ${schoolId}:`, filteredClasses);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("فشل في تحميل الحلقات");
    }
  };

  const fetchStudentsPoints = async () => {
    if (!dateFrom || !dateTo) {
      setError("يرجى تحديد تاريخ البداية والنهاية");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem('token');

      let url = `${API_BASE}/api/points/reports/students-summary?date_from=${dateFrom}&date_to=${dateTo}`;

      if (classIdFromQuery) {
        url += `&class_id=${classIdFromQuery}`;
      } else if (selectedSchool) {
        url += `&school_id=${selectedSchool}`;
      }
      if (!classIdFromQuery && selectedClass) {
        url += `&class_id=${selectedClass}`;
      }

      console.log("Fetching points from URL:", url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Points response:", response.data);
      setStudentsPoints(response.data.students || []);
    } catch (err) {
      console.error("Error fetching students points:", err);
      console.error("Error details:", err.response?.data);
      setError(`فشل في تحميل تقرير النقاط: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetailedPoints = async (student) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `${API_BASE}/api/points/student/${student.id}?date_from=${dateFrom}&date_to=${dateTo}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPointsRecords(response.data.points || []);
      setSelectedStudent(student);
      setShowPointsModal(true);
    } catch (err) {
      console.error("Error fetching student detailed points:", err);
      setError("فشل في تحميل تفاصيل النقاط");
    } finally {
      setLoading(false);
    }
  };

  // Points editing functions (same as StudentProfile)
  const startEditingPoint = (record) => {
    setEditingPointRecord(record.id);
    setEditingPointForm({
      points: record.points_given,
      notes: record.notes || "",
      date: record.points_date
    });
  };

  const cancelEditingPoint = () => {
    setEditingPointRecord(null);
    setEditingPointForm({ points: 0, notes: "", date: "" });
  };

  const saveEditedPoint = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/api/points/${editingPointRecord}`, {
        points_given: parseFloat(editingPointForm.points),
        notes: editingPointForm.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess("تم تحديث النقاط بنجاح");
      cancelEditingPoint();
      fetchStudentDetailedPoints(selectedStudent); // Refresh the points
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في تحديث النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const deletePointRecord = async (recordId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/points/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess("تم حذف السجل بنجاح");
      fetchStudentDetailedPoints(selectedStudent); // Refresh the points
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في حذف السجل");
      setTimeout(() => setError(""), 3000);
    }
  };

  const formatSafeDate = (dateStr, options = {}) => {
    if (!dateStr) return 'تاريخ غير صحيح';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'تاريخ غير صحيح';

      return date.toLocaleDateString('ar-SA', {
        weekday: options.weekday || undefined,
        year: 'numeric',
        month: options.month || 'short',
        day: 'numeric',
        calendar: 'islamic-umalqura'
      });
    } catch (error) {
      return 'تاريخ غير صحيح';
    }
  };

  // Add error boundary for debugging
  try {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AiOutlineStar className="text-3xl text-yellow-600" />
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">تقارير النقاط</h1>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {!classIdFromQuery && (
              <>
            {/* School Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">مجمع الحلقات:</label>
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setSelectedClass("");
                  fetchClasses(e.target.value);
                }}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">جميع مجمعات الحلقات</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">الحلقة:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSchool}
              >
                <option value="">جميع الحلقات</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

              </>
            )}

            {classIdFromQuery && currentClass && (
              <div className="col-span-1 md:col-span-2 lg:col-span-2 flex items-end">
                <div className="w-full p-3 border rounded-lg bg-gray-50 text-sm text-gray-700">
                  {currentClass.name}
                </div>
              </div>
            )}

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={fetchStudentsPoints}
                disabled={!dateFrom || !dateTo}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AiOutlineSearch />
                بحث
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

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <AiOutlineLoading3Quarters className="animate-spin text-2xl text-blue-500" />
            <span>جاري تحميل البيانات...</span>
          </div>
        </div>
      )}

      {/* Results Table */}
      {!loading && studentsPoints.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">
              تقرير النقاط من {formatSafeDate(dateFrom)} إلى {formatSafeDate(dateTo)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              إجمالي الطلاب: {studentsPoints.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right font-medium border-b">اسم الطالب</th>
                  <th className="px-6 py-3 text-center font-medium border-b">مجمع الحلقات</th>
                  <th className="px-6 py-3 text-center font-medium border-b">الحلقة</th>
                  <th className="px-6 py-3 text-center font-medium border-b">إجمالي النقاط</th>
                  <th className="px-6 py-3 text-center font-medium border-b">عدد الأيام</th>
                  <th className="px-6 py-3 text-center font-medium border-b">المتوسط</th>
                  <th className="px-6 py-3 text-center font-medium border-b">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {studentsPoints.map((student, index) => (
                  <tr key={student.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AiOutlineUser className="text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {student.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">
                        {student.school_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">
                        {student.class_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        parseFloat(student.total_points || 0) >= 50 ? 'bg-green-100 text-green-800' :
                        parseFloat(student.total_points || 0) >= 30 ? 'bg-blue-100 text-blue-800' :
                        parseFloat(student.total_points || 0) >= 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {parseFloat(student.total_points || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">
                        {student.points_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">
                        {student.points_count > 0 ? (parseFloat(student.total_points || 0) / parseFloat(student.points_count || 1)).toFixed(1) : '0'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => fetchStudentDetailedPoints(student)}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                        title="عرض تفاصيل النقاط"
                      >
                        <AiOutlineTable className="w-4 h-4" />
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {studentsPoints.length}
                </div>
                <div className="text-sm text-gray-600">إجمالي الطلاب</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {studentsPoints.reduce((sum, s) => sum + parseFloat(s.total_points || 0), 0).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">إجمالي النقاط</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {studentsPoints.length > 0 ?
                    (studentsPoints.reduce((sum, s) => sum + parseFloat(s.total_points || 0), 0) / studentsPoints.length).toFixed(1) :
                    '0'
                  }
                </div>
                <div className="text-sm text-gray-600">متوسط النقاط</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {studentsPoints.reduce((sum, s) => sum + parseInt(s.points_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">إجمالي الأيام</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && studentsPoints.length === 0 && dateFrom && dateTo && (
        <div className="text-center py-12">
          <AiOutlineStar className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">لا توجد بيانات</h3>
          <p className="text-gray-500">
            لا توجد نقاط للطلاب في الفترة المحددة
          </p>
        </div>
      )}

      {/* Points Details Modal */}
      {showPointsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                سجل النقاط التفصيلي - {selectedStudent.first_name} {selectedStudent.last_name}
              </h3>
              <button
                onClick={() => setShowPointsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-center text-sm font-medium border">التاريخ</th>
                    <th className="p-3 text-center text-sm font-medium border">النقاط</th>
                    <th className="p-3 text-center text-sm font-medium border">النقاط من 5</th>
                    <th className="p-3 text-center text-sm font-medium border">ملاحظات</th>
                    <th className="p-3 text-center text-sm font-medium border">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsRecords.length > 0 ? (
                    pointsRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 text-center text-sm border">
                          {formatSafeDate(record.points_date || record.created_at, { weekday: 'long', month: 'long' })}
                        </td>
                        <td className="p-3 text-center text-sm border font-semibold">
                          {editingPointRecord === record.id ? (
                            <select
                              value={editingPointForm.points}
                              onChange={(e) => setEditingPointForm({...editingPointForm, points: e.target.value})}
                              className="w-20 p-1 border rounded text-center"
                            >
                              <option value={0}>0</option>
                              <option value={0.5}>0.5</option>
                              <option value={1}>1</option>
                              <option value={1.5}>1.5</option>
                              <option value={2}>2</option>
                              <option value={2.5}>2.5</option>
                              <option value={3}>3</option>
                              <option value={3.5}>3.5</option>
                              <option value={4}>4</option>
                              <option value={4.5}>4.5</option>
                              <option value={5}>5</option>
                            </select>
                          ) : (
                            record.points_given
                          )}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          <div className="flex items-center justify-center">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= (editingPointRecord === record.id ? editingPointForm.points : record.points_given) ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {editingPointRecord === record.id ? (
                            <textarea
                              value={editingPointForm.notes}
                              onChange={(e) => setEditingPointForm({...editingPointForm, notes: e.target.value})}
                              className="w-32 p-1 border rounded text-xs resize-none"
                              rows={2}
                              placeholder="ملاحظات..."
                            />
                          ) : (
                            record.notes || '-'
                          )}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {editingPointRecord === record.id ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={saveEditedPoint}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                title="حفظ"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditingPoint}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                title="إلغاء"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => startEditingPoint(record)}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                title="تعديل"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deletePointRecord(record.id)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                title="حذف"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-gray-500">
                        لا توجد سجلات نقاط لهذا الطالب في الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPointsModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  } catch (error) {
    console.error('PointsReports component error:', error);
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          خطأ في تحميل الصفحة: {error.message}
        </div>
      </div>
    );
  }
};

export default PointsReports;
