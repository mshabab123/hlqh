import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineCheck, AiOutlineClose } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// TeacherForm component for add/edit
const TeacherForm = ({ teacher, onSubmit, onCancel, isEditing = false, onTeacherChange, schools, getFilteredSchools, classes = [] }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل المعلم" : "إضافة معلم جديد"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
            <input
              type="text"
              value={teacher.id}
              onChange={(e) => onTeacherChange({...teacher, id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="[0-9]{10}"
              maxLength="10"
              required
              disabled={isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات *</label>
            <select
              value={teacher.school_id}
              onChange={(e) => onTeacherChange({...teacher, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر مجمع الحلقات</option>
              {getFilteredSchools().map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={teacher.first_name}
              onChange={(e) => onTeacherChange({...teacher, first_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الثاني *</label>
            <input
              type="text"
              value={teacher.second_name}
              onChange={(e) => onTeacherChange({...teacher, second_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الجد *</label>
            <input
              type="text"
              value={teacher.third_name}
              onChange={(e) => onTeacherChange({...teacher, third_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={teacher.last_name}
              onChange={(e) => onTeacherChange({...teacher, last_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={teacher.email}
              onChange={(e) => onTeacherChange({...teacher, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال *</label>
            <input
              type="text"
              value={teacher.phone}
              onChange={(e) => onTeacherChange({...teacher, phone: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^05[0-9]{8}$"
              placeholder="05xxxxxxxx"
              required
            />
          </div>
        </div>
        
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
            <input
              type="password"
              value={teacher.password}
              onChange={(e) => onTeacherChange({...teacher, password: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength="6"
              required
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">التخصص</label>
            <input
              type="text"
              value={teacher.specialization || ""}
              onChange={(e) => onTeacherChange({...teacher, specialization: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={teacher.address || ""}
              onChange={(e) => onTeacherChange({...teacher, address: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">المؤهلات</label>
          <textarea
            value={teacher.actual_qualifications || ""}
            onChange={(e) => onTeacherChange({...teacher, actual_qualifications: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="الشهادات والمؤهلات العلمية..."
          />
        </div>
        
        {isEditing && (
          <div>
            <label className="block text-sm font-medium mb-1">الحلقات المسندة</label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد حلقات متاحة</p>
              ) : (
                classes
                  .filter(cls => !teacher.school_id || cls.school_id === teacher.school_id)
                  .map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacher.class_ids?.includes(cls.id) || false}
                      onChange={(e) => {
                        const currentIds = teacher.class_ids || [];
                        const newIds = e.target.checked
                          ? [...currentIds, cls.id]
                          : currentIds.filter(id => id !== cls.id);
                        onTeacherChange({...teacher, class_ids: newIds});
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {cls.name}
                      {cls.teacher_id === teacher.id && 
                        <span className="text-xs text-green-600 mr-1">(حالياً)</span>
                      }
                      {cls.teacher_id && cls.teacher_id !== teacher.id && 
                        <span className="text-xs text-orange-600 mr-1">(معلم آخر)</span>
                      }
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              يمكنك تعيين المعلم لعدة حلقات أو تركه بدون حلقة
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)]"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  const [selectedSchool, setSelectedSchool] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "active", "inactive"
  
  const [newTeacher, setNewTeacher] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    school_id: "",
    specialization: "",
    actual_qualifications: "",
    user_type: "teacher"
  });

  useEffect(() => {
    fetchTeachers();
    fetchSchools();
    fetchClasses();
  }, [selectedSchool, activeFilter]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ user_type: 'teacher' });
      if (selectedSchool) {
        params.append('school_id', selectedSchool);
      }
      if (activeFilter !== "all") {
        params.append('is_active', activeFilter === "active" ? 'true' : 'false');
      }
      
      const response = await axios.get(`${API_BASE}/api/teachers?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTeachers(response.data.teachers || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل المعلمين");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSchools(response.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      // The API returns an array directly, not wrapped in an object
      const classesData = Array.isArray(response.data) ? response.data : (response.data.classes || []);
      console.log('Fetched classes:', classesData);
      setClasses(classesData);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/teachers`, newTeacher, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowAddModal(false);
      setNewTeacher({
        id: "",
        first_name: "",
        second_name: "",
        third_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        school_id: "",
        specialization: "",
        actual_qualifications: "",
        user_type: "teacher"
      });
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة المعلم");
    }
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        first_name: editingTeacher.first_name,
        second_name: editingTeacher.second_name,
        third_name: editingTeacher.third_name,
        last_name: editingTeacher.last_name,
        email: editingTeacher.email,
        phone: editingTeacher.phone,
        address: editingTeacher.address,
        school_id: editingTeacher.school_id,
        specialization: editingTeacher.specialization,
        qualifications: editingTeacher.actual_qualifications
      };
      
      await axios.put(`${API_BASE}/api/teachers/${editingTeacher.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Handle multiple class assignments using new API
      if (editingTeacher.class_ids !== undefined) {
        const selectedIds = editingTeacher.class_ids || [];
        
        
        // Use new teacher-class assignment API
        await axios.post(`${API_BASE}/api/teachers/${editingTeacher.id}/classes`, {
          class_ids: selectedIds
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      setEditingTeacher(null);
      fetchTeachers();
      fetchClasses(); // Refresh classes to reflect changes
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث المعلم");
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المعلم؟")) {
      try {
        await axios.delete(`${API_BASE}/api/teachers/${teacherId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchTeachers();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف المعلم");
      }
    }
  };

  const toggleActivation = async (teacherId, currentStatus) => {
    try {
      await axios.patch(`${API_BASE}/api/teachers/${teacherId}/activate`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة التفعيل");
    }
  };

  const canManageTeacher = (teacher) => {
    if (userRole === 'admin') return true;
    if (userRole === 'supervisor' && teacher.school_id === userSchoolId) return true;
    return false;
  };

  const getFilteredSchools = () => {
    if (userRole === 'admin') return schools;
    if (userRole === 'supervisor' && userSchoolId) {
      return schools.filter(school => school.id === userSchoolId);
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-[var(--color-primary-700)]">إدارة المعلمين</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة معلم جديد
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">تصفية حسب مجمع الحلقات:</label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">جميع مجمعات الحلقات</option>
            {getFilteredSchools().map(school => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">تصفية حسب الحالة:</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع المعلمين</option>
            <option value="active">المعلمون النشطون</option>
            <option value="inactive">المعلمون غير النشطين</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--color-primary-700)]">
                {teacher.first_name} {teacher.last_name}
              </h3>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  teacher.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {teacher.is_active ? 'نشط' : 'غير نشط'}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  معلم
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>رقم الهوية:</strong> {teacher.id}</p>
              <p><strong>البريد:</strong> {teacher.email}</p>
              <p><strong>الجوال:</strong> {teacher.phone}</p>
              {teacher.specialization && <p><strong>التخصص:</strong> {teacher.specialization}</p>}
              {teacher.actual_qualifications && <p><strong>المؤهلات:</strong> {teacher.actual_qualifications}</p>}
              
              {/* Display assigned classes */}
              {(() => {
                // Check if teacher has class_ids array (multiple assignments)
                const teacherClassIds = teacher.class_ids || [];
                // Also check if teacher is assigned through the assigned_teacher_ids in classes
                const teacherClasses = classes.filter(cls => {
                  // Check if teacher is in the class's assigned_teacher_ids array
                  const assignedTeacherIds = cls.assigned_teacher_ids || [];
                  return assignedTeacherIds.includes(teacher.id) || 
                         teacherClassIds.includes(cls.id) || 
                         cls.teacher_id === teacher.id;
                });
                
                console.log(`Teacher ${teacher.id} classes:`, teacherClasses);
                
                if (teacherClasses.length > 0) {
                  return (
                    <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-800 text-xs mb-2">
                        حلقات مجمع الحلقات ({teacherClasses.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {teacherClasses.map(cls => (
                          <span 
                            key={cls.id} 
                            className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                          >
                            {cls.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-xs text-center">
                        لا يدرس أي حلقة حالياً
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {canManageTeacher(teacher) && (
                <>
                  <button
                    onClick={() => {
                      // Find all classes assigned to this teacher using multiple methods
                      const assignedClassIds = [];
                      
                      // Method 1: Check teacher's class_ids array (from API)
                      if (teacher.class_ids && Array.isArray(teacher.class_ids)) {
                        assignedClassIds.push(...teacher.class_ids);
                      }
                      
                      // Method 2: Check classes where teacher is in assigned_teacher_ids
                      classes.forEach(cls => {
                        const assignedTeacherIds = cls.assigned_teacher_ids || [];
                        if (assignedTeacherIds.includes(teacher.id) && !assignedClassIds.includes(cls.id)) {
                          assignedClassIds.push(cls.id);
                        }
                      });
                      
                      // Method 3: Legacy check - classes where teacher_id matches
                      classes.forEach(cls => {
                        if (cls.teacher_id === teacher.id && !assignedClassIds.includes(cls.id)) {
                          assignedClassIds.push(cls.id);
                        }
                      });
                      
                      console.log(`Loading edit for teacher ${teacher.id} with classes:`, assignedClassIds);
                      
                      setEditingTeacher({
                        ...teacher,
                        class_ids: assignedClassIds
                      });
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    <AiOutlineEdit /> تعديل
                  </button>
                  
                  <button
                    onClick={() => toggleActivation(teacher.id, teacher.is_active)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-white text-sm ${
                      teacher.is_active 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {teacher.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                    {teacher.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteTeacher(teacher.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    <AiOutlineDelete /> حذف
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {teachers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد معلمين مسجلين</p>
        </div>
      )}

      {showAddModal && (
        <TeacherForm
          teacher={newTeacher}
          onSubmit={handleAddTeacher}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onTeacherChange={setNewTeacher}
          schools={schools}
          getFilteredSchools={getFilteredSchools}
          classes={classes}
        />
      )}

      {editingTeacher && (
        <TeacherForm
          teacher={editingTeacher}
          onSubmit={handleEditTeacher}
          onCancel={() => setEditingTeacher(null)}
          isEditing={true}
          onTeacherChange={setEditingTeacher}
          schools={schools}
          getFilteredSchools={getFilteredSchools}
          classes={classes}
        />
      )}
    </div>
  );
}
