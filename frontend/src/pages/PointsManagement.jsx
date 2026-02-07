import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  AiOutlineStar,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
  AiOutlineLoading3Quarters,
  AiOutlineReload,
  AiOutlineClose,
  AiOutlineSave
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PointsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data states
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [pointsData, setPointsData] = useState(null);

  // Selection states
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [lockedClassId, setLockedClassId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showOnlyWithPoints, setShowOnlyWithPoints] = useState(false);

  // Edit mode
  const [editingCell, setEditingCell] = useState(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [pointsForm, setPointsForm] = useState({
    points: 0,
    notes: ""
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSemester) {
      fetchPointsData();
    }
  }, [selectedClass, selectedSemester]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingCell && !event.target.closest('.points-cell')) {
        setEditingCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCell]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Get accessible classes
      console.log('Fetching classes...');
      const classesRes = await axios.get(`${API_BASE}/api/points/teacher/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Classes response:', classesRes.data);
      setClasses(classesRes.data.classes);

      // Get semesters - try to get all semesters first, then filter if needed
      let semestersData = [];

      try {
        console.log('Fetching semesters...');

        // Always try to get all semesters first - this is simpler and more robust
        const semestersRes = await axios.get(`${API_BASE}/api/semesters`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Semesters response:', semestersRes.data);
        semestersData = semestersRes.data.semesters || semestersRes.data || [];

        // If user is not admin, we can filter by accessible schools if needed
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'admin' && classesRes.data.classes.length > 0) {
          const schoolIds = [...new Set(classesRes.data.classes
            .map(cls => cls.school_id)
            .filter(Boolean)
          )];

          if (schoolIds.length > 0) {
            // Filter semesters to only include those for accessible schools
            semestersData = semestersData.filter(semester =>
              schoolIds.includes(semester.school_id)
            );
          }
        }

        console.log('Final semesters data:', semestersData);
      } catch (semesterError) {
        console.error('Error fetching semesters:', semesterError);
        // Don't fail completely, just use empty array
        semestersData = [];
      }

      setSemesters(semestersData);

      // Auto-select options with URL override
      const urlParams = new URLSearchParams(window.location.search);
      const initialClassId = urlParams.get('class_id');
      const initialSemesterId = urlParams.get('semester_id');

      const lockedId = initialClassId && classesRes.data.classes.some(cls => String(cls.id) === String(initialClassId))
        ? initialClassId
        : "";
      setLockedClassId(lockedId);

      let classIdToUse = "";
      if (lockedId) {
        classIdToUse = lockedId;
      } else if (classesRes.data.classes.length > 0) {
        classIdToUse = classesRes.data.classes[0].id;
      }

      if (classIdToUse) {
        setSelectedClass(classIdToUse);
      }

      if (semestersData.length > 0) {
        let semesterIdToUse = "";
        if (initialSemesterId && semestersData.some(sem => String(sem.id) === String(initialSemesterId))) {
          semesterIdToUse = initialSemesterId;
        } else if (classIdToUse) {
          const selectedClassItem = classesRes.data.classes.find(cls => String(cls.id) === String(classIdToUse));
          if (selectedClassItem && semestersData.some(sem => String(sem.id) === String(selectedClassItem.semester_id))) {
            semesterIdToUse = selectedClassItem.semester_id;
          }
        }

        if (!semesterIdToUse) {
          const currentDate = new Date();
          const currentSemester = semestersData.find(semester => {
            const startDate = new Date(semester.start_date);
            const endDate = new Date(semester.end_date);
            return currentDate >= startDate && currentDate <= endDate;
          });
          semesterIdToUse = currentSemester ? currentSemester.id : semestersData[0].id;
        }

        if (semesterIdToUse) {
          setSelectedSemester(semesterIdToUse);
        }
      }

    } catch (err) {
      console.error("Error loading initial data:", err);
      setError(`فشل في تحميل البيانات الأولية: ${err.message || err.response?.data?.error || 'خطأ غير معروف'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointsData = async () => {
    if (!selectedClass || !selectedSemester) return;

    console.log('Fetching points data for class:', selectedClass, 'semester:', selectedSemester);

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Get students in class
      const studentsRes = await axios.get(`${API_BASE}/api/students?class_id=${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Get points for the class and semester
      const pointsRes = await axios.get(`${API_BASE}/api/points/class/${selectedClass}?semester_id=${selectedSemester}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const semester = semesters.find(s => s.id == selectedSemester) || null;
      const parseDateOnly = (value) => {
        if (!value) return null;
        const [datePart] = String(value).split('T');
        const parts = datePart.split('-').map(Number);
        if (parts.length !== 3) return null;
        const [year, month, day] = parts;
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
      };
      const startDate = parseDateOnly(semester?.start_date);
      const endDate = parseDateOnly(semester?.end_date);
      const weekendDays = Array.isArray(semester?.weekend_days)
        ? semester.weekend_days
        : (() => {
            try {
              return semester?.weekend_days ? JSON.parse(semester.weekend_days) : [5, 6];
            } catch (error) {
              return [5, 6];
            }
          })();
      const vacationDays = Array.isArray(semester?.vacation_days)
        ? semester.vacation_days
        : (() => {
            try {
              return semester?.vacation_days ? JSON.parse(semester.vacation_days) : [];
            } catch (error) {
              return [];
            }
          })();
      const vacationSet = new Set(vacationDays);

      const workingDays = [];
      if (startDate && endDate) {
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          if (!weekendDays.includes(dayOfWeek) && !vacationSet.has(dateKey)) {
            workingDays.push(dateKey);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        const fallbackEnd = new Date();
        const fallbackStart = new Date();
        fallbackStart.setDate(fallbackEnd.getDate() - 30);
        const currentDate = new Date(fallbackStart);
        while (currentDate <= fallbackEnd) {
          const dayOfWeek = currentDate.getDay();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          if (!weekendDays.includes(dayOfWeek)) {
            workingDays.push(`${year}-${month}-${day}`);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Process data similar to attendance
      const students = (studentsRes.data.students || studentsRes.data || []).map(student => {
        const studentPoints = workingDays.map(date => {
          const pointRecord = (pointsRes.data.points || []).find(p => {
            if (p.student_id !== student.id) return false;

            // Backend now returns points_date as YYYY-MM-DD string format
            const dbDate = p.points_date;

            console.log('Date comparison:', {
              workingDate: date,
              dbDate,
              student: student.first_name + ' ' + student.last_name,
              matches: dbDate === date
            });

            return dbDate === date;
          });

          return {
            date: date,
            points: pointRecord ? parseFloat(pointRecord.points_given) : null,
            notes: pointRecord ? pointRecord.notes : null,
            id: pointRecord ? pointRecord.id : null
          };
        });

        // Calculate statistics
        const totalDays = workingDays.length;
        const daysWithPoints = studentPoints.filter(day => day.points !== null).length;
        const totalPoints = studentPoints.reduce((sum, day) => sum + (parseFloat(day.points) || 0), 0);
        const averagePoints = daysWithPoints > 0 ? parseFloat((totalPoints / daysWithPoints).toFixed(1)) : 0;

        return {
          student_id: student.id,
          name: `${student.first_name} ${student.last_name}`.trim(),
          first_name: student.first_name,
          last_name: student.last_name,
          is_active: student.is_active,
          points: studentPoints,
          statistics: {
            total_days: totalDays,
            days_with_points: daysWithPoints,
            total_points: totalPoints,
            average_points: averagePoints
          }
        };
      });

      // Always set the data, even if there are no students or points
      console.log('Setting points data with', students.length, 'students');
      console.log('Working days generated:', workingDays);
      console.log('Points from backend:', pointsRes.data.points);
      setPointsData({
        semester: semester || { display_name: 'Semester', name: 'Semester' },
        working_days: workingDays.map(date => {
          // Create date object using UTC to avoid timezone issues
          const dateParts = date.split('-');
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-based
          const day = parseInt(dateParts[2]);
          const dateObj = new Date(year, month, day);

          return {
            date: date,
            day_name: dateObj.toLocaleDateString('ar-SA', { weekday: 'short' }),
            formatted_date: dateObj.toLocaleDateString('ar-SA', {
              month: 'short',
              day: 'numeric'
            })
          };
        }),
        students: students
      });

    } catch (err) {
      console.error('Error fetching points data:', err);
      setError("فشل في تحميل بيانات النقاط");
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (studentId, date) => {
    const cellKey = `${studentId}_${date}`;
    setEditingCell(editingCell === cellKey ? null : cellKey);
  };

  const openPointsModal = (student, date) => {
    if (!student.is_active) {
      setError("لا يمكن إعطاء نقاط لطالب غير مفعل");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSelectedStudent(student);
    setSelectedDate(date);

    // Find existing points for this date
    const dayPoints = student.points.find(p => p.date === date);
    console.log('Opening modal for:', { student: student.name, date, dayPoints });
    setPointsForm({
      points: dayPoints ? dayPoints.points : 0,
      notes: dayPoints ? dayPoints.notes || "" : ""
    });

    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    setShowPointsModal(false);
    setSelectedStudent(null);
    setSelectedDate("");
    setPointsForm({
      points: 0,
      notes: ""
    });
  };

  const handleGivePoints = async (e) => {
    e.preventDefault();

    if (!selectedStudent || !selectedDate || !selectedSemester) {
      setError("بيانات غير مكتملة");
      return;
    }

    console.log('Sending points data:', {
      student_id: selectedStudent.student_id,
      class_id: selectedClass,
      semester_id: selectedSemester,
      points_date: selectedDate,
      points_given: parseFloat(pointsForm.points),
      notes: pointsForm.notes
    });

    try {
      const response = await axios.post(`${API_BASE}/api/points`, {
        student_id: selectedStudent.student_id,
        class_id: selectedClass,
        semester_id: selectedSemester,
        points_date: selectedDate,
        points_given: parseFloat(pointsForm.points),
        notes: pointsForm.notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      console.log('Points save response:', response.data);
      setSuccess("تم إعطاء النقاط بنجاح");
      closePointsModal();
      fetchPointsData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error giving points:", error);
      console.error("Error response:", error.response?.data);
      setError(error.response?.data?.error || "فشل في إعطاء النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeletePoints = async (student, date) => {
    if (!window.confirm('هل أنت متأكد من حذف النقاط لهذا الطالب في هذا التاريخ؟')) {
      return;
    }

    try {
      const dayPoints = student.points.find(p => p.date === date);
      if (!dayPoints || !dayPoints.id) {
        setError("لا توجد نقاط لحذفها");
        return;
      }

      await axios.delete(`${API_BASE}/api/points/${dayPoints.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess("تم حذف النقاط بنجاح");
      fetchPointsData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting points:", error);
      setError(error.response?.data?.error || "فشل في حذف النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getPointsColor = (points) => {
    if (points === null || points === undefined) return 'bg-gray-100 text-gray-500';
    if (points >= 4.5) return 'bg-green-100 text-green-800';
    if (points >= 3.5) return 'bg-blue-100 text-blue-800';
    if (points >= 2.5) return 'bg-yellow-100 text-yellow-800';
    if (points >= 1.5) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'تاريخ غير صحيح';
    try {
      // Parse date string manually to avoid timezone issues
      const dateParts = dateStr.split('-');
      if (dateParts.length !== 3) return 'تاريخ غير صحيح';

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Month is 0-based
      const day = parseInt(dateParts[2]);

      if (isNaN(year) || isNaN(month) || isNaN(day)) return 'تاريخ غير صحيح';

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return 'تاريخ غير صحيح';

      const hijriDate = date.toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        calendar: 'islamic-umalqura'
      });

      const gregorianDate = date.toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        calendar: 'gregory'
      });

      return (
        <div className="text-xs text-center">
          <div className="font-semibold text-gray-800">{hijriDate} هـ</div>
          <div className="text-gray-600 mt-0.5">{gregorianDate} م</div>
        </div>
      );
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'تاريخ غير صحيح';
    }
  };


  const visibleClasses = lockedClassId
    ? classes.filter(cls => String(cls.id) === String(lockedClassId))
    : classes;

  const filteredPointsData = useMemo(() => {
    if (!pointsData) return null;
    const dateSet = new Set(
      pointsData.working_days
        .map(d => d.date)
        .filter(date => {
          if (filterStartDate && date < filterStartDate) return false;
          if (filterEndDate && date > filterEndDate) return false;
          return true;
        })
    );

    const workingDays = pointsData.working_days.filter(day => dateSet.has(day.date));
    const students = pointsData.students
      .filter(student => {
        if (!studentQuery) return true;
        return student.name.toLowerCase().includes(studentQuery.toLowerCase());
      })
      .map(student => {
        const filteredPoints = student.points.filter(point => dateSet.has(point.date));
        const totalDays = workingDays.length;
        const daysWithPoints = filteredPoints.filter(day => day.points !== null).length;
        const totalPoints = filteredPoints.reduce((sum, day) => sum + (parseFloat(day.points) || 0), 0);
        const averagePoints = daysWithPoints > 0 ? parseFloat((totalPoints / daysWithPoints).toFixed(1)) : 0;
        return {
          ...student,
          points: filteredPoints,
          statistics: {
            total_days: totalDays,
            days_with_points: daysWithPoints,
            total_points: totalPoints,
            average_points: averagePoints
          }
        };
      })
      .filter(student => (showOnlyWithPoints ? student.statistics.days_with_points > 0 : true));

    return { ...pointsData, working_days: workingDays, students };
  }, [pointsData, filterStartDate, filterEndDate, studentQuery, showOnlyWithPoints]);

  if (loading && !pointsData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center gap-3">
          <AiOutlineLoading3Quarters className="animate-spin text-2xl text-blue-500" />
          <span>جاري تحميل بيانات النقاط...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-full mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AiOutlineStar className="text-3xl text-yellow-600" />
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">إدارة النقاط</h1>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">الحلقة:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={classes.length === 0 || !!lockedClassId}
              >
                <option value="">
                  {classes.length === 0 ? "لا توجد حلقات متاحة" : "اختر الحلقة"}
                </option>
                {visibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school_name} ({cls.student_count} طالب)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الفصل الدراسي:</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={semesters.length === 0}
              >
                <option value="">
                  {semesters.length === 0 ? "لا توجد فصول دراسية متاحة" : "اختر الفصل الدراسي"}
                </option>
                {Array.isArray(semesters) && semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name || semester.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchPointsData}
                disabled={!selectedClass || !selectedSemester}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!selectedClass || !selectedSemester ? "يرجى اختيار الحلقة والفصل الدراسي أولاً" : "تحديث بيانات النقاط"}
              >
                <AiOutlineReload />
                {pointsData ? "تحديث البيانات" : "إنشاء جدول النقاط"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Student search</label>
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyWithPoints}
                  onChange={(e) => setShowOnlyWithPoints(e.target.checked)}
                  className="h-4 w-4"
                />
                إظهار الطلاب الذين لديهم نقاط فقط
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
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

      {/* Points Table */}
      {filteredPointsData && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">
              جدول النقاط - {filteredPointsData.semester.display_name || filteredPointsData.semester.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filterStartDate || filterEndDate
                ? `Showing ${filterStartDate || 'start'} to ${filterEndDate || 'end'}`
                : 'Showing full semester'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky right-0 bg-gray-50 px-4 py-3 text-right font-medium border-l min-w-[200px]">
                    الطالب
                  </th>
                  <th className="px-2 py-3 text-center font-medium border-l min-w-[80px]">
                    المجموع
                  </th>
                  {filteredPointsData.working_days.map((dayInfo) => (
                    <th key={dayInfo.date} className="px-2 py-3 text-center font-medium border-l min-w-[80px] text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">{dayInfo.day_name}</span>
                        {formatDate(dayInfo.date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPointsData.students.map((student) => (
                  <tr key={student.student_id} className="border-b hover:bg-gray-50">
                    <td className="sticky right-0 bg-white px-4 py-3 border-l">
                      <div className="flex items-center gap-2">
                        <AiOutlineUser className="text-gray-400" />
                        <div>
                          <div className={`font-medium text-sm ${!student.is_active ? 'text-gray-500' : ''}`}>
                            {student.name}
                            {!student.is_active && <span className="text-red-600 text-xs ml-1">(غير مفعل)</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {student.student_id} | {classes.find(c => c.id === selectedClass)?.name || 'الحلقة'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center border-l">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        student.statistics.total_points >= 20 ? 'bg-green-100 text-green-800' :
                        student.statistics.total_points >= 15 ? 'bg-blue-100 text-blue-800' :
                        student.statistics.total_points >= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.statistics.total_points}
                      </span>
                    </td>
                    {student.points.map((day) => (
                      <td key={day.date} className="px-1 py-3 text-center border-l">
                        <div className="points-cell relative">
                          <button
                            onClick={() => handleCellClick(student.student_id, day.date)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${getPointsColor(day.points)} hover:opacity-75`}
                            title={`${day.date} - ${day.points !== null ? `${day.points} نقاط` : 'لا توجد نقاط'}`}
                            disabled={!student.is_active}
                          >
                            {day.points !== null ? day.points : '-'}
                          </button>
                          {editingCell === `${student.student_id}_${day.date}` && student.is_active && (
                            <div className="absolute z-50 bg-white border rounded-lg shadow-xl p-3 mt-1 -ml-8 min-w-[120px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPointsModal(student, day.date);
                                    setEditingCell(null);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                >
                                  <AiOutlineEdit className="w-3 h-3" />
                                  {day.points !== null ? 'تعديل' : 'إضافة'}
                                </button>
                                {day.points !== null && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePoints(student, day.date);
                                      setEditingCell(null);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                  >
                                    <AiOutlineDelete className="w-3 h-3" />
                                    حذف
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {filteredPointsData.students.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredPointsData.students.length}
                  </div>
                  <div className="text-sm text-gray-600">إجمالي الطلاب</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {(filteredPointsData.students.reduce((sum, s) => sum + s.statistics.total_points, 0) / filteredPointsData.students.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">متوسط المجموع</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredPointsData.working_days.length}
                  </div>
                  <div className="text-sm text-gray-600">أيام العمل</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredPointsData.students.reduce((sum, s) => sum + s.statistics.total_points, 0)}
                  </div>
                  <div className="text-sm text-gray-600">إجمالي النقاط</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!pointsData && !loading && (
        <div className="text-center py-12">
          <AiOutlineStar className="mx-auto text-6xl text-gray-400 mb-4" />
          {selectedClass && selectedSemester ? (
            <>
              <h3 className="text-xl font-medium text-gray-600 mb-2">لا توجد بيانات نقاط</h3>
              <p className="text-gray-500 mb-4">
                لا توجد بيانات نقاط لهذه الحلقة والفصل الدراسي
                <br />
                انقر على "تحديث البيانات" لإنشاء الجدول وإضافة نقاط جديدة
              </p>
              <button
                onClick={fetchPointsData}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <AiOutlineReload />
                إنشاء جدول النقاط
              </button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-medium text-gray-600 mb-2">ابدأ بإدارة النقاط</h3>
              <p className="text-gray-500 mb-4">
                يرجى اختيار الحلقة والفصل الدراسي من القوائم أعلاه لبدء إدارة النقاط
              </p>
              <div className="space-y-2">
                {!selectedClass && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <span className="text-lg">⚠️</span>
                    <span>يرجى اختيار الحلقة</span>
                  </div>
                )}
                {!selectedSemester && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <span className="text-lg">⚠️</span>
                    <span>يرجى اختيار الفصل الدراسي</span>
                  </div>
                )}
                {classes.length === 0 && (
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <span className="text-lg">ℹ️</span>
                    <span>لا توجد حلقات متاحة لك</span>
                  </div>
                )}
                {semesters.length === 0 && (
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <span className="text-lg">ℹ️</span>
                    <span>لا توجد فصول دراسية متاحة</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                إعطاء نقاط - {selectedStudent.name}
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
                  التاريخ
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النقاط (0 - 5)
                </label>
                <select
                  value={pointsForm.points || 0}
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
    </div>
  );
};

export default PointsManagement;
