import React, { useState, useEffect } from 'react';
import { FaUser, FaGraduationCap, FaTrophy, FaBook, FaHistory, FaChartLine, FaCalendarAlt, FaEdit, FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import { getSurahNameFromId } from '../utils/quranData';
import { calculateQuranBlocks, calculateStudentGoalProgress, formatMemorizationDisplay } from '../utils/studentUtils';
import QuranBlocksGrid from '../components/QuranBlocksGrid';
import StudentCertificatesButton from '../components/StudentCertificatesButton';
import ChildDashboard from '../components/ChildDashboard';
import axios, { axiosRaw } from '../utils/axiosConfig';

const SCHOOL_LEVELS = [
  'لم يدخل المدرسة',
  'روضة',
  'الأول الابتدائي',
  'الثاني الابتدائي',
  'الثالث الابتدائي',
  'الرابع الابتدائي',
  'الخامس الابتدائي',
  'السادس الابتدائي',
  'الأول متوسط',
  'الثاني متوسط',
  'الثالث متوسط',
  'الأول ثانوي',
  'الثاني ثانوي',
  'الثالث ثانوي',
  'غير محدد'
];

const Children = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('semesters');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState('direct');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentDob, setSelectedStudentDob] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');
  const [studentRegistrationForm, setStudentRegistrationForm] = useState({
    id: '',
    first_name: '',
    second_name: '',
    third_name: '',
    last_name: '',
    date_of_birth: '',
    school_level: '',
    password: '',
    phone: '',
    email: ''
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [registeringSemesterId, setRegisteringSemesterId] = useState(null);
  const [pendingSemesterRegistration, setPendingSemesterRegistration] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [selectedSemesterPanel, setSelectedSemesterPanel] = useState(null);
  const [showPreviousSemesters, setShowPreviousSemesters] = useState(false);
  const [attendanceBySemester, setAttendanceBySemester] = useState({});
  const [attendanceLoadingSemesterId, setAttendanceLoadingSemesterId] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;
  const userId = user?.id;
  const isStudentView = userRole === 'student';

  const canUseParentChildActions = ['parent', 'parent_student', 'admin', 'administrator', 'teacher'].includes(userRole);
  const canViewChildren = ['parent', 'parent_student', 'admin', 'administrator', 'teacher', 'student'].includes(userRole);

  useEffect(() => {
    if (isStudentView && userId) {
      setChildren([]);
      setSelectedChild({
        relationship_id: `student-${userId}`,
        student_id: userId,
        first_name: user.first_name || '',
        second_name: user.second_name || '',
        third_name: user.third_name || '',
        last_name: user.last_name || '',
        school_level: user.school_level || '',
        relationship_type: 'student',
        is_active: user.is_active !== false
      });
      setLoading(false);
      return;
    }

    if (canViewChildren) {
      fetchChildren();
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      setDataLoading(true);
      setSelectedSemesterId(null);
      setSelectedSemesterPanel(null);
      setShowPreviousSemesters(false);
      setAttendanceBySemester({});
      fetchChildData(selectedChild.student_id).finally(() => setDataLoading(false));
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/children/${userId}`);
      const nextChildren = response.data.children || [];
      setChildren(nextChildren);
      setSelectedChild((currentChild) => {
        if (!currentChild) return null;
        return nextChildren.some((child) => child.relationship_id === currentChild.relationship_id)
          ? currentChild
          : null;
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('خطأ في جلب بيانات الأبناء');
    } finally {
      setLoading(false);
    }
  };

  const getWeightedGradeTotal = (grades = []) => {
    const courseBuckets = grades.reduce((acc, grade) => {
      const courseLabel = grade.course_name || grade.class_name || grade.surah_name || grade.start_reference || 'غير محدد';
      if (!acc[courseLabel]) {
        acc[courseLabel] = [];
      }
      acc[courseLabel].push(grade);
      return acc;
    }, {});

    const courseSummaries = Object.entries(courseBuckets).map(([courseLabel, courseGrades]) => {
      const numericGrades = courseGrades.map((courseGrade) => {
        const rawValue = courseGrade.grade ?? courseGrade.grade_value ?? courseGrade.score;
        if (rawValue === null || rawValue === undefined || rawValue === '') {
          return null;
        }
        const numericValue = Number(rawValue);
        if (Number.isNaN(numericValue)) {
          return null;
        }
        if (courseGrade.max_grade && Number(courseGrade.max_grade) > 0) {
          return (numericValue / Number(courseGrade.max_grade)) * 100;
        }
        return numericValue;
      }).filter((value) => Number.isFinite(value));

      const averagePercent = numericGrades.length
        ? numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length
        : 0;
      const weightValue = courseGrades.find((courseGrade) => courseGrade.percentage !== undefined && courseGrade.percentage !== null)?.percentage ?? 0;
      const weight = Number(weightValue) || 0;
      const weightedGrade = averagePercent * (weight / 100);

      return { courseLabel, weightedGrade };
    });

    return courseSummaries.reduce((sum, course) => sum + course.weightedGrade, 0);
  };

  const parseSurahReference = (reference) => {
    if (!reference || typeof reference !== 'string') return null;
    const [surahPart, ayahPart] = reference.split(':');
    const surahId = parseInt(surahPart, 10);
    if (Number.isNaN(surahId)) return null;
    const ayahNumber = ayahPart ? parseInt(ayahPart, 10) : null;
    return {
      surahId,
      ayahNumber: Number.isNaN(ayahNumber) ? null : ayahNumber
    };
  };

  const formatSurahLabel = (grade) => {
    const startRef = parseSurahReference(grade.start_reference);
    const endRef = parseSurahReference(grade.end_reference);

    if (startRef) {
      const startName = getSurahNameFromId(startRef.surahId) || grade.surah_name || grade.course_name || '-';
      const startAyah = startRef.ayahNumber;

      if (endRef && endRef.surahId) {
        const endName = getSurahNameFromId(endRef.surahId) || startName;
        const endAyah = endRef.ayahNumber;
        const left = startAyah ? `${startName}:${startAyah}` : startName;
        const right = endAyah ? `${endName}:${endAyah}` : endName;
        return `${left} - ${right}`;
      }

      if (startAyah) return `${startName}:${startAyah}`;
      return startName;
    }

    const fallbackSurahId = grade.surah_id || grade.start_surah_id;
    const fallbackAyah = grade.ayah_number || grade.start_ayah_number;
    if (fallbackSurahId) {
      const fallbackName = getSurahNameFromId(fallbackSurahId) || grade.surah_name || '-';
      return fallbackAyah ? `${fallbackName}:${fallbackAyah}` : fallbackName;
    }

    return grade.surah_name || grade.start_reference || grade.course_name || '-';
  };

  const fetchChildData = async (studentId) => {
    try {
      setLoading(true);
      const [gradesRes, pointsRes, attendanceRes, goalsRes, studentRes, semesterOptionsRes] = await Promise.allSettled([
        axios.get(`/api/grades/student/${studentId}`),
        axios.get(`/api/points/student/${studentId}`),
        axios.get(`/api/attendance/student/${studentId}/semester`, {
          validateStatus: (status) => status === 200 || status === 404
        }),
        axios.get(`/api/students/${studentId}/goals`),
        axios.get(`/api/students/${studentId}`),
        axios.get(`/api/semesters/registration-options?student_id=${studentId}`)
      ]);

      const gradesData = gradesRes.status === 'fulfilled' ? gradesRes.value.data : { grades: [] };
      const pointsData = pointsRes.status === 'fulfilled' ? pointsRes.value.data : { points: [], totalPoints: 0 };
      const attendanceData = attendanceRes.status === 'fulfilled' && attendanceRes.value.status !== 404
        ? attendanceRes.value.data
        : { days: [], statistics: { attendance_rate: 0 } };
      const goalsData = goalsRes.status === 'fulfilled' ? goalsRes.value.data : { goals: [] };
      const studentData = studentRes.status === 'fulfilled' ? studentRes.value.data?.student : null;
      const semesterOptionsData = semesterOptionsRes.status === 'fulfilled' ? semesterOptionsRes.value.data : { semesters: [] };

      setSemesterOptions(semesterOptionsData.semesters || []);
      setChildData({
        grades: gradesData.grades || [],
        points: pointsData.points || [],
        attendance: attendanceData.days || [],
        goals: goalsData.goals || [],
        student: studentData,
        statistics: {
          totalPoints: pointsData.totalPoints || 0,
          averageGrade: gradesData.averageGrade || 0,
          weightedGradeTotal: getWeightedGradeTotal(gradesData.grades || []),
          attendancePercentage: attendanceData.statistics?.attendance_rate || 0,
          present_days: attendanceData.statistics?.present_days ?? null,
          absent_days: attendanceData.statistics?.absent_days ?? null,
          total_working_days: attendanceData.statistics?.total_working_days ?? null,
          completedPages: gradesData.completedPages || 0
        }
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('خطأ في جلب بيانات الطالب');
    } finally {
      setLoading(false);
    }
  };

  const getSemesterTypeText = (type) => {
    switch (type) {
      case 'first': return 'الأول';
      case 'second': return 'الثاني';
      case 'summer': return 'الصيفي';
      default: return type || 'غير محدد';
    }
  };

  const openSemesterRegistration = (semester) => {
    if (!selectedChild?.student_id || !semester) return;
    setPendingSemesterRegistration({
      semester,
      school_level: selectedChild.school_level || childData?.student?.school_level || ''
    });
  };

  const handleRegisterSemester = async () => {
    if (!selectedChild?.student_id || !pendingSemesterRegistration?.semester?.id) return;
    if (!pendingSemesterRegistration.school_level) {
      alert('يرجى اختيار المستوى الدراسي للطالب');
      return;
    }

    const semesterId = pendingSemesterRegistration.semester.id;
    try {
      setRegisteringSemesterId(semesterId);
      await axios.post(`/api/semesters/${semesterId}/register`, {
        student_id: selectedChild.student_id,
        school_level: pendingSemesterRegistration.school_level
      });
      const response = await axios.get(`/api/semesters/registration-options?student_id=${selectedChild.student_id}`);
      setSemesterOptions(response.data.semesters || []);
      setChildren((prev) => prev.map((child) => (
        child.student_id === selectedChild.student_id
          ? { ...child, school_level: pendingSemesterRegistration.school_level }
          : child
      )));
      setSelectedChild((prev) => prev
        ? { ...prev, school_level: pendingSemesterRegistration.school_level }
        : prev
      );
      setPendingSemesterRegistration(null);
    } catch (err) {
      console.error('Error registering child in semester:', err);
      alert(err.response?.data?.message || 'تعذر تسجيل الطالب في الفصل');
    } finally {
      setRegisteringSemesterId(null);
    }
  };

  const fetchSemesterAttendance = async (studentId, semesterId) => {
    if (!studentId || !semesterId || semesterId === 'unknown' || attendanceBySemester[semesterId]) return;

    try {
      setAttendanceLoadingSemesterId(semesterId);
      const response = await axios.get(`/api/attendance/student/${studentId}/semester?semester_id=${semesterId}`, {
        validateStatus: (status) => status === 200 || status === 404
      });
      setAttendanceBySemester((prev) => ({
        ...prev,
        [semesterId]: response.status === 200
          ? response.data
          : { days: [], statistics: { attendance_rate: 0 } }
      }));
    } catch (err) {
      console.error('Error fetching semester attendance:', err);
      setAttendanceBySemester((prev) => ({
        ...prev,
        [semesterId]: { days: [], statistics: { attendance_rate: 0 } }
      }));
    } finally {
      setAttendanceLoadingSemesterId(null);
    }
  };

  const handleAddChild = async () => {
    try {
      if (addModalMode === 'register') {
        const response = await axiosRaw.post(`/api/children/${userId}/register-student`, studentRegistrationForm);
        setShowAddModal(false);
        fetchChildren();
        setAddModalMode('direct');
        setStudentRegistrationForm({
          id: '',
          first_name: '',
          second_name: '',
          third_name: '',
          last_name: '',
          date_of_birth: '',
          school_level: '',
          password: '',
          phone: '',
          email: ''
        });
        alert(response.data?.message || 'تم تسجيل الطالب بنجاح');
        return;
      }

      const endpoint = addModalMode === 'request'
        ? `/api/children/${userId}/request-link`
        : `/api/children/${userId}/add`;
      const response = await axiosRaw.post(
        endpoint,
        {
          studentId: selectedStudentId.trim(),
          dateOfBirth: selectedStudentDob,
          relationshipType: relationshipType,
          isPrimary: false
        }
      );
      setShowAddModal(false);
      if (addModalMode !== 'request') {
        fetchChildren();
      }
      setSelectedStudentId('');
      setSelectedStudentDob('');
      setAddModalMode('direct');
      alert(response.data?.message || 'تمت العملية بنجاح');
    } catch (err) {
      console.error('Error adding child:', err);
      alert(err.response?.data?.error || 'خطأ في إضافة الطالب');
    }
  };

  const handleRemoveChild = async (relationshipId) => {
    if (window.confirm('هل أنت متأكد من إلغاء ربط هذا الطالب؟')) {
      try {
        await axios.delete(`/api/children/${userId}/${relationshipId}`);
        fetchChildren();
      } catch (err) {
        console.error('Error removing child:', err);
        alert('خطأ في إلغاء ربط الطالب');
      }
    }
  };

  const renderGradesHistory = () => {
    if (!childData?.grades?.length) {
      return (
        <div className="text-center py-8">
          <FaGraduationCap className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد درجات مسجلة</p>
        </div>
      );
    }

    const groupedGrades = childData.grades.reduce((acc, grade) => {
      const courseLabel = grade.course_name || grade.class_name || grade.surah_name || grade.start_reference || 'غير محدد';
      if (!acc[courseLabel]) {
        acc[courseLabel] = [];
      }
      acc[courseLabel].push(grade);
      return acc;
    }, {});

    const courseSummaries = Object.entries(groupedGrades).map(([courseLabel, grades]) => {
      const numericGrades = grades.map((grade) => {
        const rawValue = grade.grade ?? grade.grade_value ?? grade.score;
        if (rawValue === null || rawValue === undefined || rawValue === '') {
          return null;
        }
        const numericValue = Number(rawValue);
        if (Number.isNaN(numericValue)) {
          return null;
        }
        if (grade.max_grade && Number(grade.max_grade) > 0) {
          return (numericValue / Number(grade.max_grade)) * 100;
        }
        return numericValue;
      }).filter((value) => Number.isFinite(value));

      const averagePercent = numericGrades.length
        ? numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length
        : 0;
      const weightValue = grades.find((grade) => grade.percentage !== undefined && grade.percentage !== null)?.percentage ?? 0;
      const weight = Number(weightValue) || 0;
      const weightedGrade = averagePercent * (weight / 100);

      return { courseLabel, averagePercent, weight, weightedGrade };
    });

    const totalWeightedGrade = courseSummaries.reduce((sum, course) => sum + course.weightedGrade, 0);

    const courseSummaryMap = courseSummaries.reduce((acc, course) => {
      acc[course.courseLabel] = course;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المقرر</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">درجة المقرر</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الوزن</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الدرجة الموزونة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courseSummaries.map((course) => (
                <tr key={`summary-${course.courseLabel}`}>
                  <td className="px-4 py-2 text-sm text-gray-900">{course.courseLabel}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{Number.isFinite(course.averagePercent) ? course.averagePercent.toFixed(1) : '0'}%</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{Number.isFinite(course.weight) ? course.weight.toFixed(1) : '0'}%</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{Number.isFinite(course.weightedGrade) ? course.weightedGrade.toFixed(1) : '0'}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-2 text-sm font-semibold text-gray-700" colSpan={3}>الإجمالي الموزون</td>
                <td className="px-4 py-2 text-sm font-semibold text-gray-700">{Number.isFinite(totalWeightedGrade) ? totalWeightedGrade.toFixed(1) : '0'}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {Object.entries(groupedGrades).map(([courseLabel, grades]) => {
          const isOpen = expandedCourse === courseLabel;
          const summary = courseSummaryMap[courseLabel];

          return (
            <div key={courseLabel} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md">
              <button
                type="button"
                onClick={() => setExpandedCourse(isOpen ? null : courseLabel)}
                className="w-full bg-gradient-to-r from-slate-50 via-white to-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 flex items-center justify-between hover:from-slate-100 hover:to-slate-200 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2">
                  <span>{courseLabel}</span>
                  <span className="text-xs text-gray-500">({grades.length})</span>
                </span>
                <span className="text-right text-xs text-slate-500">
                  <div>
                    {Number.isFinite(summary?.averagePercent)
                      ? `الدرجة: ${summary.averagePercent.toFixed(1)}%`
                      : 'الدرجة: -'}
                  </div>
                  <div>
                    {Number.isFinite(summary?.weightedGrade)
                      ? `الموزونة: ${summary.weightedGrade.toFixed(1)}%`
                      : 'الموزونة: -'}
                  </div>
                </span>
              </button>
              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السورة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الدرجة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {grades.map((grade, index) => {
                        const dateValue = grade.date || grade.date_graded || grade.created_at;
                        const dateLabel = dateValue && !Number.isNaN(new Date(dateValue).getTime())
                          ? new Date(dateValue).toLocaleDateString('ar-SA')
                          : '-';
                        const surahLabel = formatSurahLabel(grade);
                        const gradeValue = grade.grade ?? grade.grade_value ?? grade.score ?? '-';
                        const gradeIsNumeric = typeof gradeValue === 'number' || (!Number.isNaN(Number(gradeValue)) && gradeValue !== '-');
                        let badgeClass = 'bg-red-100 text-red-800';

                        if (gradeIsNumeric) {
                          const numericValue = Number(gradeValue);
                          if (numericValue >= 90) {
                            badgeClass = 'bg-green-100 text-green-800';
                          } else if (numericValue >= 75) {
                            badgeClass = 'bg-blue-100 text-blue-800';
                          } else if (numericValue >= 60) {
                            badgeClass = 'bg-yellow-100 text-yellow-800';
                          }
                        } else if (gradeValue === 'U.U.OSO�O�') {
                          badgeClass = 'bg-green-100 text-green-800';
                        } else if (gradeValue === 'OSUSO_ OSO_O�U<') {
                          badgeClass = 'bg-blue-100 text-blue-800';
                        } else if (gradeValue === 'OSUSO_') {
                          badgeClass = 'bg-yellow-100 text-yellow-800';
                        }

                        return (
                          <tr key={`${courseLabel}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {dateLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{surahLabel}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                                {gradeIsNumeric ? Number(gradeValue) : gradeValue}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPointsHistory = () => {
    if (!childData?.points?.length) {
      return (
        <div className="text-center py-8">
          <FaTrophy className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد نقاط مسجلة</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">النقاط</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المعلم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {childData.points.map((point, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(point.points_date).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {point.points_given}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{point.teacher_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{point.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSemesters = () => {
    const grades = childData?.grades || [];
    const semesterGradeGroups = grades.reduce((acc, grade) => {
      const semesterKey = grade.semester_id || grade.semester_name || 'unknown';
      const semesterLabel = grade.semester_name || 'فصل غير محدد';
      if (!acc[semesterKey]) {
        acc[semesterKey] = {
          label: semesterLabel,
          grades: [],
          className: grade.class_name || null
        };
      }
      acc[semesterKey].grades.push(grade);
      if (!acc[semesterKey].className && grade.class_name) {
        acc[semesterKey].className = grade.class_name;
      }
      return acc;
    }, {});

    const previousSemesters = Object.values(semesterGradeGroups).map((semester) => {
      const percentages = semester.grades.map((grade) => {
        const rawValue = grade.grade ?? grade.grade_value ?? grade.score;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return null;
        if (grade.max_grade && Number(grade.max_grade) > 0) {
          return (numericValue / Number(grade.max_grade)) * 100;
        }
        return numericValue;
      }).filter((value) => Number.isFinite(value));

      const average = percentages.length
        ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
        : 0;

      return {
        ...semester,
        average,
        gradesCount: semester.grades.length
      };
    });

    return (
      <div className="space-y-6">
        <div>
          <h5 className="mb-3 text-lg font-semibold text-gray-800">الفصول المتاحة للتسجيل</h5>
          {semesterOptions.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              لا توجد فصول متاحة للعرض حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {semesterOptions.map((semester) => {
                const isOpen = Boolean(semester.registration_open);
                const isRegistered = Boolean(semester.registration_status);

                return (
                  <div
                    key={semester.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isOpen
                        ? 'border-teal-200 bg-teal-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          الفصل {getSemesterTypeText(semester.type)} {semester.year}
                        </p>
                        <p className="text-sm text-gray-600">{semester.school_name || 'بدون مجمع محدد'}</p>
                        {semester.registered_class_name && (
                          <p className="mt-1 text-sm text-teal-700">الحلقة: {semester.registered_class_name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOpen ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isOpen ? 'متاح' : 'غير متاح'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-600">
                        {isRegistered
                          ? semester.registered_class_name
                            ? 'تم التسجيل والتسكين'
                            : 'تم التسجيل بانتظار الحلقة'
                          : 'لم يتم التسجيل'}
                      </span>
                      {isOpen && !isRegistered && (
                        <button
                          type="button"
                          onClick={() => openSemesterRegistration(semester)}
                          disabled={registeringSemesterId === semester.id}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                          {registeringSemesterId === semester.id ? 'جارٍ التسجيل...' : 'تسجيل'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        <div>
          <h5 className="mb-3 text-lg font-semibold text-gray-800">الفصول السابقة ومسيرة الطالب</h5>
          {previousSemesters.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              لا توجد درجات أو مسيرة مسجلة في فصول سابقة
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {previousSemesters.map((semester) => (
                <div key={semester.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{semester.label}</p>
                      <p className="text-sm text-gray-600">{semester.className || 'بدون حلقة محددة'}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {semester.gradesCount} درجة
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-gray-600">
                      <span>متوسط الدرجات</span>
                      <span>{Number.isFinite(semester.average) ? semester.average.toFixed(1) : '0'}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.min(Math.max(semester.average || 0, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSemestersMain = () => {
    const grades = childData?.grades || [];
    const semesterGradeGroups = grades.reduce((acc, grade) => {
      const semesterKey = String(grade.semester_id || grade.semester_name || 'unknown');
      if (!acc[semesterKey]) {
        acc[semesterKey] = {
          id: semesterKey,
          label: grade.semester_name || 'فصل غير محدد',
          grades: [],
          className: grade.class_name || null,
          classNames: grade.class_name ? [grade.class_name] : []
        };
      }
      acc[semesterKey].grades.push(grade);
      if (!acc[semesterKey].className && grade.class_name) {
        acc[semesterKey].className = grade.class_name;
      }
      if (grade.class_name && !acc[semesterKey].classNames.includes(grade.class_name)) {
        acc[semesterKey].classNames.push(grade.class_name);
      }
      return acc;
    }, {});

    const averageFor = (semesterGrades = []) => {
      const values = semesterGrades.map((grade) => {
        const rawValue = grade.grade ?? grade.grade_value ?? grade.score;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return null;
        if (grade.max_grade && Number(grade.max_grade) > 0) {
          return (numericValue / Number(grade.max_grade)) * 100;
        }
        return numericValue;
      }).filter((value) => Number.isFinite(value));

      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    };

    const semesterMap = new Map();
    semesterOptions.forEach((semester) => {
      const id = String(semester.id);
      const gradeGroup = semesterGradeGroups[id];
      const classNames = [
        semester.registered_class_name,
        ...(gradeGroup?.classNames || [])
      ].filter(Boolean);
      semesterMap.set(id, {
        id,
        label: `الفصل ${getSemesterTypeText(semester.type)} ${semester.year}`,
        schoolName: semester.school_name,
        registrationOpen: Boolean(semester.registration_open),
        registrationStatus: semester.registration_status,
        registeredClassName: semester.registered_class_name,
        startDate: semester.start_date,
        className: semester.registered_class_name || gradeGroup?.className || null,
        classNames: [...new Set(classNames)],
        grades: gradeGroup?.grades || []
      });
    });

    Object.values(semesterGradeGroups).forEach((semester) => {
      if (!semesterMap.has(semester.id)) {
        semesterMap.set(semester.id, {
          ...semester,
          registrationOpen: false,
          registrationStatus: null,
          registeredClassName: null,
          classNames: semester.classNames || [],
          startDate: semester.grades?.[0]?.date_graded || semester.grades?.[0]?.date || semester.grades?.[0]?.created_at || null
        });
      }
    });

    const semesters = Array.from(semesterMap.values()).map((semester) => {
      const gradesCount = semester.grades.length;
      const hasGrades = gradesCount > 0;
      return {
        ...semester,
        average: averageFor(semester.grades),
        gradesCount,
        hasGrades,
        classesLabel: semester.classNames?.length ? semester.classNames.join('، ') : '',
        isRegistered: Boolean(semester.registrationStatus) || hasGrades
      };
    }).sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
      return bTime - aTime;
    });

    const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId) || null;
    const autoSelectedSemester = selectedSemester
      || semesters.find((semester) => semester.isRegistered && semester.registrationOpen)
      || semesters.find((semester) => semester.isRegistered)
      || null;
    const activeSemester = autoSelectedSemester || {
      id: '',
      label: 'اختر فصلاً',
      className: null,
      schoolName: '',
      classesLabel: '',
      registrationOpen: false,
      registrationStatus: null,
      registeredClassName: null,
      grades: [],
      average: 0,
      gradesCount: 0,
      hasGrades: false,
      isRegistered: false
    };
    const activeIsPlaceholder = !autoSelectedSemester;
    const activeGrades = activeSemester?.grades || [];
    const previousSemesters = semesters.filter((semester) => semester.id !== activeSemester.id);

    if (!semesters.length) {
      return (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
          لا توجد فصول للعرض حالياً
        </div>
      );
    }

    const activeIsRegistered = activeSemester.isRegistered;
    const activeIsRegistrationOnly = activeSemester.registrationOpen && !activeIsRegistered;

    return (
      <div className="space-y-5">
        {(activeIsPlaceholder || showPreviousSemesters) && (
        <div className="space-y-3 [&>h5:first-of-type]:hidden">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-lg font-semibold text-gray-800">
              {activeIsPlaceholder ? 'الفصول' : 'الفصول السابقة'}
            </h5>
            {!activeIsPlaceholder && (
              <button
                type="button"
                onClick={() => setShowPreviousSemesters(false)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                إخفاء
              </button>
            )}
          </div>
          <h5 className="text-lg font-semibold text-gray-800">الفصول</h5>
          {(activeIsPlaceholder ? semesters : previousSemesters).map((semester) => {
            const isSelected = activeSemester.id === semester.id;
            const isRegistered = semester.isRegistered;
            const isRegistrationOnly = semester.registrationOpen && !isRegistered;

            if (isRegistrationOnly) {
              return (
                <button
                  key={semester.id}
                  type="button"
                  onClick={() => {
                    setSelectedSemesterId(semester.id);
                    setSelectedSemesterPanel(null);
                  }}
                  className={`w-full rounded-lg border p-4 text-center shadow-sm transition hover:shadow-md ${
                    isSelected
                      ? 'border-2 border-teal-600 bg-teal-50'
                      : 'border-slate-300 bg-white hover:border-teal-500 hover:bg-teal-50'
                  }`}
                >
                  <FaCalendarAlt className="mx-auto mb-2 text-3xl text-teal-600" />
                  <p className="text-base font-bold text-gray-900">{semester.label}</p>
                  <span className="mt-2 inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                    التسجيل متاح
                  </span>
                </button>
              );
            }

            return (
              <button
                key={semester.id}
                type="button"
                onClick={() => {
                  setSelectedSemesterId(semester.id);
                  setSelectedSemesterPanel(null);
                }}
                className={`w-full rounded-lg border p-3 text-right shadow-sm transition hover:shadow-md ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50'
                    : semester.registrationOpen
                      ? 'border-teal-300 bg-teal-50 hover:border-teal-500'
                      : 'border-slate-300 bg-gray-50 opacity-85 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{semester.label}</p>
                    <p className="text-sm text-gray-600">{semester.schoolName || semester.className || 'بدون حلقة محددة'}</p>
                    {semester.classesLabel && (
                      <p className="mt-1 text-xs text-gray-500">الحلقات: {semester.classesLabel}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    semester.registrationOpen ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {semester.registrationOpen ? 'متاح' : 'غير متاح'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                  <span>
                    {isRegistered
                      ? semester.registeredClassName
                        ? `مسجل في ${semester.registeredClassName}`
                        : semester.hasGrades
                          ? 'سجل مسبقاً'
                          : 'مسجل بانتظار الحلقة'
                      : 'لم يتم التسجيل'}
                  </span>
                  {isRegistered && <span>{semester.average.toFixed(1)}%</span>}
                </div>
              </button>
            );
          })}
          {!activeIsPlaceholder && previousSemesters.length === 0 && (
            <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
              لا توجد فصول سابقة
            </div>
          )}
        </div>
        )}

        {!activeIsPlaceholder && (
        <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h5 className="text-xl font-bold text-gray-900">{activeSemester.label}</h5>
              <p className="text-sm text-gray-600">{activeSemester.className || activeSemester.schoolName || 'بدون حلقة محددة'}</p>
              {activeSemester.classesLabel && (
                <p className="mt-1 text-sm text-gray-600">الحلقات التي كان فيها: {activeSemester.classesLabel}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StudentCertificatesButton
                studentId={selectedChild?.student_id}
                semesterId={activeSemester.id}
                emptyMessage="لم تُمنح شهادة لهذا الفصل بعد."
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedSemesterId(null);
                  setSelectedSemesterPanel(null);
                  setShowPreviousSemesters((prev) => !prev);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-[0px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                <FaHistory className="text-sm" />
                <span className="text-sm">
                  {showPreviousSemesters ? 'إخفاء الفصول السابقة' : 'عرض الفصول السابقة'}
                </span>
                رجوع للفصول
              </button>
            </div>
          </div>

          {activeIsPlaceholder ? (
            <div className="rounded-lg bg-gray-50 p-10 text-center text-lg font-semibold text-gray-600">
              اختر فصلاً من القائمة لعرض بياناته
            </div>
          ) : activeIsRegistrationOnly ? (
            <div className="rounded-lg border border-teal-400 bg-teal-50 p-6 text-center shadow-sm">
              <FaCalendarAlt className="mx-auto mb-3 text-4xl text-teal-600" />
              <h6 className="mb-2 text-xl font-bold text-gray-900">التسجيل متاح</h6>
              <p className="mb-4 text-sm text-gray-600">لا توجد تفاصيل قبل التسجيل في هذا الفصل.</p>
              <button
                type="button"
                onClick={() => openSemesterRegistration(activeSemester)}
                disabled={registeringSemesterId === activeSemester.id}
                className="rounded-lg bg-teal-600 px-6 py-3 text-base font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {registeringSemesterId === activeSemester.id ? 'جارٍ التسجيل...' : 'تسجيل في الفصل'}
              </button>
            </div>
          ) : (
            <>
          <div className={`grid grid-cols-1 ${activeIsRegistered ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-1'} gap-3 mb-6`}>
            {activeIsRegistered && (
              <>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">متوسط الدرجات</p>
                  <p className="text-2xl font-bold text-blue-800">{activeSemester.average.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">عدد الدرجات</p>
                  <p className="text-2xl font-bold text-emerald-800">{activeSemester.gradesCount}</p>
                </div>
              </>
            )}
            {activeSemester.classesLabel && (
              <div className="rounded-lg bg-indigo-50 p-4">
                <p className="text-sm text-indigo-700">الحلقات</p>
                <p className="text-base font-bold text-indigo-800">{activeSemester.classesLabel}</p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-700">حالة التسجيل</p>
              <p className="text-lg font-bold text-slate-800">
                {activeSemester.registeredClassName
                  ? 'تم التسكين'
                  : activeSemester.registrationStatus
                    ? 'بانتظار الحلقة'
                    : activeSemester.hasGrades
                      ? 'سجل مسبقاً'
                      : 'غير مسجل'}
              </p>
            </div>
          </div>

          {activeIsRegistered ? (
            <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              { id: 'goals', label: 'الأهداف', icon: <FaChartLine /> },
              { id: 'grades', label: 'الدرجات', icon: <FaGraduationCap /> },
              { id: 'journey', label: 'المسيرة', icon: <FaBook /> },
              { id: 'points', label: 'النقاط', icon: <FaTrophy /> },
              { id: 'attendance', label: 'الحضور', icon: <FaCalendarAlt /> }
            ].map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => {
                  setSelectedSemesterPanel(panel.id);
                  if (panel.id === 'attendance') {
                    fetchSemesterAttendance(selectedChild?.student_id, activeSemester.id);
                  }
                }}
                className={`rounded-lg border p-4 text-center transition-colors ${
                  selectedSemesterPanel === panel.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex justify-center text-2xl">{panel.icon}</div>
                <div className="text-sm font-semibold">{panel.label}</div>
              </button>
            ))}
          </div>

          {!selectedSemesterPanel && (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              اختر أيقونة لعرض تفاصيل هذا الفصل
            </div>
          )}

          {selectedSemesterPanel === 'journey' && (activeGrades.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h6 className="mb-3 font-bold text-gray-800">مسيرة الحفظ في هذا الفصل</h6>
                <QuranBlocksGrid blocksData={calculateQuranBlocks(selectedChild, activeGrades)} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المقرر</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المقطع</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الدرجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeGrades.map((grade, index) => {
                      const dateValue = grade.date || grade.date_graded || grade.created_at;
                      const dateLabel = dateValue && !Number.isNaN(new Date(dateValue).getTime())
                        ? new Date(dateValue).toLocaleDateString('ar-SA')
                        : '-';
                      const gradeValue = grade.grade ?? grade.grade_value ?? grade.score ?? '-';
                      return (
                        <tr key={`${activeSemester.id}-${index}`}>
                          <td className="px-4 py-3 text-sm text-gray-700">{dateLabel}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{grade.course_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatSurahLabel(grade)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{gradeValue}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              لا توجد درجات أو مسيرة مسجلة في هذا الفصل حتى الآن
            </div>
          ))}

          {selectedSemesterPanel === 'grades' && (
            activeGrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المقرر</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المقطع</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الدرجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeGrades.map((grade, index) => {
                      const dateValue = grade.date || grade.date_graded || grade.created_at;
                      const dateLabel = dateValue && !Number.isNaN(new Date(dateValue).getTime())
                        ? new Date(dateValue).toLocaleDateString('ar-SA')
                        : '-';
                      const gradeValue = grade.grade ?? grade.grade_value ?? grade.score ?? '-';
                      return (
                        <tr key={`grades-${activeSemester.id}-${index}`}>
                          <td className="px-4 py-3 text-sm text-gray-700">{dateLabel}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{grade.course_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatSurahLabel(grade)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{gradeValue}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                لا توجد درجات مسجلة في هذا الفصل حتى الآن
              </div>
            )
          )}

          {selectedSemesterPanel === 'points' && renderPointsHistory()}
          {selectedSemesterPanel === 'goals' && renderGoals()}
          {selectedSemesterPanel === 'attendance' && (
            attendanceLoadingSemesterId === activeSemester.id ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <p className="mr-3 text-gray-600">جاري تحميل سجل الحضور...</p>
              </div>
            ) : (
              renderAttendance(
                attendanceBySemester[activeSemester.id]?.days || [],
                attendanceBySemester[activeSemester.id]?.statistics || {}
              )
            )
          )}
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 p-10 text-center text-lg font-semibold text-gray-600">
              لم يسجل في هذا الفصل
            </div>
          )}
            </>
          )}
        </div>
        )}
      </div>
    );
  };

  const renderAttendance = (attendanceDays = childData?.attendance || [], attendanceStats = childData?.statistics || {}) => {
    if (!attendanceDays.length) {
      return (
        <div className="text-center py-8">
          <FaCalendarAlt className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد سجلات حضور</p>
        </div>
      );
    }

    const stats = attendanceStats || {};
    const presentCount = attendanceDays.filter(day => day.is_present === true).length;
    const absentCount = attendanceDays.filter(day => day.is_present === false).length;

    const months = attendanceDays.reduce((acc, day) => {
      const monthKey = day.date?.slice(0, 7) || 'unknown';
      const monthLabel = day.date
        ? new Date(day.date).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
        : 'غير محدد';
      if (!acc[monthKey]) {
        acc[monthKey] = { label: monthLabel, days: [] };
      }
      acc[monthKey].days.push(day);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">نسبة الحضور الإجمالية</p>
              <p className="text-2xl font-bold text-blue-600">{stats.attendancePercentage ?? stats.attendance_rate ?? 0}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">عدد الأيام</p>
              <p className="text-lg font-semibold">حاضر: {stats.present_days ?? presentCount} | غائب: {stats.absent_days ?? absentCount}</p>
            </div>
          </div>
        </div>

        {Object.entries(months).map(([monthKey, monthData]) => (
          <div key={monthKey} className="bg-white rounded-lg shadow p-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">{monthData.label}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {monthData.days.map((day, index) => {
                const statusClass = day.status === 'present'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : day.status === 'absent'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200';
                const dayLabel = day.date ? new Date(day.date).getDate() : '-';

                return (
                  <div
                    key={`${monthKey}-${index}`}
                    className={`border rounded-lg p-3 text-center ${statusClass}`}
                  >
                    <div className="text-xs font-medium">{day.day_name || '-'}</div>
                    <div className="text-lg font-bold">{dayLabel}</div>
                    <div className="text-xs">{day.formatted_date || ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!childData?.statistics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaTrophy className="text-yellow-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">مجموع النقاط</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.totalPoints}</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaGraduationCap className="text-green-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">الدرجة </h5>
          <h3 className="text-2xl font-bold">{Number.isFinite(childData.statistics.weightedGradeTotal) ? childData.statistics.weightedGradeTotal.toFixed(1) : '0'}%</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaCalendarAlt className="text-blue-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">نسبة الحضور</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.attendancePercentage}%</h3>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <FaBook className="text-purple-500 mx-auto mb-2" size={30} />
          <h5 className="text-lg font-semibold mb-1">الصفحات المحفوظة</h5>
          <h3 className="text-2xl font-bold">{childData.statistics.completedPages}</h3>
        </div>
      </div>
    );
  };

  const renderGoals = () => {
    const goalStudent = childData?.student;
    const targetSurahId = parseInt(goalStudent?.target_surah_id, 10) || 0;
    const targetAyah = parseInt(goalStudent?.target_ayah_number, 10) || 0;
    const currentSurahId = parseInt(goalStudent?.memorized_surah_id, 10) || 0;
    const currentAyah = parseInt(goalStudent?.memorized_ayah_number, 10) || 0;
    const hasQuranGoal = targetSurahId && targetAyah;
    const progress = hasQuranGoal ? calculateStudentGoalProgress(goalStudent) : null;
    const currentDisplay = currentSurahId
      ? formatMemorizationDisplay(currentSurahId, currentAyah)
      : { display: 'لم يبدأ بعد', pageNumber: 0 };
    const targetDisplay = hasQuranGoal
      ? formatMemorizationDisplay(targetSurahId, targetAyah)
      : { display: '', pageNumber: 0 };

    if (!hasQuranGoal && !childData?.goals?.length) {
      return (
        <div className="text-center py-8">
          <FaChartLine className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد أهداف محددة</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {hasQuranGoal && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">الهدف المطلوب:</div>
                <div className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700">
                  {targetDisplay.display}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div className="font-semibold">الهدف المطلوب:</div>
                <div className="text-blue-600">
                  سورة {getSurahNameFromId(targetSurahId)} - الآية {targetAyah}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">إحصائيات الهدف الحالي:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">حالة الهدف</div>
                  <div className={`text-sm font-bold ${progress.percentage >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                    {progress.percentage >= 100 ? 'تم تحقيق الهدف' : 'قيد التحقيق'}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">الموقع الحالي</div>
                  <div className="text-sm font-bold text-purple-600">
                    {currentSurahId ? `سورة ${getSurahNameFromId(currentSurahId)} - آية ${currentAyah}` : 'لم يبدأ بعد'}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">الهدف المطلوب</div>
                  <div className="text-sm font-bold text-orange-600">
                    سورة {getSurahNameFromId(targetSurahId)} - آية {targetAyah}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">الآيات المتبقية</div>
                  <div className="text-sm font-bold text-red-600">
                    {Math.max(0, progress.totalGoalVerses - progress.memorizedVerses)} آية
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">الصفحات المتبقية</div>
                  <div className="text-sm font-bold text-indigo-600">
                    {Math.max(0, progress.totalGoalPages - progress.memorizedPages)} صفحة
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">إجمالي صفحات الهدف</div>
                  <div className="text-sm font-bold text-cyan-600">
                    {progress.totalGoalPages} صفحة
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">الصفحة الحالية</div>
                  <div className="text-sm font-bold text-purple-600">
                    صفحة {currentDisplay.pageNumber || 0}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">صفحة الهدف</div>
                  <div className="text-sm font-bold text-green-600">
                    صفحة {targetDisplay.pageNumber || 0}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-600 mb-1">تقدم الصفحات</div>
                  <div className="text-sm font-bold text-orange-600">
                    {progress.pagePercentage}%
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>تقدم الآيات:</span>
                    <span className="font-bold">{progress.memorizedVerses} من {progress.totalGoalVerses} آية</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        progress.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, progress.percentage)}%` }}
                    >
                      <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                        {Math.min(100, progress.percentage)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>تقدم الصفحات:</span>
                    <span className="font-bold">{progress.memorizedPages} من {progress.totalGoalPages} صفحة</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        progress.pagePercentage >= 100 ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, progress.pagePercentage)}%` }}
                    >
                      <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                        {Math.min(100, progress.pagePercentage)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {childData?.goals?.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-700">أهداف أخرى</div>
            {childData.goals.map((goal, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <h6 className="text-lg font-semibold">{goal.title}</h6>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    goal.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {goal.completed ? 'مكتمل' : 'قيد التنفيذ'}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{goal.description}</p>
                {goal.target_date && (
                  <small className="text-gray-500">
                    التاريخ المستهدف: {new Date(goal.target_date).toLocaleDateString('ar-SA')}
                  </small>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'semesters', label: 'الفصول', icon: <FaCalendarAlt className="inline mr-2" /> },
    { id: 'profile', label: 'الملف الشخصي', icon: <FaUser className="inline mr-2" /> },
    { id: 'grades', label: 'الدرجات', icon: <FaGraduationCap className="inline mr-2" /> },
    { id: 'points', label: 'النقاط', icon: <FaTrophy className="inline mr-2" /> },
    { id: 'attendance', label: 'الحضور', icon: <FaCalendarAlt className="inline mr-2" /> },
    { id: 'goals', label: 'الأهداف', icon: <FaChartLine className="inline mr-2" /> },
    { id: 'review', label: 'نظام المراجعة', icon: <FaBook className="inline mr-2" /> },
    { id: 'history', label: 'السجل', icon: <FaHistory className="inline mr-2" /> }
  ];

  const renderCardContent = (cardId) => {
    switch (cardId) {
      case 'profile':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">رقم الهوية</p>
              <p className="font-semibold">{selectedChild.student_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">البريد الإلكتروني</p>
              <p className="font-semibold">{selectedChild.email || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">رقم الهاتف</p>
              <p className="font-semibold">{selectedChild.phone || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">نوع العلاقة</p>
              <p className="font-semibold">{selectedChild.relationship_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">الحالة</p>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                selectedChild.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {selectedChild.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </div>
        );
      case 'semesters':
        return renderSemestersMain();
      case 'grades':
        return renderGradesHistory();
      case 'points':
        return renderPointsHistory();
      case 'attendance':
        return renderAttendance();
      case 'goals':
        return renderGoals();
      case 'history':
        return (
          <div className="text-center text-gray-500 py-8">
            <p>سيتم إضافة السجل الكامل قريباً</p>
          </div>
        );
      case 'review':
        if (!selectedChild || !childData?.grades) {
          return (
            <div className="text-center text-gray-500 py-8">
              <p>لا توجد بيانات مراجعة حالياً</p>
            </div>
          );
        }
        return (
          <div className="bg-white rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-lg font-semibold text-gray-800">نظام المراجعة</h5>
                <p className="text-sm text-gray-500">المحفوظ والمراجع من صفحات القرآن</p>
              </div>
            </div>
            <QuranBlocksGrid blocksData={calculateQuranBlocks(selectedChild, childData.grades)} />
          </div>
        );
      default:
        return null;
    }
  };

  if (!canViewChildren) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3">
            <p className="text-sm text-yellow-700">ليس لديك صلاحية لعرض هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mr-3">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="mr-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isAddChildSubmitDisabled = addModalMode === 'register'
    ? !studentRegistrationForm.id.trim()
      || !studentRegistrationForm.first_name.trim()
      || !studentRegistrationForm.second_name.trim()
      || !studentRegistrationForm.third_name.trim()
      || !studentRegistrationForm.last_name.trim()
      || !studentRegistrationForm.date_of_birth
      || !studentRegistrationForm.school_level
      || !studentRegistrationForm.password.trim()
    : !selectedStudentId.trim() || !selectedStudentDob;

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      <div className="space-y-6">
        {/* Children List */}
        {!selectedChild && (
        <div className="w-full">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <span className="text-lg font-semibold">الأبناء</span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
              {children.map((child) => (
                <button
                  key={child.relationship_id}
                  type="button"
                  className={`rounded-lg border p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-start gap-3 shadow-sm transition hover:shadow-md ${
                    selectedChild?.relationship_id === child.relationship_id ? 'bg-blue-50 border-2 border-blue-600 shadow-md' : 'border-slate-300'
                  }`}
                  onClick={() => setSelectedChild(child)}
                >
                  <div className="flex items-start gap-3 text-right">
                    <span className="rounded-md bg-slate-100 p-2 text-slate-500">
                      <FaUser />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-gray-900">{child.first_name} {child.last_name}</span>
                      <span className="mt-1 block text-xs text-gray-500">المستوى: {child.school_level || 'غير محدد'}</span>
                      <span className="mt-1 block text-xs text-blue-600">عرض الفصول</span>
                    </span>
                  </div>
                  {['parent', 'admin', 'administrator'].includes(userRole) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChild(child.relationship_id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveChild(child.relationship_id);
                        }
                      }}
                      className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="إزالة الربط"
                    >
                      <FaTrash />
                    </span>
                  )}
                </button>
              ))}
              {children.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  لا يوجد أبناء مسجلين
                </div>
              )}
            </div>
            {canUseParentChildActions && (
              <div className="grid grid-cols-1 gap-3 border-t border-gray-200 p-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-400 bg-emerald-50 p-3 shadow-sm transition hover:shadow-md">
                  <button
                    onClick={() => {
                      setAddModalMode('request');
                      setShowAddModal(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold flex items-center justify-center"
                  >
                    <FaPlus className="ml-2" /> اضافة ابن مسجل مسبقاً
                  </button>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    استخدم هذا الخيار إذا كان ابنك مسجلاً سابقاً في المنصة، وسيتم إرسال طلب ربطه بحسابك للإدارة.
                  </p>
                </div>

                <div className="rounded-lg border border-indigo-400 bg-indigo-50 p-3 shadow-sm transition hover:shadow-md">
                  <button
                    onClick={() => {
                      setAddModalMode('register');
                      setShowAddModal(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-semibold flex items-center justify-center"
                  >
                    <FaPlus className="ml-2" /> تسجيل ابن جديد كطالب
                  </button>
                  <p className="mt-2 text-xs leading-5 text-indigo-800">
                    استخدم هذا الخيار إذا لم يكن لابنك سجل في المنصة، وسيتم إنشاء حساب طالب جديد بانتظار تفعيل الإدارة.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Child Details — اللوحة الحديثة */}
        <div className="w-full">
          {selectedChild && (
            dataLoading ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600"></div>
                <p className="mr-3 text-slate-600">جاري تحميل البيانات...</p>
              </div>
            ) : (
              <ChildDashboard
                child={selectedChild}
                childData={childData}
                semesterOptions={semesterOptions}
                isStudentView={isStudentView}
                onBack={() => {
                  setSelectedChild(null);
                  setSelectedSemesterId(null);
                  setSelectedSemesterPanel(null);
                }}
                onOpenRegistration={openSemesterRegistration}
                registeringSemesterId={registeringSemesterId}
                attendanceBySemester={attendanceBySemester}
                attendanceLoadingSemesterId={attendanceLoadingSemesterId}
                onFetchAttendance={(semesterId) => fetchSemesterAttendance(selectedChild.student_id, semesterId)}
              />
            )
          )}
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">
                {addModalMode === 'register'
                  ? 'تسجيل ابن جديد كطالب'
                  : addModalMode === 'request'
                    ? 'طلب إضافة ابن'
                    : 'إضافة طالب'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalMode('direct');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            {addModalMode === 'register' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={studentRegistrationForm.id}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, id: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="رقم هوية الطالب"
                />
                <input
                  type="date"
                  value={studentRegistrationForm.date_of_birth}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={studentRegistrationForm.first_name}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="الاسم الأول"
                />
                <input
                  type="text"
                  value={studentRegistrationForm.second_name}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, second_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="الاسم الثاني"
                />
                <input
                  type="text"
                  value={studentRegistrationForm.third_name}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, third_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="اسم الجد"
                />
                <input
                  type="text"
                  value={studentRegistrationForm.last_name}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="العائلة"
                />
                <select
                  value={studentRegistrationForm.school_level}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, school_level: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">اختر المرحلة الدراسية</option>
                  <option value="لم يدخل المدرسة">لم يدخل المدرسة</option>
                  <option value="روضة">روضة</option>
                  <option value="الأول الابتدائي">الأول الابتدائي</option>
                  <option value="الثاني الابتدائي">الثاني الابتدائي</option>
                  <option value="الثالث الابتدائي">الثالث الابتدائي</option>
                  <option value="الرابع الابتدائي">الرابع الابتدائي</option>
                  <option value="الخامس الابتدائي">الخامس الابتدائي</option>
                  <option value="السادس الابتدائي">السادس الابتدائي</option>
                  <option value="الأول متوسط">الأول متوسط</option>
                  <option value="الثاني متوسط">الثاني متوسط</option>
                  <option value="الثالث متوسط">الثالث متوسط</option>
                  <option value="الأول ثانوي">الأول ثانوي</option>
                  <option value="الثاني ثانوي">الثاني ثانوي</option>
                  <option value="الثالث ثانوي">الثالث ثانوي</option>
                  <option value="غير محدد">غير محدد</option>
                </select>
                <input
                  type="password"
                  value={studentRegistrationForm.password}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="كلمة مرور الطالب"
                />
                <input
                  type="text"
                  value={studentRegistrationForm.phone}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="جوال الطالب (اختياري)"
                />
                <input
                  type="email"
                  value={studentRegistrationForm.email}
                  onChange={(e) => setStudentRegistrationForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="البريد الإلكتروني (اختياري)"
                />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم هوية الطالب
                  </label>
                  <input
                    type="text"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="مثال: 1234567890"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={selectedStudentDob}
                    onChange={(e) => setSelectedStudentDob(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع العلاقة
                  </label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="parent">والد/والدة</option>
                    <option value="guardian">ولي أمر</option>
                    <option value="relative">قريب</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalMode('direct');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddChild}
                disabled={isAddChildSubmitDisabled}
                className={`px-4 py-2 rounded-md ${
                  !isAddChildSubmitDisabled
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {addModalMode === 'register'
                  ? 'تسجيل الطالب'
                  : addModalMode === 'request'
                    ? 'إرسال الطلب'
                    : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSemesterRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-gray-900">تسجيل الطالب في الفصل</h3>
              <p className="mt-1 text-sm text-gray-600">
                {pendingSemesterRegistration.semester.label
                  || pendingSemesterRegistration.semester.display_name
                  || `الفصل ${getSemesterTypeText(pendingSemesterRegistration.semester.type)} ${pendingSemesterRegistration.semester.year}`}
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm text-gray-600">المستوى السابق</p>
              <p className="mt-1 font-semibold text-gray-900">
                {selectedChild?.school_level || childData?.student?.school_level || 'غير محدد'}
              </p>
            </div>

            <label className="mb-2 block text-sm font-semibold text-gray-800">
              المستوى الدراسي لهذا الفصل
            </label>
            <select
              value={pendingSemesterRegistration.school_level}
              onChange={(e) => setPendingSemesterRegistration((prev) => ({
                ...prev,
                school_level: e.target.value
              }))}
              className="mb-5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="">اختر المستوى الدراسي</option>
              {SCHOOL_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingSemesterRegistration(null)}
                className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRegisterSemester}
                disabled={registeringSemesterId === pendingSemesterRegistration.semester.id}
                className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {registeringSemesterId === pendingSemesterRegistration.semester.id ? 'جارٍ التسجيل...' : 'تأكيد التسجيل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Children;







