import { useState, useEffect, Fragment } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineUser, AiOutlineBook, AiOutlineReload, AiOutlineStar, AiOutlineFileText, AiOutlineBarChart, AiOutlineCopy } from "react-icons/ai";
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
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [selectedClassForCourses, setSelectedClassForCourses] = useState(null);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [selectedClassForGrades, setSelectedClassForGrades] = useState(null);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedClassForPoints, setSelectedClassForPoints] = useState(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceSemester, setCopySourceSemester] = useState("");
  const [copyTargetSemester, setCopyTargetSemester] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [userRole, setUserRole] = useState(storedUser.role || storedUser.user_type || "admin");
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  const [showExtraClasses, setShowExtraClasses] = useState(() => {
    const stored = localStorage.getItem("teacher_extra_classes_visible");
    return stored ? stored === "true" : true;
  });
  
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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || user.user_type || "admin");
  }, []);

  useEffect(() => {
    if (userRole === "teacher") {
      fetchTeacherClasses();
      return;
    }
    fetchSchools();
    fetchTeachers();
    fetchSemesters();
    fetchClasses(); // Load all classes initially
  }, [userRole]);
  
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
    if (userRole === "teacher") return;
    fetchClasses(schoolFilter || null, semesterFilter || null);
  }, [schoolFilter, semesterFilter, userRole]);

  useEffect(() => {
    if (userRole !== "teacher") return;
    localStorage.setItem("teacher_extra_classes_visible", String(showExtraClasses));
  }, [showExtraClasses, userRole]);

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

  const fetchTeacherClasses = async () => {
    try {
      setTeacherLoading(true);
      setTeacherError("");
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/teachers/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = response.data?.classes || [];
      const normalized = Array.isArray(list)
        ? list.map((item) => ({
            ...item,
            student_count: item.student_count ?? item.enrolled_students ?? 0,
          }))
        : [];
      setTeacherClasses(normalized);
    } catch (err) {
      setTeacherError(err.response?.data?.error || "فشل في تحميل الحلقات للمعلم");
    } finally {
      setTeacherLoading(false);
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
      // Add timestamp to prevent caching
      const response = await axios.get(`${API_BASE}/api/teachers?user_type=teacher&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
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

  const handleAddClass = async (e, dataToSubmit) => {
    e.preventDefault();
    const classData = dataToSubmit || newClass;
    
    try {
      // First create the class
      const response = await axios.post(`${API_BASE}/api/classes`, {
        ...classData,
        teacher_id: classData.teacher_ids?.length > 0 ? classData.teacher_ids[0] : null // Keep backward compatibility
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // If we have teachers selected, assign them using the new API with primary teacher
      if (classData.teacher_ids?.length > 0 && response.data.classId) {
        await axios.post(`${API_BASE}/api/classes/${response.data.classId}/teachers`, {
          teacher_ids: classData.teacher_ids,
          primary_teacher_id: classData.primary_teacher_id || classData.teacher_ids[0]
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
      fetchTeachers(); // Refresh teachers to update their assignments
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة الحلقة");
    }
  };

  const handleEditClass = async (e, dataToSubmit) => {
    e.preventDefault();
    const classData = dataToSubmit || editingClass;
    
    try {
      // First update the class basic info
      await axios.put(`${API_BASE}/api/classes/${classData.id}`, {
        ...classData,
        teacher_id: classData.teacher_ids?.length > 0 ? classData.teacher_ids[0] : null // Keep backward compatibility
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Update teacher assignments using the new API with primary teacher
      if (classData.teacher_ids !== undefined) {
        await axios.post(`${API_BASE}/api/classes/${classData.id}/teachers`, {
          teacher_ids: classData.teacher_ids || [],
          primary_teacher_id: classData.primary_teacher_id || classData.teacher_ids?.[0]
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      setEditingClass(null);
      fetchClasses(schoolFilter || null, semesterFilter || null);
      fetchTeachers(); // Refresh teachers to update their assignments
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

  const handleCopySemester = async () => {
    setCopyError("");
    setCopySuccess("");

    if (!copySourceSemester || !copyTargetSemester) {
      setCopyError("يرجى اختيار الفصل المصدر والفصل الهدف.");
      return;
    }

    if (copySourceSemester === copyTargetSemester) {
      setCopyError("الفصل المصدر والهدف يجب أن يكونا مختلفين.");
      return;
    }

    if (!window.confirm("هل تريد نسخ جميع الحلقات للفصل الهدف بدون الدرجات؟")) {
      return;
    }

    try {
      setCopyLoading(true);
      await axios.post(`${API_BASE}/api/classes/copy-semester`, {
        source_semester_id: copySourceSemester,
        target_semester_id: copyTargetSemester,
        copy_students: false,
        copy_teachers: false
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setCopySuccess("تم نسخ الحلقات بنجاح بدون الدرجات.");
      setShowCopyModal(false);
      setCopySourceSemester("");
      setCopyTargetSemester("");
      fetchClasses(schoolFilter || null, semesterFilter || null);
    } catch (err) {
      setCopyError(err.response?.data?.error || "فشل في نسخ الحلقات.");
    } finally {
      setCopyLoading(false);
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

  if (userRole === "teacher") {
    const primaryClasses = teacherClasses.filter((item) => item.teacher_role === "primary");
    const extraClasses = teacherClasses.filter((item) => item.teacher_role !== "primary");

    const renderTeacherClassCard = (classItem, isExtra) => (
      <div key={classItem.id} className="bg-white rounded-xl shadow-lg border-0 hover:shadow-xl transition-shadow duration-300">
        <div className={`bg-gradient-to-r ${isExtra ? "from-amber-500 to-orange-500" : "from-blue-500 to-purple-600"} text-white p-4 rounded-t-xl`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold mb-1">{classItem.name}</h3>
              <p className="text-blue-100 text-sm">{classItem.school_name}</p>
            </div>
            {isExtra && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-200 text-amber-800">
                إضافية
              </span>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">الفصل الدراسي</div>
              <div className="text-sm font-medium">{classItem.semester_name || "-"}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">الطلاب</div>
              <div className="text-sm font-medium">
                {classItem.student_count ?? 0}{classItem.max_students ? ` / ${classItem.max_students}` : ""}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="text-xs text-gray-500 mb-1">المعلم</div>
            <div className="text-sm font-medium">{classItem.teacher_name || "-"}</div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedClassForStudents(classItem)}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-1 justify-center"
              >
                <AiOutlineUser className="text-lg" /> الطلاب
              </button>

              {!isExtra && (
                <>
                  <button
                    onClick={() => handleManageCourses(classItem)}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex-1 justify-center"
                  >
                    <AiOutlineBook className="text-lg" /> المقررات
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClassForGrades(classItem);
                      setShowGradesModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 justify-center"
                  >
                    <AiOutlineFileText className="text-lg" /> الدرجات
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClassForPoints(classItem);
                      setShowPointsModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex-1 justify-center"
                  >
                    <AiOutlineStar className="text-lg" /> النقاط
                  </button>

                  <button
                    onClick={() => {
                      const semesterParam = classItem.semester_id ? `&semester_id=${classItem.semester_id}` : "";
                      window.location.href = `/points-management?class_id=${classItem.id}${semesterParam}`;
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex-1 justify-center"
                  >
                    <AiOutlineStar className="text-lg" /> إدارة النقاط
                  </button>

                  <button
                    onClick={() => {
                      const semesterParam = classItem.semester_id ? `&semester_id=${classItem.semester_id}` : "";
                      window.location.href = `/points-reports?class_id=${classItem.id}${semesterParam}`;
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex-1 justify-center"
                  >
                    <AiOutlineBarChart className="text-lg" /> تقارير النقاط
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="container mx-auto px-4 py-6" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">حلقاتي</h1>
            <p className="text-gray-600">
             اخي المعلم،نسأل الله لك التوفيق والسداد في مهمتك العظيمة.
            </p>
          </div>

          {teacherError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {teacherError}
            </div>
          )}

          {teacherLoading ? (
            <div className="text-center py-8 text-gray-600">جاري تحميل الحلقات...</div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">الحلقات الأساسية</h2>
                {primaryClasses.length === 0 ? (
                  <div className="text-gray-500">لا توجد حلقات أساسية.</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {primaryClasses.map((classItem) => renderTeacherClassCard(classItem, false))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">الحلقات الإضافية</h2>
                  <button
                    type="button"
                    onClick={() => setShowExtraClasses((prev) => !prev)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showExtraClasses ? "إخفاء" : "إظهار"}
                  </button>
                </div>
                {showExtraClasses ? (
                  extraClasses.length === 0 ? (
                    <div className="text-gray-500">لا توجد حلقات إضافية.</div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {extraClasses.map((classItem) => renderTeacherClassCard(classItem, true))}
                    </div>
                  )
                ) : null}
              </div>
            </>
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
              readOnly
              onClose={() => {
                setShowCoursesModal(false);
                setSelectedClassForCourses(null);
                setCourses([]);
              }}
              onRefresh={(newSemesterId) => {
                const semesterIdToUse = newSemesterId || selectedClassForCourses.semester_id;
                if (semesterIdToUse && selectedClassForCourses.id) {
                  setCourses([]);
                  fetchCourses(semesterIdToUse, selectedClassForCourses.id);
                }
              }}
            />
          )}

          {showGradesModal && selectedClassForGrades && (
            <ClassGradesModal
              classItem={selectedClassForGrades}
              onClose={() => {
                setShowGradesModal(false);
                setSelectedClassForGrades(null);
              }}
            />
          )}

          {showPointsModal && selectedClassForPoints && (
            <ClassPointsModal
              classItem={selectedClassForPoints}
              onClose={() => {
                setShowPointsModal(false);
                setSelectedClassForPoints(null);
              }}
            />
          )}
        </div>
      </div>
    );
  }

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
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchTeachers();
              fetchClasses(schoolFilter || null, semesterFilter || null);
            }}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            title="تحديث قائمة المعلمين والحلقات"
          >
            <AiOutlineReload /> تحديث
          </button>
          {["admin", "administrator"].includes(userRole) && (
            <button
              onClick={() => {
                setCopyError("");
                setCopySuccess("");
                setShowCopyModal(true);
              }}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600"
            >
              <AiOutlineCopy /> نسخ الحلقات
            </button>
          )}
          <button
            onClick={() => {
              fetchTeachers(); // Refresh teachers before opening modal
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
          >
            <AiOutlinePlus /> إضافة حلقة جديدة
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {copySuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {copySuccess}
        </div>
      )}

      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-lg w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">نسخ الحلقات إلى فصل آخر</h3>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              سيتم نسخ الحلقات مع الطلاب والمعلمين ومقررات الحلقات فقط بدون الدرجات.
            </p>

            {copyError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {copyError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الفصل المصدر</label>
                <select
                  value={copySourceSemester}
                  onChange={(e) => setCopySourceSemester(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الفصل</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {(semester.display_name || `الفصل ${semester.year}`)}{semester.school_name ? ` - ${semester.school_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الفصل الهدف</label>
                <select
                  value={copyTargetSemester}
                  onChange={(e) => setCopyTargetSemester(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الفصل</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {(semester.display_name || `الفصل ${semester.year}`)}{semester.school_name ? ` - ${semester.school_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCopySemester}
                disabled={copyLoading}
                className={`px-4 py-2 rounded-lg text-white ${copyLoading ? "bg-amber-400" : "bg-amber-500 hover:bg-amber-600"}`}
              >
                {copyLoading ? "جار النسخ..." : "نسخ الآن"}
              </button>
            </div>
          </div>
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
                    <div className="text-sm font-medium">
                      {classItem.current_students || 0} / {classItem.max_students} طالب
                    </div>
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
                  <div className="grid grid-cols-2 gap-2">
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

                    <button
                      onClick={() => {
                        setSelectedClassForGrades(classItem);
                        setShowGradesModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 justify-center"
                    >
                      <AiOutlineFileText /> {"الدرجات"}
                    </button>

                    <button
                      onClick={() => {
                        const semesterParam = classItem.semester_id ? `&semester_id=${classItem.semester_id}` : "";
                        window.location.href = `/points-management?class_id=${classItem.id}${semesterParam}`;
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex-1 justify-center"
                      title="إدارة النقاط"
                    >
                      <AiOutlineStar /> النقاط
                    </button>
                  </div>
                  
                  {/* Secondary Actions */}
                  {canManageClassWithContext(classItem) && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetchTeachers(); // Refresh teachers before editing
                          
                          // Extract primary teacher from teachers_with_roles if available
                          let primaryTeacherId = null;
                          if (classItem.teachers_with_roles && Array.isArray(classItem.teachers_with_roles)) {
                            const primaryTeacher = classItem.teachers_with_roles.find(t => t.role === 'primary');
                            primaryTeacherId = primaryTeacher?.id || classItem.assigned_teacher_ids?.[0];
                          }
                          
                          setEditingClass({
                            ...classItem,
                            teacher_ids: classItem.assigned_teacher_ids || [],
                            primary_teacher_id: primaryTeacherId
                          });
                        }}
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

      {showGradesModal && selectedClassForGrades && (
        <ClassGradesModal
          classItem={selectedClassForGrades}
          onClose={() => {
            setShowGradesModal(false);
            setSelectedClassForGrades(null);
          }}
        />
      )}
    </div>
  );
}

// CourseManagementModal Component
const CourseManagementModal = ({ classItem, courses, semesters, readOnly = false, onClose, onRefresh }) => {
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
            {!readOnly && (
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
            )}
            
            {!readOnly && selectedSemesterId && (
              <div className="flex items-center">
                <div className="bg-white p-3 rounded-lg border w-full">
                  <div className="text-sm text-gray-600">إحصائيات المقررات</div>
                  <div className="text-lg font-bold text-blue-600">
                    {courses.length} مقرر
                  </div>
                  <div className="text-xs text-gray-500">
                    {courses.reduce((sum, course) => sum + (parseFloat(course.percentage) || 0), 0)}% مجموع النسب
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!readOnly && (
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
        )}

        {/* Add/Edit Course Form */}
        {!readOnly && showAddCourseForm && (
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
                مجموع النسب: {courses.reduce((sum, course) => sum + (parseFloat(course.percentage) || 0), 0)}%
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
                    
                    {!readOnly && (
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
                    )}
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
                  {courses.reduce((sum, course) => sum + (parseFloat(course.percentage) || 0), 0)}%
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

const ClassGradesModal = ({ classItem, onClose }) => {
  const [grades, setGrades] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        const [classRes, gradesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/classes/${classItem.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/classes/${classItem.id}/grades-summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setClassInfo(classRes.data || null);
        setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);

        const semesterId = classRes.data?.semester_id;
        if (semesterId) {
          const coursesRes = await axios.get(
            `${API_BASE}/api/semesters/${semesterId}/classes/${classItem.id}/courses`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error("Error loading class grades:", err);
        setError("حدث خطأ في تحميل الدرجات.");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [classItem.id]);

  const courseNames = courses.length
    ? courses.map((course) => course.name)
    : Array.from(new Set(grades.map((row) => row.course_name)));
  const coursePercentages = new Map();
  courses.forEach((course) => {
    coursePercentages.set(course.name, Number(course.percentage) || 0);
  });
  const studentMap = new Map();
  const courseTotals = new Map();
  const attendanceCourseName = "المواظبة";
  const getColumnClass = (index) => (index % 2 === 0 ? "bg-slate-50/70" : "bg-white");
  const getRatingLabel = (value) => {
    if (value === null || value === undefined) return "-";
    if (value >= 90) return "ممتاز";
    if (value >= 80) return "جيد جدا";
    if (value >= 70) return "جيد";
    if (value >= 60) return "مقبول";
    return "ضعيف";
  };

  grades.forEach((row) => {
    const studentId = row.student_id;
    const name = `${row.first_name} ${row.second_name || ""} ${row.third_name || ""} ${row.last_name}`.replace(/\s+/g, " ").trim();
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, { name, courses: {}, presentCount: null, totalDays: null, absentCount: null });
    }
    const entry = studentMap.get(studentId);
    const key = row.course_name;
    if (!coursePercentages.has(key) && row.course_percentage !== undefined && row.course_percentage !== null) {
      coursePercentages.set(key, Number(row.course_percentage) || 0);
    }
    if (!entry.courses[key]) {
      entry.courses[key] = { sum: 0, count: 0, values: [] };
    }
    if (!courseTotals.has(key)) {
      courseTotals.set(key, { sum: 0, count: 0 });
    }
    if (row.percentage_score !== null && row.percentage_score !== undefined) {
      const value = Number(row.percentage_score);
      entry.courses[key].sum += value;
      entry.courses[key].count += 1;
      entry.courses[key].values.push(value);
      courseTotals.get(key).sum += value;
      courseTotals.get(key).count += 1;
    }
    if (entry.presentCount === null && row.present_count !== undefined && row.present_count !== null) {
      entry.presentCount = Number(row.present_count);
    }
    if (entry.totalDays === null && row.total_days !== undefined && row.total_days !== null) {
      entry.totalDays = Number(row.total_days);
    }
    if (entry.absentCount === null && row.absent_count !== undefined && row.absent_count !== null) {
      entry.absentCount = Number(row.absent_count);
    }
  });

  const students = Array.from(studentMap.entries()).map(([studentId, data]) => {
    const attendancePct =
      data.totalDays && data.totalDays > 0 && data.presentCount !== null
        ? (data.presentCount / data.totalDays) * 100
        : null;
    const averages = courseNames.map((course) => {
      if (course === attendanceCourseName) {
        return attendancePct;
      }
      const stats = data.courses[course];
      if (!stats || stats.count === 0) {
        return course === "السلوك" ? null : null;
      }
      return stats.sum / stats.count;
    });
    const valid = averages.filter((v) => v !== null);
    const weightedTotal = courseNames.reduce((sum, course, idx) => {
      const avg = averages[idx];
      const weight = coursePercentages.get(course) || 0;
      if (avg === null) return sum;
      return sum + (avg * weight) / 100;
    }, 0);
    const totalSum = valid.length ? weightedTotal : null;
    return { studentId, name: data.name, averages, totalSum, attendancePct, absentCount: data.absentCount };
  });

  const sortedStudents = [...students].sort((a, b) => {
    if (a.totalSum === null && b.totalSum === null) return 0;
    if (a.totalSum === null) return 1;
    if (b.totalSum === null) return -1;
    return b.totalSum - a.totalSum;
  });

  const courseAverages = courseNames.map((course) => {
    if (course === attendanceCourseName) {
      const values = students
        .map((student) => student.attendancePct)
        .filter((value) => value !== null);
      if (!values.length) {
        return null;
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      return total / values.length;
    }
    const stats = courseTotals.get(course);
    if (!stats || stats.count === 0) {
      return course === "السلوك" ? null : null;
    }
    return stats.sum / stats.count;
  });

  const handleExportToExcel = () => {

    const tableHeaders = [
      "الطالب",
      ...courseNames.flatMap((course) => {
        const percentage = coursePercentages.get(course) || 0;
        const percentageLabel = Number.isInteger(percentage)
          ? percentage
          : percentage.toFixed(1);
        return [course, `${course} موزون (${percentageLabel})`];
      }),
      "أيام الغياب",
      "الإجمالي",
      "التقدير",
    ];

    const rows = sortedStudents.map((student) => {
      const courseCells = courseNames.flatMap((course, idx) => {
        const avg = student.averages[idx];
        const weight = coursePercentages.get(course) || 0;
        const weighted = avg !== null ? (avg * weight) / 100 : null;
        return [
          avg !== null ? avg.toFixed(1) : "-",
          weighted !== null ? weighted.toFixed(1) : "-",
        ];
      });
      return [
        student.name,
        ...courseCells,
        student.absentCount !== null ? student.absentCount : "-",
        student.totalSum !== null ? student.totalSum.toFixed(1) : "-",
        getRatingLabel(student.totalSum),
      ];
    });

    const headerRows = [
      ["مجمع الحلقات", classInfo?.school_name || "-"],
      ["المعلم", classInfo?.teacher_name || "-"],
      ["الحلقة", classInfo?.name || classItem.name],
      [],
    ];

    const allRows = [...headerRows, tableHeaders, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    XLSX.writeFile(workbook, "class-grades.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 rounded-lg">
          <div>
            <h3 className="text-xl font-bold mb-1">{"درجات الحلقة"}</h3>
            <div className="text-sm text-slate-200">
              {classInfo?.name || classItem.name}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {"مجمع الحلقات: "} {classInfo?.school_name || "-"} {" | "}
              {"المعلم: "} {classInfo?.teacher_name || "-"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportToExcel}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow mr-3"
          >
            {"تصدير إكسل"}
          </button>
          <button
            onClick={onClose}
            className="text-slate-200 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">
            {"جاري تحميل الدرجات..."}
          </div>
        ) : courseNames.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {"لا توجد درجات بعد."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-right border">
              <thead className="bg-slate-50">
                <tr className="border-b">
                  <th className={`py-3 px-3 text-gray-700 ${getColumnClass(0)}`}>
                    {"الطالب"}
                  </th>
                  {courseNames.map((course, courseIndex) => (
                    <Fragment key={course}>
                      <th className={`py-3 px-3 text-gray-700 ${getColumnClass(1 + courseIndex * 2)}`}>
                        {course}
                      </th>
                      <th className={`py-3 px-3 text-gray-700 ${getColumnClass(1 + courseIndex * 2 + 1)}`}>
                        {course} {"موزون"}
                        {coursePercentages.has(course) && (
                          <span className="text-xs text-gray-500">
                            {" ("}
                            {Number.isInteger(coursePercentages.get(course))
                              ? coursePercentages.get(course)
                              : (coursePercentages.get(course) || 0).toFixed(1)}
                            {")"}
                          </span>
                        )}
                      </th>
                    </Fragment>
                  ))}
                  <th className={`py-3 px-3 text-gray-700 ${getColumnClass(1 + courseNames.length * 2)}`}>
                    {"أيام الغياب"}
                  </th>
                  <th className={`py-3 px-3 text-gray-700 ${getColumnClass(2 + courseNames.length * 2)}`}>
                    {"الإجمالي"}
                  </th>
                  <th className={`py-3 px-3 text-gray-700 ${getColumnClass(3 + courseNames.length * 2)}`}>
                    {"التقدير"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => (
                  <tr key={student.studentId} className="border-b last:border-0">
                    <td className={`py-2 px-3 font-medium text-slate-800 ${getColumnClass(0)}`}>
                      {student.name}
                    </td>
                    {courseNames.map((course, idx) => {
                      const stats = studentMap.get(student.studentId)?.courses[course];
                      const avg =
                        course === attendanceCourseName
                          ? student.attendancePct
                          : stats && stats.count > 0
                            ? (stats.sum / stats.count)
                            : course === "السلوك"
                              ? null
                              : null;
                      const weight = coursePercentages.get(course) || 0;
                      const weighted = avg !== null ? (avg * weight) / 100 : null;
                      return (
                        <Fragment key={course}>
                          <td className={`py-2 px-3 text-gray-700 ${getColumnClass(1 + idx * 2)}`}>
                            {avg !== null ? avg.toFixed(1) : "-"}
                          </td>
                          <td className={`py-2 px-3 text-gray-700 ${getColumnClass(1 + idx * 2 + 1)}`}>
                            {weighted !== null ? weighted.toFixed(1) : "-"}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td className={`py-2 px-3 text-slate-700 text-center ${getColumnClass(1 + courseNames.length * 2)}`}>
                      {student.absentCount !== null ? student.absentCount : "-"}
                    </td>
                    <td className={`py-2 px-3 text-slate-700 font-semibold ${getColumnClass(2 + courseNames.length * 2)}`}>
                      {student.totalSum !== null ? student.totalSum.toFixed(1) : "-"}
                    </td>
                    <td className={`py-2 px-3 text-slate-700 font-semibold ${getColumnClass(3 + courseNames.length * 2)}`}>
                      {getRatingLabel(student.totalSum)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-slate-50">
                  <td className={`py-2 px-3 font-semibold text-slate-700 ${getColumnClass(0)}`}>
                    {"متوسط المقرر"}
                  </td>
                  {courseAverages.map((avg, idx) => {
                    const course = courseNames[idx];
                    const weight = coursePercentages.get(course) || 0;
                    const weightedAvg = avg !== null ? (avg * weight) / 100 : null;
                    return (
                      <Fragment key={course}>
                        <td className={`py-2 px-3 text-slate-700 ${getColumnClass(1 + idx * 2)}`}>
                          {avg !== null ? avg.toFixed(1) : "-"}
                        </td>
                        <td className={`py-2 px-3 text-slate-700 ${getColumnClass(1 + idx * 2 + 1)}`}>
                          {weightedAvg !== null ? weightedAvg.toFixed(1) : "-"}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className={`py-2 px-3 text-gray-500 ${getColumnClass(1 + courseNames.length * 2)}`}>-</td>
                  <td className={`py-2 px-3 text-gray-500 ${getColumnClass(2 + courseNames.length * 2)}`}>-</td>
                  <td className={`py-2 px-3 text-gray-500 ${getColumnClass(3 + courseNames.length * 2)}`}>-</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-3 text-xs text-gray-500">
              {"تم حساب المتوسط باعتبار جميع الدرجات المسجلة لكل مقرر."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

  const ClassPointsModal = ({ classItem, onClose }) => {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (classItem.semester_id) {
        params.append("semester_id", classItem.semester_id);
      }
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      params.append("limit", "10000");
      const response = await axios.get(
        `${API_BASE}/api/points/class/${classItem.id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPoints(response.data?.points || []);
    } catch (err) {
      console.error("Error loading class points:", err);
      setError("فشل في تحميل نقاط الطلاب.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  const groupedPoints = Object.values(
    points.reduce((acc, record) => {
      const key = record.student_id || record.student_name || "unknown";
      if (!acc[key]) {
        acc[key] = {
          student_id: record.student_id,
          student_name: record.student_name || "-",
          total_points: 0,
        };
      }
      const fullName =
        record.student_full_name ||
        record.student_name_full ||
        record.student_name;
      if (fullName) {
        acc[key].student_name = fullName;
      }
      acc[key].total_points += Number(record.points_given || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total_points - a.total_points);

  const handleExportToExcel = () => {

    const rows = groupedPoints.map((record) => [
      record.student_name,
      record.total_points.toFixed(1),
    ]);

    const headerRows = [
      ["الصف", classItem.name],
      ["الفترة", dateFrom || "-", dateTo || "-"],
      [],
    ];

    const tableHeaders = ["الطالب", "إجمالي النقاط"];
    const allRows = [...headerRows, tableHeaders, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Points");
    XLSX.writeFile(workbook, "class-points.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-5xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[var(--color-primary-700)]">
            نقاط الطلاب - {classItem.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchPoints}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              تصفية
            </button>
            <button
              onClick={handleExportToExcel}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600"
            >
              تصدير إكسل
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">جاري تحميل النقاط...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الطالب
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي النقاط
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedPoints.map((record) => (
                  <tr key={record.student_id || record.student_name}>
                    <td className="px-4 py-2 text-sm text-gray-700">{record.student_name}</td>
                    <td className="px-4 py-2 text-sm text-center text-gray-700">
                      {record.total_points.toFixed(1)}
                    </td>
                  </tr>
                ))}
                {groupedPoints.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-4 py-6 text-center text-gray-500">
                      لا توجد نقاط في هذا النطاق.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
