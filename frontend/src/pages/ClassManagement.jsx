import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineUser } from "react-icons/ai";
import ClassForm from "../components/ClassForm";
import StudentListModal from "../components/StudentListModal";
import { 
  canManageClass, 
  getFilteredSchools, 
  getFilteredClasses, 
  getFilteredTeachers 
} from "../utils/classUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  
  const [newClass, setNewClass] = useState({
    name: "",
    school_id: "",
    semester_id: "",
    school_level: "",
    teacher_id: "",
    max_students: 20,
    is_active: true
  });

  useEffect(() => {
    fetchClasses();
    fetchSchools();
    fetchTeachers();
    fetchSemesters();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
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

  const fetchSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSemesters(response.data || []);
    } catch (err) {
      console.error('Error fetching semesters:', err);
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
        semester_id: "",
        school_level: "",
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

  // Utility functions with current user context
  const canManageClassWithContext = (classData) => canManageClass(classData, userRole, userSchoolId);
  const getFilteredSchoolsWithContext = () => getFilteredSchools(schools, userRole, userSchoolId);
  const getFilteredClassesWithContext = () => getFilteredClasses(classes, userRole, userSchoolId);
  const getFilteredTeachersWithContext = (schoolId) => getFilteredTeachers(teachers, schoolId);

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
        {getFilteredClassesWithContext().map((classItem) => (
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
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedClassForStudents(classItem)}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <AiOutlineUser /> قائمة الطلاب
              </button>
              
              {canManageClassWithContext(classItem) && (
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

      {getFilteredClassesWithContext().length === 0 && (
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
          semesters={semesters}
          getFilteredSchools={getFilteredSchoolsWithContext}
          getFilteredTeachers={getFilteredTeachersWithContext}
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
          semesters={semesters}
          getFilteredSchools={getFilteredSchoolsWithContext}
          getFilteredTeachers={getFilteredTeachersWithContext}
        />
      )}

      {selectedClassForStudents && (
        <StudentListModal
          classItem={selectedClassForStudents}
          onClose={() => setSelectedClassForStudents(null)}
        />
      )}
    </div>
  );
}