import { useState, useEffect } from "react";
import axios from "../utils/axiosConfig";
import { AiOutlineStar, AiOutlineUserAdd, AiOutlineSave, AiOutlineClose, AiOutlineEdit, AiOutlineDelete, AiOutlineTable, AiOutlineCalendar, AiOutlineCheck, AiOutlineBook } from "react-icons/ai";
import { BsFillGridFill } from "react-icons/bs";
import { QURAN_SURAHS, TOTAL_QURAN_PAGES } from "../utils/quranData";
import {
  getMaxVerse,
  calculateTotalScore
} from "../utils/classUtils";
import {
  calculateStudentGoalProgress,
  calculateGoalProgressBar,
  formatMemorizationDisplay,
  calculatePageNumber,
  calculateQuranPagePercentage,
  calculateQuranBlocks
} from "../utils/studentUtils";
import { getSurahIdFromName, getSurahNameFromId } from "../utils/quranData";
import QuranProgressModal from "./QuranProgressModal";
import QuranBlocksModal from "./QuranBlocksModal";
import QuranTestingModal from "./QuranTestingModal";
import QuranHomeworkModal from "./QuranHomeworkModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Safe date formatting function showing both Hijri and Gregorian dates
const formatSafeDate = (dateString, options = {}) => {
  if (!dateString) return 'تاريخ غير صحيح';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'تاريخ غير صحيح';

    // Use local date formatting to avoid timezone issues
    const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));

    // Format Hijri date (primary display - what's currently being used)
    const hijriDate = localDate.toLocaleDateString('ar-SA', {
      weekday: options.weekday || 'short',
      year: 'numeric',
      month: options.month || 'short',
      day: 'numeric',
      calendar: 'islamic-umalqura',
      ...options
    });

    // Format Gregorian date (additional information from database)
    const gregorianDate = localDate.toLocaleDateString('ar-SA', {
      weekday: options.weekday || 'short',
      year: 'numeric',
      month: options.month || 'short',
      day: 'numeric',
      calendar: 'gregory'
    });

    return (
      <div className="text-xs">
        <div className="font-semibold text-gray-800">{hijriDate} هـ</div>
        <div className="text-gray-600 mt-1">{gregorianDate} م</div>
      </div>
    );
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'تاريخ غير صحيح';
  }
};

const StudentProfileModal = ({ student, classItem, onBack, onClose }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [semesterNotice, setSemesterNotice] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Points and attendance data
  const [pointsData, setPointsData] = useState({ totalPoints: 0, averagePoints: 0, pointsCount: 0 });
  const [attendanceData, setAttendanceData] = useState({ attendanceRate: 0, presentDays: 0, totalDays: 0 });
  
  // Points modal state
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({
    points: 0,
    notes: "",
    date: new Date().toISOString().split('T')[0] // Default to today
  });
  
  // Attendance modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("present");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // New table modals state
  const [showAbsentTableModal, setShowAbsentTableModal] = useState(false);
  const [showPointsTableModal, setShowPointsTableModal] = useState(false);

  // Points editing state
  const [editingPointRecord, setEditingPointRecord] = useState(null);
  const [editingPointForm, setEditingPointForm] = useState({ points: 0, notes: "", date: "" });

  // Attendance editing state
  const [editingAttendanceCell, setEditingAttendanceCell] = useState(null);
  const [editingAttendanceData, setEditingAttendanceData] = useState({
    date: '',
    isPresent: null
  });
  const [absentRecords, setAbsentRecords] = useState([]);
  const [pointsRecords, setPointsRecords] = useState([]);

  // Quran Progress Modal state
  const [showQuranProgressModal, setShowQuranProgressModal] = useState(false);
  const [quranModalStudentData, setQuranModalStudentData] = useState(null);

  // Quran Blocks Modal state
  const [showBlocksModal, setShowBlocksModal] = useState(false);

  // Quran Testing Modal state
  const [showQuranTestingModal, setShowQuranTestingModal] = useState(false);
  const [viewingTestData, setViewingTestData] = useState(null);

  // Homework Modal state
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);

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
      fetchUserRole();
    }
  }, [student, classItem]);

  // Close attendance editing dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingAttendanceCell && !event.target.closest('.attendance-edit-cell')) {
        setEditingAttendanceCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingAttendanceCell]);

  // Fetch user role
  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Decode token to get user role
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

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

  const getViewSemesterId = async () => {
    if (classItem?.semester_id) {
      return classItem.semester_id;
    }

    try {
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      return semesterResponse.data.semester?.id || null;
    } catch (error) {
      if (error.response?.status === 404) {
        setSemesterNotice('انتهى الفصل الدراسي الحالي، لا يمكن عرض البيانات.');
        return null;
      }
      console.error('Error fetching current semester:', error);
      return null;
    }
  };

  const getCurrentSemesterIdForWrite = async (endedMessage, mismatchMessage) => {
    try {
      const semesterResponse = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const currentSemester = semesterResponse.data.semester;
      if (!currentSemester) {
        setSemesterNotice(endedMessage);
        return null;
      }

      if (classItem?.semester_id && currentSemester.id !== classItem.semester_id) {
        setSemesterNotice(mismatchMessage);
        return null;
      }

      return currentSemester.id;
    } catch (error) {
      if (error.response?.status === 404) {
        setSemesterNotice(endedMessage);
        return null;
      }
      console.error('Error fetching current semester:', error);
      return null;
    }
  };


  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setSemesterNotice("");
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
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Fetch student points data
      const pointsResponse = await axios.get(`${API_BASE}/api/points/student/${student.id}`, {
        params: {
          semester_id: semesterId
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
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Fetch attendance data
      const attendanceResponse = await axios.get(`${API_BASE}/api/attendance/semester/${semesterId}/class/${classItem.id}`, {
        params: {
          student_id: student.id
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Get the student's attendance data from the response
      const studentAttendance = attendanceResponse.data.students?.find(s => s.student_id === student.id);
      const attendanceRecords = studentAttendance?.attendance || [];

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

  // Attendance editing handlers
  const handleAttendanceCellClick = (recordIndex, record) => {
    const cellKey = `attendance_${recordIndex}`;

    if (editingAttendanceCell === cellKey) {
      // Close if already editing this cell
      setEditingAttendanceCell(null);
      setEditingAttendanceData({ date: '', isPresent: null });
    } else {
      // Open editing for this cell
      setEditingAttendanceCell(cellKey);
      setEditingAttendanceData({
        date: record.date || record.attendance_date || '',
        isPresent: record.is_present
      });
    }
  };

  const handleAttendanceChange = async () => {
    if (!editingAttendanceData.date || editingAttendanceData.isPresent === null) {
      setError('يرجى تحديد التاريخ والحالة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Update attendance
      await axios.post(`${API_BASE}/api/attendance/mark`, {
        semester_id: semesterId,
        class_id: classItem.id,
        student_id: student.id,
        attendance_date: editingAttendanceData.date,
        is_present: editingAttendanceData.isPresent,
        notes: ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Update the local state
      setAbsentRecords(prev => prev.map(r => {
        const recordDate = r.date || r.attendance_date;
        if (recordDate === editingAttendanceData.date) {
          return {
            ...r,
            is_present: editingAttendanceData.isPresent,
            date: editingAttendanceData.date,
            attendance_date: editingAttendanceData.date
          };
        }
        return r;
      }));

      setEditingAttendanceCell(null);
      setEditingAttendanceData({ date: '', isPresent: null });
      setSuccess(`تم تسجيل ${editingAttendanceData.isPresent ? 'الحضور' : 'الغياب'} بنجاح`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('فشل في حفظ الحضور');
      setTimeout(() => setError(''), 3000);
    }
  };

  // QuranProgressModal handlers
  const handleQuranProgressSubmit = async (e, updatedStudent) => {
    e?.preventDefault();

    console.log('QuranProgressModal submit from StudentProfileModal:', updatedStudent);

    try {
      // Prepare student data like the students page does
      const studentData = {
        first_name: updatedStudent.first_name,
        second_name: updatedStudent.second_name,
        third_name: updatedStudent.third_name,
        last_name: updatedStudent.last_name,
        school_level: updatedStudent.school_level,
        status: updatedStudent.status
      };

      // Add Qur'an progress fields like students page
      if (updatedStudent.memorized_surah_id && updatedStudent.memorized_surah_id !== "") {
        studentData.memorized_surah_id = parseInt(updatedStudent.memorized_surah_id);
      }
      if (updatedStudent.memorized_ayah_number && updatedStudent.memorized_ayah_number !== "") {
        studentData.memorized_ayah_number = parseInt(updatedStudent.memorized_ayah_number);
      }
      if (updatedStudent.target_surah_id && updatedStudent.target_surah_id !== "") {
        studentData.target_surah_id = parseInt(updatedStudent.target_surah_id);
      }
      if (updatedStudent.target_ayah_number && updatedStudent.target_ayah_number !== "") {
        studentData.target_ayah_number = parseInt(updatedStudent.target_ayah_number);
      }

      console.log('Saving student data using same endpoint as students page:', studentData);

      // Use the same API endpoint as students page
      await axios.put(
        `${API_BASE}/api/students/${student.id}`,
        studentData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      // Update the student data with the new progress
      setStudentData(prevData => ({
        ...prevData,
        ...updatedStudent,
        // Ensure the data is properly converted for display
        memorized_surah_id: parseInt(updatedStudent.memorized_surah_id) || null,
        memorized_ayah_number: parseInt(updatedStudent.memorized_ayah_number) || null,
        target_surah_id: parseInt(updatedStudent.target_surah_id) || null,
        target_ayah_number: parseInt(updatedStudent.target_ayah_number) || null
      }));

      setShowQuranProgressModal(false);
      fetchStudentProfile(); // Refresh the data
    } catch (error) {
      console.error("Error saving Quran progress:", error);
      setError(error.response?.data?.error || "فشل في حفظ بيانات الحفظ");
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuranProgressCancel = () => {
    setShowQuranProgressModal(false);
    setQuranModalStudentData(null); // Clear temp data
  };

  const handleStudentChange = (updatedStudent) => {
    setStudentData(prevData => ({
      ...prevData,
      ...updatedStudent
    }));
  };

  const handleSaveQuranTest = async (testData) => {
    console.log('Saving Quran test result:', testData);

    if (!testData.course_id) {
      setError('يرجى اختيار المقرر أولاً');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSaving(true);

      // Build reference strings for the tested range
      const start_ref = testData.start_surah && testData.start_ayah
        ? `${testData.start_surah}:${testData.start_ayah}`
        : '';
      const end_ref = testData.end_surah && testData.end_ayah
        ? `${testData.end_surah}:${testData.end_ayah}`
        : '';

      // Use the calculated grade from the modal
      const calculatedGrade = testData.calculated_grade;
      const gradePerError = testData.grade_per_error || 1;

      // Save as a grade
      await axios.post(`${API_BASE}/api/classes/${classItem.id}/grades`, {
        student_id: student.id,
        course_id: testData.course_id,
        grade_value: calculatedGrade,
        max_grade: testData.max_grade,
        notes: testData.notes ? `${testData.notes}\n\nعدد الأخطاء: ${testData.total_errors}\nالخصم لكل خطأ: ${gradePerError}` : `عدد الأخطاء: ${testData.total_errors}\nالخصم لكل خطأ: ${gradePerError}`,
        grade_type: 'memorization',
        start_reference: start_ref,
        end_reference: end_ref,
        grade_date: testData.test_date,
        error_details: testData.error_details,
        quran_error_display: testData.quran_error_display
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setSuccess('تم حفظ نتيجة الاختبار بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      setShowQuranTestingModal(false);
      fetchStudentProfile(); // Refresh to show the new grade
    } catch (error) {
      console.error('Error saving Quran test:', error);
      setError(error.response?.data?.error || 'فشل في حفظ نتيجة الاختبار');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleViewQuranTest = (grade) => {
    // Extract grade_per_error from notes
    let gradePerError = 1;
    if (grade.notes) {
      const gradePerErrorMatch = grade.notes.match(/الخصم لكل خطأ:\s*(\d+(?:\.\d+)?)/);
      if (gradePerErrorMatch) {
        gradePerError = parseFloat(gradePerErrorMatch[1]);
      }
    }

    // Prepare the test data from the grade record to view in the modal
    const testData = {
      course_id: grade.course_id,
      start_surah: grade.start_reference ? grade.start_reference.split(':')[0] : '',
      start_ayah: grade.start_reference ? grade.start_reference.split(':')[1] : '',
      end_surah: grade.end_reference ? grade.end_reference.split(':')[0] : '',
      end_ayah: grade.end_reference ? grade.end_reference.split(':')[1] : '',
      error_details: grade.error_details ? (typeof grade.error_details === 'string' ? JSON.parse(grade.error_details) : grade.error_details) : {},
      max_grade: grade.max_grade || 100,
      calculated_grade: grade.grade_value,
      grade_per_error: gradePerError,
      notes: grade.notes || ''
    };

    setViewingTestData(testData);
    setShowQuranTestingModal(true);
  };

  const handleSaveHomework = async (homeworkData) => {
    try {
      setSaving(true);

      await axios.post(`${API_BASE}/api/homework`, homeworkData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setSuccess('تم حفظ الواجب بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      setShowHomeworkModal(false);
      fetchStudentProfile(); // Refresh to show the new homework
    } catch (error) {
      console.error('Error saving homework:', error);
      setError(error.response?.data?.error || 'فشل في حفظ الواجب');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleShowBlocks = async () => {
    console.log('Fetching fresh student data and grades for Quran blocks:', student.id);

    // Fetch fresh student data and grades
    let freshStudentData = studentData;
    let grades = [];

    if (student.id) {
      try {
        const token = localStorage.getItem('token');

        // Fetch fresh student data from same endpoint as students page
        const studentResponse = await fetch(`/api/students/${student.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (studentResponse.ok) {
          const apiResponse = await studentResponse.json();
          console.log('Raw API response:', apiResponse);
          // Extract the student object from the API response
          freshStudentData = apiResponse.student || apiResponse;
          console.log('Fresh student data fetched for blocks:', freshStudentData);
        }

        // Fetch grades using simple endpoint (no class_id or semester_id)
        const gradesResponse = await fetch(`/api/grades/student/${student.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (gradesResponse.ok) {
          const gradesData = await gradesResponse.json();
          console.log('Raw grades response:', gradesData);

          // Extract grades array from the response object
          if (Array.isArray(gradesData)) {
            // Direct array (old format)
            grades = gradesData;
          } else if (gradesData.grades && Array.isArray(gradesData.grades)) {
            // Object with grades property (new format)
            grades = gradesData.grades;
          } else {
            console.log('Unexpected grades response format:', typeof gradesData);
            grades = [];
          }

          console.log('Grades extracted for blocks:', grades.length, 'grades');
          if (grades.length > 0) {
            console.log('Sample grade data:', grades[0]);
            console.log('Grades with start_reference:', grades.filter(g => g.start_reference).length);
          } else {
            console.log('No grades found for student');
          }
        } else {
          console.error('Failed to fetch grades. Status:', gradesResponse.status);
          const errorText = await gradesResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching fresh data for blocks:', error);
      }
    }

    const blocksData = calculateQuranBlocks(freshStudentData, grades);
    setShowBlocksModal(blocksData);
  };

  const fetchAttendanceRecords = async () => {
    try {
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Fetch all attendance records for this student
      const response = await axios.get(`${API_BASE}/api/attendance/semester/${semesterId}/class/${classItem.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Get the student's attendance data
      const studentAttendance = response.data.students?.find(s => s.student_id === student.id);

      // Get all attendance records (both present and absent)
      const allRecords = studentAttendance?.attendance || [];

      // Filter records that have been marked (show records with explicit is_present values)
      const recordedAttendance = allRecords.filter(record => {
        const hasExplicitAttendance = record.is_present !== null; // Show if marked as present/absent
        const hasDate = record.date || record.attendance_date;
        return hasExplicitAttendance && hasDate;
      });

      setAbsentRecords(recordedAttendance);
      setShowAbsentTableModal(true);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setError('فشل في جلب سجلات الحضور');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Add function to handle attendance editing by teachers
  const handleAttendanceEdit = async (record, isPresent) => {
    try {
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Update attendance
      await axios.post(`${API_BASE}/api/attendance/mark`, {
        semester_id: semesterId,
        class_id: classItem.id,
        student_id: student.id,
        attendance_date: record.date || record.attendance_date,
        is_present: isPresent,
        notes: record.notes || ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess(`تم تحديث ${isPresent ? 'الحضور' : 'الغياب'} بنجاح`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh attendance records
      fetchAttendanceRecords();
      fetchAttendanceData(); // Refresh summary data as well

    } catch (error) {
      console.error('Error updating attendance:', error);
      setError('فشل في تحديث الحضور');
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchPointsRecords = async () => {
    try {
      const semesterId = await getViewSemesterId();
      if (!semesterId) return;

      // Fetch detailed points records
      const response = await axios.get(`${API_BASE}/api/points/student/${student.id}`, {
        params: {
          semester_id: semesterId
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
    setPointsForm({
      points: 0,
      notes: "",
      date: new Date().toISOString().split('T')[0] // Default to today
    });
    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    setShowPointsModal(false);
    setPointsForm({
      points: 0,
      notes: "",
      date: new Date().toISOString().split('T')[0] // Reset to today
    });
  };

  const handleGivePoints = async (e) => {
    e.preventDefault();
    try {
      const semesterId = await getCurrentSemesterIdForWrite(
        'انتهى الفصل الدراسي الحالي، لا يمكن إضافة نقاط.',
        'لا يمكن إضافة نقاط لفصل دراسي سابق.'
      );
      if (!semesterId) return;

      await axios.post(`${API_BASE}/api/points`, {
        student_id: student.id,
        class_id: classItem.id,
        semester_id: semesterId,
        points_date: pointsForm.date,
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

  // Points editing functions
  const startEditingPoint = (record) => {
    setEditingPointRecord(record.id);
    setEditingPointForm({
      points: record.points_given,
      notes: record.notes || "",
      date: record.points_date
    });
  };

  const cancelEditingPoint = () => {
    setEditingPointRecord(null);
    setEditingPointForm({ points: 0, notes: "", date: "" });
  };

  const saveEditedPoint = async () => {
    try {
      await axios.put(`${API_BASE}/api/points/${editingPointRecord}`, {
        points_given: parseFloat(editingPointForm.points),
        notes: editingPointForm.notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess("تم تحديث النقاط بنجاح");
      cancelEditingPoint();
      fetchPointsRecords(); // Refresh the points table
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في تحديث النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const deletePointRecord = async (recordId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/points/${recordId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess("تم حذف السجل بنجاح");
      fetchPointsRecords(); // Refresh the points table
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "فشل في حذف السجل");
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
    setAttendanceDate(new Date().toISOString().split('T')[0]);
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      const semesterId = await getCurrentSemesterIdForWrite(
        'انتهى الفصل الدراسي الحالي، لا يمكن تسجيل الحضور.',
        'لا يمكن تسجيل الحضور لفصل دراسي سابق.'
      );
      if (!semesterId) return;

      await axios.post(`${API_BASE}/api/attendance/mark`, {
        semester_id: semesterId,
        class_id: classItem.id,
        student_id: student.id,
        attendance_date: attendanceDate,
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

        {semesterNotice && (
          <div className="bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded mb-4">
            {semesterNotice}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
              onClick={fetchAttendanceRecords}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <AiOutlineCalendar />
              سجلات الحضور
            </button>
            <button
              onClick={fetchPointsRecords}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              <AiOutlineTable />
              جدول النقاط
            </button>
            <button
              onClick={async () => {
                console.log('Fetching fresh student data by ID for QuranProgressModal:', student.id);
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch(`/api/students/${student.id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });

                  if (response.ok) {
                    const apiResponse = await response.json();
                    console.log('Raw API response for QuranProgressModal:', apiResponse);
                    // Extract the student object from the API response
                    const freshStudentData = apiResponse.student || apiResponse;
                    console.log('Fresh student data fetched for QuranProgressModal:', freshStudentData);
                    console.log('Target surah data in fresh fetch:', {
                      target_surah_id: freshStudentData.target_surah_id,
                      target_ayah_number: freshStudentData.target_ayah_number,
                      memorized_surah_id: freshStudentData.memorized_surah_id,
                      memorized_ayah_number: freshStudentData.memorized_ayah_number
                    });

                    // Create a temporary student object for QuranProgressModal only
                    const tempStudentForModal = {
                      ...freshStudentData,
                      memorized_surah_id: freshStudentData.memorized_surah_id ? String(freshStudentData.memorized_surah_id) : "",
                      memorized_ayah_number: freshStudentData.memorized_ayah_number ? String(freshStudentData.memorized_ayah_number) : "",
                      target_surah_id: freshStudentData.target_surah_id ? String(freshStudentData.target_surah_id) : "",
                      target_ayah_number: freshStudentData.target_ayah_number ? String(freshStudentData.target_ayah_number) : ""
                    };

                    console.log('Formatted temp student for modal:', tempStudentForModal);

                    // Store the temp data in a separate state for the modal
                    setQuranModalStudentData(tempStudentForModal);
                    setShowQuranProgressModal(true);
                  } else {
                    console.error('Failed to fetch fresh student data, using existing data');
                    setShowQuranProgressModal(true);
                  }
                } catch (error) {
                  console.error('Error fetching fresh student data:', error);
                  setShowQuranProgressModal(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <AiOutlineEdit />
              خطة الحفظ
            </button>
            <button
              onClick={handleShowBlocks}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <BsFillGridFill />
             متابعة المراجعة
            </button>
            <button
              onClick={() => setShowQuranTestingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <AiOutlineBook />
              اختبار القرآن
            </button>
            <button
              onClick={() => setShowHomeworkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <AiOutlineBook />
              تكليف واجب
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
                    onClick={async () => {
                      console.log('Fetching fresh student data from goal section for QuranProgressModal:', student.id);
                      try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`/api/students/${student.id}`, {
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });

                        if (response.ok) {
                          const apiResponse = await response.json();
                          console.log('Raw API response from goal section:', apiResponse);
                          // Extract the student object from the API response
                          const freshStudentData = apiResponse.student || apiResponse;
                          console.log('Fresh student data fetched from goal section:', freshStudentData);
                          console.log('Target surah data in goal section fetch:', {
                            target_surah_id: freshStudentData.target_surah_id,
                            target_ayah_number: freshStudentData.target_ayah_number,
                            memorized_surah_id: freshStudentData.memorized_surah_id,
                            memorized_ayah_number: freshStudentData.memorized_ayah_number
                          });

                          // Create a temporary student object for QuranProgressModal only
                          const tempStudentForModal = {
                            ...freshStudentData,
                            memorized_surah_id: freshStudentData.memorized_surah_id ? String(freshStudentData.memorized_surah_id) : "",
                            memorized_ayah_number: freshStudentData.memorized_ayah_number ? String(freshStudentData.memorized_ayah_number) : "",
                            target_surah_id: freshStudentData.target_surah_id ? String(freshStudentData.target_surah_id) : "",
                            target_ayah_number: freshStudentData.target_ayah_number ? String(freshStudentData.target_ayah_number) : ""
                          };

                          console.log('Formatted temp student for modal from goal section:', tempStudentForModal);

                          // Store the temp data in a separate state for the modal
                          setQuranModalStudentData(tempStudentForModal);
                          setShowQuranProgressModal(true);
                        } else {
                          console.error('Failed to fetch fresh student data from goal section, using existing data');
                          setShowQuranProgressModal(true);
                        }
                      } catch (error) {
                        console.error('Error fetching fresh student data from goal section:', error);
                        setShowQuranProgressModal(true);
                      }
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    تعديل الهدف
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
                              {formatSafeDate(latestGrade.date_graded || latestGrade.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Target Position */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المطلوب:</h4>
                    <p className="text-base font-bold text-blue-700">
                      {(() => {
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;

                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };

                        const targetSurahName = getCurrentSurahName(targetSurahId);
                        return `سورة ${targetSurahName} - الآية ${targetAyah}`;
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المطلوب:</h4>

                    {/* Goal Description - Same format as QuranProgressModal */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-base font-bold text-blue-700">
                        {(() => {
                          const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                          const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                          const targetSurahId = parseInt(studentData.goal?.target_surah_id) || 0;
                          const targetAyah = parseInt(studentData.goal?.target_ayah_number) || 0;

                          const getCurrentSurahName = (surahId) => {
                            const surah = QURAN_SURAHS.find(s => s.id === surahId);
                            return surah ? surah.name : '';
                          };

                          const getMemorizationPosition = (surahId) => {
                            const index = QURAN_SURAHS.findIndex(s => s.id == surahId);
                            return index !== -1 ? index + 1 : 0;
                          };

                          const getCurrentSurahWithPosition = (surahId) => {
                            const position = getMemorizationPosition(surahId);
                            const name = getCurrentSurahName(surahId);
                            return position > 0 ? `سورة ${name} (${position})` : `سورة ${name}`;
                          };

                          const getSurahIdFromPosition = (position) => {
                            if (position < 1 || position > QURAN_SURAHS.length) return 0;
                            return QURAN_SURAHS[position - 1].id;
                          };

                          const getNextMemorizationRef = (surahId, ayahNumber) => {
                            const surah = QURAN_SURAHS.find(s => s.id == surahId);
                            if (!surah) return null;
                            const ayah = parseInt(ayahNumber) || 0;
                            if (ayah < surah.ayahCount) {
                              return { surahId: surah.id, ayah: ayah + 1 };
                            }
                            const position = getMemorizationPosition(surahId);
                            const nextSurahId = getSurahIdFromPosition(position + 1);
                            if (!nextSurahId) {
                              return { surahId: surah.id, ayah: surah.ayahCount };
                            }
                            return { surahId: nextSurahId, ayah: 1 };
                          };


                          // Calculate page information for display
                          const targetDisplay = formatMemorizationDisplay(targetSurahId, targetAyah);
                          const currentDisplay = currentSurahId ?
                            formatMemorizationDisplay(currentSurahId, currentAyah) :
                            { display: 'سورة الفاتحة (صفحة 1)', pageNumber: 1 };
                          const nextRef = getNextMemorizationRef(currentSurahId, currentAyah);
                          const nextDisplay = nextRef
                            ? formatMemorizationDisplay(nextRef.surahId, nextRef.ayah)
                            : currentDisplay;


                          if (!currentSurahId || currentSurahId === 0) {
                            // No current memorization - start from الفاتحة (position 1)
                            const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);
                            return `من سورة الفاتحة آية 1 إلى ${targetSurahWithPos} آية ${targetAyah} (من صفحة 1 إلى صفحة ${targetDisplay.pageNumber})`;
                          } else {
                            const currentPosition = getMemorizationPosition(currentSurahId);
                            const targetPosition = getMemorizationPosition(targetSurahId);

                            if (currentSurahId === targetSurahId) {
                              // Same surah
                              const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                              if (currentAyah >= targetAyah) {
                                return `🎉 تم تحقيق الهدف - ${currentSurahWithPos} آية ${currentAyah} (صفحة ${currentDisplay.pageNumber})`;
                              } else {
                                const nextSurahWithPos = nextRef ? getCurrentSurahWithPosition(nextRef.surahId) : currentSurahWithPos;
                                const nextAyah = nextRef ? nextRef.ayah : currentAyah + 1;
                                return `من ${nextSurahWithPos} آية ${nextAyah} إلى آية ${targetAyah} (من صفحة ${nextDisplay.pageNumber} إلى صفحة ${targetDisplay.pageNumber})`;
                              }
                            } else {
                              // Different surahs - check memorization positions
                              const currentSurahWithPos = getCurrentSurahWithPosition(currentSurahId);
                              const targetSurahWithPos = getCurrentSurahWithPosition(targetSurahId);

                              if (currentPosition > targetPosition) {
                                return `🎉 تم تجاوز الهدف - الحالي: ${currentSurahWithPos} آية ${currentAyah} (صفحة ${currentDisplay.pageNumber})`;
                              } else {
                                const nextSurahWithPos = nextRef ? getCurrentSurahWithPosition(nextRef.surahId) : currentSurahWithPos;
                                const nextAyah = nextRef ? nextRef.ayah : currentAyah + 1;
                                return `من ${nextSurahWithPos} آية ${nextAyah} إلى ${targetSurahWithPos} آية ${targetAyah} (من صفحة ${nextDisplay.pageNumber} إلى صفحة ${targetDisplay.pageNumber})`;
                              }
                            }
                          }
                        })()}
                      </p>
                    </div>

                    <h4 className="text-sm font-medium text-gray-700 mb-2">إحصائيات الهدف الحالي:</h4>
                    <div className="space-y-3">
                      {(() => {
                        // Use enhanced student progress calculation with page support
                        const student = {
                          memorized_surah_id: studentData?.memorized_surah_id,
                          memorized_ayah_number: studentData?.memorized_ayah_number,
                          target_surah_id: studentData.goal?.target_surah_id,
                          target_ayah_number: studentData.goal?.target_ayah_number
                        };

                        const progress = calculateStudentGoalProgress(student);
                        const progressBar = calculateGoalProgressBar(student);

                        const currentSurahId = parseInt(studentData?.memorized_surah_id) || 0;
                        const currentAyah = parseInt(studentData?.memorized_ayah_number) || 0;
                        const targetSurahId = parseInt(studentData.goal.target_surah_id) || 0;
                        const targetAyah = parseInt(studentData.goal.target_ayah_number) || 0;

                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id === surahId);
                          return surah ? surah.name : '';
                        };

                        // Get formatted display for current and target positions
                        const currentDisplay = currentSurahId ?
                          formatMemorizationDisplay(currentSurahId, currentAyah) :
                          { display: 'لم يبدأ بعد', pageNumber: 0 };

                        const targetDisplay = formatMemorizationDisplay(targetSurahId, targetAyah);

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
                                {isGoalAchieved ? '0 صفحة' : `${progress.totalGoalPages - progress.memorizedPages} صفحة`}
                              </div>
                            </div>

                            {/* Total Goal Pages */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">إجمالي صفحات الهدف</div>
                              <div className="text-xs sm:text-sm font-bold text-cyan-600">
                                {progress.totalGoalPages} صفحة
                              </div>
                            </div>

                            {/* Current Page Number */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">الصفحة الحالية</div>
                              <div className="text-xs sm:text-sm font-bold text-purple-600">
                                صفحة {currentDisplay.pageNumber || 0}
                              </div>
                            </div>

                            {/* Target Page Number */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">صفحة الهدف</div>
                              <div className="text-xs sm:text-sm font-bold text-green-600">
                                صفحة {targetDisplay.pageNumber}
                              </div>
                            </div>

                            {/* Page Progress Percentage */}
                            <div className="bg-white p-2 sm:p-3 rounded border">
                              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">تقدم الصفحات</div>
                              <div className="text-xs sm:text-sm font-bold text-orange-600">
                                {progress.pagePercentage}%
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Goal Progress Bars */}
                      <div className="mt-4 space-y-4">
                        {/* Verse Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>تقدم الآيات:</span>
                            <span className="font-bold">
                              {(() => {
                                const student = {
                                  memorized_surah_id: studentData?.memorized_surah_id,
                                  memorized_ayah_number: studentData?.memorized_ayah_number,
                                  target_surah_id: studentData.goal?.target_surah_id,
                                  target_ayah_number: studentData.goal?.target_ayah_number
                                };
                                const progress = calculateStudentGoalProgress(student);
                                return `${progress.memorizedVerses} من ${progress.totalGoalVerses} آية`;
                              })()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${
                                (() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return progress.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500';
                                })()
                              }`}
                              style={{
                                width: `${(() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return Math.min(100, progress.percentage);
                                })()}%`
                              }}
                            >
                              <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                                {(() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return Math.min(100, progress.percentage);
                                })()}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Page Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>تقدم الصفحات:</span>
                            <span className="font-bold">
                              {(() => {
                                const student = {
                                  memorized_surah_id: studentData?.memorized_surah_id,
                                  memorized_ayah_number: studentData?.memorized_ayah_number,
                                  target_surah_id: studentData.goal?.target_surah_id,
                                  target_ayah_number: studentData.goal?.target_ayah_number
                                };
                                const progress = calculateStudentGoalProgress(student);
                                return `${progress.memorizedPages} من ${progress.totalGoalPages} صفحة`;
                              })()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${
                                (() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return progress.pagePercentage >= 100 ? 'bg-green-500' : 'bg-orange-500';
                                })()
                              }`}
                              style={{
                                width: `${(() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return Math.min(100, progress.pagePercentage);
                                })()}%`
                              }}
                            >
                              <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                                {(() => {
                                  const student = {
                                    memorized_surah_id: studentData?.memorized_surah_id,
                                    memorized_ayah_number: studentData?.memorized_ayah_number,
                                    target_surah_id: studentData.goal?.target_surah_id,
                                    target_ayah_number: studentData.goal?.target_ayah_number
                                  };
                                  const progress = calculateStudentGoalProgress(student);
                                  return Math.min(100, progress.pagePercentage);
                                })()}%
                              </span>
                            </div>
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
                      {[...QURAN_SURAHS].sort((a, b) => a.id - b.id).map(surah => (
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
                            {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                              <th className="p-2 text-center text-sm border">عرض</th>
                            )}
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
                              {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                                <td className="p-2 text-center border">
                                  {grade.error_details && grade.start_reference && grade.end_reference ? (
                                    <button
                                      onClick={() => handleViewQuranTest(grade)}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                      title="عرض نتيجة الاختبار"
                                    >
                                      عرض
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              )}
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
                                {formatSafeDate(grade.date_graded || grade.created_at)}
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
                  التاريخ
                </label>
                <input
                  type="date"
                  value={pointsForm.date}
                  onChange={(e) => setPointsForm({...pointsForm, date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
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
                  التاريخ
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

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

      {/* Attendance Records Table Modal */}
      {showAbsentTableModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                سجلات الحضور والغياب - {student.first_name} {student.last_name}
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
                    <th className="p-3 text-center text-sm font-medium border">الحالة</th>
                    <th className="p-3 text-center text-sm font-medium border">ملاحظات</th>
                    {['teacher', 'admin', 'administrator'].includes(userRole) && (
                      <th className="p-3 text-center text-sm font-medium border">إجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {absentRecords.length > 0 ? (
                    absentRecords.map((record, index) => {
                      // Dual calendar date formatting
                      const formatDate = (dateString) => {
                        if (!dateString) return 'تاريخ غير صحيح';
                        try {
                          const date = new Date(dateString);
                          if (isNaN(date.getTime())) return 'تاريخ غير صحيح';

                          // Use local date formatting to avoid timezone issues
                          const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));

                          // Format Hijri date (primary display)
                          const hijriDate = localDate.toLocaleDateString('ar-SA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            calendar: 'islamic-umalqura'
                          });

                          // Format Gregorian date (secondary display)
                          const gregorianDate = localDate.toLocaleDateString('ar-SA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            calendar: 'gregory'
                          });

                          return (
                            <div className="text-sm">
                              <div className="font-semibold text-gray-800">{hijriDate} هـ</div>
                              <div className="text-gray-600 mt-1">{gregorianDate} م</div>
                            </div>
                          );
                        } catch (error) {
                          console.error('Date formatting error:', error);
                          return 'تاريخ غير صحيح';
                        }
                      };

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-3 text-center text-sm border">
                            {formatDate(record.date || record.attendance_date)}
                          </td>
                          <td className="p-3 text-center text-sm border">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              record.is_present === true
                                ? 'bg-green-100 text-green-800'
                                : record.is_present === false
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.is_present === true ? 'حضور' : record.is_present === false ? 'غياب' : 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-sm border">
                            {record.notes || '-'}
                          </td>
                          {['teacher', 'admin', 'administrator'].includes(userRole) && (
                            <td className="p-3 text-center text-sm border">
                              <div className="relative attendance-edit-cell">
                                <button
                                  onClick={() => handleAttendanceCellClick(index, record)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                  title="تعديل الحضور"
                                >
                                  تعديل
                                </button>
                                {editingAttendanceCell === `attendance_${index}` && (
                                  <>
                                    {/* Overlay Background */}
                                    <div className="fixed inset-0 bg-black/50 z-[70]" onClick={() => setEditingAttendanceCell(null)}></div>

                                    {/* Centered Modal */}
                                    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4">
                                      <div className="bg-white border rounded-lg shadow-xl p-6 min-w-[300px] max-w-md w-full">
                                        <h4 className="text-lg font-semibold mb-4 text-center">تعديل سجل الحضور</h4>
                                        <div className="flex flex-col gap-4">
                                      {/* Date Input */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ:</label>
                                        <input
                                          type="date"
                                          value={editingAttendanceData.date}
                                          onChange={(e) => setEditingAttendanceData(prev => ({
                                            ...prev,
                                            date: e.target.value
                                          }))}
                                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>

                                      {/* Status Selection */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">الحالة:</label>
                                        <div className="flex gap-3">
                                          <button
                                            onClick={() => setEditingAttendanceData(prev => ({
                                              ...prev,
                                              isPresent: true
                                            }))}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                              editingAttendanceData.isPresent === true
                                                ? 'bg-green-500 text-white shadow-lg'
                                                : 'bg-gray-200 text-gray-700 hover:bg-green-100 border border-gray-300'
                                            }`}
                                          >
                                            <AiOutlineCheck className="w-4 h-4" />
                                            حاضر
                                          </button>
                                          <button
                                            onClick={() => setEditingAttendanceData(prev => ({
                                              ...prev,
                                              isPresent: false
                                            }))}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                              editingAttendanceData.isPresent === false
                                                ? 'bg-red-500 text-white shadow-lg'
                                                : 'bg-gray-200 text-gray-700 hover:bg-red-100 border border-gray-300'
                                            }`}
                                          >
                                            <AiOutlineClose className="w-4 h-4" />
                                            غائب
                                          </button>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-3 pt-4">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingAttendanceCell(null);
                                            setEditingAttendanceData({ date: '', isPresent: null });
                                          }}
                                          className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                                        >
                                          إلغاء
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAttendanceChange();
                                          }}
                                          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-lg"
                                        >
                                          حفظ التغييرات
                                        </button>
                                      </div>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={['teacher', 'admin', 'administrator'].includes(userRole) ? '4' : '3'} className="p-6 text-center text-gray-500">
                        لا توجد سجلات حضور لهذا الطالب
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
                    <th className="p-3 text-center text-sm font-medium border">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsRecords.length > 0 ? (
                    pointsRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 text-center text-sm border">
                          {formatSafeDate(record.points_date || record.created_at, { weekday: 'long', month: 'long' })}
                        </td>
                        <td className="p-3 text-center text-sm border font-semibold">
                          {editingPointRecord === record.id ? (
                            <select
                              value={editingPointForm.points}
                              onChange={(e) => setEditingPointForm({...editingPointForm, points: e.target.value})}
                              className="w-20 p-1 border rounded text-center"
                            >
                              <option value={0}>0</option>
                              <option value={0.5}>0.5</option>
                              <option value={1}>1</option>
                              <option value={1.5}>1.5</option>
                              <option value={2}>2</option>
                              <option value={2.5}>2.5</option>
                              <option value={3}>3</option>
                              <option value={3.5}>3.5</option>
                              <option value={4}>4</option>
                              <option value={4.5}>4.5</option>
                              <option value={5}>5</option>
                            </select>
                          ) : (
                            record.points_given
                          )}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          <div className="flex items-center justify-center">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= (editingPointRecord === record.id ? editingPointForm.points : record.points_given) ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {editingPointRecord === record.id ? (
                            <textarea
                              value={editingPointForm.notes}
                              onChange={(e) => setEditingPointForm({...editingPointForm, notes: e.target.value})}
                              className="w-32 p-1 border rounded text-xs resize-none"
                              rows={2}
                              placeholder="ملاحظات..."
                            />
                          ) : (
                            record.notes || '-'
                          )}
                        </td>
                        <td className="p-3 text-center text-sm border">
                          {editingPointRecord === record.id ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={saveEditedPoint}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                title="حفظ"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditingPoint}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                title="إلغاء"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => startEditingPoint(record)}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                title="تعديل"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deletePointRecord(record.id)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                title="حذف"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-gray-500">
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

      {/* Quran Progress Modal */}
      {showQuranProgressModal && (quranModalStudentData || studentData) && (() => {
        // Use the fresh student data if available, otherwise fall back to regular studentData
        const sourceData = quranModalStudentData || studentData;
        console.log('SOURCE DATA ANALYSIS:', {
          hasQuranModalStudentData: !!quranModalStudentData,
          usingFreshData: !!quranModalStudentData,
          sourceData_target_surah_id: sourceData.target_surah_id,
          sourceData_goal_target_surah_id: sourceData.goal?.target_surah_id,
          sourceDataKeys: Object.keys(sourceData)
        });
        const formattedStudentData = {
          ...sourceData,
          memorized_surah_id: sourceData.memorized_surah_id ? String(sourceData.memorized_surah_id) : "",
          memorized_ayah_number: sourceData.memorized_ayah_number ? String(sourceData.memorized_ayah_number) : "",
          // Handle both flat structure (fresh data) and nested structure (original data)
          target_surah_id: sourceData.target_surah_id
            ? String(sourceData.target_surah_id)
            : (sourceData.goal?.target_surah_id ? String(sourceData.goal.target_surah_id) : ""),
          target_ayah_number: sourceData.target_ayah_number
            ? String(sourceData.target_ayah_number)
            : (sourceData.goal?.target_ayah_number ? String(sourceData.goal.target_ayah_number) : "")
        };

        console.log('StudentProfileModal - Formatted data for QuranProgressModal:', formattedStudentData);
        console.log('StudentProfileModal - Original studentData:', studentData);
        console.log('StudentProfileModal - classItem:', classItem);

        return (
          <QuranProgressModal
            student={formattedStudentData}
            onSubmit={handleQuranProgressSubmit}
            onCancel={handleQuranProgressCancel}
            onStudentChange={handleStudentChange}
          />
        );
      })()}

      {/* Quran Blocks Modal */}
      {showBlocksModal && (
        <QuranBlocksModal
          student={studentData}
          blocksData={showBlocksModal}
          onClose={() => setShowBlocksModal(false)}
        />
      )}

      {/* Quran Testing Modal */}
      {showQuranTestingModal && studentData && (
        <QuranTestingModal
          student={studentData}
          courses={studentData.courses || []}
          onClose={() => {
            setShowQuranTestingModal(false);
            setViewingTestData(null);
          }}
          onSave={handleSaveQuranTest}
          initialTestData={viewingTestData}
          viewMode={viewingTestData !== null}
        />
      )}

      {/* Homework Modal */}
      {showHomeworkModal && studentData && (
        <QuranHomeworkModal
          student={studentData}
          classItem={classItem}
          onClose={() => setShowHomeworkModal(false)}
          onSave={handleSaveHomework}
        />
      )}
    </div>
  );
};

export default StudentProfileModal;
