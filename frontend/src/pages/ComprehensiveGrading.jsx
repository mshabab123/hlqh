import { useState, useEffect } from "react";
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
        setClasses(response.data.classes || []);
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
    await loadStudentGrades(student.id, classId);
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    
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

  // Filter students based on search term
  const getFilteredStudents = (students) => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
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
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h2 className="text-xl font-bold text-blue-800 mb-2">
                      {classes[activeTab].name}
                    </h2>
                    <p className="text-blue-700">
                      المستوى: {classes[activeTab].school_level} | 
                      عدد الطلاب: {classes[activeTab].student_count} / {classes[activeTab].max_students}
                    </p>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الطالب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            متوسط الدرجات
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            نسبة الحضور
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            أيام الغياب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            النقاط
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredStudents(classes[activeTab].students).map((student, idx) => (
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
                                  <div className="text-sm text-gray-500">
                                    رقم الهوية: {student.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleStudentGradeClick(student, classes[activeTab].id)}
                                className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${getGradeColor(student.averageGrade)}`}
                              >
                                {student.averageGrade.toFixed(1)}%
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getAttendanceColor(student.attendanceRate)}`}>
                                {student.attendanceRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm text-gray-900">
                                {student.absentDays} / {student.totalDays}
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

                  {getFilteredStudents(classes[activeTab].students).length === 0 && (
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
              {(editingGrade !== null || gradeForm.course_id) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingGrade ? 'تعديل الدرجة' : 'إضافة درجة جديدة'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
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
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
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