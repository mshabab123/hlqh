import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Move ClassForm component outside to prevent re-creation on each render
const ClassForm = ({ classData, onSubmit, onCancel, isEditing = false, onClassChange, schools, teachers, getFilteredSchools, getFilteredTeachers }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الحلقة *</label>
            <input
              type="text"
              value={classData.name}
              onChange={(e) => onClassChange({...classData, name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات *</label>
            <select
              value={classData.school_id}
              onChange={(e) => onClassChange({...classData, school_id: e.target.value})}
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">المعلم</label>
            <select
              value={classData.teacher_id || ""}
              onChange={(e) => onClassChange({...classData, teacher_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!classData.school_id}
            >
              <option value="">اختر المعلم</option>
              {getFilteredTeachers(classData.school_id).map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name}
                </option>
              ))}
            </select>
            {!classData.school_id && (
              <p className="text-sm text-gray-500 mt-1">يرجى اختيار مجمع الحلقات أولاً</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحد الأقصى للطلاب</label>
            <input
              type="number"
              min="1"
              max="50"
              value={classData.max_students}
              onChange={(e) => onClassChange({...classData, max_students: parseInt(e.target.value) || 0})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-4">
          <input
            type="checkbox"
            checked={classData.is_active}
            onChange={(e) => onClassChange({...classData, is_active: e.target.checked})}
            className="w-4 h-4"
          />
          <label className="text-sm font-medium">حلقة نشطة</label>
        </div>
        
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

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  
  const [newClass, setNewClass] = useState({
    name: "",
    school_id: "",
    teacher_id: "",
    max_students: 20,
    is_active: true
  });

  useEffect(() => {
    fetchClasses();
    fetchSchools();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClasses(response.data.classes || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الحلقات");
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

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/teachers?user_type=teacher`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTeachers(response.data.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };


  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/classes`, newClass, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowAddModal(false);
      setNewClass({
        name: "",
        school_id: "",
        teacher_id: "",
        max_students: 20,
        is_active: true
      });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة الحلقة");
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/api/classes/${editingClass.id}`, editingClass, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث الحلقة");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفصل؟")) {
      try {
        await axios.delete(`${API_BASE}/api/classes/${classId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchClasses();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف الحلقة");
      }
    }
  };

  const toggleClassStatus = async (classId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/classes/${classId}`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة الفصل");
    }
  };

  const canManageClass = (classData) => {
    if (userRole === 'admin') return true;
    if (userRole === 'administrator' && classData.school_id === userSchoolId) return true;
    return false;
  };

  const getFilteredSchools = () => {
    if (userRole === 'admin') return schools;
    if (userRole === 'administrator' && userSchoolId) {
      return schools.filter(school => school.id === userSchoolId);
    }
    return [];
  };

  const getFilteredClasses = () => {
    if (userRole === 'admin') return classes;
    if (userRole === 'administrator' && userSchoolId) {
      return classes.filter(cls => cls.school_id === userSchoolId);
    }
    return classes;
  };

  const getFilteredTeachers = (schoolId) => {
    if (!schoolId) return [];
    return teachers.filter(teacher => teacher.school_id === schoolId);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة الحلقة</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة حلقة جديدة
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getFilteredClasses().map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--color-primary-700)]">{classItem.name}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                classItem.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {classItem.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>مجمع الحلقات:</strong> {classItem.school_name}</p>
              {classItem.teacher_name && <p><strong>المعلم:</strong> {classItem.teacher_name}</p>}
              <p><strong>الحد الأقصى:</strong> {classItem.max_students} طالب</p>
            </div>
            
            <div className="flex gap-2">
              {canManageClass(classItem) && (
                <>
                  <button
                    onClick={() => setEditingClass(classItem)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <AiOutlineEdit /> تعديل
                  </button>
                  
                  <button
                    onClick={() => toggleClassStatus(classItem.id, classItem.is_active)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-white ${
                      classItem.is_active 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {classItem.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteClass(classItem.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <AiOutlineDelete /> حذف
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {getFilteredClasses().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد حلقات مسجلة</p>
        </div>
      )}

      {showAddModal && (
        <ClassForm
          classData={newClass}
          onSubmit={handleAddClass}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onClassChange={setNewClass}
          schools={schools}
          teachers={teachers}
          getFilteredSchools={getFilteredSchools}
          getFilteredTeachers={getFilteredTeachers}
        />
      )}

      {editingClass && (
        <ClassForm
          classData={editingClass}
          onSubmit={handleEditClass}
          onCancel={() => setEditingClass(null)}
          isEditing={true}
          onClassChange={setEditingClass}
          schools={schools}
          teachers={teachers}
          getFilteredSchools={getFilteredSchools}
          getFilteredTeachers={getFilteredTeachers}
        />
      )}
    </div>
  );
}