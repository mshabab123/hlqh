import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { AiOutlineEdit, AiOutlineDelete, AiOutlinePlus, AiOutlineBook, AiOutlinePercentage, AiOutlineFileText, AiOutlineEye } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const ClassCourseManagement = () => {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  
  const prevSchoolRef = useRef("");
  
  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [semestersLoading, setSemestersLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [courseForm, setCourseForm] = useState({
    name: "",
    percentage: 0,
    requires_surah: false,
    description: "",
    grade_type: null
  });

  const defaultCourses = [
    { name: "الحفظ الجديد", percentage: 40, requires_surah: true, description: "حفظ سور جديدة", grade_type: "memorization" },
    { name: "المراجعة الصغرى", percentage: 25, requires_surah: true, description: "مراجعة السور المحفوظة حديثاً", grade_type: "memorization" },
    { name: "المراجعة الكبرى", percentage: 25, requires_surah: true, description: "مراجعة جميع السور المحفوظة", grade_type: "memorization" },
    { name: "السلوك", percentage: 10, requires_surah: false, description: "تقييم السلوك والأخلاق", grade_type: "behavior" }
  ];

  // Load user data
  const [user, setUser] = useState(null);

  const loadSchools = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error("Error loading schools:", error);
      setError("فشل في تحميل المجمعات");
      setSchools([]);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    if (!selectedSchool) {
      setClasses([]);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/classes?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const classesData = response.data || [];
      setClasses(classesData);
    } catch (error) {
      console.error("Error loading classes:", error);
      setError("فشل في تحميل الحلقات");
      setClasses([]);
    }
  }, [selectedSchool]);

  const loadSemesters = useCallback(async () => {
    if (!selectedSchool) {
      setSemesters([]);
      setSemestersLoading(false);
      return;
    }

    try {
      setSemestersLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const semesterData = response.data.semesters || [];
      setSemesters(semesterData);
    } catch (error) {
      console.error("Error loading semesters:", error);
      setError("فشل في تحميل الفصول الدراسية");
      setSemesters([]);
    } finally {
      setSemestersLoading(false);
    }
  }, [selectedSchool]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // Load classes when school is selected
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Load semesters when school is selected  
  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  // Clear dependent selections only when school actually changes
  useEffect(() => {
    if (prevSchoolRef.current !== selectedSchool) {
      setSelectedClass("");
      setSelectedSemester("");
      setCourses([]);
      prevSchoolRef.current = selectedSchool;
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      loadCourses();
    } else {
      setCourses([]);
    }
  }, [selectedClass, selectedSemester]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursesWithNumberPercentages = response.data.map(course => ({
        ...course,
        percentage: parseFloat(course.percentage) || 0
      }));
      setCourses(coursesWithNumberPercentages);
      setError("");
    } catch (error) {
      console.error("Error loading courses:", error);
      setError("فشل في تحميل المقررات");
      setCourses([]);
    }
  };

  const handleSaveCourse = async () => {
    try {
      setLoading(true);
      setError("");
      
      if (!courseForm.name.trim()) {
        setError("يرجى إدخال اسم المقرر");
        return;
      }
      
      if (courseForm.percentage <= 0 || courseForm.percentage > 100) {
        setError("يجب أن تكون النسبة المئوية بين 1 و 100");
        return;
      }
      
      const token = localStorage.getItem("token");
      const courseData = {
        ...courseForm,
        class_id: selectedClass
      };

      if (editingCourse) {
        await axios.put(`${API_BASE}/api/courses/${editingCourse.id}`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess("تم تحديث المقرر بنجاح");
      } else {
        await axios.post(`${API_BASE}/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess("تم إضافة المقرر بنجاح");
      }
      
      await loadCourses();
      setShowCourseModal(false);
      setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "", grade_type: null });
      setEditingCourse(null);
    } catch (error) {
      console.error("Error saving course:", error);
      setError(error.response?.data?.message || "حدث خطأ في حفظ المقرر");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setCourseForm({
      name: course.name,
      percentage: parseFloat(course.percentage) || 0,
      requires_surah: course.requires_surah,
      description: course.description || "",
      grade_type: course.grade_type || null
    });
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!confirm(`هل أنت متأكد من حذف المقرر "${courseName}"؟\n\nتحذير: سيتم حذف جميع الدرجات المرتبطة بهذا المقرر أيضاً!`)) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess("تم حذف المقرر بنجاح");
      await loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      setError(error.response?.data?.message || "حدث خطأ في حذف المقرر");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCourses = async () => {
    if (!selectedClass || !selectedSemester) return;
    
    if (!confirm("هل تريد إنشاء المقررات الافتراضية؟\n\nسيتم إنشاء 4 مقررات أساسية.")) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      let createdCount = 0;
      
      for (const course of defaultCourses) {
        try {
          await axios.post(`${API_BASE}/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, course, {
            headers: { Authorization: `Bearer ${token}` }
          });
          createdCount++;
        } catch (err) {
          console.error(`Error creating course ${course.name}:`, err);
        }
      }
      
      setSuccess(`تم إنشاء ${createdCount} من ${defaultCourses.length} مقررات بنجاح`);
      await loadCourses();
    } catch (error) {
      console.error("Error creating default courses:", error);
      setError("حدث خطأ في إنشاء المقررات الافتراضية");
    } finally {
      setLoading(false);
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

  const getSelectedClassInfo = () => {
    const classInfo = classes.find(cls => cls.id === selectedClass);
    return classInfo ? `${classInfo.name} - ${classInfo.school_level}` : "";
  };

  const getSelectedSchoolName = () => {
    const school = schools.find(s => s.id === selectedSchool);
    return school ? school.name : "";
  };

  const getSelectedSemesterInfo = () => {
    const semester = semesters.find(s => s.id === selectedSemester);
    return semester ? `الفصل ${getSemesterTypeText(semester.type)} ${semester.year}` : "";
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <AiOutlineBook className="text-blue-600" />
              إدارة مقررات الحلقات
            </h1>
            {selectedClass && selectedSemester && (
              <button
                onClick={() => setShowClassDetails(!showClassDetails)}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <AiOutlineEye />
                {showClassDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
              </button>
            )}
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
          
          {/* Class Details */}
          {showClassDetails && selectedClass && selectedSemester && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">معلومات الحلقة المختارة:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">المجمع: </span>
                  <span className="text-gray-800">{getSelectedSchoolName()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">الحلقة: </span>
                  <span className="text-gray-800">{getSelectedClassInfo()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">الفصل الدراسي: </span>
                  <span className="text-gray-800">{getSelectedSemesterInfo()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Selection Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">المجمع:</label>
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setSelectedClass("");
                  setCourses([]);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">اختر المجمع</option>
                {schools && schools.map ? schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                )) : null}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">الحلقة:</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCourses([]);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedSchool}
              >
                <option value="">
                  {!selectedSchool ? "اختر المجمع أولاً" : "اختر الحلقة"}
                </option>
                {classes && classes.map ? classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                )) : null}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setCourses([]);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedSchool || semestersLoading}
              >
                <option value="">
                  {!selectedSchool 
                    ? "اختر المجمع أولاً" 
                    : semestersLoading
                      ? "جارٍ تحميل الفصول الدراسية..."
                      : semesters.length === 0
                        ? "لا توجد فصول دراسية لهذا المجمع"
                        : "اختر الفصل الدراسي"
                  }
                </option>
                {!semestersLoading && semesters && semesters.length > 0 && semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    الفصل {getSemesterTypeText(semester.type)} {semester.year}
                  </option>
                ))}
              </select>
              {selectedSchool && !semestersLoading && semesters.length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  لا توجد فصول دراسية متاحة لهذا المجمع. تواصل مع الإدارة لإضافة فصول دراسية.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Course Management */}
        {selectedClass && selectedSemester && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <AiOutlineFileText className="text-green-600" />
                مقررات الحلقة
              </h2>
              <div className="flex gap-3">
                {courses.length === 0 && (
                  <button
                    onClick={createDefaultCourses}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <AiOutlineBook />
                    {loading ? "جارٍ الإنشاء..." : "إنشاء المقررات الافتراضية"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "", grade_type: null });
                    setEditingCourse(null);
                    setShowCourseModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <AiOutlinePlus />
                  إضافة مقرر
                </button>
              </div>
            </div>

            {courses.length > 0 && (
              <div className="mb-6">
                <div className={`p-4 rounded-lg border-2 ${
                  getTotalPercentage() === 100 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <AiOutlinePercentage className="text-blue-600" />
                      إجمالي النسب: {getTotalPercentage()}%
                    </p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getTotalPercentage() === 100 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getTotalPercentage() === 100 ? '✓ مكتمل' : '⚠️ غير مكتمل'}
                    </span>
                  </div>
                  {getTotalPercentage() !== 100 && (
                    <p className="text-sm text-red-600 mt-1">
                      يجب أن يكون إجمالي النسب 100% للحصول على تقييم صحيح
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses && courses.map ? courses.map(course => (
                <div key={course.id} className="bg-gray-50 rounded-lg p-5 border hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <AiOutlineBook className="text-blue-600" />
                      {course.name}
                    </h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      course.percentage >= 30 ? 'bg-blue-100 text-blue-800' :
                      course.percentage >= 20 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {course.percentage}%
                    </div>
                  </div>

                  <div className="mb-2">
                    {course.class_id === selectedClass ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        نطاق المقرر: الفصل
                      </span>
                    ) : (
                      <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded">
                        نطاق المقرر: الفصل الدراسي
                      </span>
                    )}
                  </div>
                  
                  {course.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {course.grade_type && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        course.grade_type === 'memorization' ? 'bg-purple-100 text-purple-700' :
                        course.grade_type === 'behavior' ? 'bg-blue-100 text-blue-700' :
                        course.grade_type === 'exam' ? 'bg-orange-100 text-orange-700' :
                        course.grade_type === 'attendance' ? 'bg-teal-100 text-teal-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.grade_type === 'memorization' ? '📖 حفظ ومراجعة' :
                         course.grade_type === 'behavior' ? '⭐ سلوك' :
                         course.grade_type === 'exam' ? '📝 اختبار' :
                         course.grade_type === 'attendance' ? '✅ حضور' :
                         '📋 أخرى'}
                      </span>
                    )}
                    {course.requires_surah && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                        📌 يتطلب تحديد سور
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <AiOutlineEdit />
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.name)}
                      className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <AiOutlineDelete />
                      حذف
                    </button>
                  </div>
                </div>
              )) : null}
            </div>

            {courses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد مقررات</h3>
                <p className="text-gray-500 mb-6">
                  لا توجد مقررات لهذه الحلقة حالياً. يمكنك إنشاء المقررات الافتراضية أو إضافة مقرر جديد.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={createDefaultCourses}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <AiOutlineBook />
                    إنشاء المقررات الافتراضية
                  </button>
                  <button
                    onClick={() => {
                      setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "", grade_type: null });
                      setEditingCourse(null);
                      setShowCourseModal(true);
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <AiOutlinePlus />
                    إضافة مقرر جديد
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedClass && !selectedSemester && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">ابدأ بإدارة المقررات</h3>
              <p className="text-gray-500">
                اختر المجمع والحلقة والفصل الدراسي لبدء إدارة المقررات
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                {editingCourse ? (
                  <><AiOutlineEdit className="text-yellow-600" />تعديل المقرر</>
                ) : (
                  <><AiOutlinePlus className="text-green-600" />إضافة مقرر جديد</>
                )}
              </h2>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2 flex items-center gap-2">
                  <AiOutlineBook className="text-blue-600" />
                  اسم المقرر *
                </label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="مثال: الحفظ الجديد"
                  maxLength="100"
                />
                <p className="text-xs text-gray-500 mt-1">{courseForm.name.length}/100</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 flex items-center gap-2">
                  <AiOutlinePercentage className="text-green-600" />
                  النسبة المئوية *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={courseForm.percentage}
                    onChange={(e) => setCourseForm({...courseForm, percentage: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="100"
                    step="0.1"
                    placeholder="مثال: 40"
                  />
                  <span className="absolute left-3 top-3 text-gray-500">%</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>الحد الأدنى: 1%</span>
                  <span>الحد الأقصى: 100%</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 flex items-center gap-2">
                  <AiOutlineFileText className="text-purple-600" />
                  الوصف
                </label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="وصف المقرر وأهدافه..."
                  maxLength="500"
                />
                <p className="text-xs text-gray-500 mt-1">{courseForm.description.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AiOutlineFileText className="inline ml-2" />
                  نوع المقرر
                </label>
                <select
                  value={courseForm.grade_type || ""}
                  onChange={(e) => setCourseForm({...courseForm, grade_type: e.target.value || null})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر نوع المقرر...</option>
                  <option value="memorization">حفظ ومراجعة (سيظهر في اختبار القرآن)</option>
                  <option value="behavior">سلوك</option>
                  <option value="exam">اختبار</option>
                  <option value="attendance">حضور ومواظبة</option>
                  <option value="other">أخرى</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  المقررات من نوع "حفظ ومراجعة" ستظهر في اختبار القرآن
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={courseForm.requires_surah}
                    onChange={(e) => setCourseForm({...courseForm, requires_surah: e.target.checked})}
                    className="w-5 h-5 mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="text-gray-700 font-medium">يتطلب تحديد السور والآيات</span>
                    <p className="text-sm text-gray-500 mt-1">
                      فعل هذا الخيار إذا كان المقرر يتطلب تسجيل نطاق محدد من السور أو الآيات (مثل الحفظ الجديد أو المراجعة)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveCourse}
                disabled={loading || !courseForm.name.trim() || courseForm.percentage <= 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>جارٍ الحفظ...</>
                ) : (
                  <>{editingCourse ? "تحديث المقرر" : "إضافة المقرر"}</>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCourseModal(false);
                  setCourseForm({ name: "", percentage: 0, requires_surah: false, description: "", grade_type: null });
                  setEditingCourse(null);
                  setError("");
                }}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                disabled={loading}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassCourseManagement;
