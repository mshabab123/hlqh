import { useState, useEffect } from "react";
import axios from "axios";

const ClassCourseManagement = () => {
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadClasses();
      loadSemesters(); // Load semesters only for selected school
    } else {
      setSemesters([]);
      setSelectedSemester("");
      setCourses([]);
    }
    // Clear selected semester and courses when school changes
    setSelectedSemester("");
    setCourses([]);
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      loadCourses();
    } else {
      setCourses([]);
    }
  }, [selectedClass, selectedSemester]);

  const loadSchools = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/schools", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error("Error loading schools:", error);
      setSchools([]);
    }
  };

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/classes?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      setClasses([]);
    }
  };

  const loadSemesters = async () => {
    if (!selectedSchool) {
      setSemesters([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/semesters?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSemesters(response.data || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
      setSemesters([]);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, {
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

  const handleSaveCourse = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const courseData = {
        ...courseForm,
        class_id: selectedClass
      };

      if (editingCourse) {
        await axios.put(`http://localhost:5000/api/courses/${editingCourse.id}`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`http://localhost:5000/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, courseData, {
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
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("حدث خطأ في حذف المقرر");
    }
  };

  const createDefaultCourses = async () => {
    if (!selectedClass || !selectedSemester) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      for (const course of defaultCourses) {
        await axios.post(`http://localhost:5000/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, course, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      await loadCourses();
    } catch (error) {
      console.error("Error creating default courses:", error);
      alert("حدث خطأ في إنشاء المقررات الافتراضية");
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة مقررات الحلقات</h1>

          {/* Selection Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <option value="">اختر الحلقة</option>
                {classes && classes.map ? classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school_level} ({cls.semester_name})
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
                disabled={!selectedSchool || (semesters && semesters.length === 0)}
              >
                <option value="">
                  {!selectedSchool 
                    ? "اختر المجمع أولاً" 
                    : (semesters && semesters.length === 0)
                      ? "لا توجد فصول دراسية لهذا المجمع"
                      : "اختر الفصل الدراسي"
                  }
                </option>
                {semesters && semesters.map ? semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    الفصل {getSemesterTypeText(semester.type)} {semester.year}
                  </option>
                )) : null}
              </select>
            </div>
          </div>

          {/* Course Management */}
          {selectedClass && selectedSemester && (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  مقررات الحلقة
                </h2>
                <div className="flex gap-2">
                  {courses.length === 0 && (
                    <button
                      onClick={createDefaultCourses}
                      disabled={loading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? "جارٍ الإنشاء..." : "إنشاء المقررات الافتراضية"}
                    </button>
                  )}
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
              </div>

              {courses.length > 0 && (
                <div className="mb-4">
                  <p className="text-lg font-semibold">
                    إجمالي النسب: {getTotalPercentage()}%
                    <span className={getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}>
                      {getTotalPercentage() === 100 ? ' ✓' : ' (يجب أن يكون 100%)'}
                    </span>
                  </p>
                </div>
              )}

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

              {courses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لا توجد مقررات لهذه الحلقة. يمكنك إنشاء المقررات الافتراضية أو إضافة مقرر جديد.
                </div>
              )}
            </div>
          )}

          {!selectedClass && !selectedSemester && (
            <div className="text-center py-8 text-gray-500">
              اختر المجمع والحلقة والفصل الدراسي لإدارة المقررات
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default ClassCourseManagement;