import { useState, useEffect } from "react";
import axios from "axios";

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

  // Quran surahs data
  const surahs = [
    { number: 1, name: "الفاتحة", ayahs: 7 },
    { number: 2, name: "البقرة", ayahs: 286 },
    { number: 3, name: "آل عمران", ayahs: 200 },
    { number: 4, name: "النساء", ayahs: 176 },
    { number: 5, name: "المائدة", ayahs: 120 },
    { number: 6, name: "الأنعام", ayahs: 165 },
    { number: 7, name: "الأعراف", ayahs: 206 },
    { number: 8, name: "الأنفال", ayahs: 75 },
    { number: 9, name: "التوبة", ayahs: 129 },
    { number: 10, name: "يونس", ayahs: 109 },
    { number: 11, name: "هود", ayahs: 123 },
    { number: 12, name: "يوسف", ayahs: 111 },
    { number: 13, name: "الرعد", ayahs: 43 },
    { number: 14, name: "إبراهيم", ayahs: 52 },
    { number: 15, name: "الحجر", ayahs: 99 },
    { number: 16, name: "النحل", ayahs: 128 },
    { number: 17, name: "الإسراء", ayahs: 111 },
    { number: 18, name: "الكهف", ayahs: 110 },
    { number: 19, name: "مريم", ayahs: 98 },
    { number: 20, name: "طه", ayahs: 135 },
    { number: 21, name: "الأنبياء", ayahs: 112 },
    { number: 22, name: "الحج", ayahs: 78 },
    { number: 23, name: "المؤمنون", ayahs: 118 },
    { number: 24, name: "النور", ayahs: 64 },
    { number: 25, name: "الفرقان", ayahs: 77 },
    { number: 26, name: "الشعراء", ayahs: 227 },
    { number: 27, name: "النمل", ayahs: 93 },
    { number: 28, name: "القصص", ayahs: 88 },
    { number: 29, name: "العنكبوت", ayahs: 69 },
    { number: 30, name: "الروم", ayahs: 60 },
    { number: 31, name: "لقمان", ayahs: 34 },
    { number: 32, name: "السجدة", ayahs: 30 },
    { number: 33, name: "الأحزاب", ayahs: 73 },
    { number: 34, name: "سبأ", ayahs: 54 },
    { number: 35, name: "فاطر", ayahs: 45 },
    { number: 36, name: "يس", ayahs: 83 },
    { number: 37, name: "الصافات", ayahs: 182 },
    { number: 38, name: "ص", ayahs: 88 },
    { number: 39, name: "الزمر", ayahs: 75 },
    { number: 40, name: "غافر", ayahs: 85 },
    { number: 41, name: "فصلت", ayahs: 54 },
    { number: 42, name: "الشورى", ayahs: 53 },
    { number: 43, name: "الزخرف", ayahs: 89 },
    { number: 44, name: "الدخان", ayahs: 59 },
    { number: 45, name: "الجاثية", ayahs: 37 },
    { number: 46, name: "الأحقاف", ayahs: 35 },
    { number: 47, name: "محمد", ayahs: 38 },
    { number: 48, name: "الفتح", ayahs: 29 },
    { number: 49, name: "الحجرات", ayahs: 18 },
    { number: 50, name: "ق", ayahs: 45 },
    { number: 51, name: "الذاريات", ayahs: 60 },
    { number: 52, name: "الطور", ayahs: 49 },
    { number: 53, name: "النجم", ayahs: 62 },
    { number: 54, name: "القمر", ayahs: 55 },
    { number: 55, name: "الرحمن", ayahs: 78 },
    { number: 56, name: "الواقعة", ayahs: 96 },
    { number: 57, name: "الحديد", ayahs: 29 },
    { number: 58, name: "المجادلة", ayahs: 22 },
    { number: 59, name: "الحشر", ayahs: 24 },
    { number: 60, name: "الممتحنة", ayahs: 13 },
    { number: 61, name: "الصف", ayahs: 14 },
    { number: 62, name: "الجمعة", ayahs: 11 },
    { number: 63, name: "المنافقون", ayahs: 11 },
    { number: 64, name: "التغابن", ayahs: 18 },
    { number: 65, name: "الطلاق", ayahs: 12 },
    { number: 66, name: "التحريم", ayahs: 12 },
    { number: 67, name: "الملك", ayahs: 30 },
    { number: 68, name: "القلم", ayahs: 52 },
    { number: 69, name: "الحاقة", ayahs: 52 },
    { number: 70, name: "المعارج", ayahs: 44 },
    { number: 71, name: "نوح", ayahs: 28 },
    { number: 72, name: "الجن", ayahs: 28 },
    { number: 73, name: "المزمل", ayahs: 20 },
    { number: 74, name: "المدثر", ayahs: 56 },
    { number: 75, name: "القيامة", ayahs: 40 },
    { number: 76, name: "الإنسان", ayahs: 31 },
    { number: 77, name: "المرسلات", ayahs: 50 },
    { number: 78, name: "النبأ", ayahs: 40 },
    { number: 79, name: "النازعات", ayahs: 46 },
    { number: 80, name: "عبس", ayahs: 42 },
    { number: 81, name: "التكوير", ayahs: 29 },
    { number: 82, name: "الإنفطار", ayahs: 19 },
    { number: 83, name: "المطففين", ayahs: 36 },
    { number: 84, name: "الإنشقاق", ayahs: 25 },
    { number: 85, name: "البروج", ayahs: 22 },
    { number: 86, name: "الطارق", ayahs: 17 },
    { number: 87, name: "الأعلى", ayahs: 19 },
    { number: 88, name: "الغاشية", ayahs: 26 },
    { number: 89, name: "الفجر", ayahs: 30 },
    { number: 90, name: "البلد", ayahs: 20 },
    { number: 91, name: "الشمس", ayahs: 15 },
    { number: 92, name: "الليل", ayahs: 21 },
    { number: 93, name: "الضحى", ayahs: 11 },
    { number: 94, name: "الشرح", ayahs: 8 },
    { number: 95, name: "التين", ayahs: 8 },
    { number: 96, name: "العلق", ayahs: 19 },
    { number: 97, name: "القدر", ayahs: 5 },
    { number: 98, name: "البينة", ayahs: 8 },
    { number: 99, name: "الزلزلة", ayahs: 8 },
    { number: 100, name: "العاديات", ayahs: 11 },
    { number: 101, name: "القارعة", ayahs: 11 },
    { number: 102, name: "التكاثر", ayahs: 8 },
    { number: 103, name: "العصر", ayahs: 3 },
    { number: 104, name: "الهمزة", ayahs: 9 },
    { number: 105, name: "الفيل", ayahs: 5 },
    { number: 106, name: "قريش", ayahs: 4 },
    { number: 107, name: "الماعون", ayahs: 7 },
    { number: 108, name: "الكوثر", ayahs: 3 },
    { number: 109, name: "الكافرون", ayahs: 6 },
    { number: 110, name: "النصر", ayahs: 3 },
    { number: 111, name: "المسد", ayahs: 5 },
    { number: 112, name: "الإخلاص", ayahs: 4 },
    { number: 113, name: "الفلق", ayahs: 5 },
    { number: 114, name: "الناس", ayahs: 6 }
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
      setGradeForm({
        score: existingGrade.score || 0,
        from_surah: existingGrade.from_surah || "",
        from_ayah: existingGrade.from_ayah || 1,
        to_surah: existingGrade.to_surah || "",
        to_ayah: existingGrade.to_ayah || 1,
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

  const getSurahName = (surahNumber) => {
    const surah = surahs.find(s => s.number === parseInt(surahNumber));
    return surah ? surah.name : "";
  };

  const getMaxAyahs = (surahNumber) => {
    const surah = surahs.find(s => s.number === parseInt(surahNumber));
    return surah ? surah.ayahs : 1;
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">إدارة درجات الطلاب</h1>

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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">من سورة:</label>
                      <select
                        value={gradeForm.from_surah}
                        onChange={(e) => setGradeForm({...gradeForm, from_surah: e.target.value, from_ayah: 1})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">اختر السورة</option>
                        {surahs && surahs.map ? surahs.map(surah => (
                          <option key={surah.number} value={surah.number}>
                            {surah.number}. {surah.name}
                          </option>
                        )) : null}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">من آية:</label>
                      <select
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">إلى سورة:</label>
                      <select
                        value={gradeForm.to_surah}
                        onChange={(e) => setGradeForm({...gradeForm, to_surah: e.target.value, to_ayah: 1})}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">اختر السورة</option>
                        {surahs && surahs.map ? surahs.map(surah => (
                          <option key={surah.number} value={surah.number}>
                            {surah.number}. {surah.name}
                          </option>
                        )) : null}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">إلى آية:</label>
                      <select
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