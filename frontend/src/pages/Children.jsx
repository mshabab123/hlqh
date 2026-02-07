import React, { useState, useEffect } from 'react';
import { FaUser, FaGraduationCap, FaTrophy, FaBook, FaHistory, FaChartLine, FaCalendarAlt, FaEdit, FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import { getSurahNameFromId } from '../utils/quranData';
import { calculateQuranBlocks, calculateStudentGoalProgress, formatMemorizationDisplay } from '../utils/studentUtils';
import QuranBlocksGrid from '../components/QuranBlocksGrid';
import axios from '../utils/axiosConfig';

const Children = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentDob, setSelectedStudentDob] = useState('');
  const [relationshipType, setRelationshipType] = useState('parent');
  const [dataLoading, setDataLoading] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;
  const userId = user?.id;

  const canViewChildren = ['parent', 'admin', 'administrator', 'teacher'].includes(userRole);

  useEffect(() => {
    if (canViewChildren) {
      fetchChildren();
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      setDataLoading(true);
      fetchChildData(selectedChild.student_id).finally(() => setDataLoading(false));
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/children/${userId}`);
      setChildren(response.data.children || []);
      if (response.data.children?.length > 0) {
        setSelectedChild(response.data.children[0]);
      }
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
      const [gradesRes, pointsRes, attendanceRes, goalsRes, studentRes] = await Promise.allSettled([
        axios.get(`/api/grades/student/${studentId}`),
        axios.get(`/api/points/student/${studentId}`),
        axios.get(`/api/attendance/student/${studentId}/semester`, {
          validateStatus: (status) => status === 200 || status === 404
        }),
        axios.get(`/api/students/${studentId}/goals`),
        axios.get(`/api/students/${studentId}`)
      ]);

      const gradesData = gradesRes.status === 'fulfilled' ? gradesRes.value.data : { grades: [] };
      const pointsData = pointsRes.status === 'fulfilled' ? pointsRes.value.data : { points: [], totalPoints: 0 };
      const attendanceData = attendanceRes.status === 'fulfilled' && attendanceRes.value.status !== 404
        ? attendanceRes.value.data
        : { days: [], statistics: { attendance_rate: 0 } };
      const goalsData = goalsRes.status === 'fulfilled' ? goalsRes.value.data : { goals: [] };
      const studentData = studentRes.status === 'fulfilled' ? studentRes.value.data?.student : null;

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

  const handleAddChild = async () => {
    try {
      await axios.post(
        `/api/children/${userId}/add`,
        {
          studentId: selectedStudentId.trim(),
          dateOfBirth: selectedStudentDob,
          relationshipType: relationshipType,
          isPrimary: false
        }
      );
      setShowAddModal(false);
      fetchChildren();
      setSelectedStudentId('');
      setSelectedStudentDob('');
    } catch (err) {
      console.error('Error adding child:', err);
      alert('خطأ في إضافة الطالب');
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

  const renderAttendance = () => {
    if (!childData?.attendance?.length) {
      return (
        <div className="text-center py-8">
          <FaCalendarAlt className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500">لا توجد سجلات حضور</p>
        </div>
      );
    }

    const stats = childData.statistics || {};
    const presentCount = childData.attendance.filter(day => day.is_present === true).length;
    const absentCount = childData.attendance.filter(day => day.is_present === false).length;

    const months = childData.attendance.reduce((acc, day) => {
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
              <p className="text-2xl font-bold text-blue-600">{stats.attendancePercentage}%</p>
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

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Children List */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-lg font-semibold">الأبناء</span>
              {userRole === 'parent' && (
                <button
                  onClick={() => {
                    setShowAddModal(true);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
                >
                  <FaPlus className="ml-1" /> إضافة
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {children.map((child) => (
                <div
                  key={child.relationship_id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center ${
                    selectedChild?.relationship_id === child.relationship_id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedChild(child)}
                >
                  <div className="flex items-center">
                    <FaUser className="text-gray-400 ml-2" />
                    <span>{child.first_name} {child.last_name}</span>
                  </div>
                  {userRole === 'parent' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChild(child.relationship_id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              {children.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  لا يوجد أبناء مسجلين
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Child Details */}
        <div className="lg:w-3/4">
          {selectedChild ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-xl font-semibold">
                  {selectedChild.first_name} {selectedChild.second_name} {selectedChild.third_name} {selectedChild.last_name}
                </h4>
                <p className="text-sm text-gray-600">
                  المستوى: {selectedChild.school_level || 'غير محدد'}
                </p>
              </div>

              <div className="p-6">
                {dataLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mr-3">جاري تحميل البيانات...</p>
                  </div>
                ) : (
                  <>
                    {renderStatistics()}
                    {/* Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setActiveCard(tab.id);
                          }}
                          className={`rounded-lg border p-3 text-center transition-colors ${
                            activeTab === tab.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {tab.icon}
                            <span className="text-sm font-medium">{tab.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                {/* Modal Card */}
                {activeCard && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
                      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <div className="text-lg font-semibold text-gray-800">
                          {tabs.find(tab => tab.id === activeCard)?.label || ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveCard(null)}
                          className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                          aria-label="إغلاق"
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                        {renderCardContent(activeCard)}
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <p className="text-sm text-blue-700">الرجاء اختيار طالب من القائمة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">إضافة طالب</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

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

            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddChild}
                disabled={!selectedStudentId.trim() || !selectedStudentDob}
                className={`px-4 py-2 rounded-md ${
                  selectedStudentId.trim() && selectedStudentDob
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Children;


























