import { useState, useEffect } from "react";
import axios from "axios";
import { QURAN_SURAHS, getSurahNameFromId } from "../utils/quranData";

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
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [gradeForm, setGradeForm] = useState({
    score: 0,
    from_surah: "",
    from_ayah: 1,
    to_surah: "",
    to_ayah: 1,
    notes: ""
  });

  // Using centralized Quran data from utils/quranData.js

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSemester && selectedClass) {
      loadCourses();
    }
  }, [selectedSemester, selectedClass]);

  useEffect(() => {
    if (selectedSemester && selectedClass) {
      loadGrades();
    }
  }, [selectedSemester, selectedClass]);

  const loadSemesters = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/semesters", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSemesters(response.data);
    } catch (error) {
      console.error("Error loading semesters:", error);
    }
  };

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
      const response = await axios.get(`http://localhost:5000/api/schools/${selectedSchool}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/classes/${selectedClass}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error("Error loading students:", error);
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

  const loadGrades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/api/grades/semester/${selectedSemester}/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data);
    } catch (error) {
      console.error("Error loading grades:", error);
    }
  };

  const handleOpenGradeModal = (student, course) => {
    setSelectedStudent(student);
    setSelectedCourse(course);
    
    // Load existing grade if available
    const existingGrade = grades.find(g => g.student_id === student.id && g.course_id === course.id);
    if (existingGrade) {
      // If to_ayah is null, use the max ayah for that surah
      const toAyahValue = existingGrade.to_ayah || 
        (existingGrade.to_surah ? getMaxAyahs(existingGrade.to_surah) : 1);
      
      setGradeForm({
        score: existingGrade.score || 0,
        from_surah: existingGrade.from_surah || "",
        from_ayah: existingGrade.from_ayah || 1,
        to_surah: existingGrade.to_surah || "",
        to_ayah: toAyahValue,
        notes: existingGrade.notes || ""
      });
    } else {
      setGradeForm({
        score: 0,
        from_surah: "",
        from_ayah: 1,
        to_surah: "",
        to_ayah: 1,
        notes: ""
      });
    }
    
    setShowGradeModal(true);
  };

  const handleSaveGrade = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const gradeData = {
        student_id: selectedStudent.id,
        course_id: selectedCourse.id,
        semester_id: selectedSemester,
        class_id: selectedClass,
        score: gradeForm.score,
        from_surah: selectedCourse.requires_surah ? gradeForm.from_surah : null,
        from_ayah: selectedCourse.requires_surah ? gradeForm.from_ayah : null,
        to_surah: selectedCourse.requires_surah ? gradeForm.to_surah : null,
        to_ayah: selectedCourse.requires_surah ? gradeForm.to_ayah : null,
        notes: gradeForm.notes
      };

      const existingGrade = grades.find(g => g.student_id === selectedStudent.id && g.course_id === selectedCourse.id);
      
      if (existingGrade) {
        await axios.put(`http://localhost:5000/api/grades/${existingGrade.id}`, gradeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post("http://localhost:5000/api/grades", gradeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      await loadGrades();
      setShowGradeModal(false);
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("حدث خطأ في حفظ الدرجة");
    } finally {
      setLoading(false);
    }
  };

  const getStudentGrade = (studentId, courseId) => {
    const grade = grades.find(g => g.student_id === studentId && g.course_id === courseId);
    return grade ? grade.score : "-";
  };

  const getSurahName = (surahId) => {
    return getSurahNameFromId(surahId) || "";
  };

  const getMaxAyahs = (surahId) => {
    const surah = QURAN_SURAHS.find(s => s.id === parseInt(surahId));
    return surah ? surah.ayahCount : 1;
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
  const canGrade = user && (user.role === 'admin' || user.role === 'administrator' || user.role === 'teacher');

  if (!canGrade) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة مخصصة للمعلمين والمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-6">إدارة درجات الطلاب</h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">اختر الفصل</option>
                {semesters && semesters.map ? semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    الفصل {getSemesterTypeText(semester.type)} {semester.year}
                  </option>
                )) : null}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">المجمع:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
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
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                disabled={!selectedSchool}
              >
                <option value="">اختر الحلقة</option>
                {classes && classes.map ? classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                )) : null}
              </select>
            </div>
          </div>

          {/* Grades Table */}
          {selectedSemester && selectedClass && courses.length > 0 && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">اسم الطالب</th>
                    {courses && courses.map ? courses.map(course => (
                      <th key={course.id} className="px-4 py-3 text-center font-semibold text-gray-700 border-b">
                        {course.name}
                        <br />
                        <span className="text-sm text-gray-500">({course.percentage}%)</span>
                      </th>
                    )) : null}
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {students && students.map ? students.map(student => {
                    const totalScore = (courses && courses.reduce) ? courses.reduce((sum, course) => {
                      const grade = getStudentGrade(student.id, course.id);
                      return sum + (grade !== "-" ? (grade * course.percentage / 100) : 0);
                    }, 0) : 0;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-b font-medium text-gray-800">
                          {student.first_name} {student.last_name}
                        </td>
                        {courses && courses.map ? courses.map(course => (
                          <td key={course.id} className="px-4 py-3 border-b text-center">
                            <button
                              onClick={() => handleOpenGradeModal(student, course)}
                              className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-lg transition-colors"
                            >
                              {getStudentGrade(student.id, course.id)}
                            </button>
                          </td>
                        )) : null}
                        <td className="px-4 py-3 border-b text-center font-bold">
                          {totalScore.toFixed(1)}
                        </td>
                      </tr>
                    );
                  }) : null}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty States */}
          {!selectedSemester && (
            <div className="text-center py-8 text-gray-500">
              اختر الفصل الدراسي للبدء
            </div>
          )}

          {selectedSemester && selectedClass && courses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد مقررات لهذه الحلقة في الفصل الدراسي المحدد. 
              <br />
              يمكنك إضافة مقررات من صفحة "مقررات الحلقات".
            </div>
          )}

          {selectedSemester && selectedClass && students.length === 0 && courses.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد طلاب في هذه الحلقة
            </div>
          )}
        </div>
      </div>

      {/* Grade Modal */}
      {showGradeModal && selectedStudent && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              تقييم الطالب: {selectedStudent.first_name} {selectedStudent.last_name}
            </h2>
            <h3 className="text-lg font-semibold mb-4 text-blue-600">
              المقرر: {selectedCourse.name} ({selectedCourse.percentage}%)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">الدرجة:</label>
                <input
                  type="number"
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({...gradeForm, score: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {selectedCourse.requires_surah && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">من سورة:</label>
                      <select
                        value={gradeForm.from_surah}
                        onChange={(e) => {
                          const surahId = e.target.value;
                          if (surahId) {
                            const maxAyah = getMaxAyahs(surahId);
                            console.log(`Selected Surah ID: ${surahId}, Max Ayah: ${maxAyah}`); // Debug
                            setGradeForm({
                              ...gradeForm, 
                              from_surah: surahId, 
                              from_ayah: 1,
                              to_surah: surahId,  // Auto-set the same surah
                              to_ayah: maxAyah    // Auto-set to last ayah
                            });
                          } else {
                            setGradeForm({
                              ...gradeForm, 
                              from_surah: "", 
                              from_ayah: 1,
                              to_surah: "",
                              to_ayah: 1
                            });
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">اختر السورة</option>
                        {[...QURAN_SURAHS].sort((a, b) => a.id - b.id).map(surah => (
                          <option key={surah.id} value={surah.id}>
                            {surah.id}. {surah.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">من آية:</label>
                      <select
                        key={`from-ayah-${gradeForm.from_surah}`}
                        value={gradeForm.from_ayah}
                        onChange={(e) => setGradeForm({...gradeForm, from_ayah: parseInt(e.target.value)})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        disabled={!gradeForm.from_surah}
                      >
                        {Array.from({length: getMaxAyahs(gradeForm.from_surah)}, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">إلى سورة:</label>
                      <select
                        value={gradeForm.to_surah}
                        onChange={(e) => {
                          const surahId = e.target.value;
                          const maxAyah = surahId ? getMaxAyahs(surahId) : 1;
                          setGradeForm({...gradeForm, to_surah: surahId, to_ayah: maxAyah});
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">اختر السورة</option>
                        {[...QURAN_SURAHS].sort((a, b) => a.id - b.id).map(surah => (
                          <option key={surah.id} value={surah.id}>
                            {surah.id}. {surah.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">إلى آية:</label>
                      <select
                        key={`to-ayah-${gradeForm.to_surah}`}
                        value={gradeForm.to_ayah}
                        onChange={(e) => setGradeForm({...gradeForm, to_ayah: parseInt(e.target.value)})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        disabled={!gradeForm.to_surah}
                      >
                        {Array.from({length: getMaxAyahs(gradeForm.to_surah)}, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {gradeForm.from_surah && gradeForm.to_surah && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-blue-800 font-medium">
                        النطاق: من سورة {getSurahName(gradeForm.from_surah)} آية {gradeForm.from_ayah}
                        <br />
                        إلى سورة {getSurahName(gradeForm.to_surah)} آية {gradeForm.to_ayah}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">ملاحظات:</label>
                <textarea
                  value={gradeForm.notes}
                  onChange={(e) => setGradeForm({...gradeForm, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveGrade}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "جارٍ الحفظ..." : "حفظ الدرجة"}
              </button>
              <button
                onClick={() => {
                  setShowGradeModal(false);
                  setSelectedStudent(null);
                  setSelectedCourse(null);
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

export default StudentGrading;