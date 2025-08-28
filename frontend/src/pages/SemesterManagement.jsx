import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Working Days Display Component
const WorkingDaysDisplay = ({ startDate, endDate, weekendDays, vacationDays, calculateWorkingDays }) => {
  const daysInfo = useMemo(() => {
    if (!startDate || !endDate) return { total: 0, working: 0 };
    return calculateWorkingDays(startDate, endDate, weekendDays, vacationDays);
  }, [startDate, endDate, weekendDays, vacationDays, calculateWorkingDays]);

  if (!startDate || !endDate) return null;

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="text-sm">
        <div className="flex justify-between mb-2">
          <span>إجمالي الأيام:</span>
          <span className="font-bold">{daysInfo.total} يوم</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>أيام العمل:</span>
          <span className="font-bold text-green-600">{daysInfo.working} يوم</span>
        </div>
        <div className="flex justify-between">
          <span>أيام العطل (الأسبوعية + الاستثنائية):</span>
          <span className="font-bold text-red-600">{daysInfo.total - daysInfo.working} يوم</span>
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-600">
          <span>• أيام العطل الاستثنائية:</span>
          <span>{vacationDays.length} يوم</span>
        </div>
      </div>
    </div>
  );
};

const SemesterManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [detailsSemester, setDetailsSemester] = useState(null);
  const [newVacationDate, setNewVacationDate] = useState("");
  const [showVacationCalendar, setShowVacationCalendar] = useState(false);
  
  const [newSemester, setNewSemester] = useState({
    type: "first", // first, second, summer
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    school_id: "",
    weekend_days: [5, 6], // Friday=5, Saturday=6 (ISO weekdays)
    vacation_days: []
  });

  const [courseForm, setCourseForm] = useState({
    name: "",
    percentage: 0,
    requires_surah: false,
    description: ""
  });

  const defaultCourses = [
    { name: "الحفظ الجديد", percentage: 40, requires_surah: true, description: "حفظ سور جديدة" },
    { name: "المراجعة الصغرى", percentage: 25, requires_surah: true, description: "مراجعة السور المحفوظة حديثاً" },
    { name: "المراجعة الكبرى", percentage: 25, requires_surah: true, description: "مراجعة جميع السور المحفوظة" },
    { name: "السلوك", percentage: 10, requires_surah: false, description: "تقييم السلوك والأخلاق" }
  ];

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Load schools on component mount
  useEffect(() => {
    loadSchools();
  }, []);
  
  // Load semesters when school is selected
  useEffect(() => {
    loadSemesters();
  }, [selectedSchool]);

  // Load courses when semester is selected
  useEffect(() => {
    if (selectedSemester && selectedSchool) {
      loadCourses();
    }
  }, [selectedSemester, selectedSchool]);

  const loadSchools = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error("Error loading schools:", error);
      setSchools([]);
    }
  };

  const loadSemesters = async () => {
    if (!selectedSchool) {
      setSemesters([]);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSemesters(response.data.semesters || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
      setSemesters([]);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters/${selectedSemester.id}/courses/${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursesWithNumberPercentages = response.data.map(course => ({
        ...course,
        percentage: parseFloat(course.percentage) || 0
      }));
      setCourses(coursesWithNumberPercentages);
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    }
  };

  const handleAddSemester = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const semesterData = {
        ...newSemester,
        school_id: newSemester.school_id || selectedSchool,
        display_name: `الفصل ${newSemester.type === 'first' ? 'الأول' : newSemester.type === 'second' ? 'الثاني' : 'الصيفي'} ${newSemester.year}`
      };
      
      let response;
      if (editingSemester) {
        // Edit existing semester
        response = await axios.put(`${API_BASE}/api/semesters/${editingSemester.id}`, semesterData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update semester in state
        setSemesters(semesters.map(sem => 
          sem.id === editingSemester.id ? response.data : sem
        ));
        
        // Update selected semester if it's the one being edited
        if (selectedSemester?.id === editingSemester.id) {
          setSelectedSemester(response.data);
        }
      } else {
        // Create new semester
        response = await axios.post(`${API_BASE}/api/semesters`, semesterData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSemesters([...semesters, response.data]);
        
        // Create default courses for all schools
        if (schools.length > 0) {
          await createDefaultCourses(response.data.id);
        }
      }
      
      // Reset form
      setNewSemester({
        type: "first",
        year: new Date().getFullYear(),
        start_date: "",
        end_date: "",
        school_id: "",
        weekend_days: [5, 6],
        vacation_days: []
      });
      setShowAddModal(false);
      setEditingSemester(null);
    } catch (error) {
      console.error("Error saving semester:", error);
      const errorMessage = error.response?.data?.message || "حدث خطأ في إضافة الفصل الدراسي";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCourses = async (semesterId) => {
    const token = localStorage.getItem("token");
    
    for (const school of schools) {
      for (const course of defaultCourses) {
        try {
          await axios.post(`${API_BASE}/api/semesters/${semesterId}/courses`, {
            ...course,
            school_id: school.id
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error("Error creating default course:", error);
        }
      }
    }
  };

  const handleSaveCourse = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const courseData = {
        ...courseForm,
        semester_id: selectedSemester.id,
        school_id: selectedSchool
      };

      if (editingCourse) {
        await axios.put(`${API_BASE}/api/courses/${editingCourse.id}`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE}/api/semesters/${selectedSemester.id}/courses`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      await loadCourses();
      setShowCourseModal(false);
      setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "" });
      setEditingCourse(null);
    } catch (error) {
      console.error("Error saving course:", error);
      alert("حدث خطأ في حفظ المقرر");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setCourseForm({
      name: course.name,
      percentage: parseFloat(course.percentage) || 0,
      requires_surah: course.requires_surah,
      description: course.description || ""
    });
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقرر؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("حدث خطأ في حذف المقرر");
    }
  };

  const getTotalPercentage = () => {
    return courses.reduce((total, course) => total + parseFloat(course.percentage || 0), 0);
  };

  const getSemesterTypeText = (type) => {
    const types = {
      'first': 'الأول',
      'second': 'الثاني', 
      'summer': 'الصيفي'
    };
    return types[type] || type;
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  };

  const calculateWorkingDays = (startDate, endDate, weekendDays = [5, 6], vacationDays = []) => {
    if (!startDate || !endDate) return { total: 0, working: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const vacationSet = new Set(vacationDays);
    
    let totalDays = 0;
    let workingDays = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      totalDays++;
      
      // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
      // Convert to ISO day (1=Monday, ..., 7=Sunday)
      const dayOfWeek = currentDate.getDay();
      const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      const isWeekend = weekendDays.includes(isoDayOfWeek);
      const isVacation = vacationSet.has(currentDate.toISOString().split('T')[0]);
      
      if (!isWeekend && !isVacation) {
        workingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { total: totalDays, working: workingDays };
  };

  const addVacationDay = (date) => {
    const vacationDays = newSemester.vacation_days || [];
    if (!date || vacationDays.includes(date)) {
      if (vacationDays.includes(date)) {
        alert("هذا التاريخ مضاف بالفعل كيوم عطلة");
      }
      return;
    }
    
    setNewSemester(prev => ({
      ...prev,
      vacation_days: [...vacationDays, date].sort()
    }));
    setNewVacationDate("");
  };

  const removeVacationDay = (date) => {
    setNewSemester(prev => ({
      ...prev,
      vacation_days: (prev.vacation_days || []).filter(d => d !== date)
    }));
  };

  const toggleWeekendDay = (dayNumber) => {
    const weekendDays = [...(newSemester.weekend_days || [5, 6])];
    const index = weekendDays.indexOf(dayNumber);
    
    if (index > -1) {
      weekendDays.splice(index, 1);
    } else {
      weekendDays.push(dayNumber);
    }
    
    setNewSemester({
      ...newSemester,
      weekend_days: weekendDays.sort()
    });
  };

  const getWeekdayName = (dayNumber) => {
    const days = {
      1: 'الاثنين',
      2: 'الثلاثاء', 
      3: 'الأربعاء',
      4: 'الخميس',
      5: 'الجمعة',
      6: 'السبت',
      7: 'الأحد'
    };
    return days[dayNumber] || '';
  };

  const handleShowDetails = (semester) => {
    setDetailsSemester(semester);
    setShowDetailsModal(true);
  };

  const getDaysRemaining = (semester) => {
    if (!semester.start_date || !semester.end_date) return null;
    
    const today = new Date();
    const startDate = new Date(semester.start_date);
    const endDate = new Date(semester.end_date);
    
    if (today < startDate) {
      // Semester hasn't started yet
      const daysToStart = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
      return { status: 'upcoming', days: daysToStart, text: `يبدأ خلال ${daysToStart} يوم` };
    } else if (today > endDate) {
      // Semester has ended
      const daysEnded = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
      return { status: 'ended', days: daysEnded, text: `انتهى منذ ${daysEnded} يوم` };
    } else {
      // Semester is ongoing
      const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return { status: 'current', days: daysRemaining, text: `${daysRemaining} يوم متبقي` };
    }
  };

  const handleEditSemester = (semester) => {
    setNewSemester({
      type: semester.type,
      year: semester.year,
      start_date: semester.start_date ? semester.start_date.split('T')[0] : "",
      end_date: semester.end_date ? semester.end_date.split('T')[0] : "",
      display_name: semester.display_name || "",
      school_id: semester.school_id || selectedSchool,
      weekend_days: semester.weekend_days || [5, 6],
      vacation_days: semester.vacation_days || []
    });
    setEditingSemester(semester);
    setShowAddModal(true);
  };

  const handleDeleteSemester = async (semesterId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل الدراسي؟ سيتم حذف جميع المقررات والدرجات المرتبطة به.")) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/semesters/${semesterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadSemesters();
      
      // Clear selection if the deleted semester was selected
      if (selectedSemester?.id === semesterId) {
        setSelectedSemester(null);
        setCourses([]);
      }
    } catch (error) {
      console.error("Error deleting semester:", error);
      if (error.response?.status === 403) {
        alert("ليس لديك صلاحية لحذف الفصل الدراسي");
      } else {
        alert("حدث خطأ في حذف الفصل الدراسي");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  const canManage = user && (user.role === 'admin' || user.role === 'administrator');

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة مخصصة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">إدارة الفصول الدراسية</h1>
            <button
              onClick={() => {
                setEditingSemester(null);
                setNewSemester({
                  name: "",
                  type: "first",
                  year: new Date().getFullYear(),
                  start_date: "",
                  end_date: "",
                  display_name: "",
                  school_id: selectedSchool,
                  weekend_days: [5, 6],
                  vacation_days: []
                });
                setShowAddModal(true);
              }}
              disabled={!selectedSchool}
              className={`px-6 py-2 rounded-lg transition-colors ${
                selectedSchool 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!selectedSchool ? 'يجب اختيار المجمع أولاً' : ''}
            >
              إضافة فصل دراسي جديد
            </button>
          </div>

          {/* School Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">اختيار المجمع:</label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full md:w-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر المجمع</option>
              {schools && schools.map ? schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              )) : null}
            </select>
          </div>

          {/* Semesters Grid */}
          {!selectedSchool ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">اختر المجمع</h3>
              <p className="text-gray-500">يرجى اختيار المجمع لعرض الفصول الدراسية الخاصة به</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {semesters && semesters.length > 0 ? semesters.map(semester => (
              <div
                key={semester.id}
                className={`bg-white border-2 rounded-xl p-6 transition-all ${
                  selectedSemester?.id === semester.id 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div 
                  className="cursor-pointer mb-4"
                  onClick={() => setSelectedSemester(semester)}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    الفصل {getSemesterTypeText(semester.type)}
                  </h3>
                  <p className="text-gray-600 mb-2">العام: {semester.year}</p>
                  
                  {semester.start_date && semester.end_date && (
                    <>
                      <p className="text-sm text-gray-500 mb-3">
                        من {new Date(semester.start_date).toLocaleDateString('ar-EG')} 
                        إلى {new Date(semester.end_date).toLocaleDateString('ar-EG')}
                      </p>
                      
                      {/* Days Information */}
                      {(() => {
                        const totalDays = calculateDays(semester.start_date, semester.end_date);
                        const daysInfo = getDaysRemaining(semester);
                        const workDaysInfo = calculateWorkingDays(
                          semester.start_date, 
                          semester.end_date, 
                          semester.weekend_days || [5, 6], 
                          semester.vacation_days || []
                        );
                        
                        // Calculate remaining working days if semester is current
                        let remainingWorkDays = 0;
                        if (daysInfo?.status === 'current') {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const remainingWorkDaysInfo = calculateWorkingDays(
                            today.toISOString().split('T')[0],
                            semester.end_date,
                            semester.weekend_days || [5, 6],
                            semester.vacation_days || []
                          );
                          remainingWorkDays = remainingWorkDaysInfo.working;
                        }
                        
                        return (
                          <div className="space-y-2">
                            {/* Main days info */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="text-blue-600 font-medium">📅</span>
                                    <span className="text-gray-700">إجمالي: </span>
                                    <span className="font-semibold text-gray-800">{totalDays || 0} يوم</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-green-600 font-medium">💼</span>
                                    <span className="text-gray-700">أيام عمل: </span>
                                    <span className="font-semibold text-green-800">{workDaysInfo.working || 0} يوم</span>
                                  </div>
                                </div>
                                
                                {/* Show remaining work days for current semester */}
                                {daysInfo?.status === 'current' && (
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1">
                                      <span className="text-orange-600 font-medium">⏳</span>
                                      <span className="text-gray-700">أيام عمل متبقية: </span>
                                      <span className="font-semibold text-orange-700">{remainingWorkDays} يوم</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ({Math.round((remainingWorkDays / workDaysInfo.working) * 100)}% من أيام العمل)
                                    </div>
                                  </div>
                                )}
                                
                                {daysInfo && (
                                  <div className="flex items-center gap-1 pt-2 border-t border-gray-200">
                                    <span className={`text-sm ${
                                      daysInfo.status === 'upcoming' ? 'text-blue-600' :
                                      daysInfo.status === 'current' ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                      {daysInfo.status === 'upcoming' ? '🔜' :
                                       daysInfo.status === 'current' ? '⏰' : '✅'}
                                    </span>
                                    <span className={`text-xs font-medium ${
                                      daysInfo.status === 'upcoming' ? 'text-blue-600' :
                                      daysInfo.status === 'current' ? 'text-green-600' : 'text-gray-500'
                                    }`}>
                                      {daysInfo.status === 'upcoming' && `يبدأ خلال ${daysInfo.days} يوم`}
                                      {daysInfo.status === 'current' && `متبقي ${daysInfo.days} يوم`}
                                      {daysInfo.status === 'ended' && `انتهى منذ ${daysInfo.days} يوم`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                              
                            {/* Progress bar for current semesters */}
                            {daysInfo?.status === 'current' && totalDays && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  {(() => {
                                    const elapsed = totalDays - daysInfo.days;
                                    const progress = (elapsed / totalDays) * 100;
                                    return (
                                      <div 
                                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      />
                                    );
                                  })()}
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>مر {totalDays - daysInfo.days} يوم</span>
                                  <span>{Math.round(((totalDays - daysInfo.days) / totalDays) * 100)}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowDetails(semester);
                    }}
                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    التفاصيل
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSemester(semester);
                    }}
                    className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded text-sm hover:bg-yellow-600 transition-colors"
                  >
                    تعديل
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSemester(semester.id);
                      }}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors"
                      disabled={loading}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
              )) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد فصول دراسية</h3>
                  <p className="text-gray-500">لم يتم إنشاء أي فصول دراسية لهذا المجمع بعد</p>
                </div>
              )}
            </div>
          )}

          {/* Course Management */}
          {selectedSemester && selectedSchool && (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  مقررات الفصل {getSemesterTypeText(selectedSemester.type)} {selectedSemester.year}
                </h2>
                <button
                  onClick={() => {
                    setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "" });
                    setEditingCourse(null);
                    setShowCourseModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  إضافة مقرر
                </button>
              </div>

              <div className="mb-4">
                <p className="text-lg font-semibold">
                  إجمالي النسب: {getTotalPercentage()}%
                  <span className={getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}>
                    {getTotalPercentage() === 100 ? ' ✓' : ' (يجب أن يكون 100%)'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses && courses.map ? courses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg p-4 shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-800">{course.name}</h3>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                        {course.percentage}%
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                    
                    {course.requires_surah && (
                      <p className="text-sm text-green-600 mb-3">
                        📖 يتطلب تحديد السور والآيات
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Semester Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 max-w-md w-full mx-auto my-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {editingSemester ? 'تعديل الفصل الدراسي' : 'إضافة فصل دراسي جديد'}
            </h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">نوع الفصل:</label>
                <select
                  value={newSemester.type}
                  onChange={(e) => setNewSemester({...newSemester, type: e.target.value})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm sm:text-base"
                >
                  <option value="first">الأول</option>
                  <option value="second">الثاني</option>
                  <option value="summer">الصيفي</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">السنة:</label>
                <input
                  type="number"
                  value={newSemester.year}
                  onChange={(e) => setNewSemester({...newSemester, year: parseInt(e.target.value)})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm sm:text-base"
                  min="2020"
                  max="2050"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">تاريخ البداية:</label>
                <input
                  type="date"
                  value={newSemester.start_date}
                  onChange={(e) => setNewSemester({...newSemester, start_date: e.target.value})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">تاريخ النهاية:</label>
                <input
                  type="date"
                  value={newSemester.end_date}
                  onChange={(e) => setNewSemester({...newSemester, end_date: e.target.value})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-sm sm:text-base"
                />
              </div>

              {/* Working Days Calculation */}
              <WorkingDaysDisplay 
                startDate={newSemester.start_date}
                endDate={newSemester.end_date}
                weekendDays={newSemester.weekend_days || [5, 6]}
                vacationDays={newSemester.vacation_days || []}
                calculateWorkingDays={calculateWorkingDays}
              />

              {/* Weekend Days Selection */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">أيام نهاية الأسبوع:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(dayNum => (
                    <label key={dayNum} className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 border rounded hover:bg-gray-50 text-xs sm:text-sm">
                      <input
                        type="checkbox"
                        checked={newSemester.weekend_days && newSemester.weekend_days.includes(dayNum)}
                        onChange={() => toggleWeekendDay(dayNum)}
                        className="w-3 h-3 sm:w-4 sm:h-4"
                      />
                      <span className="text-xs sm:text-sm">{getWeekdayName(dayNum)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vacation Days Management */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">أيام العطل والإجازات:</label>
                
                {/* Add vacation day */}
                <div className="flex gap-1 sm:gap-2 mb-3">
                  <input
                    type="date"
                    value={newVacationDate}
                    onChange={(e) => setNewVacationDate(e.target.value)}
                    className="flex-1 p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm"
                    min={newSemester.start_date}
                    max={newSemester.end_date}
                  />
                  <button
                    type="button"
                    onClick={() => addVacationDay(newVacationDate)}
                    disabled={!newVacationDate}
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-xs sm:text-sm"
                  >
                    إضافة
                  </button>
                </div>

                {/* Vacation days list */}
                {newSemester.vacation_days && newSemester.vacation_days.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                    {newSemester.vacation_days.map(date => (
                      <div key={date} className="flex justify-between items-center py-1">
                        <span className="text-sm">
                          {new Date(date + 'T00:00:00').toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVacationDay(date)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6">
              <button
                onClick={handleAddSemester}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? "جارٍ الحفظ..." : editingSemester ? "حفظ التعديلات" : "إضافة الفصل"}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSemester(null);
                  setNewSemester({
                    name: "",
                    type: "first",
                    year: new Date().getFullYear(),
                    start_date: "",
                    end_date: "",
                    display_name: "",
                    school_id: "",
                    weekend_days: [5, 6],
                    vacation_days: []
                  });
                }}
                className="flex-1 bg-gray-500 text-white py-2 sm:py-3 rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {editingCourse ? "تعديل المقرر" : "إضافة مقرر جديد"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">اسم المقرر:</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="مثال: الحفظ الجديد"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">النسبة المئوية:</label>
                <input
                  type="number"
                  value={courseForm.percentage}
                  onChange={(e) => setCourseForm({...courseForm, percentage: parseFloat(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">الوصف:</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="وصف المقرر..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={courseForm.requires_surah}
                    onChange={(e) => setCourseForm({...courseForm, requires_surah: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">يتطلب تحديد السور والآيات</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveCourse}
                disabled={loading || !courseForm.name}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button
                onClick={() => {
                  setShowCourseModal(false);
                  setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "" });
                  setEditingCourse(null);
                }}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Semester Details Modal */}
      {showDetailsModal && detailsSemester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                تفاصيل الفصل {getSemesterTypeText(detailsSemester.type)} {detailsSemester.year}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsSemester(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Semester Status */}
              {detailsSemester.start_date && detailsSemester.end_date && (
                <div className="bg-gray-50 rounded-lg p-4">
                  {(() => {
                    const daysInfo = getDaysRemaining(detailsSemester);
                    const totalDays = calculateDays(detailsSemester.start_date, detailsSemester.end_date);
                    
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">
                            {daysInfo?.status === 'upcoming' ? '🔜' : 
                             daysInfo?.status === 'current' ? '📅' : '✅'}
                          </span>
                          <h3 className="font-semibold text-gray-700">حالة الفصل الدراسي</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <p className={`font-medium ${
                            daysInfo?.status === 'upcoming' ? 'text-blue-600' :
                            daysInfo?.status === 'current' ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {daysInfo?.text || 'غير محدد'}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">إجمالي الأيام:</span>
                              <span className="font-semibold ml-2">{totalDays || 'غير محدد'} يوم</span>
                            </div>
                            <div>
                              <span className="text-gray-600">النوع:</span>
                              <span className="font-semibold ml-2">{getSemesterTypeText(detailsSemester.type)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dates Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📆</span>
                  <h3 className="font-semibold text-gray-700">التواريخ</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ البداية:</span>
                    <span className="font-semibold">
                      {detailsSemester.start_date 
                        ? new Date(detailsSemester.start_date).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'غير محدد'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ النهاية:</span>
                    <span className="font-semibold">
                      {detailsSemester.end_date 
                        ? new Date(detailsSemester.end_date).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'غير محدد'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {detailsSemester.display_name && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📝</span>
                    <h3 className="font-semibold text-gray-700">الاسم المعروض</h3>
                  </div>
                  <p className="text-gray-700">{detailsSemester.display_name}</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsSemester(null);
                  handleEditSemester(detailsSemester);
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                تعديل الفصل
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailsSemester(null);
                }}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterManagement;