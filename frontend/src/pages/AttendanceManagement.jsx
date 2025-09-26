import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineUser, AiOutlineEye, AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { formatDateWithHijri, getArabicDayName } from "../utils/hijriDate";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentWorkDays, setStudentWorkDays] = useState({ all: [], present: [], absent: [], upcoming: [] });
  const [modalLoading, setModalLoading] = useState(false);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [updatingDay, setUpdatingDay] = useState(null); // Track which specific day is being updated

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Reload students when semester changes to recalculate attendance percentages
  useEffect(() => {
    if (currentSemester) {
      loadStudents();
    }
  }, [currentSemester]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSemesters(),
        loadStudents()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesters = async () => {
    try {
      // Try loading all semesters
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      let semesterData = response.data.semesters || response.data || [];
      
      // If no real semesters, create test ones
      if (semesterData.length === 0) {
        const now = new Date();
        const testStart = new Date(now.getFullYear(), 0, 1); // January 1st this year
        const testEnd = new Date(now.getFullYear(), 11, 31); // December 31st this year
        
        semesterData = [
          {
            id: 'current-semester',
            display_name: 'الفصل الحالي 2025',
            start_date: testStart.toISOString().split('T')[0],
            end_date: testEnd.toISOString().split('T')[0],
            weekend_days: [5, 6],
            vacation_days: [],
            is_current: true
          },
          {
            id: 'previous-semester',
            display_name: 'الفصل السابق 2024',
            start_date: new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
            end_date: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
            weekend_days: [5, 6],
            vacation_days: []
          }
        ];
      }
      
      setSemesters(semesterData);
      
      // Set current semester (first one or marked as current)
      const current = semesterData.find(s => s.is_current) || semesterData[0];
      setCurrentSemester(current);
      
    } catch (error) {
      console.error("Error loading semesters:", error);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const studentsData = response.data.students || response.data || [];
      
      // Calculate attendance percentage for each student if currentSemester is available
      const studentsWithAttendance = await Promise.all(
        studentsData.map(async (student) => {
          let attendancePercentage = null;
          
          if (currentSemester) {
            try {
              // Calculate working days for current semester (all days for percentage)
              const allWorkingDays = calculateWorkingDays(currentSemester);
              
              if (allWorkingDays.length > 0) {
                let attendanceData = [];
                
                try {
                  // Get attendance data for this student
                  // If student has a class_id, use it; otherwise skip attendance API call
                  if (student.class_id && student.class_id !== null) {
                    const attendanceResponse = await axios.get(
                      `${API_BASE}/api/attendance/semester/${currentSemester.id}/class/${student.class_id}?student_id=${student.id}`,
                      {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      }
                    );
                    attendanceData = attendanceResponse.data || [];
                  } else {
                    console.log(`Student ${student.id} has no class_id, using grade-based attendance only`);
                    attendanceData = []; // No attendance records, will rely on grade-based inference
                  }
                } catch (apiError) {
                  console.warn(`Failed to fetch attendance data for student ${student.id}:`, apiError);
                  attendanceData = []; // Fallback to empty array
                }
                
                // Count present days
                const presentDays = attendanceData.filter(record => 
                  record.student_id === student.id && record.is_present
                ).length;
                
                // Also count days with no record as absent (using grade-based inference)
                const recordedDays = attendanceData.filter(record => 
                  record.student_id === student.id
                ).length;
                
                // Calculate absence percentage (only recorded absent days / all working days)
                const absentDays = recordedDays - presentDays; // Only days with records marked as absent
                
                // Absence percentage = only actual absent days / all working days
                if (allWorkingDays.length > 0) {
                  attendancePercentage = Math.round((absentDays / allWorkingDays.length) * 100);
                } else {
                  attendancePercentage = 0; // No working days
                }
              }
            } catch (error) {
              console.warn(`Failed to calculate attendance for student ${student.id}:`, error);
            }
          }
          
          return {
            ...student,
            attendancePercentage: attendancePercentage
          };
        })
      );
      
      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const calculateWorkingDays = (semester) => {
    if (!semester || !semester.start_date || !semester.end_date) return [];
    
    const start = new Date(semester.start_date);
    const end = new Date(semester.end_date);
    const weekendDays = semester.weekend_days || [5, 6];
    const vacationDays = semester.vacation_days || [];
    
    const workingDays = [];
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      const isWeekend = weekendDays.includes(dayOfWeek);
      const isVacation = vacationDays.includes(dateStr);
      
      if (!isWeekend && !isVacation) {
        workingDays.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const showStudentAttendance = async (student) => {
    if (!currentSemester) {
      setError("لا يوجد فصل دراسي محدد");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSelectedStudent(student);
    setShowAttendanceModal(true);
    setModalLoading(true);

    try {
      // Try to get attendance data from proper attendance tables first
      let attendanceData = [];
      
      try {
        // First try the semester_attendance table
        if (student.class_id && student.class_id !== null) {
          const attendanceResponse = await axios.get(
            `${API_BASE}/api/attendance/semester/${currentSemester.id}/class/${student.class_id}?student_id=${student.id}`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          attendanceData = attendanceResponse.data || [];
          console.log('📊 FRONTEND: Attendance records found:', attendanceData.length);
          console.log('📊 FRONTEND: Full attendance data:', attendanceData);
          console.log('📊 FRONTEND: Query was for student:', student.id, 'semester:', currentSemester.id, 'class:', student.class_id);
        } else {
          console.log('Student has no class_id, using grade-based attendance only');
        }
      } catch (attendanceError) {
        console.log('No attendance records found, falling back to grades-based detection', attendanceError);
      }
      
      // Also get student grades as fallback
      const gradesResponse = await axios.get(
        `${API_BASE}/api/grades/student/${student.id}/semester/${currentSemester.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const grades = gradesResponse.data || [];
      console.log('Student grades data:', grades.length, grades);
      
      // Calculate work days and add any days that have attendance records
      let workingDays = calculateWorkingDays(currentSemester);
      
      // Add any days that have attendance records but aren't in working days
      // This handles cases where attendance is marked on weekends
      attendanceData.forEach(record => {
        const recordDate = new Date(record.attendance_date);
        const recordExists = workingDays.some(day => {
          return day.toDateString() === recordDate.toDateString();
        });
        
        if (!recordExists) {
          workingDays.push(recordDate);
          console.log(`📅 Added non-working day ${recordDate.toISOString().split('T')[0]} because it has attendance record`);
        }
      });
      
      // Sort working days chronologically
      workingDays.sort((a, b) => a - b);
      
      if (student.id === '1171300863') {
        console.log(`🔍 DEBUGGING Student 1171300863:`);
        console.log(`   - Attendance records:`, attendanceData);
        console.log(`   - Grades:`, grades);
        console.log(`   - Today's date:`, new Date().toISOString().split('T')[0]);
        console.log(`   - Yesterday's date:`, new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]);
        
        grades.forEach((grade, i) => {
          const gradeDate = new Date(grade.created_at).toISOString().split('T')[0];
          console.log(`   - Grade ${i+1}: Created on ${gradeDate}, Value: ${grade.grade_value}`);
        });
      }

      // Create work days with attendance status
      const workDaysWithAttendance = workingDays.map(day => {
        const dateStr = day.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        // First check if there's explicit attendance record for this date
        const attendanceRecord = attendanceData.find(record => {
          const recordDate = new Date(record.attendance_date).toISOString().split('T')[0];
          return recordDate === dateStr && record.student_id === student.id;
        });
        
        let isPresent = false;
        let attendanceSource = 'none';
        
        if (attendanceRecord) {
          // Use explicit attendance record
          isPresent = attendanceRecord.is_present;
          attendanceSource = attendanceRecord.has_grade ? 'grade-based' : 'manual';
        } else {
          // Fall back to grade-based detection
          if (dateStr === today) {
            // For today, check if student has any grades created today
            isPresent = grades.some(grade => {
              const gradeCreatedDate = new Date(grade.created_at).toISOString().split('T')[0];
              return gradeCreatedDate === today;
            });
            attendanceSource = isPresent ? 'grade-inference' : 'none';
          } else {
            // For past dates, check if grade was created on that specific date
            isPresent = grades.some(grade => {
              const gradeDate = new Date(grade.created_at).toISOString().split('T')[0];
              return gradeDate === dateStr;
            });
            attendanceSource = isPresent ? 'grade-inference' : 'none';
          }
        }

        // Format date with both Gregorian and Hijri
        const dateWithHijri = formatDateWithHijri(day);

        return {
          date: day,
          dateString: dateStr,
          isPresent,
          isToday: dateStr === today,
          attendanceSource,
          dayName: dateWithHijri.dayName,
          formattedDate: dateWithHijri.full,
          gregorianDate: dateWithHijri.gregorian,
          hijriDate: dateWithHijri.hijri,
          shortDate: dateWithHijri.short
        };
      });

      // Group days into categories
      const today = new Date().toISOString().split('T')[0];
      
      const presentDays = workDaysWithAttendance.filter(day => day.isPresent);
      const absentDays = workDaysWithAttendance.filter(day => !day.isPresent && day.dateString <= today);
      const upcomingDays = workDaysWithAttendance.filter(day => day.dateString > today);
      
      console.log(`📊 Attendance Summary for Student ${student.id}:`);
      console.log(`   - Total working days: ${workDaysWithAttendance.length}`);
      console.log(`   - Present days: ${presentDays.length}`, presentDays.map(d => d.dateString));
      console.log(`   - Absent days: ${absentDays.length}`, absentDays.map(d => d.dateString));
      console.log(`   - Upcoming days: ${upcomingDays.length}`, upcomingDays.map(d => d.dateString));
      console.log(`   - Attendance data records: ${attendanceData.length}`);
      console.log(`   - Grades data records: ${grades.length}`);
      
      setStudentWorkDays({
        all: workDaysWithAttendance,
        present: presentDays,
        absent: absentDays,
        upcoming: upcomingDays
      });
    } catch (error) {
      console.error('Error loading student attendance:', error);
      setError('فشل في تحميل بيانات الحضور');
      setTimeout(() => setError(""), 3000);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowAttendanceModal(false);
    setSelectedStudent(null);
    setStudentWorkDays({ all: [], present: [], absent: [], upcoming: [] });
    setUpdatingAttendance(false);
    setUpdatingDay(null);
  };

  const switchSemester = (semester) => {
    setCurrentSemester(semester);
    // Close modal if it's open to avoid confusion
    if (showAttendanceModal) {
      closeModal();
    }
  };

  const autoMarkAbsent = async () => {
    if (!currentSemester) {
      setError('لا يوجد فصل دراسي محدد');
      setTimeout(() => setError(""), 3000);
      return;
    }

    const confirmMessage = 'هل تريد وضع علامة غياب تلقائياً لجميع الطلاب الذين لا توجد لديهم درجات أو حضور في الأيام السابقة؟';
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      // Get all classes for current user
      const classesResponse = await axios.get(`${API_BASE}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const classes = classesResponse.data || [];
      
      let totalMarkedAbsent = 0;
      
      // Process each class
      for (const classData of classes) {
        try {
          const response = await axios.post(
            `${API_BASE}/api/attendance/auto-mark-absent`,
            {
              semester_id: currentSemester.id,
              class_id: classData.id
            },
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          totalMarkedAbsent += response.data.markedAbsentCount || 0;
        } catch (error) {
          console.warn(`Failed to auto-mark absent for class ${classData.id}:`, error);
        }
      }
      
      setError(`تم وضع ${totalMarkedAbsent} طالب كغائب تلقائياً`);
      setTimeout(() => setError(""), 3000);
      
      // Reload students to update percentages
      await loadStudents();
      
    } catch (error) {
      console.error('Error auto-marking absent:', error);
      setError('فشل في التحديد التلقائي للغياب');
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (dayData) => {
    console.log('🔄 Toggle attendance called for:', {
      date: dayData.dateString,
      isPresent: dayData.isPresent,
      isToday: dayData.isToday,
      fullDayData: dayData
    });
    
    if (!selectedStudent || !currentSemester) {
      console.log('❌ Missing student or semester:', { selectedStudent, currentSemester });
      setError('خطأ: معلومات الطالب أو الفصل الدراسي مفقودة');
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Don't allow changing future days
    const today = new Date().toISOString().split('T')[0];
    if (dayData.dateString > today) {
      console.log('❌ Cannot change future day:', dayData.dateString, 'vs today:', today);
      setError('❌ لا يمكن تعديل الحضور للأيام القادمة');
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Prevent multiple simultaneous updates
    if (updatingDay === dayData.dateString || updatingAttendance) {
      console.log('⚠️ Already updating attendance, ignoring click');
      return;
    }

    console.log('✅ Starting attendance toggle...');
    setUpdatingDay(dayData.dateString);
    setUpdatingAttendance(true);

    // Store original state for rollback
    const originalIsPresent = dayData.isPresent;
    const newIsPresent = !dayData.isPresent;
    
    console.log('🔄 Toggling from', originalIsPresent, 'to', newIsPresent);

    try {
      // Optimistic update - update UI immediately
      const updatedWorkDays = { ...studentWorkDays };
      const dayIndex = updatedWorkDays.all.findIndex(day => day.dateString === dayData.dateString);
      
      if (dayIndex >= 0) {
        updatedWorkDays.all[dayIndex] = {
          ...updatedWorkDays.all[dayIndex],
          isPresent: newIsPresent,
          attendanceSource: 'manual'
        };
        
        // Recalculate categories
        const today = new Date().toISOString().split('T')[0];
        updatedWorkDays.present = updatedWorkDays.all.filter(day => day.isPresent);
        updatedWorkDays.absent = updatedWorkDays.all.filter(day => !day.isPresent && day.dateString <= today);
        updatedWorkDays.upcoming = updatedWorkDays.all.filter(day => day.dateString > today);
        
        setStudentWorkDays(updatedWorkDays);
      }
      
      // Get class_id with better logic
      let classId = selectedStudent.class_id;
      
      if (!classId || classId === null || classId === 'null') {
        console.log('⚠️ Student has no class_id, finding appropriate class...');
        
        try {
          // First, try to find student's enrollment
          const enrollmentResponse = await axios.get(
            `${API_BASE}/api/students/${selectedStudent.id}/enrollments`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
          
          const enrollments = enrollmentResponse.data || [];
          const activeEnrollment = enrollments.find(e => e.status === 'enrolled');
          
          if (activeEnrollment) {
            classId = activeEnrollment.class_id;
            console.log('📚 Found class via enrollment:', classId);
          } else {
            // Fallback: get available classes for teacher/admin
            const classesResponse = await axios.get(`${API_BASE}/api/classes`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const classes = classesResponse.data || [];
            
            if (classes.length > 0) {
              classId = classes[0].id;
              console.log('📚 Using fallback class_id:', classId);
            }
          }
        } catch (classError) {
          console.warn('❌ Could not fetch class information:', classError);
        }
        
        if (!classId) {
          throw new Error('لا توجد حلقات متاحة لتسجيل الحضور');
        }
      }

      const requestData = {
        semester_id: currentSemester.id,
        class_id: classId,
        student_id: selectedStudent.id,
        attendance_date: dayData.dateString,
        is_present: newIsPresent,
        is_explicit: true,
        notes: `تم التعديل يدوياً في ${new Date().toLocaleString('ar-EG')} - تغيير من ${originalIsPresent ? 'حاضر' : 'غائب'} إلى ${newIsPresent ? 'حاضر' : 'غائب'}`
      };
      
      console.log('📤 Sending request:', requestData);
      
      // Send to backend
      const response = await axios.post(
        `${API_BASE}/api/attendance`,
        requestData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('📥 Response:', response.data);

      // Show success message with better feedback
      const statusText = newIsPresent ? '✅ حاضر' : '❌ غائب';
      const dateText = dayData.formattedDate;
      setError(`تم تحديث حضور ${dateText} إلى ${statusText}`);
      setTimeout(() => setError(""), 2500);

      // Reload student list in background to update percentages
      loadStudents().catch(err => console.warn('Failed to reload students:', err));

    } catch (error) {
      console.error('❌ Error toggling attendance:', error);
      
      // Rollback optimistic update
      const rolledBackWorkDays = { ...studentWorkDays };
      const dayIndex = rolledBackWorkDays.all.findIndex(day => day.dateString === dayData.dateString);
      
      if (dayIndex >= 0) {
        rolledBackWorkDays.all[dayIndex] = {
          ...rolledBackWorkDays.all[dayIndex],
          isPresent: originalIsPresent
        };
        
        // Recalculate categories
        const today = new Date().toISOString().split('T')[0];
        rolledBackWorkDays.present = rolledBackWorkDays.all.filter(day => day.isPresent);
        rolledBackWorkDays.absent = rolledBackWorkDays.all.filter(day => !day.isPresent && day.dateString <= today);
        rolledBackWorkDays.upcoming = rolledBackWorkDays.all.filter(day => day.dateString > today);
        
        setStudentWorkDays(rolledBackWorkDays);
      }
      
      let errorMessage = '❌ فشل في تحديث الحضور';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = '⏰ انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى';
      } else if (error.response?.status === 404) {
        errorMessage = '❌ لم يتم العثور على البيانات المطلوبة';
      } else if (error.response?.status === 403) {
        errorMessage = '🚫 ليس لديك صلاحية لتعديل هذا الحضور';
      } else if (error.response?.status >= 500) {
        errorMessage = '⚠️ خطأ في الخادم - يرجى المحاولة لاحقاً';
      } else if (error.response?.data?.error) {
        errorMessage = `❌ ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(""), 4000);
    } finally {
      console.log('🔄 Toggle attendance finished');
      setUpdatingDay(null);
      setUpdatingAttendance(false);
    }
  };

  // Check permissions
  const canManage = user && (user.role === 'admin' || user.role === 'administrator' || user.role === 'teacher');

  if (!canManage) {
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">حضور الطلاب</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Semester Selection at Top */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">الفصول الدراسية المتاحة:</h2>
            <div className="flex flex-wrap gap-3">
              {semesters.map(semester => (
                <button
                  key={semester.id}
                  onClick={() => switchSemester(semester)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentSemester?.id === semester.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {semester.display_name}
                </button>
              ))}
            </div>
            {currentSemester && (
              <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-blue-700">
                      <strong>الفصل الحالي:</strong> {currentSemester.display_name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      انقر على "عرض الحضور" لأي طالب لعرض حضوره في هذا الفصل
                    </p>
                  </div>
                  <button
                    onClick={autoMarkAbsent}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    title="وضع علامة غياب تلقائياً للطلاب الذين لا توجد لديهم درجات أو حضور في الأيام السابقة"
                  >
                    {loading ? '⏳ معالجة...' : '🤖 تحديد الغياب تلقائياً'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Students List */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <h2 className="text-xl font-semibold">جميع الطلاب ({students.length} طالب)</h2>
              <p className="text-sm text-gray-600 mt-1">
                انقر على "عرض الحضور" لعرض حضور الطالب في الفصل المختار حالياً
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-blue-600 mb-2">جاري تحميل البيانات...</div>
              </div>
            ) : students.length > 0 ? (
              <div className="overflow-y-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">#</th>
                      <th className="p-3 text-right text-sm font-medium text-gray-700 border-b">اسم الطالب</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">رقم الهوية</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">نسبة الغياب</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">الحالة</th>
                      <th className="p-3 text-center text-sm font-medium text-gray-700 border-b">عرض التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-600">{index + 1}</td>
                        <td className="p-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <AiOutlineUser className="text-blue-500" size={16} />
                            <span>
                              {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm text-gray-600">{student.id}</td>
                        <td className="p-3 text-center text-sm">
                          {student.attendancePercentage !== null ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold ${
                                student.attendancePercentage <= 10 ? 'bg-green-100 text-green-700' :
                                student.attendancePercentage <= 25 ? 'bg-yellow-100 text-yellow-700' :
                                student.attendancePercentage <= 40 ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {student.attendancePercentage}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.attendancePercentage <= 10 ? '⭐ ممتاز' :
                                 student.attendancePercentage <= 25 ? '👍 جيد' :
                                 student.attendancePercentage <= 40 ? '⚠️ مقبول' : '❌ ضعيف'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">غير محسوب</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.is_active 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {student.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => showStudentAttendance(student)}
                            disabled={!currentSemester}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto ${
                              currentSemester 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!currentSemester ? 'لا يوجد فصل دراسي محدد' : `عرض الحضور - ${currentSemester.display_name}`}
                          >
                            <AiOutlineEye size={14} />
                            <span>عرض الحضور</span>
                            {currentSemester && (
                              <span className="text-xs opacity-75">
                                ({currentSemester.display_name})
                              </span>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد طلاب</h3>
                <p className="text-gray-500">لم يتم العثور على أي طلاب في النظام</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
            
            {/* Loading Overlay */}
            {updatingAttendance && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-blue-600 font-medium">جاري تحديث الحضور...</p>
                </div>
              </div>
            )}
            <div className="bg-green-100 p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-green-800">
                  حضور الطالب - {selectedStudent.first_name} {selectedStudent.second_name} {selectedStudent.third_name} {selectedStudent.last_name}
                </h3>
                <p className="text-sm text-green-600 mt-1">
                  الفصل الدراسي: {currentSemester?.display_name || 'غير محدد'}
                </p>
                {studentWorkDays.all.length > 0 && (
                  <>
                    <div className="mt-2 text-sm text-green-700">
                      إجمالي أيام العمل: <span className="font-bold">{studentWorkDays.all.length}</span> يوم | 
                      الحضور: <span className="font-bold text-green-600">
                        {studentWorkDays.present.length}
                      </span> يوم | 
                      الغياب: <span className="font-bold text-red-600">
                        {studentWorkDays.absent.length}
                      </span> يوم | 
                      أيام قادمة: <span className="font-bold text-blue-600">
                        {studentWorkDays.upcoming.length}
                      </span> يوم
                    </div>
                    <div className="mt-2 text-xs text-green-600">
                      نسبة الغياب: <span className="font-bold text-red-600">
                        {studentWorkDays.all.length > 0 ? 
                          Math.round((studentWorkDays.absent.length / studentWorkDays.all.length) * 100) : 0}%
                      </span>
                      <span className="text-xs text-gray-500 mr-2">
                        ({studentWorkDays.absent.length} من {studentWorkDays.all.length} يوم عمل)
                      </span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-green-600 hover:text-green-800 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="text-green-600 mb-2">جاري تحميل بيانات الحضور...</div>
                </div>
              ) : studentWorkDays.all.length > 0 ? (
                <div className="space-y-4">
                  
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-400 rounded border border-green-500"></div>
                      <span className="text-sm text-gray-700">حاضر ({studentWorkDays.present.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-400 rounded border border-red-500"></div>
                      <span className="text-sm text-gray-700">غائب ({studentWorkDays.absent.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-400 rounded border border-blue-500"></div>
                      <span className="text-sm text-gray-700">قادم ({studentWorkDays.upcoming.length})</span>
                    </div>
                  </div>

                  {/* All Days Grid - Weekly Layout */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {/* Week day headers */}
                    <div className="grid grid-cols-7 gap-2 mb-3 bg-gray-50 p-2 rounded">
                      {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-gray-700 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Organize days into weekly rows */}
                    {(() => {
                      const days = studentWorkDays.all;
                      if (days.length === 0) return <div className="text-center text-gray-500 py-8">لا توجد أيام</div>;

                      // Group days by weeks
                      const weeks = [];
                      const startDate = new Date(days[0].dateString);
                      const startDayOfWeek = startDate.getDay(); // 0 = Sunday

                      // Create first week with proper alignment
                      let currentWeek = new Array(7).fill(null);
                      let dayIndex = 0;

                      // Fill the weeks
                      for (let i = 0; i < days.length; i++) {
                        const weekPosition = (startDayOfWeek + i) % 7;
                        currentWeek[weekPosition] = days[i];

                        if (weekPosition === 6 || i === days.length - 1) {
                          // End of week or last day
                          weeks.push([...currentWeek]);
                          currentWeek = new Array(7).fill(null);
                        }
                      }

                      return (
                        <div className="space-y-2">
                          {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="grid grid-cols-7 gap-2">
                              {week.map((dayData, dayIndex) => {
                                if (!dayData) {
                                  return <div key={dayIndex} className="h-16"></div>;
                                }

                                const today = new Date().toISOString().split('T')[0];
                                const isUpcoming = dayData.dateString > today;
                                const isPresent = dayData.isPresent;
                                const isUpdatingThisDay = updatingDay === dayData.dateString;

                                // Determine colors based on status
                                let bgColor, borderColor, textColor, hoverBg;
                                if (isUpcoming) {
                                  bgColor = 'bg-blue-50';
                                  borderColor = 'border-blue-200';
                                  textColor = 'text-blue-800';
                                  hoverBg = 'hover:bg-blue-100';
                                } else if (isPresent) {
                                  bgColor = 'bg-green-50';
                                  borderColor = 'border-green-200';
                                  textColor = 'text-green-800';
                                  hoverBg = 'hover:bg-green-100';
                                } else {
                                  bgColor = 'bg-red-50';
                                  borderColor = 'border-red-200';
                                  textColor = 'text-red-800';
                                  hoverBg = 'hover:bg-red-100';
                                }

                                return (
                                  <div
                                    key={`${weekIndex}-${dayIndex}`}
                                    onClick={() => !isUpcoming && !isUpdatingThisDay && !updatingAttendance && toggleAttendance(dayData)}
                                    className={`
                                      min-h-16 p-2 ${bgColor} border-2 ${borderColor} rounded-lg text-center relative transition-all duration-200
                                      ${!isUpcoming && !isUpdatingThisDay && !updatingAttendance ? `cursor-pointer ${hoverBg} hover:shadow-lg hover:scale-105` : 'cursor-default'}
                                      ${dayData.isToday ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                                      ${isUpdatingThisDay ? 'opacity-70 animate-pulse border-blue-400' : ''}
                                      ${updatingAttendance && !isUpdatingThisDay ? 'opacity-40' : ''}
                                    `}
                                    title={
                                      isUpdatingThisDay
                                        ? `جاري تحديث الحضور... - ${dayData.formattedDate}`
                                        : isUpcoming
                                          ? `${dayData.formattedDate} - يوم قادم`
                                          : isPresent
                                            ? `انقر لتغيير إلى غياب - ${dayData.formattedDate}`
                                            : `انقر لتغيير إلى حضور - ${dayData.formattedDate}`
                                    }
                                  >
                                    {/* Today indicator */}
                                    {dayData.isToday && (
                                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                        اليوم
                                      </div>
                                    )}

                                    {/* Status indicator */}
                                    <div className="absolute -top-2 -left-2 text-lg">
                                      {isUpdatingThisDay ? (
                                        <span className="text-blue-600 animate-spin">⏳</span>
                                      ) : isUpcoming ? (
                                        <span className="text-blue-600">⏰</span>
                                      ) : isPresent ? (
                                        <span className="text-green-600 font-bold">✅</span>
                                      ) : (
                                        <span className="text-red-600 font-bold">❌</span>
                                      )}
                                    </div>

                                    {/* Date display */}
                                    <div className={`font-medium ${textColor} text-sm mb-1`}>
                                      {dayData.shortDate}
                                    </div>

                                    {/* Source indicator */}
                                    {!isUpcoming && (
                                      <div className="text-xs text-gray-600">
                                        {dayData.attendanceSource === 'manual' && '📝 يدوي'}
                                        {dayData.attendanceSource === 'grade-based' && '📊 درجة'}
                                        {dayData.attendanceSource === 'grade-inference' && '🎯 تلقائي'}
                                        {dayData.attendanceSource === 'none' && '❓ غير محدد'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">📅</div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">لا توجد أيام عمل</h4>
                  <p className="text-gray-500">لا توجد أيام عمل محددة لهذا الفصل الدراسي</p>
                </div>
              )}
            </div>

            <div className="bg-gray-100 p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <div>يمكنك تغيير الفصل الدراسي من الأعلى لعرض حضور فصول أخرى</div>
                <div className="mt-1 text-blue-600">
                  💡 انقر على أي يوم (أخضر أو أحمر) لتغيير حالة الحضور
                </div>
              </div>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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

export default AttendanceManagement;