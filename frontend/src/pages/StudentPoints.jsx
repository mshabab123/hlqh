import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineStar, AiOutlineCalendar, AiOutlineUser, AiOutlineBook, AiOutlineFileText } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentPoints = () => {
  const [points, setPoints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'student' && user?.id) {
      loadSemesters();
      loadStudentPoints();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadStudentPoints();
    }
  }, [selectedSemester, dateFrom, dateTo, currentPage]);

  const loadSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSemesters(response.data.semesters || response.data || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
    }
  };

  const loadStudentPoints = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSemester) params.append('semester_id', selectedSemester);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', currentPage);
      params.append('limit', 20);

      const response = await axios.get(`${API_BASE}/api/points/student/${user.id}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPoints(response.data.points || []);
      setSummary(response.data.summary || null);
      setTotalPages(Math.ceil((response.data.pagination?.total || 0) / 20));
      
    } catch (error) {
      console.error("Error loading student points:", error);
      setError("فشل في تحميل النقاط");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderPointsStars = (points) => {
    if (points === null || points === undefined) return null;
    
    const stars = [];
    const fullStars = Math.floor(points);
    const hasHalf = points % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <AiOutlineStar key={i} className="inline text-yellow-400 fill-current" />
      );
    }
    
    if (hasHalf) {
      stars.push(
        <div key="half" className="inline-block relative">
          <AiOutlineStar className="text-yellow-400" />
          <AiOutlineStar 
            className="absolute top-0 left-0 text-yellow-400 fill-current" 
            style={{clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'}} 
          />
        </div>
      );
    }
    
    const remainingStars = 5 - Math.ceil(points);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <AiOutlineStar key={`empty-${i}`} className="inline text-gray-300" />
      );
    }
    
    return <div className="flex items-center">{stars}</div>;
  };

  const getPointsColor = (points) => {
    if (points === null || points === undefined) return "text-gray-400";
    if (points >= 4.5) return "text-green-600";
    if (points >= 3.5) return "text-blue-600";
    if (points >= 2.5) return "text-yellow-600";
    if (points >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  const getPointsLabel = (points) => {
    if (points === null || points === undefined) return "لا توجد نقاط";
    if (points === 5) return "ممتاز";
    if (points >= 4.5) return "ممتاز -";
    if (points >= 4) return "جيد جداً";
    if (points >= 3.5) return "جيد جداً -";
    if (points >= 3) return "جيد";
    if (points >= 2.5) return "جيد -";
    if (points >= 2) return "مقبول";
    if (points >= 1) return "ضعيف";
    return "ضعيف جداً";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check permissions
  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة متاحة للطلاب فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AiOutlineStar className="w-7 h-7 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">نقاطي</h1>
              <p className="text-gray-600">عرض النقاط اليومية والتقييمات</p>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">إجمالي النقاط</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {parseFloat(summary.total_points || 0).toFixed(1)}
                    </p>
                  </div>
                  <AiOutlineStar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">المتوسط</p>
                    <p className="text-2xl font-bold text-green-700">
                      {parseFloat(summary.average_points || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="flex">
                    {renderPointsStars(parseFloat(summary.average_points || 0))}
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 mb-1">أعلى نقاط</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {parseFloat(summary.max_points || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="flex">
                    {renderPointsStars(parseFloat(summary.max_points || 0))}
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">عدد الأيام</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {summary.total_entries || 0}
                    </p>
                  </div>
                  <AiOutlineCalendar className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفصل الدراسي</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">جميع الفصول</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Points List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">سجل النقاط</h2>
            <p className="text-gray-600 mt-1">تفاصيل النقاط اليومية</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل النقاط...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحلقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المعلم</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">النقاط</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">التقدير</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {points.map(point => (
                    <tr key={point.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <AiOutlineCalendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(point.points_date)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <AiOutlineBook className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {point.class_name}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <AiOutlineUser className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {point.teacher_name}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {renderPointsStars(point.points_given)}
                          <span className={`text-sm font-medium ${getPointsColor(point.points_given)}`}>
                            {point.points_given}/5
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPointsColor(point.points_given)} bg-opacity-10`}>
                          {getPointsLabel(point.points_given)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          {point.notes && <AiOutlineFileText className="w-4 h-4 text-gray-400 mt-0.5" />}
                          <span className="text-sm text-gray-600">
                            {point.notes || "لا توجد ملاحظات"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {points.length === 0 && !loading && (
                <div className="text-center py-12">
                  <AiOutlineStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">لا توجد نقاط مسجلة</p>
                  <p className="text-gray-400 text-sm mt-2">سيتم عرض النقاط عندما يقوم المعلمون بإعطائها</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    الصفحة {currentPage} من {totalPages}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPoints;