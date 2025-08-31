import React, { useState, useEffect } from 'react';
import { FaUser, FaGraduationCap, FaTrophy, FaBook, FaHistory, FaChartLine, FaCalendarAlt, FaEdit, FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import axios from '../utils/axiosConfig';

const Children = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');
  const [dataLoading, setDataLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;
  const userId = user?.id;

  const canViewChildren = ['parent', 'admin', 'administrator', 'teacher'].includes(userRole);

  useEffect(() => {
    if (canViewChildren) {
      fetchChildren();
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      setDataLoading(true);
      fetchChildData(selectedChild.student_id).finally(() => setDataLoading(false));
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/children/${userId}`);
      setChildren(response.data.children || []);
      if (response.data.children?.length > 0) {
        setSelectedChild(response.data.children[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('خطأ في جلب بيانات الأبناء');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (studentId) => {
    try {
      setLoading(true);
      const [gradesRes, pointsRes, attendanceRes, goalsRes] = await Promise.allSettled([
        axios.get(`/api/grades/student/${studentId}`),
        axios.get(`/api/points/student/${studentId}`),
        axios.get(`/api/attendance/student/${studentId}`),
        axios.get(`/api/students/${studentId}/goals`)
      ]);

      const gradesData = gradesRes.status === 'fulfilled' ? gradesRes.value.data : { grades: [] };
      const pointsData = pointsRes.status === 'fulfilled' ? pointsRes.value.data : { points: [], totalPoints: 0 };
      const attendanceData = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data : { attendance: [], percentage: 0 };
      const goalsData = goalsRes.status === 'fulfilled' ? goalsRes.value.data : { goals: [] };

      setChildData({
        grades: gradesData.grades || [],
        points: pointsData.points || [],
        attendance: attendanceData.attendance || [],
        goals: goalsData.goals || [],
        statistics: {
          totalPoints: pointsData.totalPoints || 0,
          averageGrade: gradesData.averageGrade || 0,
          attendancePercentage: attendanceData.percentage || 0,
          completedPages: gradesData.completedPages || 0
        }
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('خطأ في جلب بيانات الطالب');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await axios.get(`/api/children/${userId}/available`);
      setAvailableStudents(response.data.students || []);
    } catch (err) {
      console.error('Error fetching available students:', err);
    }
  };

  const handleAddChild = async () => {
    try {
      await axios.post(
        `/api/children/${userId}/add`,
        {
          studentId: selectedStudentId,
          relationshipType: relationshipType,
          isPrimary: false
        }
      );
      setShowAddModal(false);
      fetchChildren();
      setSelectedStudentId('');
    } catch (err) {
      console.error('Error adding child:', err);
      alert('خطأ في إضافة الطالب');
    }
  };

  const handleRemoveChild = async (relationshipId) => {
    if (window.confirm('هل أنت متأكد من إلغاء ربط هذا الطالب؟')) {
      try {
        await axios.delete(`/api/children/${userId}/${relationshipId}`);
        fetchChildren();
      } catch (err) {
        console.error('Error removing child:', err);
        alert('خطأ في إلغاء ربط الطالب');
      }
    }
  };

  const renderGradesHistory = () => {
    if (!childData?.grades?.length) {
      return (
        <div className="text-center py-8">
          <FaGraduationCap className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد درجات مسجلة</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفصل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السورة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصفحات</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التقدير</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {childData.grades.map((grade, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(grade.date).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.class_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.surah_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.pages}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    grade.grade === 'ممتاز' ? 'bg-green-100 text-green-800' :
                    grade.grade === 'جيد جداً' ? 'bg-blue-100 text-blue-800' :
                    grade.grade === 'جيد' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {grade.grade}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPointsHistory = () => {
    if (!childData?.points?.length) {
      return (
        <div className="text-center py-8">
          <FaTrophy className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد نقاط مسجلة</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النقاط</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المعلم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {childData.points.map((point, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(point.points_date).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {point.points_given}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{point.teacher_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{point.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAttendance = () => {
    if (!childData?.attendance?.length) {
      return (
        <div className="text-center py-8">
          <FaCalendarAlt className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد سجلات حضور</p>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-4 bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">نسبة الحضور الإجمالية</p>
              <p className="text-2xl font-bold text-blue-600">{childData.statistics.attendancePercentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">عدد الأيام</p>
              <p className="text-lg font-semibold">حاضر: {childData.attendance.filter(r => r.is_present).length} | غائب: {childData.attendance.filter(r => !r.is_present).length}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفصل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {childData.attendance.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.attendance_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.is_present ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {record.is_present ? 'حاضر' : 'غائب'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.class_name || 'غير محدد'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!childData?.statistics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaTrophy className="text-yellow-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">مجموع النقاط</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.totalPoints}</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaGraduationCap className="text-green-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">متوسط الدرجات</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.averageGrade}%</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaCalendarAlt className="text-blue-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">نسبة الحضور</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.attendancePercentage}%</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaBook className="text-purple-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">الصفحات المحفوظة</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.completedPages}</h3>
        </div>
      </div>
    );
  };

  const renderGoals = () => {
    if (!childData?.goals?.length) {
      return (
        <div className="text-center py-8">
          <FaChartLine className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد أهداف محددة</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {childData.goals.map((goal, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <h6 className="text-lg font-semibold">{goal.title}</h6>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                goal.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {goal.completed ? 'مكتمل' : 'قيد التنفيذ'}
              </span>
            </div>
            <p className="text-gray-600 mb-2">{goal.description}</p>
            <small className="text-gray-500">
              التاريخ المستهدف: {new Date(goal.target_date).toLocaleDateString('ar-SA')}
            </small>
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'profile', label: 'الملف الشخصي', icon: <FaUser className="inline mr-2" /> },
    { id: 'grades', label: 'الدرجات', icon: <FaGraduationCap className="inline mr-2" /> },
    { id: 'points', label: 'النقاط', icon: <FaTrophy className="inline mr-2" /> },
    { id: 'attendance', label: 'الحضور', icon: <FaCalendarAlt className="inline mr-2" /> },
    { id: 'goals', label: 'الأهداف', icon: <FaChartLine className="inline mr-2" /> },
    { id: 'history', label: 'السجل', icon: <FaHistory className="inline mr-2" /> }
  ];

  if (!canViewChildren) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3">
            <p className="text-sm text-yellow-700">ليس لديك صلاحية لعرض هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mr-3">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Children List */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-lg font-semibold">الأبناء</span>
              {userRole === 'parent' && (
                <button
                  onClick={() => {
                    fetchAvailableStudents();
                    setShowAddModal(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
                >
                  <FaPlus className="ml-1" /> إضافة
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {children.map((child) => (
                <div
                  key={child.relationship_id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center ${
                    selectedChild?.relationship_id === child.relationship_id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedChild(child)}
                >
                  <div className="flex items-center">
                    <FaUser className="text-gray-400 ml-2" />
                    <span>{child.first_name} {child.last_name}</span>
                  </div>
                  {userRole === 'parent' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChild(child.relationship_id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              {children.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  لا يوجد أبناء مسجلين
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Child Details */}
        <div className="lg:w-3/4">
          {selectedChild ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-xl font-semibold">
                  {selectedChild.first_name} {selectedChild.second_name} {selectedChild.third_name} {selectedChild.last_name}
                </h4>
                <p className="text-sm text-gray-600">
                  المستوى: {selectedChild.school_level || 'غير محدد'}
                </p>
              </div>

              <div className="p-6">
                {dataLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mr-3">جاري تحميل البيانات...</p>
                  </div>
                ) : (
                  <>
                    {renderStatistics()}

                    {/* Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8 space-x-reverse">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div>
                  {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">رقم الهوية</p>
                        <p className="font-semibold">{selectedChild.student_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                        <p className="font-semibold">{selectedChild.email || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">رقم الهاتف</p>
                        <p className="font-semibold">{selectedChild.phone || 'غير محدد'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">نوع العلاقة</p>
                        <p className="font-semibold">{selectedChild.relationship_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">الحالة</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedChild.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedChild.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'grades' && renderGradesHistory()}
                  {activeTab === 'points' && renderPointsHistory()}
                  {activeTab === 'attendance' && renderAttendance()}
                  {activeTab === 'goals' && renderGoals()}
                  
                  {activeTab === 'history' && (
                    <div className="text-center text-gray-500 py-8">
                      <p>سيتم إضافة السجل الكامل قريباً</p>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <p className="text-sm text-blue-700">الرجاء اختيار طالب من القائمة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">إضافة طالب</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر الطالب
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- اختر طالب --</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} - {student.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع العلاقة
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="parent">والد/والدة</option>
                <option value="guardian">ولي أمر</option>
                <option value="relative">قريب</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddChild}
                disabled={!selectedStudentId}
                className={`px-4 py-2 rounded-md ${
                  selectedStudentId
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Children;