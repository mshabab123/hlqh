import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineStar, AiOutlineUserAdd, AiOutlineSave, AiOutlineClose, AiOutlineEdit, AiOutlineDelete, AiOutlineTable, AiOutlineCalendar } from "react-icons/ai";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import { 
  getMaxVerse, 
  calculateStudentGoalProgress,
  calculateTotalScore
} from "../utils/classUtils";
import { getSurahIdFromName, getSurahNameFromId } from "../utils/quranData";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentProfileModal = ({ student, classItem, onBack, onClose }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // Points and attendance data
  const [pointsData, setPointsData] = useState({ totalPoints: 0, averagePoints: 0, pointsCount: 0 });
  const [attendanceData, setAttendanceData] = useState({ attendanceRate: 0, presentDays: 0, totalDays: 0 });
  
  // Points modal state
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({ points: 0, notes: "" });
  
  // Attendance modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("present");

  // New table modals state
  const [showAbsentTableModal, setShowAbsentTableModal] = useState(false);
  const [showPointsTableModal, setShowPointsTableModal] = useState(false);
  const [absentRecords, setAbsentRecords] = useState([]);
  const [pointsRecords, setPointsRecords] = useState([]);
  
  // Grade modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null); // Track which grade is being edited
  const [gradeInput, setGradeInput] = useState({
    grade_value: '',
    max_grade: '100',
    notes: '',
    start_surah: '',
    start_verse: '',
    end_surah: '',
    end_verse: '',
    grade_date: new Date().toISOString().split('T')[0], // Default to today's date
    grade_time: new Date().toTimeString().slice(0, 5) // Default to current time (HH:MM)
  });
  const [goalProgress, setGoalProgress] = useState({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState({
    target_surah: '',
    target_ayah_number: '',
    target_date: ''
  });
  const [savingGoal, setSavingGoal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student && classItem) {
      fetchStudentProfile();
    }
  }, [student, classItem]);

  // Calculate goal progress whenever studentData changes
  useEffect(() => {
    if (studentData?.goal && studentData?.grades) {
      calculateGoalProgress();
    }
  }, [studentData]);

  const calculateGoalProgress = () => {
    if (!studentData) {
      setGoalProgress({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
      return;
    }

    const progress = calculateStudentGoalProgress(studentData);
    setGoalProgress(progress);
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/student/${student.id}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setStudentData(response.data);
      console.log('Student Profile Data:', response.data);
      
      // Fetch points and attendance data in parallel
      await Promise.all([
        fetchPointsData(),
        fetchAttendanceData()
      ]);
      
    } catch (err) {
      setError("فشل في تحميل ملف الطالب");
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsData = async () => {
    try {
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const currentSemester = semesterResponse.data.semester;
      if (!currentSemester) return;

      // Fetch student points data
      const pointsResponse = await axios.get(`${API_BASE}/api/points/student/${student.id}`, {
        params: {
          semester_id: currentSemester.id
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const points = pointsResponse.data.points || [];
      const summary = pointsResponse.data.summary || {};
      
      setPointsData({
        totalPoints: parseFloat(summary.total_points || 0),
        averagePoints: parseFloat(summary.average_points || 0),
        pointsCount: parseInt(summary.total_entries || 0)
      });
      
    } catch (error) {
      console.error('Error fetching points data:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const currentSemester = semesterResponse.data.semester;
      if (!currentSemester) return;

      // Fetch attendance data
      const attendanceResponse = await axios.get(`${API_BASE}/api/attendance/semester/${currentSemester.id}/class/${classItem.id}`, {
        params: {
          student_id: student.id
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const attendanceRecords = attendanceResponse.data || [];
      const presentDays = attendanceRecords.filter(record => record.is_present === true).length;
      const totalDays = attendanceRecords.length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      
      setAttendanceData({
        attendanceRate: attendanceRate,
        presentDays: presentDays,
        totalDays: totalDays
      });
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const handleAddGrade = (course) => {
    setSelectedCourse(course);
    setGradeInput({
      grade_value: '',
      max_grade: '100',
      notes: '',
      start_surah: '',
      start_verse: '',
      end_surah: '',
      end_verse: '',
      grade_date: new Date().toISOString().split('T')[0], // Reset to today's date
      grade_time: new Date().toTimeString().slice(0, 5) // Reset to current time
    });
    setError('');
  };

  const saveGoal = async () => {
    if (!goalInput.target_surah || !goalInput.target_ayah_number) {
      setError('يرجى تحديد السورة والآية المستهدفة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSavingGoal(true);
      
      const response = await axios.put(
        `${API_BASE}/api/classes/${classItem.id}/student/${student.id}/goal`,
        {
          target_surah_id: getSurahIdFromName(goalInput.target_surah),
          target_ayah_number: parseInt(goalInput.target_ayah_number)
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local data with new goal
      setStudentData({
        ...studentData,
        goal: response.data.goal
      });
      
      setShowGoalForm(false);
      setGoalInput({
        target_surah: '',
        target_ayah_number: '',
        target_date: ''
      });
      
      // Refresh the student profile to get updated data
      fetchStudentProfile();
      
      // Show success message
      alert('تم حفظ الهدف بنجاح!');
      
    } catch (err) {
      console.error('Error saving goal:', err);
      setError(err.response?.data?.error || "فشل في حفظ الهدف");
      setTimeout(() => setError(''), 5000);
    } finally {
      setSavingGoal(false);
    }
  };

  const saveGrade = async () => {
    if (!gradeInput.grade_value) {
      setError('يرجى إدخال الدرجة');
      return;
    }

    // Build reference strings for Quran verses - convert Surah names to IDs
    const start_ref = gradeInput.start_surah && gradeInput.start_verse ?
      `${getSurahIdFromName(gradeInput.start_surah)}:${gradeInput.start_verse}` : '';
    const end_ref = gradeInput.end_surah && gradeInput.end_verse ?
      `${getSurahIdFromName(gradeInput.end_surah)}:${gradeInput.end_verse}` : '';

    console.log('Saving grade references:', {
      start_surah_name: gradeInput.start_surah,
      start_surah_id: getSurahIdFromName(gradeInput.start_surah),
      start_ref,
      end_ref
    });

    try {
      setSaving(true);

      if (editingGrade) {
        // Update existing grade
        await axios.put(`${API_BASE}/api/grades/${editingGrade.id}`, {
          grade_value: parseFloat(gradeInput.grade_value),
          max_grade: parseFloat(gradeInput.max_grade),
          notes: gradeInput.notes,
          start_reference: start_ref,
          end_reference: end_ref,
          grade_date: gradeInput.grade_date,
          class_id: classItem.id
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        // Create new grade
        await axios.post(`${API_BASE}/api/classes/${classItem.id}/grades`, {
          student_id: student.id,
          course_id: selectedCourse.id,
          grade_value: parseFloat(gradeInput.grade_value),
          max_grade: parseFloat(gradeInput.max_grade),
          notes: gradeInput.notes,
          grade_type: 'memorization',
          start_reference: start_ref,
          end_reference: end_ref,
          grade_date: gradeInput.grade_date
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      setSelectedCourse(null);
      setEditingGrade(null);
      setGradeInput({
        grade_value: '', max_grade: '100', notes: '',
        start_surah: '', start_verse: '', end_surah: '', end_verse: '',
        grade_date: new Date().toISOString().split('T')[0],
        grade_time: new Date().toTimeString().slice(0, 5)
      });
      fetchStudentProfile();

    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ الدرجة");
    } finally {
      setSaving(false);
    }
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    setSelectedCourse(studentData.courses.find(c => c.id === grade.course_id));

    // Parse references back to surah names and verses
    let startSurah = '', startVerse = '', endSurah = '', endVerse = '';

    if (grade.start_reference) {
      const [surahId, verse] = grade.start_reference.split(':');
      startSurah = getSurahNameFromId(parseInt(surahId)) || '';
      startVerse = verse || '';
    }

    if (grade.end_reference) {
      const [surahId, verse] = grade.end_reference.split(':');
      endSurah = getSurahNameFromId(parseInt(surahId)) || '';
      endVerse = verse || '';
    }

    setGradeInput({
      grade_value: grade.grade_value?.toString() || '',
      max_grade: grade.max_grade?.toString() || '100',
      notes: grade.notes || '',
      start_surah: startSurah,
      start_verse: startVerse,
      end_surah: endSurah,
      end_verse: endVerse,
      grade_date: grade.date_graded ? grade.date_graded.split('T')[0] : new Date().toISOString().split('T')[0],
      grade_time: grade.date_graded ? new Date(grade.date_graded).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5)
    });

    setShowGradeModal(true);
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدرجة؟')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/grades/${gradeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      fetchStudentProfile();
      setSuccess('تم حذف الدرجة بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حذف الدرجة");
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchAbsentRecords = async () => {
    try {
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const currentSemester = semesterResponse.data.semester;
      if (!currentSemester) return;

      // Fetch absent records for this student
      const response = await axios.get(`${API_BASE}/api/attendance/semester/${currentSemester.id}/class/${classItem.id}`, {
        params: {
          student_id: student.id,
          status: 'absent'
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Filter only absent records
      const absentOnly = response.data.filter(record => !record.is_present);
      setAbsentRecords(absentOnly);
      setShowAbsentTableModal(true);
    } catch (error) {
      console.error('Error fetching absent records:', error);
      setError('فشل في جلب سجلات الغياب');
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchPointsRecords = async () => {
    try {
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const currentSemester = semesterResponse.data.semester;
      if (!currentSemester) return;

      // Fetch detailed points records
      const response = await axios.get(`${API_BASE}/api/points/student/${student.id}`, {
        params: {
          semester_id: currentSemester.id
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPointsRecords(response.data.points || []);
      setShowPointsTableModal(true);
    } catch (error) {
      console.error('Error fetching points records:', error);
      setError('فشل في جلب سجلات النقاط');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openPointsModal = () => {
    setPointsForm({ points: 0, notes: "" });
    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    setShowPointsModal(false);
    setPointsForm({ points: 0, notes: "" });
  };

  const handleGivePoints = async (e) => {
    e.preventDefault();
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      await axios.post(`${API_BASE}/api/points`, {
        student_id: student.id,
        class_id: classItem.id,
        semester_id: semesterResponse.data.semester.id,
        points_date: currentDate,
        points_given: parseFloat(pointsForm.points),
        notes: pointsForm.notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess("تم إعطاء النقاط بنجاح");
      closePointsModal();
      fetchPointsData(); // Refresh points data
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في إعطاء النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const openAttendanceModal = () => {
    setAttendanceStatus("present");
    setShowAttendanceModal(true);
  };

  const closeAttendanceModal = () => {
    setShowAttendanceModal(false);
    setAttendanceStatus("present");
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Get current semester
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      await axios.post(`${API_BASE}/api/attendance`, {
        semester_id: semesterResponse.data.semester.id,
        class_id: classItem.id,
        student_id: student.id,
        attendance_date: currentDate,
        is_present: attendanceStatus === 'present',
        is_explicit: true,
        notes: null
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess(`تم تسجيل ${attendanceStatus === 'present' ? 'حضور' : 'غياب'} الطالب بنجاح`);
      closeAttendanceModal();
      fetchAttendanceData(); // Refresh attendance data
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في تسجيل الحضور");
      setTimeout(() => setError(""), 3000);
    }
  };

  if (!student || !classItem) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <div className="text-center">جاري تحميل ملف الطالب...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-lg"
            >
              ← العودة للقائمة
            </button>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-primary-700)]">
              ملف الطالب: {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h2>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={openPointsModal}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              <AiOutlineStar />
              إعطاء نقاط
            </button>
            <button
              onClick={openAttendanceModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              <AiOutlineUserAdd />
              تسجيل حضور
            </button>
            <button
              onClick={fetchAbsentRecords}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              <AiOutlineCalendar />
              جدول الغياب
            </button>
            <button
              onClick={fetchPointsRecords}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              <AiOutlineTable />
              جدول النقاط
            </button>
          </div>
        </div>

        {studentData && (
          <div className="space-y-6">
            {/* Student Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 bg-gray-50 p-2 sm:p-3 md:p-4 rounded-lg">
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{calculateTotalScore(studentData)}%</div>
                <div className="text-xs sm:text-sm text-gray-600">المجموع الكلي</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{studentData.grades?.length || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600">إجمالي الدرجات</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">
                  {studentData.memorized_pages || 0}
                  <span className="text-xs sm:text-sm text-gray-500">/{studentData.total_pages || TOTAL_QURAN_PAGES}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">الصفحات المحفوظة</div>
                <div className="text-[10px] sm:text-xs text-indigo-500">
                  {studentData.pages_percentage ? `${studentData.pages_percentage}%` : '0%'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">
                  {pointsData.totalPoints.toFixed(1)}
                  <span className="text-xs sm:text-sm text-gray-500">/{pointsData.pointsCount > 0 ? (pointsData.pointsCount * 5) : 0}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">إجمالي النقاط</div>
                <div className="text-[10px] sm:text-xs text-yellow-500">
                  {pointsData.pointsCount > 0 ? `متوسط: ${pointsData.averagePoints.toFixed(1)}/5` : 'لا توجد نقاط'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600">
                  {attendanceData.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600">معدل الحضور</div>
                <div className="text-[10px] sm:text-xs text-emerald-500">
                  {attendanceData.presentDays}/{attendanceData.totalDays} يوم
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-base md:text-lg font-bold text-purple-600">{student.school_level}</div>
                <div className="text-xs sm:text-sm text-gray-600">المستوى</div>
              </div>
              <div className="text-center">
                <div className="text-sm sm:text-base md:text-lg font-bold text-orange-600">{classItem.name}</div>
                <div className="text-xs sm:text-sm text-gray-600">الحلقة</div>
              </div>
            </div>

 
            {/* Goal and Progress Section */}
            {studentData.goal?.target_surah_id && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">الهدف والتقدم</h3>
                  <button
                    onClick={() => setShowGoalForm(!showGoalForm)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    {showGoalForm ? 'إخفاء' : 'تعديل الهدف'}
                  </button>
                </div>

                {/* Last Recorded Memorization Grade */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 mb-4">
                  <h4 className="text-lg font-semibold text-green-800 mb-3">📖 آخر درجة حفظ مسجلة</h4>
                  <div className="bg-white p-4 rounded-lg border">
                    {(() => {
                      // Find the most recent memorization grade
                      const memorization_courses = ['تحفيظ القرآن', 'تحفيظ', 'حفظ القرآن', 'الحفظ', 'قرآن'];
                      const recentMemorizationGrades = studentData.grades?.filter(grade => 
                        memorization_courses.some(course => 
                          grade.course_name?.toLowerCase().includes(course.toLowerCase())
                        ) && grade.start_reference
                      ).sort((a, b) => new Date(b.date_graded || b.created_at) - new Date(a.date_graded || a.created_at));
                      
                      const latestGrade = recentMemorizationGrades?.[0];
                      
                      if (!latestGrade) {
                        return (
                          <div className="text-center text-gray-600">
                            <div className="text-sm">لا توجد درجات حفظ مسجلة بعد</div>
                          </div>
                        );
                      }
                      
                      // Helper function to convert reference ID format to readable format
                      const formatReference = (ref) => {
                        if (!ref) return '';
                        const [surahId, ayah] = ref.split(':');
                        const surahName = getSurahNameFromId(parseInt(surahId));
                        return { surahName: surahName || `سورة رقم ${surahId}`, ayah: ayah };
                      };
                      
                      const startRef = formatReference(latestGrade.start_reference);
                      const endRef = formatReference(latestGrade.end_reference);
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">المقطع المحفوظ:</div>
                            <div className="text-base font-bold text-green-700">
                              {startRef.surahName && endRef.surahName && startRef.surahName === endRef.surahName
                                ? `سورة ${startRef.surahName}`
                                : startRef.surahName && endRef.surahName
                                ? `من ${startRef.surahName} إلى ${endRef.surahName}`
                                : startRef.surahName || 'غير محدد'
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">الآيات:</div>
                            <div className="text-base font-bold text-green-700">
                              {startRef.ayah && endRef.ayah
                                ? startRef.ayah === endRef.ayah
                                  ? `الآية ${startRef.ayah}`
                                  : `من الآية ${startRef.ayah} إلى ${endRef.ayah}`
                                : startRef.ayah || 'غير محدد'
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">الدرجة:</div>
                            <div className="text-base font-bold text-blue-700">
                              {Math.round(parseFloat(latestGrade.grade_value))}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(latestGrade.date_graded || latestGrade.created_at).toLocaleDateString('ar-SA', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المحدد:</h4>
                    <p className="text-base font-bold text-blue-700">
                      {(() => {
                        const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                        const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;
                        
                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };
                        
                        if (!currentSurahId || currentSurahId === 0) {
                          // No current memorization - start from beginning
                          return `من سورة الناس إلى سورة ${getCurrentSurahName(targetSurahId)} الآية ${targetAyah}`;
                        } else if (currentSurahId === targetSurahId) {
                          // Same surah
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          if (currentAyah >= targetAyah) {
                            return `🎉 تم تحقيق الهدف - سورة ${currentSurahName} الآية ${currentAyah}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${currentAyah + 1} إلى الآية ${targetAyah}`;
                          }
                        } else {
                          // Different surahs
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          const targetSurahName = getCurrentSurahName(targetSurahId);
                          if (currentSurahId < targetSurahId) {
                            return `🎉 تم تجاوز الهدف - الحالي: سورة ${currentSurahName}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${currentAyah + 1} إلى سورة ${targetSurahName} الآية ${targetAyah}`;
                          }
                        }
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">إحصائيات الهدف الحالي:</h4>
                    <div className="space-y-3">
                      {(() => {
                        const progress = calculateStudentGoalProgress(studentData);
                        const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                        const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;
                        
                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };
                        
                        // Calculate pages for goal progress
                        const calculateGoalPages = () => {
                          if (!targetSurahId || !targetAyah) return { goalPages: 0, currentPages: 0, remainingPages: 0 };
                          
                          let goalPages = 0;
                          let currentPages = 0;
                          
                          // Calculate total pages needed for the goal (from current position to target)
                          if (!currentSurahId || currentSurahId === 0) {
                            // No current memorization - calculate from beginning (Surah 114) to target
                            for (let surahId = 114; surahId >= targetSurahId; surahId--) {
                              const surah = QURAN_SURAHS.find(s => s.id === surahId);
                              if (!surah) continue;
                              
                              if (surahId === targetSurahId) {
                                // Target surah - calculate pages for target ayahs
                                const ayahProgress = Math.min(targetAyah, surah.ayahCount) / surah.ayahCount;
                                goalPages += Math.ceil(ayahProgress * surah.totalPages);
                              } else {
                                // Complete surah
                                goalPages += surah.totalPages;
                              }
                            }
                            currentPages = 0; // Nothing memorized yet
                          } else {
                            // Calculate pages from current position to target position
                            const currentSurahIdInt = parseInt(currentSurahId);
                            const currentAyahInt = parseInt(currentAyah);
                            
                            if (currentSurahIdInt < targetSurahId || 
                                (currentSurahIdInt === targetSurahId && currentAyahInt >= targetAyah)) {
                              // Goal already achieved
                              goalPages = 1; // Minimum for calculation
                              currentPages = 1;
                            } else {
                              // Calculate pages needed from current to target
                              for (let surahId = currentSurahIdInt; surahId >= targetSurahId; surahId--) {
                                const surah = QURAN_SURAHS.find(s => s.id === surahId);
                                if (!surah) continue;
                                
                                if (surahId === currentSurahIdInt && surahId === targetSurahId) {
                                  // Same surah - calculate pages from current ayah to target ayah
                                  const ayahsNeeded = targetAyah - currentAyahInt;
                                  const ayahProgress = ayahsNeeded / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else if (surahId === currentSurahIdInt) {
                                  // Current surah - pages from current ayah to end
                                  const remainingAyahs = surah.ayahCount - currentAyahInt;
                                  const ayahProgress = remainingAyahs / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else if (surahId === targetSurahId) {
                                  // Target surah - pages from beginning to target ayah
                                  const ayahProgress = targetAyah / surah.ayahCount;
                                  goalPages += Math.ceil(ayahProgress * surah.totalPages);
                                } else {
                                  // Complete surah in between
                                  goalPages += surah.totalPages;
                                }
                              }
                              currentPages = 0; // Not achieved yet
                            }
                          }
                          
                          return { 
                            goalPages, 
                            currentPages, 
                            remainingPages: Math.max(0, goalPages - currentPages) 
                          };
                        };
                        
                        const goalPagesInfo = calculateGoalPages();
                        const isGoalAchieved = progress.percentage >= 100;
                        
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                            {/* Goal Status */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">حالة الهدف</div>
                              <div className={`text-xs sm:text-sm font-bold ${isGoalAchieved ? 'text-green-600' : 'text-blue-600'}`}>
                                {isGoalAchieved ? '🎉 تم تحقيق الهدف' : '📚 قيد التحقيق'}
                              </div>
                            </div>
                            
                            {/* Current Position */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الموقع الحالي</div>
                              <div className="text-xs sm:text-sm font-bold text-purple-600">
                                {currentSurahId ? `سورة ${getCurrentSurahName(currentSurahId)} - آية ${currentAyah}` : 'لم يبدأ بعد'}
                              </div>
                            </div>
                            
                            {/* Target Position */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الهدف المطلوب</div>
                              <div className="text-xs sm:text-sm font-bold text-orange-600">
                                سورة {getCurrentSurahName(targetSurahId)} - آية {targetAyah}
                              </div>
                            </div>
                            
                            {/* Remaining Verses */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الآيات المتبقية</div>
                              <div className="text-xs sm:text-sm font-bold text-red-600">
                                {isGoalAchieved ? '0 آية' : `${progress.totalGoalVerses - progress.memorizedVerses} آية`}
                              </div>
                            </div>
                            
                            {/* Remaining Pages */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الصفحات المتبقية</div>
                              <div className="text-xs sm:text-sm font-bold text-indigo-600">
                                {isGoalAchieved ? '0 صفحة' : `${goalPagesInfo.remainingPages} صفحة`}
                              </div>
                            </div>
                            
                            {/* Total Goal Pages */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">إجمالي صفحات الهدف</div>
                              <div className="text-xs sm:text-sm font-bold text-cyan-600">
                                {goalPagesInfo.goalPages} صفحة
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Goal Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>تقدم الهدف:</span>
                          <span className="font-bold">
                            {(() => {
                              const progress = calculateStudentGoalProgress(studentData);
                              return `${progress.memorizedVerses} من ${progress.totalGoalVerses} آية`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full transition-all duration-500 ${
                              (() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return progress.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500';
                              })()
                            }`}
                            style={{ 
                              width: `${(() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return Math.min(100, progress.percentage);
                              })()}%` 
                            }}
                          >
                            <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                              {(() => {
                                const progress = calculateStudentGoalProgress(studentData);
                                return Math.min(100, progress.percentage);
                              })()}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!studentData.goal?.target_surah_id && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                <p className="text-center text-yellow-700 mb-3">لم يتم تحديد هدف للطالب بعد</p>
                <div className="text-center">
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    تحديد هدف جديد
                  </button>
                </div>
              </div>
            )}

            {/* Goal Setting Form */}
            {showGoalForm && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4">
                  {studentData.goal?.target_surah_id ? 'تعديل الهدف' : 'تحديد هدف جديد'}
                </h3>
                
                <div className="space-y-4">
                  {/* Surah Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">السورة المستهدفة:</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={goalInput.target_surah}
                      onChange={(e) => {
                        const selectedSurah = e.target.value;
                        let defaultAyah = "";
                        
                        // Set last ayah as default when selecting a surah
                        if (selectedSurah) {
                          defaultAyah = getMaxVerse(selectedSurah).toString();
                        }
                        
                        setGoalInput({
                          ...goalInput, 
                          target_surah: selectedSurah, 
                          target_ayah_number: defaultAyah
                        });
                      }}
                    >
                      <option value="">اختر السورة</option>
                      {[...QURAN_SURAHS].reverse().map(surah => (
                        <option key={surah.id} value={surah.name}>
                          {surah.id}. {surah.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Verse */}
                  {goalInput.target_surah && (
                    <div>
                      <label className="block text-sm font-medium mb-1">الآية المستهدفة (من الآية 1 إلى الآية المحددة):</label>
                      <input
                        type="number"
                        min="1"
                        max={getMaxVerse(goalInput.target_surah)}
                        className="w-full p-2 border rounded"
                        value={goalInput.target_ayah_number}
                        onChange={(e) => {
                          const verse = parseInt(e.target.value);
                          const maxVerse = getMaxVerse(goalInput.target_surah);
                          if (verse <= maxVerse || !verse) {
                            setGoalInput({...goalInput, target_ayah_number: e.target.value});
                          }
                        }}
                        placeholder={`1 - ${getMaxVerse(goalInput.target_surah)}`}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                        saveGoal();
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={savingGoal}
                    >
                      حفظ الهدف
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Course Buttons for Grade Entry */}
            <div>
              <h3 className="text-lg font-semibold mb-3">إضافة درجات - المواد الدراسية</h3>
              {(!studentData.courses || studentData.courses.length === 0) ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-yellow-700 mb-2">لا توجد مقررات مضافة لهذه الحلقة</p>
                  <p className="text-sm text-yellow-600">يرجى إضافة المقررات من صفحة إدارة الحلقات أولاً</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {studentData.courses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowGradeModal(true);
                      }}
                      className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-center font-medium"
                    >
                      {course.name}
                      {/* {course.percentage && (
                        <span className="block text-xs mt-1 opacity-75">
                          ({course.percentage}%)
                        </span>
                      )} */}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            العودة لقائمة الطلاب
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-lg mb-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingGrade ? 'تعديل الدرجة' : 'إضافة درجة جديدة'}
                </h3>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {student.first_name} {student.second_name} {student.last_name}
                </div>
              </div>
            </div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowGradeModal(false);
                  setSelectedCourse(null);
                  setEditingGrade(null);
                  setGradeInput({
                    grade_value: '', max_grade: '100', notes: '',
                    start_surah: '', start_verse: '', end_surah: '', end_verse: '',
                    grade_date: new Date().toISOString().split('T')[0],
                    grade_time: new Date().toTimeString().slice(0, 5)
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Course Display */}
              {/* {selectedCourse && (
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-gray-700">المادة المحددة:</div>
                  <div className="text-lg font-bold text-blue-700">
                    {selectedCourse.name} {selectedCourse.percentage && `(${selectedCourse.percentage}%)`}
                  </div>
                </div>
              )} */}

              {selectedCourse && (
                <>
                  {/* Grade Input */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">الدرجة (من 100):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder=" الدرجة"
                        className="w-20 p-2 border rounded"
                        value={gradeInput.grade_value}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value <= 100 || e.target.value === '') {
                            setGradeInput({...gradeInput, grade_value: e.target.value});
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">التاريخ:</label>
                      <input
                        type="date"
                        className="p-2 border rounded"
                        value={gradeInput.grade_date}
                        onChange={(e) => setGradeInput({...gradeInput, grade_date: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Quran Reference Fields - Only show for courses that require Quran references */}
                  {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">من (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.start_surah}
                            onChange={(e) => {
                              const surahName = e.target.value;
                              console.log('Selected surah:', surahName);
                              if (surahName) {
                                const maxVerse = getMaxVerse(surahName);
                                console.log('Max verse for', surahName, ':', maxVerse);
                                setGradeInput({
                                  ...gradeInput, 
                                  start_surah: surahName, 
                                  start_verse: '1',
                                  end_surah: surahName,     // Auto-set same surah
                                  end_verse: maxVerse.toString()  // Auto-set last verse
                                });
                                console.log('New gradeInput:', {
                                  ...gradeInput, 
                                  start_surah: surahName, 
                                  start_verse: '1',
                                  end_surah: surahName,
                                  end_verse: maxVerse.toString()
                                });
                              } else {
                                setGradeInput({...gradeInput, start_surah: '', start_verse: '', end_surah: '', end_verse: ''});
                              }
                            }}
                          >
                            <option value="">اختر السورة</option>
                            {[...QURAN_SURAHS].sort((a, b) => a.id - b.id).map(surah => (
                              <option key={surah.id} value={surah.name}>
                                {surah.id}. {surah.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.start_surah ? getMaxVerse(gradeInput.start_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.start_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.start_surah);
                              console.log('Start verse input changed:', e.target.value, 'Current value:', gradeInput.start_verse);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, start_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.start_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.start_surah)} آية` : ''}
                          />
                          {gradeInput.start_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.start_surah)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">إلى (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.end_surah}
                            onChange={(e) => {
                              const surahName = e.target.value;
                              console.log('Selected end surah:', surahName);
                              if (surahName) {
                                const maxVerse = getMaxVerse(surahName);
                                console.log('Max verse for end surah', surahName, ':', maxVerse);
                                setGradeInput({
                                  ...gradeInput, 
                                  end_surah: surahName, 
                                  end_verse: maxVerse.toString()  // Auto-set to last verse
                                });
                                console.log('New end verse set to:', maxVerse.toString());
                              } else {
                                setGradeInput({...gradeInput, end_surah: '', end_verse: ''});
                              }
                            }}
                          >
                            <option value="">اختر السورة</option>
                            {[...QURAN_SURAHS].sort((a, b) => a.id - b.id).map(surah => (
                              <option key={surah.id} value={surah.name}>
                                {surah.id}. {surah.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.end_surah ? getMaxVerse(gradeInput.end_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.end_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.end_surah);
                              console.log('End verse input changed:', e.target.value, 'Current value:', gradeInput.end_verse);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, end_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.end_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.end_surah)} آية` : ''}
                          />
                          {gradeInput.end_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.end_surah)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="ملاحظات (اختياري)"
                      className="flex-1 p-2 border rounded"
                      value={gradeInput.notes}
                      onChange={(e) => setGradeInput({...gradeInput, notes: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowGradeModal(false);
                        setSelectedCourse(null);
                        setEditingGrade(null);
                        setGradeInput({
                          grade_value: '', max_grade: '100', notes: '',
                          start_surah: '', start_verse: '', end_surah: '', end_verse: '',
                          grade_date: new Date().toISOString().split('T')[0]
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => {
                        saveGrade();
                        setShowGradeModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      disabled={saving || !gradeInput.grade_value}
                    >
                      <AiOutlineSave className="w-4 h-4 inline mr-2" />
                      {saving ? 'حفظ...' : (editingGrade ? 'تحديث الدرجة' : 'حفظ الدرجة')}
                    </button>
                  </div>

                  {/* Course Grade History */}
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">تاريخ درجات {selectedCourse.name}</h4>
                    <div className="bg-white rounded-lg border max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2 text-center text-sm border">الدرجة من 100</th>
                            {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                              <th className="p-2 text-center text-sm border">المرجع القرآني</th>
                            )}
                            <th className="p-2 text-center text-sm border">التاريخ</th>
                            <th className="p-2 text-right text-sm border">ملاحظات</th>
                            <th className="p-2 text-center text-sm border">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).map(grade => (
                            <tr key={grade.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center font-medium border text-sm">
                                {Math.round(parseFloat(grade.grade_value))}
                              </td>
                              {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                                <td className="p-2 text-center text-xs border">
                                  {(() => {
                                    // Helper function to convert reference ID format to readable format
                                    const formatReference = (ref) => {
                                      if (!ref) return '';
                                      const [surahId, ayah] = ref.split(':');
                                      const surahName = getSurahNameFromId(parseInt(surahId));
                                      return surahName ? `${surahName}:${ayah}` : ref;
                                    };

                                    if (grade.start_reference && grade.end_reference) {
                                      const startFormatted = formatReference(grade.start_reference);
                                      const endFormatted = formatReference(grade.end_reference);
                                      return `${startFormatted} - ${endFormatted}`;
                                    }
                                    return formatReference(grade.start_reference) || '-';
                                  })()}
                                </td>
                              )}
                              <td className="p-2 text-center text-xs border">
                                {new Date(grade.date_graded || grade.created_at).toLocaleDateString('ar-SA', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="p-2 text-xs border">
                                {grade.notes || '-'}
                              </td>
                              <td className="p-2 text-center border">
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handleEditGrade(grade)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                    title="تعديل الدرجة"
                                  >
                                    <AiOutlineEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGrade(grade.id)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                    title="حذف الدرجة"
                                  >
                                    <AiOutlineDelete className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {(!studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).length) && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          لا توجد درجات سابقة لهذه المادة
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                إعطاء نقاط - {student.first_name} {student.last_name}
              </h3>
              <button
                onClick={closePointsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleGivePoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النقاط (0 - 5)
                </label>
                <select
                  value={pointsForm.points}
                  onChange={(e) => setPointsForm({...pointsForm, points: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>0 - لا توجد نقاط</option>
                  <option value={0.5}>0.5 - نصف نقطة</option>
                  <option value={1}>1 - نقطة واحدة</option>
                  <option value={1.5}>1.5 - نقطة ونصف</option>
                  <option value={2}>2 - نقطتان</option>
                  <option value={2.5}>2.5 - نقطتان ونصف</option>
                  <option value={3}>3 - ثلاث نقاط</option>
                  <option value={3.5}>3.5 - ثلاث نقاط ونصف</option>
                  <option value={4}>4 - أربع نقاط</option>
                  <option value={4.5}>4.5 - أربع نقاط ونصف</option>
                  <option value={5}>5 - خمس نقاط (ممتاز)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختيارية)
                </label>
                <textarea
                  value={pointsForm.notes}
                  onChange={(e) => setPointsForm({...pointsForm, notes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="أضف ملاحظات حول أداء الطالب..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePointsModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <AiOutlineSave className="w-4 h-4" />
                  حفظ النقاط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                تسجيل حضور - {student.first_name} {student.last_name}
              </h3>
              <button
                onClick={closeAttendanceModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleMarkAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  حالة الحضور
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="attendance"
                      value="present"
                      checked={attendanceStatus === "present"}
                      onChange={(e) => setAttendanceStatus(e.target.value)}
                      className="mr-2"
                    />
                    حاضر
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="attendance"
                      value="absent"
                      checked={attendanceStatus === "absent"}
                      onChange={(e) => setAttendanceStatus(e.target.value)}
                      className="mr-2"
                    />
                    غائب
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAttendanceModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 text-white rounded-lg ${
                    attendanceStatus === 'present' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  تسجيل {attendanceStatus === 'present' ? 'حضور' : 'غياب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Absent Records Table Modal */}
      {showAbsentTableModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                سجل الغياب - {student.first_name} {student.last_name}
              </h3>
              <button
                onClick={() => setShowAbsentTableModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-center text-sm font-medium border">التاريخ</th>
                    <th className="p-3 text-center text-sm font-medium border">نوع الغياب</th>
                    <th className="p-3 text-center text-sm font-medium border">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {absentRecords.length > 0 ? (
                    absentRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 text-center text-sm border">
                          {new Date(record.attendance_date).toLocaleDateString('ar-SA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                            غياب
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500">
                        لا توجد سجلات غياب لهذا الطالب
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAbsentTableModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Records Table Modal */}
      {showPointsTableModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                سجل النقاط - {student.first_name} {student.last_name}
              </h3>
              <button
                onClick={() => setShowPointsTableModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AiOutlineClose className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-center text-sm font-medium border">التاريخ</th>
                    <th className="p-3 text-center text-sm font-medium border">النقاط</th>
                    <th className="p-3 text-center text-sm font-medium border">النقاط من 5</th>
                    <th className="p-3 text-center text-sm font-medium border">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsRecords.length > 0 ? (
                    pointsRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 text-center text-sm border">
                          {new Date(record.points_date || record.created_at).toLocaleDateString('ar-SA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-3 text-center text-sm border font-semibold">
                          {record.points_given}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          <div className="flex items-center justify-center">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= record.points_given ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-gray-500">
                        لا توجد سجلات نقاط لهذا الطالب
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPointsTableModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileModal;