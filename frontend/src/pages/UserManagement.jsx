import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlineUser, 
  AiOutlineEdit, 
  AiOutlineEye, 
  AiOutlineCheck, 
  AiOutlineClose,
  AiOutlineSafety,
  AiOutlineWarning,
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineDelete,
  AiOutlineUserSwitch,
  AiOutlineTeam
} from "react-icons/ai";
import { FaUserGraduate, FaChalkboardTeacher, FaUserTie, FaUsers, FaCrown } from "react-icons/fa";
import SimpleChildrenManagement from "../components/SimpleChildrenManagement";
import UserInfoEditModal from "../components/UserInfoEditModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Role display names and colors
const ROLE_CONFIG = {
  admin: { 
    name: 'مدير عام', 
    color: 'bg-red-500 text-white',
    icon: FaCrown,
    level: 5 
  },
  administrator: { 
    name: 'مدير مجمع', 
    color: 'bg-purple-500 text-white',
    icon: FaUserTie,
    level: 4 
  },
  supervisor: { 
    name: 'مشرف', 
    color: 'bg-blue-500 text-white',
    icon: FaUsers,
    level: 3 
  },
  teacher: { 
    name: 'معلم', 
    color: 'bg-green-500 text-white',
    icon: FaChalkboardTeacher,
    level: 2 
  },
  parent: { 
    name: 'ولي أمر', 
    color: 'bg-orange-500 text-white',
    icon: AiOutlineUser,
    level: 1 
  },
  student: { 
    name: 'طالب', 
    color: 'bg-gray-500 text-white',
    icon: FaUserGraduate,
    level: 0 
  }
};

// Role Edit Modal Component
const RoleEditModal = ({ user, onClose, onUpdate, schools, classes }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedSchoolId, setSelectedSchoolId] = useState(user.school_id || '');
  const [selectedClassId, setSelectedClassId] = useState(user.class_id || '');
  const [loading, setLoading] = useState(false);

  // Debug logging
  console.log('RoleEditModal - schools received:', schools);
  console.log('RoleEditModal - classes received:', classes);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation: Administrator role requires school selection
    if (selectedRole === 'administrator' && !selectedSchoolId) {
      alert('يجب اختيار المجمع للمشرف');
      setLoading(false);
      return;
    }

    try {
      const updateData = { 
        role: selectedRole,
        school_id: ['administrator', 'supervisor', 'teacher', 'student'].includes(selectedRole) ? selectedSchoolId || null : null,
        class_id: ['teacher', 'student'].includes(selectedRole) ? selectedClassId || null : null
      };

      console.log('Updating user role:', {
        userId: user.id || user.user_id,
        currentRole: user.role,
        newRole: selectedRole,
        updateData
      });

      const response = await axios.put(`${API_BASE}/api/users/${user.id || user.user_id}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Role update response:', response.data);

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('فشل في تحديث الصلاحية: ' + (error.response?.data?.error || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const requiresSchool = ['administrator', 'supervisor', 'teacher', 'student'].includes(selectedRole);
  const requiresClass = ['teacher', 'student'].includes(selectedRole);

  // Filter classes based on selected school
  const filteredClasses = classes.filter(cls => cls.school_id == selectedSchoolId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineSafety className="text-2xl" />
          تعديل صلاحيات المستخدم
        </h3>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">معلومات المستخدم:</h4>
          <p><strong>الاسم:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>الإيميل:</strong> {user.email}</p>
          <p><strong>الصلاحية الحالية:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${ROLE_CONFIG[user.role]?.color}`}>
              {ROLE_CONFIG[user.role]?.name}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">الصلاحية الجديدة:</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                // Reset school and class when changing role
                if (!['administrator', 'supervisor', 'teacher', 'student'].includes(e.target.value)) {
                  setSelectedSchoolId('');
                  setSelectedClassId('');
                }
              }}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="admin">مدير عام</option>
              <option value="administrator">مدير مجمع</option>
              <option value="supervisor">مشرف</option>
              <option value="teacher">معلم</option>
              <option value="parent">ولي أمر</option>
              <option value="student">طالب</option>
            </select>
          </div>

          {requiresSchool && (
            <div>
              <label className="block text-sm font-medium mb-2">
                المجمع المخصص
                {selectedRole === 'administrator' && (
                  <span className="text-red-500 mr-1">*</span>
                )}
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => {
                  setSelectedSchoolId(e.target.value);
                  setSelectedClassId(''); // Reset class when school changes
                }}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر المجمع</option>
                {schools && schools.length > 0 ? (
                  schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>لا توجد مجمعات متاحة</option>
                )}
              </select>
            </div>
          )}

          {requiresClass && selectedSchoolId && (
            <div>
              <label className="block text-sm font-medium mb-2">الحلقة المخصصة:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الحلقة (اختياري)</option>
                {filteredClasses && filteredClasses.length > 0 ? (
                  filteredClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - المستوى {cls.level}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>لا توجد حلقات متاحة</option>
                )}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'جاري التحديث...' : 'تحديث الصلاحية'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Details Modal
const UserDetailsModal = ({ user, onClose, schools, classes }) => {
  const getUserSchoolName = (schoolId) => {
    const school = schools.find(s => s.id == schoolId);
    return school ? school.name : 'غير محدد';
  };

  const getUserClassName = (classId) => {
    const cls = classes.find(c => c.id == classId);
    return cls ? `${cls.name} - المستوى ${cls.level}` : 'غير محدد';
  };

  const getUserClassNames = (classIds) => {
    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return 'غير محدد';
    }
    return classIds.map(classId => {
      const cls = classes.find(c => c.id == classId);
      return cls ? cls.name : 'غير معروف';
    }).join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineUser className="text-2xl" />
          تفاصيل المستخدم
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الأول</label>
              <p className="text-gray-900">{user.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العائلة</label>
              <p className="text-gray-900">{user.last_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <p className="text-gray-900">{user.phone || 'غير محدد'}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_CONFIG[user.role]?.color}`}>
                {ROLE_CONFIG[user.role]?.name}
              </span>
            </div>
          </div>

          {user.school_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المجمع</label>
              <p className="text-gray-900">{getUserSchoolName(user.school_id)}</p>
            </div>
          )}

          {((user.class_id) || (user.class_ids && user.class_ids.length > 0)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {user.class_ids && user.class_ids.length > 1 ? 'الحلقات' : 'الحلقة'}
              </label>
              <p className="text-gray-900">
                {user.class_ids && user.class_ids.length > 0
                  ? getUserClassNames(user.class_ids)
                  : getUserClassName(user.class_id)
                }
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">حالة الحساب</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {user.is_active ? 'مفعل' : 'غير مفعل'}
            </span>
          </div>

          {user.address && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <p className="text-gray-900">{user.address}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// Flip Card User Component
const UserCard = ({ user, onEdit, onView, onToggleActive, onEditProfile, onDeleteUser, onManageChildren, schools, classes, hasDuplicateEmail }) => {
  const getUserSchoolName = (schoolId) => {
    const school = schools.find(s => s.id == schoolId);
    return school ? school.name : 'غير محدد';
  };

  const getUserClassName = (classId) => {
    const cls = classes.find(c => c.id == classId);
    return cls ? `${cls.name}` : 'غير محدد';
  };

  const getUserClassNames = (classIds) => {
    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return 'غير محدد';
    }
    return classIds.map(classId => {
      const cls = classes.find(c => c.id == classId);
      return cls ? cls.name : 'غير معروف';
    }).join(', ');
  };

  const RoleIcon = ROLE_CONFIG[user.role]?.icon || AiOutlineUser;
  const roleConfig = ROLE_CONFIG[user.role];

  const getRoleGradient = (role) => {
    switch (role) {
      case 'admin': return 'from-red-500 to-red-600';
      case 'administrator': return 'from-purple-500 to-purple-600';
      case 'supervisor': return 'from-blue-500 to-blue-600';
      case 'teacher': return 'from-green-500 to-green-600';
      case 'parent': return 'from-orange-500 to-orange-600';
      case 'student': return 'from-cyan-500 to-cyan-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`p-4 bg-gradient-to-br ${getRoleGradient(user.role)} relative`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shrink-0">
              <RoleIcon className="text-white text-2xl drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-white drop-shadow-sm truncate">
                {user.first_name} {user.second_name} {user.third_name} {user.last_name}
              </h3>
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">
                {roleConfig?.name || user.role}
              </span>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full inline-block shrink-0 ${
            user.is_active ? 'bg-green-300' : 'bg-red-300'
          } drop-shadow-sm`} title={user.is_active ? 'نشط' : 'موقوف'}></span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2 text-sm flex-1">
        <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
          <span className="text-gray-500">رقم الهوية</span>
          <span className="font-bold text-gray-800" dir="ltr">{user.id || user.user_id}</span>
        </div>
        {user.phone && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
            <span className="text-gray-500">الجوال</span>
            <span className="font-semibold text-gray-800" dir="ltr">{user.phone}</span>
          </div>
        )}
        {user.email && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg gap-2">
            <span className="text-gray-500 shrink-0">البريد</span>
            <span className="font-semibold text-gray-800 truncate" dir="ltr">{user.email}</span>
            {hasDuplicateEmail(user.email) && (
              <span className="text-xs text-red-600 font-bold shrink-0" title="بريد مكرر">⚠️ مكرر</span>
            )}
          </div>
        )}
        {user.school_id && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg gap-2">
            <span className="text-gray-500 shrink-0">المجمع</span>
            <span className="font-semibold text-gray-800 truncate">{getUserSchoolName(user.school_id)}</span>
          </div>
        )}
        {((user.class_id) || (user.class_ids && user.class_ids.length > 0)) && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg gap-2">
            <span className="text-gray-500 shrink-0">{user.class_ids && user.class_ids.length > 1 ? 'الحلقات' : 'الحلقة'}</span>
            <span className="font-semibold text-gray-800 truncate">
              {user.class_ids && user.class_ids.length > 0
                ? getUserClassNames(user.class_ids)
                : getUserClassName(user.class_id)}
            </span>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات كأيقونات مع تلميحات */}
      <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-1.5">
          <button
            onClick={() => onView(user)}
            className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            title="التحكم الكامل بالمستخدم (عرض وتعديل كل المعلومات)"
            aria-label="التحكم الكامل بالمستخدم"
          >
            <AiOutlineEye className="text-lg" />
          </button>
          <button
            onClick={() => onEdit(user)}
            className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            title="تعديل الصلاحيات"
            aria-label="تعديل الصلاحيات"
          >
            <AiOutlineSafety className="text-lg" />
          </button>
          {(user.role === 'parent' || user.role === 'admin' || user.role === 'administrator' || user.role === 'teacher') && (
            <button
              onClick={() => onManageChildren(user)}
              className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              title="إدارة الأبناء"
              aria-label="إدارة الأبناء"
            >
              <AiOutlineTeam className="text-lg" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onToggleActive(user.id || user.user_id)}
            className={`p-2.5 rounded-lg transition-colors ${
              user.is_active
                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : 'text-green-600 bg-green-50 hover:bg-green-100'
            }`}
            title={user.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
            aria-label={user.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
          >
            {user.is_active ? <AiOutlineClose className="text-lg" /> : <AiOutlineCheck className="text-lg" />}
          </button>
          <button
            onClick={() => onDeleteUser(user.id || user.user_id)}
            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            title="حذف نهائياً"
            aria-label="حذف نهائياً"
          >
            <AiOutlineDelete className="text-lg" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2 text-[11px] text-gray-400 text-left" dir="ltr">
        {new Date(user.created_at).toLocaleDateString('ar-SA')}
      </div>
    </div>
  );
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showChildrenModal, setShowChildrenModal] = useState(false);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [duplicateEmailFilter, setDuplicateEmailFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchSchools();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let allUsers = [];
      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        allUsers = response.data.users;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        allUsers = response.data.data;
      }

      console.log('Fetched users:', allUsers.map(user => ({
        id: user.id || user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        is_active: user.is_active
      })));

      setUsers(allUsers);
      setError("");
      return allUsers;
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("فشل في تحميل المستخدمين");
      setUsers([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Schools API response:', response.data);
      
      // Try different response structures
      let schoolsData = [];
      if (Array.isArray(response.data)) {
        schoolsData = response.data;
      } else if (Array.isArray(response.data.schools)) {
        schoolsData = response.data.schools;
      } else if (Array.isArray(response.data.data)) {
        schoolsData = response.data.data;
      }
      
      console.log('Parsed schools:', schoolsData);
      setSchools(schoolsData);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setSchools([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Classes API response:', response.data);
      
      // Try different response structures
      let classesData = [];
      if (Array.isArray(response.data)) {
        classesData = response.data;
      } else if (Array.isArray(response.data.classes)) {
        classesData = response.data.classes;
      } else if (Array.isArray(response.data.data)) {
        classesData = response.data.data;
      }
      
      console.log('Parsed classes:', classesData);
      setClasses(classesData);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setClasses([]);
    }
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleToggleActive = async (userId) => {
    try {
      await axios.patch(`${API_BASE}/api/users/${userId}/toggle-active`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة التفعيل");
    }
  };

  const handleManageChildren = (user) => {
    setSelectedUser(user);
    setShowChildrenModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) {
      try {
        await axios.delete(`${API_BASE}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchUsers();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف المستخدم");
      }
    }
  };

  // Detect duplicate emails
  const getDuplicateEmails = () => {
    const emailCounts = {};
    users.forEach(user => {
      if (user.email) {
        const email = user.email.toLowerCase();
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    });
    
    return Object.keys(emailCounts).filter(email => emailCounts[email] > 1);
  };

  const duplicateEmails = getDuplicateEmails();
  
  const hasDuplicateEmail = (email) => {
    return email && duplicateEmails.includes(email.toLowerCase());
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active);
    const matchesSchool = schoolFilter === "all" || user.school_id == schoolFilter;
    const matchesClass = classFilter === "all" || user.class_id == classFilter;
    const matchesDuplicateEmail = duplicateEmailFilter === "all" || 
                                 (duplicateEmailFilter === "duplicate" && hasDuplicateEmail(user.email)) ||
                                 (duplicateEmailFilter === "unique" && !hasDuplicateEmail(user.email));
    
    return matchesSearch && matchesRole && matchesStatus && matchesSchool && matchesClass && matchesDuplicateEmail;
  });

  // Get classes filtered by selected school for class filter
  const filteredClassesForFilter = schoolFilter === "all" ? classes : classes.filter(cls => cls.school_id == schoolFilter);

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">إدارة المستخدمين</h1>
          <p className="text-gray-600 mt-2">إدارة جميع المستخدمين وصلاحياتهم</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AiOutlineFilter />
          فلترة المستخدمين
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البحث</label>
            <input
              type="text"
              placeholder="ابحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الصلاحية</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">جميع الصلاحيات</option>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <option key={role} value={role}>{config.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">حالة الحساب</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">جميع الحسابات</option>
              <option value="active">المفعلة</option>
              <option value="inactive">غير المفعلة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <select
              value={duplicateEmailFilter}
              onChange={(e) => setDuplicateEmailFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">جميع الإيميلات</option>
              <option value="duplicate">الإيميلات المكررة</option>
              <option value="unique">الإيميلات الفريدة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المجمع</label>
            <select
              value={schoolFilter}
              onChange={(e) => {
                setSchoolFilter(e.target.value);
                setClassFilter("all"); // Reset class filter when school changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">جميع المجمعات</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحلقة</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={schoolFilter === "all"}
            >
              <option value="all">جميع الحلقات</option>
              {filteredClassesForFilter.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name} - المستوى {cls.level}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>إجمالي المستخدمين: {filteredUsers.length}</div>
          {duplicateEmails.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              <AiOutlineWarning className="text-amber-600" />
              <span className="text-amber-700 font-medium">
                {duplicateEmails.length} بريد إلكتروني مكرر
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <UserCard
            key={user.id || user.user_id}
            user={user}
            onEdit={handleEditRole}
            onView={handleViewUser}
            onToggleActive={handleToggleActive}
            onEditProfile={handleEditProfile}
            onDeleteUser={handleDeleteUser}
            onManageChildren={handleManageChildren}
            schools={schools}
            hasDuplicateEmail={hasDuplicateEmail}
            classes={classes}
          />
        ))}
      </div>

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد مستخدمين مطابقين لمعايير البحث</p>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <RoleEditModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onUpdate={() => {
            fetchUsers();
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          schools={schools}
          classes={classes}
        />
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserInfoEditModal
          user={selectedUser}
          schools={schools}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          onUpdated={async (currentId) => {
            const list = await fetchUsers();
            const updated = list.find((u) => String(u.id || u.user_id) === String(currentId));
            if (updated) {
              setSelectedUser((prev) => ({ ...prev, ...updated }));
            }
          }}
        />
      )}

      {/* Children Management Modal */}
      {showChildrenModal && selectedUser && (
        <SimpleChildrenManagement
          user={selectedUser}
          isOpen={showChildrenModal}
          onClose={() => {
            setShowChildrenModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}