import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { 
  AiOutlineSearch, 
  AiOutlineUser, 
  AiOutlineBook, 
  AiOutlineCalendar, 
  AiOutlineEdit, 
  AiOutlineDelete,
  AiOutlinePlus,
  AiOutlineClose
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const ComprehensiveGrading = () => {
  const [schools, setSchools] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Grade editing modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  
  // Grade form state
  const [editingGrade, setEditingGrade] = useState(null);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    course_id: '',
    grade_value: '',
    max_grade: 100,
    notes: '',
    grade_type: 'regular',
    start_reference: '',
    end_reference: '',
    date_graded: new Date().toISOString().split('T')[0] // Default to today
  });

  useEffect(() => {
    loadSchools();
    loadSemesters();
  }, []);

  useEffect(() => {
    if (selectedSchool && selectedSemester) {
      loadClassesData();
    } else {
      setClasses([]);
      setActiveTab(0);
    }
  }, [selectedSchool, selectedSemester]);

  const loadSchools = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error("Error loading schools:", error);
    }
  };

  const loadSemesters = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSemesters(response.data.semesters || []);
    } catch (error) {
      console.error("Error loading semesters:", error);
    }
  };

  const loadClassesData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/api/grading/school/${selectedSchool}/semester/${selectedSemester}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        const fetchedClasses = response.data.classes || [];
        const classesWithCourses = await Promise.all(
          fetchedClasses.map(async (classItem) => {
            try {
              const coursesRes = await axios.get(
                `${API_BASE}/api/semesters/${selectedSemester}/classes/${classItem.id}/courses`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return {
                ...classItem,
                courses: Array.isArray(coursesRes.data) ? coursesRes.data : [],
              };
            } catch (error) {
              console.error("Error loading class courses:", error);
              return classItem;
            }
          })
        );
        setClasses(classesWithCourses);
        setActiveTab(0);
      }
    } catch (error) {
      console.error("Error loading classes data:", error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentGrades = async (studentId, classId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE}/api/grading/student/${studentId}/class/${classId}/semester/${selectedSemester}/grades`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setStudentGrades(response.data.courseGrades || []);
        setAvailableCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error("Error loading student grades:", error);
    }
  };

  const handleStudentGradeClick = async (student, classId) => {
    setSelectedStudent(student);
    setShowGradeModal(true);
    setShowGradeForm(false);  // Reset the form visibility
    setEditingGrade(null);     // Reset editing state
    await loadStudentGrades(student.id, classId);
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    setShowGradeForm(true);  // Show the form when editing
    
    // Format the date from the grade (could be date_graded or created_at)
    let gradeDate = grade.date_graded || grade.created_at;
    if (gradeDate) {
      gradeDate = new Date(gradeDate).toISOString().split('T')[0];
    } else {
      gradeDate = new Date().toISOString().split('T')[0];
    }
    
    setGradeForm({
      course_id: grade.course_id || '',
      grade_value: grade.grade_value || '',
      max_grade: grade.max_grade || 100,
      notes: grade.notes || '',
      grade_type: grade.grade_type || 'regular',
      start_reference: grade.start_reference || '',
      end_reference: grade.end_reference || '',
      date_graded: gradeDate
    });
  };

  const handleAddNewGrade = () => {
    setEditingGrade(null);
    setShowGradeForm(true);
    setGradeForm({
      course_id: '',
      grade_value: '',
      max_grade: 100,
      notes: '',
      grade_type: 'regular',
      start_reference: '',
      end_reference: '',
      date_graded: new Date().toISOString().split('T')[0] // Default to today
    });
  };

  const handleSaveGrade = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (editingGrade) {
        // Update existing grade
        await axios.put(
          `${API_BASE}/api/grading/grade/${editingGrade.id}`,
          gradeForm,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        // Add new grade
        const gradeData = {
          ...gradeForm,
          student_id: selectedStudent.id,
          semester_id: selectedSemester,
          class_id: classes[activeTab]?.id
        };
        
        await axios.post(`${API_BASE}/api/grading/grade`, gradeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Refresh data
      await Promise.all([
        loadStudentGrades(selectedStudent.id, classes[activeTab]?.id),
        loadClassesData()
      ]);
      
      setEditingGrade(null);
      setShowGradeForm(false);
      
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("حدث خطأ في حفظ الدرجة");
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الدرجة؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/api/grading/grade/${gradeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh data
      await Promise.all([
        loadStudentGrades(selectedStudent.id, classes[activeTab]?.id),
        loadClassesData()
      ]);
      
    } catch (error) {
      console.error("Error deleting grade:", error);
      alert("حدث خطأ في حذف الدرجة");
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return "text-green-600 bg-green-100";
    if (grade >= 80) return "text-blue-600 bg-blue-100";
    if (grade >= 70) return "text-yellow-600 bg-yellow-100";
    if (grade >= 60) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return "text-green-600 bg-green-100";
    if (rate >= 85) return "text-yellow-600 bg-yellow-100";
    if (rate >= 75) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getRatingLabel = (value) => {
    if (value == null) return "-";
    if (value >= 90) return "ممتاز";
    if (value >= 80) return "جيد جدا";
    if (value >= 70) return "جيد";
    if (value >= 60) return "مقبول";
    return "ضعيف";
  };

  const getAttendanceWeight = (coursePercentages) => {
    if (!coursePercentages) return 0;
    const explicitKeys = [
      "نسبة الحضور",
      "الحضور والغياب",
      "الحضور",
      "المواظبة",
    ];
    for (const key of explicitKeys) {
      if (coursePercentages[key] !== undefined) {
        return Number(coursePercentages[key]) || 0;
      }
    }
    const fuzzyKey = Object.keys(coursePercentages).find(
      (name) => name.includes("الحضور") || name.includes("المواظبة")
    );
    return fuzzyKey ? Number(coursePercentages[fuzzyKey]) || 0 : 0;
  };

  const getAttendanceWeightFromCourses = (courses) => {
    if (!Array.isArray(courses)) return 0;
    const explicitNames = [
      "نسبة الحضور",
      "الحضور والغياب",
      "الحضور",
      "المواظبة",
    ];
    for (const name of explicitNames) {
      const match = courses.find((course) => course?.name === name);
      if (match) return Number(match.percentage) || 0;
    }
    const fuzzy = courses.find(
      (course) =>
        typeof course?.name === "string" &&
        (course.name.includes("الحضور") || course.name.includes("المواظبة"))
    );
    return fuzzy ? Number(fuzzy.percentage) || 0 : 0;
  };

  const resolveAttendanceWeight = (classItem) => {
    const direct = Number(classItem?.attendance_weight);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const fromCourses = getAttendanceWeightFromCourses(classItem?.courses);
    if (Number.isFinite(fromCourses) && fromCourses > 0) return fromCourses;
    return getAttendanceWeight(classItem?.course_percentages || {});
  };

  const isAttendanceCourse = (courseName) => {
    if (!courseName) return false;
    return courseName.includes("الحضور") || courseName.includes("المواظبة");
  };

  const getCourseWeight = (classItem, courseName) => {
    if (!classItem || !courseName) return 0;
    if (courseName === "المواظبة") return resolveAttendanceWeight(classItem);
    const course = Array.isArray(classItem.courses)
      ? classItem.courses.find((item) => item?.name === courseName)
      : null;
    if (course && Number.isFinite(Number(course.percentage))) {
      return Number(course.percentage) || 0;
    }
    return Number(classItem.course_percentages?.[courseName]) || 0;
  };

  // Filter students based on search term
  const getFilteredStudents = (students) => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCourseNamesForClass = (classItem) => {
    if (!classItem) return [];
    const names = new Set();
    if (Array.isArray(classItem.courses)) {
      classItem.courses.forEach((course) => {
        if (course?.name) {
          names.add(course.name);
        }
      });
    }
    const coursePercentages = classItem.course_percentages || {};
    Object.keys(coursePercentages).forEach((name) => names.add(name));
    (classItem.students || []).forEach((student) => {
      const grades = student.courseGrades || {};
      Object.keys(grades).forEach((name) => names.add(name));
    });
    const attendanceCourse = Array.isArray(classItem.courses)
      ? classItem.courses.find((course) => isAttendanceCourse(course?.name))
      : null;
    if (attendanceCourse?.name || resolveAttendanceWeight(classItem) > 0) {
      names.add("المواظبة");
    }
    Array.from(names).forEach((name) => {
      if (name !== "المواظبة" && isAttendanceCourse(name)) {
        names.delete(name);
      }
    });
    return Array.from(names);
  };

  const formatWeightLabel = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? `${num}%` : "0%";
  };

  const selectedSchoolName = schools.find(
    (school) => String(school.id) === String(selectedSchool)
  )?.name || "-";

  const handleExportToExcel = () => {
    if (!classes[activeTab]) return;
    const activeClass = classes[activeTab];

    const students = getFilteredStudents(activeClass.students || []);
    const courseNames = getCourseNamesForClass(activeClass);
    const attendanceWeight = resolveAttendanceWeight(activeClass);
    const tableHeaders = [
      "الطالب",
      ...courseNames.map((course) => course),
      ...courseNames.map((course) => {
        const weight = getCourseWeight(activeClass, course);
        return `${course} موزون (${formatWeightLabel(weight)})`;
      }),
      "الإجمالي الموزون",
      "التقدير",
      "أيام الغياب",
      "النقاط",
    ];

    const rows = students.map((student) => {
      const courseCells = courseNames.map((course) => {
        const values = student.courseGrades?.[course] || [];
        if (!values.length) {
          if (course === "السلوك") return "-";
          if (isAttendanceCourse(course)) {
            return Number.isFinite(student.attendanceRate)
              ? student.attendanceRate.toFixed(1)
              : "-";
          }
          return "-";
        }
        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
        return avg.toFixed(1);
      });
      const weightedCells = courseNames.map((course) => {
        const values = student.courseGrades?.[course] || [];
        const avg = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : isAttendanceCourse(course)
            ? student.attendanceRate ?? null
            : null;
        if (avg === null) return "-";
        const weight = isAttendanceCourse(course)
          ? attendanceWeight
          : Number(activeClass.course_percentages?.[course]) || 0;
        const weighted = (avg * weight) / 100;
        return weighted.toFixed(1);
      });
      const weightedTotal = courseNames.reduce((sum, course) => {
        if (isAttendanceCourse(course)) return sum;
        const values = student.courseGrades?.[course] || [];
        const avg = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
        if (avg === null) return sum;
        const weight = Number(activeClass.course_percentages?.[course]) || 0;
        return sum + (avg * weight) / 100;
      }, 0);
      const weightedTotalWithAttendance = Number.isFinite(student.attendanceRate)
        ? weightedTotal + (student.attendanceRate * attendanceWeight) / 100
        : weightedTotal;
      return [
        student.fullName,
        ...courseCells,
        ...weightedCells,
        weightedTotalWithAttendance ? weightedTotalWithAttendance.toFixed(1) : "-",
        getRatingLabel(weightedTotalWithAttendance || null),
        student.absentDays ?? 0,
        student.totalPoints ?? 0,
      ];
    });
    const headerRows = [
      ["مجمع الحلقات", selectedSchoolName],
      ["الحلقة", activeClass.name],
      ["المعلم", activeClass.teacher_name || "-"],
      [],
    ];

    const allRows = [...headerRows, tableHeaders, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grading");
    XLSX.writeFile(workbook, "comprehensive-grading.xlsx");
  };

  const activeClass = classes[activeTab] || null;
  const filteredStudents = getFilteredStudents(activeClass?.students || []);
  const activeCourseNames = getCourseNamesForClass(activeClass);
  const attendanceWeight = resolveAttendanceWeight(activeClass);
  const activeCoursePercentages = activeClass?.course_percentages || {};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
            نظام الدرجات الشامل
          </h1>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">المجمع:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر المجمع</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الفصل الدراسي</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">البحث:</label>
              <div className="relative">
                <AiOutlineSearch className="absolute left-3 top-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن طالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
            </div>
          )}

          {/* Class Tabs */}
          {selectedSchool && selectedSemester && classes.length > 0 && (
            <div>
              {/* Tab Headers */}
              <div className="flex overflow-x-auto mb-6 border-b">
                {classes.map((classItem, index) => (
                  <button
                    key={classItem.id}
                    onClick={() => setActiveTab(index)}
                    className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === index
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {classItem.name}
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {classItem.student_count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Tab Content */}
              {classes[activeTab] && (
                <div>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-blue-800 mb-1">
                        درجات الحلقة
                      </h2>
                      <div className="text-blue-700 text-sm">
                        الحلقة: {classes[activeTab].name}
                      </div>
                      <div className="text-blue-700 text-sm">
                        مجمع الحلقات: {selectedSchoolName} | المعلم: {classes[activeTab].teacher_name || "-"}
                      </div>
                      <div className="text-blue-700 text-sm">
                        المستوى: {classes[activeTab].school_level} | عدد الطلاب: {classes[activeTab].student_count} / {classes[activeTab].max_students}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportToExcel}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow self-start md:self-auto"
                    >
                      تصدير إكسل
                    </button>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الطالب
                          </th>
                          {activeCourseNames.map((course) => (
                            <th
                              key={course}
                              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {course}
                            </th>
                          ))}
                          {activeCourseNames.map((course) => (
                            <th
                              key={`${course}-weighted`}
                              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {course} موزون ({formatWeightLabel(getCourseWeight(activeClass, course))})
                            </th>
                          ))}
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الإجمالي الموزون
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            التقدير
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            أيام الغياب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            النقاط
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            عرض الدرجات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student, idx) => (
                          <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                    <AiOutlineUser className="text-white" />
                                  </div>
                                </div>
                                <div className="mr-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {student.fullName}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {activeCourseNames.map((course) => {
                              const values = student.courseGrades?.[course] || [];
                              const avg = values.length
                                ? values.reduce((sum, value) => sum + value, 0) / values.length
                                  : isAttendanceCourse(course)
                                    ? student.attendanceRate ?? null
                                    : null;
                              const colorClass = isAttendanceCourse(course)
                                ? getAttendanceColor(avg)
                                : getGradeColor(avg);
                              return (
                                <td key={course} className="px-6 py-4 whitespace-nowrap text-center">
                                  {avg !== null ? (
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}
                                    >
                                      {avg.toFixed(1)}%
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              );
                            })}
                            {activeCourseNames.map((course) => {
                              const values = student.courseGrades?.[course] || [];
                              const avg = values.length
                                ? values.reduce((sum, value) => sum + value, 0) / values.length
                                  : isAttendanceCourse(course)
                                    ? student.attendanceRate ?? null
                                    : null;
                              const weight = isAttendanceCourse(course)
                                ? attendanceWeight
                                : Number(activeCoursePercentages[course]) || 0;
                              const weighted = avg !== null ? (avg * weight) / 100 : null;
                              return (
                                <td key={`${course}-weighted`} className="px-6 py-4 whitespace-nowrap text-center">
                                  {weighted !== null ? weighted.toFixed(1) : "-"}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {(() => {
                                const total = activeCourseNames.reduce((sum, course) => {
                                  if (isAttendanceCourse(course)) return sum;
                                  const values = student.courseGrades?.[course] || [];
                                  const avg = values.length
                                    ? values.reduce((sum, value) => sum + value, 0) / values.length
                                    : null;
                                  if (avg === null) return sum;
                                  const weight = Number(activeCoursePercentages[course]) || 0;
                                  return sum + (avg * weight) / 100;
                                }, 0);
                                const withAttendance = Number.isFinite(student.attendanceRate)
                                  ? total + (student.attendanceRate * attendanceWeight) / 100
                                  : total;
                                return withAttendance.toFixed(1);
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {(() => {
                                const total = activeCourseNames.reduce((sum, course) => {
                                  if (isAttendanceCourse(course)) return sum;
                                  const values = student.courseGrades?.[course] || [];
                                  const avg = values.length
                                    ? values.reduce((sum, value) => sum + value, 0) / values.length
                                    : null;
                                  if (avg === null) return sum;
                                  const weight = Number(activeCoursePercentages[course]) || 0;
                                  return sum + (avg * weight) / 100;
                                }, 0);
                                const withAttendance = Number.isFinite(student.attendanceRate)
                                  ? total + (student.attendanceRate * attendanceWeight) / 100
                                  : total;
                                return getRatingLabel(withAttendance);
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm text-gray-900">
                                {student.absentDays}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {student.totalPoints}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleStudentGradeClick(student, classes[activeTab].id)}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                عرض الدرجات
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد طلاب في هذه الحلقة'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty States */}
          {!selectedSchool && !selectedSemester && (
            <div className="text-center py-12 text-gray-500">
              <AiOutlineBook className="text-6xl mx-auto mb-4" />
              <p className="text-xl">اختر المجمع والفصل الدراسي للبدء</p>
            </div>
          )}

          {selectedSchool && selectedSemester && classes.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <AiOutlineUser className="text-6xl mx-auto mb-4" />
              <p className="text-xl">لا توجد حلقات في هذا المجمع للفصل الدراسي المحدد</p>
            </div>
          )}
        </div>
      </div>

      {/* Grade Details Modal */}
      {showGradeModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                درجات {selectedStudent.fullName}
              </h2>
              <button
                onClick={() => setShowGradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="text-2xl" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Add New Grade Button */}
              <div className="mb-6">
                <button
                  onClick={handleAddNewGrade}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <AiOutlinePlus />
                  إضافة درجة جديدة
                </button>
              </div>

              {/* Grade Form */}
              {(editingGrade !== null || showGradeForm) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingGrade ? 'تعديل الدرجة' : 'إضافة درجة جديدة'}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">المقرر:</label>
                      <select
                        value={gradeForm.course_id}
                        onChange={(e) => setGradeForm({...gradeForm, course_id: e.target.value})}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">اختر المقرر</option>
                        {availableCourses.map(course => (
                          <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">نوع الدرجة:</label>
                      <select
                        value={gradeForm.grade_type}
                        onChange={(e) => setGradeForm({...gradeForm, grade_type: e.target.value})}
                        className="w-full p-2 border rounded"
                      >
                        <option value="regular">عادية</option>
                        <option value="memorization">حفظ</option>
                        <option value="recitation">تلاوة</option>
                        <option value="behavior">سلوك</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">الدرجة:</label>
                      <input
                        type="number"
                        value={gradeForm.grade_value}
                        onChange={(e) => setGradeForm({...gradeForm, grade_value: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">الدرجة الكاملة:</label>
                      <input
                        type="number"
                        value={gradeForm.max_grade}
                        onChange={(e) => setGradeForm({...gradeForm, max_grade: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">تاريخ الدرجة:</label>
                    <input
                      type="date"
                      value={gradeForm.date_graded}
                      onChange={(e) => setGradeForm({...gradeForm, date_graded: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">ملاحظات:</label>
                    <textarea
                      value={gradeForm.notes}
                      onChange={(e) => setGradeForm({...gradeForm, notes: e.target.value})}
                      className="w-full p-2 border rounded"
                      rows="2"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveGrade}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => {
                        setEditingGrade(null);
                        setShowGradeForm(false);
                        setGradeForm({
                          course_id: '',
                          grade_value: '',
                          max_grade: 100,
                          notes: '',
                          grade_type: 'regular',
                          start_reference: '',
                          end_reference: '',
                          date_graded: new Date().toISOString().split('T')[0]
                        });
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Grades */}
              <div className="space-y-4">
                {studentGrades.map(courseGrade => (
                  <div key={courseGrade.course_name} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-blue-800">
                      {courseGrade.course_name}
                    </h3>
                    
                    <div className="space-y-2">
                      {courseGrade.grades.map(grade => (
                        <div key={grade.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div>
                            <span className="font-medium">
                              {grade.grade_value}/{grade.max_grade} ({((grade.grade_value / grade.max_grade) * 100).toFixed(1)}%)
                            </span>
                            <span className="text-sm text-gray-500 mr-4">
                              {new Date(grade.date_graded || grade.created_at).toLocaleDateString('ar-SA')}
                            </span>
                            {grade.notes && (
                              <div className="text-sm text-gray-600 mt-1">{grade.notes}</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditGrade(grade)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <AiOutlineEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteGrade(grade.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <AiOutlineDelete />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {courseGrade.grades.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          لا توجد درجات لهذا المقرر
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveGrading;
