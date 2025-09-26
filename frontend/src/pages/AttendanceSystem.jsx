import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineCalendar, AiOutlineCheck, AiOutlineClose, AiOutlineEye, AiOutlinePlus, AiOutlineReload, AiOutlineUser, AiOutlineClockCircle, AiOutlineFileText } from "react-icons/ai";
import { formatDateWithHijri } from "../utils/hijriDate";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const AttendanceModal = ({ session, students, onSave, onClose, initialAttendance = [] }) => {
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize attendance state
    const attendanceMap = {};
    initialAttendance.forEach(record => {
      attendanceMap[record.student_id] = {
        status: record.status || 'absent_unexcused',
        notes: record.notes || ''
      };
    });
    
    // Add missing students with default status
    students.forEach(student => {
      if (!attendanceMap[student.student_id]) {
        attendanceMap[student.student_id] = {
          status: 'absent_unexcused',
          notes: ''
        };
      }
    });
    
    setAttendance(attendanceMap);
  }, [students, initialAttendance]);

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const attendanceArray = Object.entries(attendance).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        notes: data.notes
      }));
      
      await onSave(attendanceArray);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent_excused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'absent_unexcused': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <AiOutlineCheck className="text-green-600" />;
      case 'absent_excused': return <AiOutlineClockCircle className="text-yellow-600" />;
      case 'absent_unexcused': return <AiOutlineClose className="text-red-600" />;
      default: return <AiOutlineUser className="text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-[var(--color-primary-700)] mb-2">
            تسجيل الحضور والغياب
          </h3>
          <p className="text-gray-600">
            {(() => {
              const dateWithHijri = formatDateWithHijri(new Date(session.session_date));
              return `${dateWithHijri.full} - ${session.start_time} إلى ${session.end_time}`;
            })()}
          </p>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.student_id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--color-primary-100)] p-2 rounded-full">
                      <AiOutlineUser className="text-[var(--color-primary-700)]" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">رقم الهوية: {student.student_id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  {['present', 'absent_excused', 'absent_unexcused'].map((status) => (
                    <label key={status} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`status_${student.student_id}`}
                        value={status}
                        checked={attendance[student.student_id]?.status === status}
                        onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        attendance[student.student_id]?.status === status 
                          ? getStatusColor(status) + ' border-2'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}>
                        {getStatusIcon(status)}
                        <span className="text-sm font-medium">
                          {status === 'present' ? 'حاضر' : 
                           status === 'absent_excused' ? 'غائب بعذر' : 'غائب بدون عذر'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                
                <textarea
                  value={attendance[student.student_id]?.notes || ''}
                  onChange={(e) => handleNotesChange(student.student_id, e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="ملاحظات (اختيارية)"
                  rows="2"
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)] disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الحضور'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AttendanceSystem() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentAttendance, setCurrentAttendance] = useState([]);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.role);
    }
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSessions();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/attendance-system/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClasses(response.data.classes);
      if (response.data.classes.length > 0 && !selectedClass) {
        setSelectedClass(response.data.classes[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الحلقات");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/attendance-system/class/${selectedClass.id}/sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSessions(response.data.sessions);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الجلسات");
    }
  };

  const fetchAttendance = async (sessionId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/attendance-system/session/${sessionId}/attendance`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data.attendance;
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل بيانات الحضور");
      return [];
    }
  };

  const handleMarkAttendance = async (session) => {
    const attendance = await fetchAttendance(session.id);
    setCurrentSession(session);
    setCurrentAttendance(attendance);
    setStudents(attendance);
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async (attendanceData) => {
    try {
      await axios.post(`${API_BASE}/api/attendance-system/session/${currentSession.id}/attendance`, {
        attendance: attendanceData
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSuccess("تم حفظ الحضور والغياب بنجاح");
      setShowAttendanceModal(false);
      fetchSessions(); // Refresh sessions
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ الحضور");
    }
  };

  const createNewSession = async () => {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5); // 2 hours later
    
    try {
      await axios.post(`${API_BASE}/api/attendance-system/class/${selectedClass.id}/session`, {
        sessionDate: today,
        startTime: currentTime,
        endTime: endTime,
        notes: "جلسة جديدة"
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSuccess("تم إنشاء الجلسة بنجاح");
      fetchSessions();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إنشاء الجلسة");
    }
  };

  const getSessionStatusColor = (session) => {
    if (session.attendance_marked_count === 0) {
      return 'bg-red-100 text-red-800';
    } else if (session.attendance_marked_count < session.total_students) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getSessionStatusText = (session) => {
    if (session.attendance_marked_count === 0) {
      return 'لم يتم تسجيل الحضور';
    } else if (session.attendance_marked_count < session.total_students) {
      return `تم تسجيل ${session.attendance_marked_count} من ${session.total_students}`;
    } else {
      return 'تم تسجيل الحضور مكتمل';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري تحميل نظام الحضور والغياب...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <AiOutlineCalendar className="text-3xl text-[var(--color-primary-700)]" />
            <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">نظام الحضور والغياب</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSessions}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <AiOutlineReload /> تحديث
            </button>
            {['admin', 'administrator', 'teacher'].includes(userRole) && (
              <button
                onClick={createNewSession}
                className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
                disabled={!selectedClass}
              >
                <AiOutlinePlus /> جلسة جديدة
              </button>
            )}
          </div>
        </div>

        {/* Class Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">اختيار الحلقة:</label>
          <select
            value={selectedClass?.id || ''}
            onChange={(e) => {
              const classObj = classes.find(c => c.id === e.target.value);
              setSelectedClass(classObj);
            }}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
          >
            <option value="">اختر الحلقة</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name} - {classItem.school_name} ({classItem.student_count} طالب)
              </option>
            ))}
          </select>
        </div>
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

      {selectedClass && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">معلومات الحلقة</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">اسم الحلقة</p>
              <p className="font-medium">{selectedClass.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">المجمع</p>
              <p className="font-medium">{selectedClass.school_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">المعلم</p>
              <p className="font-medium">{selectedClass.teacher_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">الجلسات</h2>
        </div>
        
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AiOutlineFileText className="text-4xl mx-auto mb-4" />
            <p>لا توجد جلسات لهذه الحلقة</p>
          </div>
        ) : (
          <div className="divide-y">
            {sessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">
                        {(() => {
                          const dateWithHijri = formatDateWithHijri(new Date(session.session_date));
                          return dateWithHijri.short;
                        })()}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSessionStatusColor(session)}`}>
                        {getSessionStatusText(session)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <AiOutlineClockCircle />
                        <span>{session.start_time} - {session.end_time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AiOutlineUser />
                        <span>{session.total_students} طالب</span>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-gray-600 mt-2">{session.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAttendance(session)}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)]"
                    >
                      <AiOutlineEye />
                      {session.attendance_marked_count > 0 ? 'عرض/تعديل' : 'تسجيل الحضور'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAttendanceModal && currentSession && (
        <AttendanceModal
          session={currentSession}
          students={students}
          onSave={handleSaveAttendance}
          onClose={() => setShowAttendanceModal(false)}
          initialAttendance={currentAttendance}
        />
      )}
    </div>
  );
}