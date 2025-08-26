import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineSearch, AiOutlineUser, AiOutlineBook } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const StudentGrading = () => {
  const [semesters, setSemesters] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadSemesters();
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadClasses();
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadCourses();
    }
  }, [selectedClass, selectedSemester]);

  useEffect(() => {
    if (selectedSemester && selectedClass) {
      loadGrades();
    }
  }, [selectedSemester, selectedClass]);

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

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/classes?school_id=${selectedSchool}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/classes/${selectedClass}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data || []);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/semesters/${selectedSemester}/classes/${selectedClass}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data || []);
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  };

  const loadGrades = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Loading grades for:", { selectedSemester, selectedClass });
      const response = await axios.get(`${API_BASE}/api/grades/semester/${selectedSemester}/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Grades response:", response.data);
      setGrades(response.data || []);
    } catch (error) {
      console.error("Error loading grades:", error);
    }
  };

  const loadStudentGrades = async (studentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/grades/student/${studentId}/semester/${selectedSemester}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data || [];
    } catch (error) {
      console.error("Error loading student grades:", error);
      return [];
    }
  };

  const getStudentGrade = (studentId, courseId) => {
    // Get all grades for this student and course
    const studentGrades = grades.filter(g => g.student_id === studentId && g.course_id === courseId);
    console.log(`Grades for student ${studentId}, course ${courseId}:`, studentGrades);
    
    if (!studentGrades || studentGrades.length === 0) return 0;
    
    // Calculate average of all grades for this course
    const totalPercentage = studentGrades.reduce((sum, grade) => {
      const gradeValue = grade.grade_value || grade.score || 0;
      const maxGrade = grade.max_grade || 100;
      const percentage = (gradeValue / maxGrade) * 100;
      console.log(`Grade calculation: ${gradeValue}/${maxGrade} = ${percentage}%`);
      return sum + percentage;
    }, 0);
    
    const average = totalPercentage / studentGrades.length;
    console.log(`Average for student ${studentId}, course ${courseId}: ${average}%`);
    
    // Return average percentage
    return average;
  };

  const calculateStudentTotal = (studentId) => {
    if (!courses.length) return 0;
    
    const totalWeightedScore = courses.reduce((sum, course) => {
      const grade = getStudentGrade(studentId, course.id);
      const weight = parseFloat(course.percentage) || 0;
      return sum + (grade * weight / 100);
    }, 0);
    
    return totalWeightedScore.toFixed(1);
  };

  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    // Load detailed grades for this student
    const studentGrades = await loadStudentGrades(student.id);
    setSelectedStudent({...student, detailedGrades: studentGrades});
  };


  const handleSaveGrade = async () => {
    if (!selectedStudent || !selectedCourse) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const gradeData = {
        student_id: selectedStudent.id,
        course_id: selectedCourse.id,
        semester_id: selectedSemester,
        class_id: selectedClass,
        grade_value: parseFloat(gradeForm.score),
        max_grade: parseFloat(gradeForm.max_grade),
        grade_type: gradeForm.grade_type,
        notes: gradeForm.notes,
        start_reference: gradeForm.start_reference,
        end_reference: gradeForm.end_reference
      };

      await axios.post(`${API_BASE}/api/grades`, gradeData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowGradeModal(false);
      loadGrades(); // Refresh grades
      if (selectedStudent) {
        handleStudentClick(selectedStudent); // Refresh student details
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("خطأ في حفظ الدرجة");
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">عرض متوسط درجات الطلاب</h1>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <label className="block text-gray-700 font-semibold mb-2">الحلقة:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSchool}
              >
                <option value="">اختر الحلقة</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
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

          {/* Main Content */}
          {selectedSemester && selectedClass && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Students List */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    الطلاب ({filteredStudents.length})
                  </h3>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredStudents.map(student => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentClick(student)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedStudent?.id === student.id
                            ? 'bg-blue-100 border-2 border-blue-300'
                            : 'bg-white hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500 text-white p-2 rounded-full">
                            <AiOutlineUser />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              المجموع: {calculateStudentTotal(student.id)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Details */}
              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-blue-500 text-white p-3 rounded-full">
                        <AiOutlineUser className="text-2xl" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </h2>
                        <p className="text-gray-600">
                          المجموع الكلي: {calculateStudentTotal(selectedStudent.id)} من 100
                        </p>
                      </div>
                    </div>

                    {/* Courses Grades */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <AiOutlineBook />
                        درجات المقررات
                      </h3>
                      
                      {courses.length > 0 ? (
                        <div className="grid gap-4">
                          {courses.map(course => {
                            const grade = getStudentGrade(selectedStudent.id, course.id);
                            const percentage = (grade / (course.max_grade || 100)) * 100;
                            
                            // Get all grades for this student and course
                            const studentCourseGrades = grades.filter(g => 
                              g.student_id === selectedStudent.id && g.course_id === course.id
                            );

                            return (
                              <div key={course.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="mb-3">
                                  <h4 className="font-medium text-gray-800 mb-1">{course.name}</h4>
                                  <span className="text-xs text-gray-500">تاريخ درجات {course.name}</span>
                                </div>
                                
                                {/* Show individual grades */}
                                <div className="mb-3 space-y-1">
                                  {studentCourseGrades.length > 0 ? (
                                    studentCourseGrades
                                      .sort((a, b) => new Date(b.date_graded || b.created_at) - new Date(a.date_graded || a.created_at))
                                      .map((gradeEntry, index) => {
                                        const gradeValue = gradeEntry.grade_value || gradeEntry.score || 0;
                                        const maxGrade = gradeEntry.max_grade || 100;
                                        const percentage = ((gradeValue / maxGrade) * 100).toFixed(1);
                                        const date = new Date(gradeEntry.date_graded || gradeEntry.created_at).toLocaleDateString('ar-SA');
                                        
                                        return (
                                          <div key={index} className="text-xs text-gray-600 flex justify-between items-center bg-white p-2 rounded">
                                            <span>{gradeValue}/{maxGrade} ({percentage}%)</span>
                                            <span className="text-gray-400">{date}</span>
                                          </div>
                                        );
                                      })
                                  ) : (
                                    <div className="text-xs text-gray-400 bg-white p-2 rounded">
                                      لا توجد درجات مدخلة
                                    </div>
                                  )}
                                </div>

                                {/* Average and progress bar */}
                                <div className="border-t pt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">المتوسط:</span>
                                    <span className="text-lg font-bold text-blue-600">
                                      {grade.toFixed(1)}%
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <div className="bg-gray-200 rounded-full h-3">
                                        <div 
                                          className={`h-3 rounded-full transition-all duration-300 ${
                                            grade >= 90 ? 'bg-green-500' :
                                            grade >= 75 ? 'bg-yellow-500' :
                                            grade >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${Math.min(grade, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      وزن: {course.percentage}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          لا توجد مقررات محددة لهذه الحلقة
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <AiOutlineUser className="text-6xl text-gray-400 mx-auto mb-4" />
                    <p className="text-xl text-gray-500">اختر طالباً لعرض متوسط درجاته في كل مقرر</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty States */}
          {!selectedSemester && (
            <div className="text-center py-12 text-gray-500">
              <AiOutlineBook className="text-6xl mx-auto mb-4" />
              <p className="text-xl">اختر الفصل الدراسي والحلقة للبدء</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default StudentGrading;