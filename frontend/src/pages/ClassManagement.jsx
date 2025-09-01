import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineUser, AiOutlineBook } from "react-icons/ai";
import ClassForm from "../components/ClassForm";
import StudentListModal from "../components/StudentListModal";
import { 
  canManageClass, 
  getFilteredSchools, 
  getFilteredClasses, 
  getFilteredTeachers 
} from "../utils/classUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [selectedClassForCourses, setSelectedClassForCourses] = useState(null);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  
  // Filter states
  const [schoolFilter, setSchoolFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [newClass, setNewClass] = useState({
    name: "",
    school_id: "",
    semester_id: "",
    school_level: "",
    teacher_ids: [],
    max_students: 20,
    is_active: true
  });

  useEffect(() => {
    fetchSchools();
    fetchTeachers();
    fetchSemesters();
    fetchClasses(); // Load all classes initially
  }, []);
  
  // Reset semester filter when school changes
  useEffect(() => {
    if (schoolFilter) {
      // Check if current semester belongs to selected school
      const currentSemesterInSchool = semesters.find(s => 
        s.id === semesterFilter && s.school_id === schoolFilter
      );
      // If current semester doesn't belong to selected school, reset it
      if (semesterFilter && !currentSemesterInSchool) {
        setSemesterFilter("");
      }
    } else {
      // If no school selected, reset semester filter
      setSemesterFilter("");
    }
  }, [schoolFilter, semesters]);

  // Fetch classes when school or semester filter changes
  useEffect(() => {
    fetchClasses(schoolFilter || null, semesterFilter || null);
  }, [schoolFilter, semesterFilter]);

  const fetchCourses = async (semesterId, classId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters/${semesterId}/classes/${classId}/courses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCourses(response.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setCourses([]);
    }
  };

  const fetchClasses = async (schoolId = null, semesterId = null) => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (schoolId) {
        params.append('school_id', schoolId);
      }
      if (semesterId) {
        params.append('semester_id', semesterId);
      }
      
      const url = params.toString() 
        ? `${API_BASE}/api/classes?${params.toString()}`
        : `${API_BASE}/api/classes`;
        
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الحلقات");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSchools(response.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/teachers?user_type=teacher`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTeachers(response.data.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSemesters(response.data.semesters || []);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      // First create the class
      const response = await axios.post(`${API_BASE}/api/classes`, {
        ...newClass,
        teacher_id: newClass.teacher_ids?.length > 0 ? newClass.teacher_ids[0] : null // Keep backward compatibility
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // If we have teachers selected, assign them using the new API
      if (newClass.teacher_ids?.length > 0 && response.data.classId) {
        await axios.post(`${API_BASE}/api/classes/${response.data.classId}/teachers`, {
          teacher_ids: newClass.teacher_ids
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      setShowAddModal(false);
      setNewClass({
        name: "",
        school_id: "",
        semester_id: "",
        school_level: "",
        teacher_ids: [],
        max_students: 20,
        is_active: true
      });
      fetchClasses(schoolFilter || null, semesterFilter || null);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة الحلقة");
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      // First update the class basic info
      await axios.put(`${API_BASE}/api/classes/${editingClass.id}`, {
        ...editingClass,
        teacher_id: editingClass.teacher_ids?.length > 0 ? editingClass.teacher_ids[0] : null // Keep backward compatibility
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Update teacher assignments using the new API
      if (editingClass.teacher_ids !== undefined) {
        await axios.post(`${API_BASE}/api/classes/${editingClass.id}/teachers`, {
          teacher_ids: editingClass.teacher_ids || []
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      setEditingClass(null);
      fetchClasses(schoolFilter || null, semesterFilter || null);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث الحلقة");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفصل؟")) {
      try {
        await axios.delete(`${API_BASE}/api/classes/${classId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchClasses(schoolFilter || null, semesterFilter || null);
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف الحلقة");
      }
    }
  };

  const toggleClassStatus = async (classId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/classes/${classId}`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchClasses(schoolFilter || null, semesterFilter || null);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة الفصل");
    }
  };

  // Utility functions with current user context
  const canManageClassWithContext = (classData) => canManageClass(classData, userRole, userSchoolId);
  const getFilteredSchoolsWithContext = () => getFilteredSchools(schools, userRole, userSchoolId);
  const getFilteredClassesWithContext = () => {
    let filteredClasses = getFilteredClasses(classes, userRole, userSchoolId);
    
    // Only apply status filter client-side since school and semester are filtered server-side
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filteredClasses = filteredClasses.filter(cls => cls.is_active === isActive);
    }
    
    return filteredClasses;
  };
  const getFilteredTeachersWithContext = (schoolId) => getFilteredTeachers(teachers, schoolId);

  const handleManageCourses = (classItem) => {
    setSelectedClassForCourses(classItem);
    setShowCoursesModal(true);
    if (classItem.semester_id && classItem.id) {
      fetchCourses(classItem.semester_id, classItem.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة الحلقة</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة حلقة جديدة
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold mb-4">تصفية وبحث الحلقات</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">🏢 مجمع الحلقات</label>
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع المجمعات</option>
              {getFilteredSchoolsWithContext().map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">📅 الفصل الدراسي</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              disabled={!schoolFilter}
              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !schoolFilter ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">
                {schoolFilter ? 'جميع فصول هذا المجمع' : 'اختر المجمع أولاً'}
              </option>
              {semesters
                .filter(semester => schoolFilter && semester.school_id === schoolFilter)
                .map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.display_name || `الفصل ${semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} ${semester.year}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">⚡ حالة الحلقة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
        
        {/* Filter Results Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              📊 عرض <span className="font-semibold text-blue-600">{getFilteredClassesWithContext().length}</span> من أصل <span className="font-semibold">{classes.length}</span> حلقة
            </div>
            {(schoolFilter || semesterFilter || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSchoolFilter('');
                  setSemesterFilter('');
                  setStatusFilter('all');
                }}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                مسح جميع المرشحات
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getFilteredClassesWithContext().map((classItem) => {
          const semester = semesters.find(s => s.id === classItem.semester_id);
          const assignedTeachers = classItem.assigned_teacher_names || [];
          const legacyTeacher = classItem.teacher_name;
          
          return (
            <div key={classItem.id} className="bg-white rounded-xl shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{classItem.name}</h3>
                    <p className="text-blue-100 text-sm">{classItem.school_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    classItem.is_active 
                      ? 'bg-green-400 text-white' 
                      : 'bg-red-400 text-white'
                  }`}>
                    {classItem.is_active ? '✓ نشط' : '✗ غير نشط'}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Semester */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">📅 الفصل الدراسي</div>
                    <div className="text-sm font-medium">
                      {semester ? (
                        <span>الفصل {semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} {semester.year}</span>
                      ) : (
                        <span className="text-orange-600">غير محدد</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Students */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">🎓 الطلاب</div>
                    <div className="text-sm font-medium">حتى {classItem.max_students} طالب</div>
                  </div>
                </div>
                
                {/* Teachers Section */}
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">👨‍🏫 المعلمون</div>
                  {assignedTeachers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {assignedTeachers.slice(0, 2).map((teacherName, index) => (
                        <span 
                          key={index} 
                          className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {teacherName.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                      {assignedTeachers.length > 2 && (
                        <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                          +{assignedTeachers.length - 2} آخرين
                        </span>
                      )}
                    </div>
                  ) : legacyTeacher ? (
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {legacyTeacher.split(' ').slice(0, 2).join(' ')}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">لم يتم التعيين</span>
                  )}
                </div>
                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Primary Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedClassForStudents(classItem)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-1 justify-center"
                    >
                      <AiOutlineUser /> الطلاب
                    </button>
                    
                    <button
                      onClick={() => handleManageCourses(classItem)}
                      className="flex items-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex-1 justify-center"
                    >
                      <AiOutlineBook /> المقررات
                    </button>
                  </div>
                  
                  {/* Secondary Actions */}
                  {canManageClassWithContext(classItem) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingClass({
                          ...classItem,
                          teacher_ids: classItem.assigned_teacher_ids || []
                        })}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex-1 justify-center"
                      >
                        <AiOutlineEdit /> تعديل
                      </button>
                      
                      <button
                        onClick={() => toggleClassStatus(classItem.id, classItem.is_active)}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-white text-sm flex-1 justify-center ${
                          classItem.is_active 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {classItem.is_active ? '⏸️' : '▶️'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteClass(classItem.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex-1 justify-center"
                      >
                        <AiOutlineDelete />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {getFilteredClassesWithContext().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد حلقات مسجلة</p>
        </div>
      )}

      {showAddModal && (
        <ClassForm
          classData={newClass}
          onSubmit={handleAddClass}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onClassChange={setNewClass}
          schools={schools}
          teachers={teachers}
          semesters={semesters}
          getFilteredSchools={getFilteredSchoolsWithContext}
          getFilteredTeachers={getFilteredTeachersWithContext}
        />
      )}

      {editingClass && (
        <ClassForm
          classData={editingClass}
          onSubmit={handleEditClass}
          onCancel={() => setEditingClass(null)}
          isEditing={true}
          onClassChange={setEditingClass}
          schools={schools}
          teachers={teachers}
          semesters={semesters}
          getFilteredSchools={getFilteredSchoolsWithContext}
          getFilteredTeachers={getFilteredTeachersWithContext}
        />
      )}

      {selectedClassForStudents && (
        <StudentListModal
          classItem={selectedClassForStudents}
          onClose={() => setSelectedClassForStudents(null)}
        />
      )}

      {showCoursesModal && selectedClassForCourses && (
        <CourseManagementModal
          classItem={selectedClassForCourses}
          courses={courses}
          semesters={semesters}
          onClose={() => {
            setShowCoursesModal(false);
            setSelectedClassForCourses(null);
            setCourses([]);
          }}
          onRefresh={(newSemesterId) => {
            const semesterIdToUse = newSemesterId || selectedClassForCourses.semester_id;
            if (semesterIdToUse && selectedClassForCourses.id) {
              setCourses([]); // Clear courses first
              fetchCourses(semesterIdToUse, selectedClassForCourses.id);
            }
          }}
        />
      )}
    </div>
  );
}

// CourseManagementModal Component
const CourseManagementModal = ({ classItem, courses, semesters, onClose, onRefresh }) => {
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState(classItem.semester_id);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({
    name: "",
    percentage: 0,
    requires_surah: false,
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  
  // Get current semester info
  const currentSemester = semesters.find(s => s.id == selectedSemesterId);


  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المقرر؟')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh(selectedSemesterId);
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('فشل في حذف المقرر');
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setNewCourse({
      name: course.name,
      percentage: course.percentage,
      requires_surah: course.requires_surah,
      description: course.description || ""
    });
    setShowAddCourseForm(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingCourse) {
        // Update existing course
        await axios.put(`${API_BASE}/api/courses/${editingCourse.id}`, {
          ...newCourse,
          school_id: classItem.school_id,
          class_id: classItem.id,
          semester_id: selectedSemesterId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Add new course
        await axios.post(`${API_BASE}/api/semesters/${selectedSemesterId}/classes/${classItem.id}/courses`, {
          ...newCourse
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Reset form
      setNewCourse({
        name: "",
        percentage: 0,
        requires_surah: false,
        description: ""
      });
      setEditingCourse(null);
      setShowAddCourseForm(false);
      onRefresh(selectedSemesterId);
    } catch (error) {
      console.error('Error saving course:', error);
      alert((editingCourse ? 'فشل في تحديث المقرر: ' : 'فشل في إضافة المقرر: ') + (error.response?.data?.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingCourse(null);
    setShowAddCourseForm(false);
    setNewCourse({
      name: "",
      percentage: 0,
      requires_surah: false,
      description: ""
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-5xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-primary-700)] mb-2">
              📚 إدارة مقررات الحلقة
            </h3>
            <div className="text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                🏢 {classItem.school_name}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">
                🎓 {classItem.name}
              </span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                📅 {currentSemester ? `الفصل ${currentSemester.type === 'first' ? 'الأول' : currentSemester.type === 'second' ? 'الثاني' : 'الصيفي'} ${currentSemester.year}` : 'غير محدد'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Semester Selection & Stats */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">📅 اختر الفصل الدراسي</label>
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  onRefresh(e.target.value);
                  setShowAddCourseForm(false);
                  setEditingCourse(null);
                }}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الفصل الدراسي</option>
                {semesters
                  .filter(semester => semester.school_id == classItem.school_id)
                  .map(semester => (
                  <option key={semester.id} value={semester.id}>
                    الفصل {semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} {semester.year}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedSemesterId && (
              <div className="flex items-center">
                <div className="bg-white p-3 rounded-lg border w-full">
                  <div className="text-sm text-gray-600">إحصائيات المقررات</div>
                  <div className="text-lg font-bold text-blue-600">
                    {courses.length} مقرر
                  </div>
                  <div className="text-xs text-gray-500">
                    {courses.reduce((sum, course) => sum + (course.percentage || 0), 0)}% مجموع النسب
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setEditingCourse(null);
              setShowAddCourseForm(!showAddCourseForm);
            }}
            disabled={!selectedSemesterId}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AiOutlinePlus /> إضافة مقرر جديد
          </button>
          
          {!selectedSemesterId && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm">
              ⚠️ يرجى اختيار فصل دراسي أولاً
            </div>
          )}
          
          {selectedSemesterId && courses.length > 0 && (
            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm">
              ℹ️ انقر على مقرر لتعديله
            </div>
          )}
        </div>

        {/* Add/Edit Course Form */}
        {showAddCourseForm && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-blue-800">
                {editingCourse ? '✏️ تعديل المقرر' : '➕ إضافة مقرر جديد'}
              </h4>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم المقرر *</label>
                  <input
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">النسبة المئوية *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCourse.percentage}
                    onChange={(e) => setNewCourse({...newCourse, percentage: parseFloat(e.target.value)})}
                    className="w-full p-3 border rounded-lg"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full p-3 border rounded-lg"
                  rows="2"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newCourse.requires_surah}
                  onChange={(e) => setNewCourse({...newCourse, requires_surah: e.target.checked})}
                  className="rounded"
                />
                <label className="text-sm">يتطلب حفظ سورة</label>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : (editingCourse ? 'تحديث المقرر' : 'حفظ المقرر')}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Courses List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold">
              📚 المقررات الحالية ({courses.length})
            </h4>
            {selectedSemesterId && courses.length > 0 && (
              <div className="text-sm text-gray-600">
                مجموع النسب: {courses.reduce((sum, course) => sum + (course.percentage || 0), 0)}%
              </div>
            )}
          </div>
          
          {coursesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل المقررات...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 text-lg mb-2">
                {selectedSemesterId ? 
                  `لا توجد مقررات لهذه الحلقة في هذا الفصل` : 
                  "يرجى اختيار فصل دراسي لعرض المقررات"
                }
              </p>
              {selectedSemesterId && (
                <p className="text-sm text-gray-400">ابدأ بإضافة مقرر جديد باستخدام الزر أعلاه</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {courses.map((course, index) => (
                <div key={course.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                          #{index + 1}
                        </span>
                        <h5 className="font-semibold text-lg">{course.name}</h5>
                        {course.requires_surah && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            📜 يتطلب حفظ سورة
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm text-gray-600">
                          📊 النسبة: <span className="font-medium text-green-600">{course.percentage}%</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          متوقع: {Math.round((course.percentage / 100) * 100)} نقطة
                        </span>
                      </div>
                      
                      {course.description && (
                        <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                          🗎 {course.description}
                        </p>
                      )}
                      
                      {course.semester_id && course.semester_id != selectedSemesterId && (
                        <div className="mt-2">
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            ⚠️ هذا المقرر من فصل دراسي آخر
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        title="تعديل المقرر"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                        title="حذف المقرر"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Summary */}
        {selectedSemesterId && (
          <div className="mt-6 pt-4 border-t bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-gray-600">إجمالي المقررات</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {courses.reduce((sum, course) => sum + (course.percentage || 0), 0)}%
                </div>
                <div className="text-sm text-gray-600">مجموع النسب المئوية</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {courses.filter(c => c.requires_surah).length}
                </div>
                <div className="text-sm text-gray-600">مقررات تتطلب حفظ</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};