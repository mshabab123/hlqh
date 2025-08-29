import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineStar, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineSave, AiOutlineClose } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PointsManagement = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [classPoints, setClassPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pointsForm, setPointsForm] = useState({
    points: 0,
    notes: ""
  });

  // Load user data
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
    if (user && allowedRoles.includes(user.role)) {
      loadTeacherClasses();
      loadCurrentSemester();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
      loadClassPoints();
    }
  }, [selectedClass, selectedDate]);

  const loadTeacherClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/points/teacher/my-classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("Error loading teacher classes:", error);
      setError("فشل في تحميل الصفوف");
    }
  };

  const loadCurrentSemester = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCurrentSemester(response.data.semester);
    } catch (error) {
      console.error("Error loading current semester:", error);
    }
  };

  const loadClassStudents = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/students?class_id=${selectedClass}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(response.data.students || response.data || []);
    } catch (error) {
      console.error("Error loading students:", error);
      setError("فشل في تحميل الطلاب");
    }
  };

  const loadClassPoints = async () => {
    if (!selectedClass || !selectedDate) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentSemester?.id) params.append('semester_id', currentSemester.id);
      params.append('points_date', selectedDate);
      
      const response = await axios.get(`${API_BASE}/api/points/class/${selectedClass}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClassPoints(response.data.points || []);
    } catch (error) {
      console.error("Error loading class points:", error);
      setError("فشل في تحميل نقاط الصف");
    } finally {
      setLoading(false);
    }
  };

  const openPointsModal = (student) => {
    // Prevent opening modal for inactive students
    if (!student.is_active) {
      setError("لا يمكن إعطاء نقاط لطالب غير مفعل");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    setSelectedStudent(student);
    
    // Check if student already has points for this date
    const existingPoints = classPoints.find(p => p.student_id === student.id);
    if (existingPoints) {
      setPointsForm({
        points: existingPoints.points_given,
        notes: existingPoints.notes || ""
      });
    } else {
      setPointsForm({
        points: 0,
        notes: ""
      });
    }
    
    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    setShowPointsModal(false);
    setSelectedStudent(null);
    setPointsForm({
      points: 0,
      notes: ""
    });
  };

  const handleGivePoints = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent || !currentSemester) {
      setError("بيانات غير مكتملة");
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/api/points`, {
        student_id: selectedStudent.id,
        class_id: selectedClass,
        semester_id: currentSemester.id,
        points_date: selectedDate,
        points_given: parseFloat(pointsForm.points),
        notes: pointsForm.notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccess("تم إعطاء النقاط بنجاح");
      closePointsModal();
      loadClassPoints();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error giving points:", error);
      setError(error.response?.data?.error || "فشل في إعطاء النقاط");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getStudentPointsForDate = (studentId) => {
    const points = classPoints.find(p => p.student_id === studentId);
    return points ? points.points_given : null;
  };

  const getPointsColor = (points) => {
    if (points === null || points === undefined) return "text-gray-400";
    if (points >= 4.5) return "text-green-600";
    if (points >= 3.5) return "text-blue-600";
    if (points >= 2.5) return "text-yellow-600";
    if (points >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  const renderPointsStars = (points) => {
    if (points === null || points === undefined) return "لا توجد نقاط";
    
    const stars = [];
    const fullStars = Math.floor(points);
    const hasHalf = points % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<AiOutlineStar key={i} className="inline text-yellow-400 fill-current" />);
    }
    
    if (hasHalf) {
      stars.push(<AiOutlineStar key="half" className="inline text-yellow-400" style={{clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'}} />);
    }
    
    const remainingStars = 5 - Math.ceil(points);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<AiOutlineStar key={`empty-${i}`} className="inline text-gray-300" />);
    }
    
    return (
      <div className="flex items-center gap-1">
        <span className="flex">{stars}</span>
        <span className="text-sm font-medium">({points}/5)</span>
      </div>
    );
  };

  // Check permissions
  const allowedRoles = ['admin', 'administrator', 'supervisor', 'teacher'];
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">غير مصرح لك بالوصول</h2>
          <p className="text-gray-600">هذه الصفحة متاحة للمعلمين والإداريين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AiOutlineStar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة النقاط</h1>
              <p className="text-gray-600">إعطاء النقاط اليومية للطلاب (حتى 5 نقاط يومياً)</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الصف</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الصف</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.school_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Students List */}
        {selectedClass && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                طلاب الصف - {selectedDate}
              </h2>
              <p className="text-gray-600 mt-1">انقر على اسم الطالب لإعطاء النقاط</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطالب</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">النقاط</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map(student => {
                    const points = getStudentPointsForDate(student.id);
                    const isInactive = !student.is_active;
                    return (
                      <tr key={student.id} className={`hover:bg-gray-50 ${isInactive ? 'bg-gray-100' : ''}`}>
                        <td className="px-6 py-4">
                          <div>
                            <div className={`font-medium ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
                              {student.first_name} {student.last_name}
                              {isInactive && <span className="ml-2 text-red-600 text-sm">(غير مفعل)</span>}
                            </div>
                            <div className="text-sm text-gray-500">ID: {student.id}</div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          <div className={`font-medium ${getPointsColor(points)}`}>
                            {renderPointsStars(points)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          {isInactive ? (
                            <span className="text-gray-500 text-sm">غير مفعل</span>
                          ) : (
                            <button
                              onClick={() => openPointsModal(student)}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 mx-auto"
                            >
                              <AiOutlineStar className="w-4 h-4" />
                              {points !== null ? 'تعديل النقاط' : 'إعطاء نقاط'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {students.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا يوجد طلاب في هذا الصف</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Points Modal */}
      {showPointsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                إعطاء نقاط - {selectedStudent.first_name} {selectedStudent.last_name}
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
              
              {/* Points Preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-2">معاينة النقاط:</p>
                <div className="flex items-center justify-center">
                  {renderPointsStars(parseFloat(pointsForm.points))}
                </div>
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