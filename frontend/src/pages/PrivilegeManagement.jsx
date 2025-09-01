import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlineUser, 
  AiOutlineEdit, 
  AiOutlineSave, 
  AiOutlineClose,
  AiOutlineCheck,
  AiOutlineStop,
  AiOutlineEye,
  AiOutlineUserSwitch,
  AiOutlineTeam
} from "react-icons/ai";
import { FaUserGraduate, FaChalkboardTeacher, FaUserTie, FaUsers, FaCrown } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Define role configurations with their permissions
const ROLE_CONFIG = {
  admin: { 
    name: 'مدير عام', 
    color: 'bg-red-500 text-white',
    icon: FaCrown,
    level: 5,
    permissions: [
      'manage_users', 'manage_schools', 'manage_classes', 'manage_teachers', 
      'manage_administrators', 'manage_students', 'manage_parents', 'manage_semesters',
      'view_reports', 'manage_database', 'manage_system_settings', 'manage_privileges'
    ]
  },
  administrator: { 
    name: 'مدير مجمع', 
    color: 'bg-purple-500 text-white',
    icon: FaUserTie,
    level: 4,
    permissions: [
      'manage_classes', 'manage_teachers', 'manage_students', 'view_reports',
      'manage_attendance', 'manage_grading', 'manage_courses'
    ]
  },
  supervisor: { 
    name: 'مشرف', 
    color: 'bg-blue-500 text-white',
    icon: FaUsers,
    level: 3,
    permissions: [
      'view_classes', 'manage_students', 'view_reports', 'manage_attendance', 'view_grading'
    ]
  },
  teacher: { 
    name: 'معلم', 
    color: 'bg-green-500 text-white',
    icon: FaChalkboardTeacher,
    level: 2,
    permissions: [
      'view_my_classes', 'manage_my_students', 'manage_attendance', 'manage_grading'
    ]
  },
  parent: { 
    name: 'ولي أمر', 
    color: 'bg-orange-500 text-white',
    icon: AiOutlineUser,
    level: 1,
    permissions: [
      'view_my_children', 'view_children_grades', 'view_children_attendance'
    ]
  },
  student: { 
    name: 'طالب', 
    color: 'bg-gray-500 text-white',
    icon: FaUserGraduate,
    level: 0,
    permissions: [
      'view_my_grades', 'view_my_attendance', 'view_my_courses'
    ]
  }
};

// All available permissions in the system
const ALL_PERMISSIONS = {
  // User Management
  'manage_users': 'إدارة جميع المستخدمين',
  'manage_privileges': 'إدارة الصلاحيات',
  
  // School Management
  'manage_schools': 'إدارة المجمعات',
  'view_schools': 'عرض المجمعات',
  
  // Class Management
  'manage_classes': 'إدارة الحلقات',
  'view_classes': 'عرض الحلقات',
  'view_my_classes': 'عرض حلقاتي',
  
  // Teacher Management
  'manage_teachers': 'إدارة المعلمين',
  'manage_administrators': 'إدارة المديرين',
  
  // Student Management
  'manage_students': 'إدارة الطلاب',
  'manage_my_students': 'إدارة طلابي',
  'view_my_children': 'عرض أبنائي',
  
  // Parent Management
  'manage_parents': 'إدارة أولياء الأمور',
  
  // Academic Management
  'manage_semesters': 'إدارة الفصول الدراسية',
  'manage_courses': 'إدارة المقررات',
  'manage_grading': 'إدارة الدرجات',
  'view_grading': 'عرض الدرجات',
  'view_my_grades': 'عرض درجاتي',
  'view_children_grades': 'عرض درجات الأبناء',
  
  // Attendance Management
  'manage_attendance': 'إدارة الحضور والغياب',
  'view_my_attendance': 'عرض حضوري',
  'view_children_attendance': 'عرض حضور الأبناء',
  
  // Reporting
  'view_reports': 'عرض التقارير',
  'manage_reports': 'إدارة التقارير',
  
  // System Management
  'manage_database': 'إدارة قاعدة البيانات',
  'manage_system_settings': 'إدارة إعدادات النظام',
  
  // Course Management
  'view_my_courses': 'عرض مقرراتي'
};

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
  'system': {
    name: 'إدارة النظام',
    permissions: ['manage_users', 'manage_privileges', 'manage_database', 'manage_system_settings']
  },
  'schools': {
    name: 'إدارة المجمعات والحلقات',
    permissions: ['manage_schools', 'view_schools', 'manage_classes', 'view_classes', 'view_my_classes']
  },
  'users': {
    name: 'إدارة المستخدمين',
    permissions: ['manage_teachers', 'manage_administrators', 'manage_students', 'manage_my_students', 'manage_parents', 'view_my_children']
  },
  'academic': {
    name: 'الأكاديميات والتعليم',
    permissions: ['manage_semesters', 'manage_courses', 'view_my_courses', 'manage_grading', 'view_grading', 'view_my_grades', 'view_children_grades']
  },
  'attendance': {
    name: 'الحضور والغياب',
    permissions: ['manage_attendance', 'view_my_attendance', 'view_children_attendance']
  },
  'reports': {
    name: 'التقارير',
    permissions: ['view_reports', 'manage_reports']
  }
};

// Permission Editor Modal
const PermissionEditorModal = ({ user, isOpen, onClose, onSave, allPermissions }) => {
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  // Permission categories and actions structure
  const permissionStructure = {
    system: { view: 'عرض النظام', manage: 'إدارة النظام' },
    schools: { view: 'عرض المجمعات', edit: 'تعديل المجمعات', manage: 'إدارة المجمعات' },
    users: { view: 'عرض المستخدمين', create: 'إنشاء المستخدمين', edit: 'تعديل المستخدمين', delete: 'حذف المستخدمين', manage: 'إدارة المستخدمين' },
    academic: { view: 'عرض الأكاديمية', edit: 'تعديل الأكاديمية', manage: 'إدارة الأكاديمية' },
    attendance: { view: 'عرض الحضور', edit: 'تعديل الحضور', manage: 'إدارة الحضور' },
    reports: { view: 'عرض التقارير', create: 'إنشاء التقارير' }
  };

  const getCategoryDisplayName = (categoryKey) => {
    const names = {
      system: 'النظام',
      schools: 'المجمعات',
      users: 'المستخدمين',
      academic: 'الأكاديمية',
      attendance: 'الحضور',
      reports: 'التقارير'
    };
    return names[categoryKey] || categoryKey;
  };

  useEffect(() => {
    if (user) {
      // Parse existing permissions if they exist
      try {
        const existing = user.permissions || {};
        setSelectedPermissions(typeof existing === 'object' ? existing : {});
      } catch {
        setSelectedPermissions({});
      }
    }
  }, [user]);

  const handlePermissionToggle = (category, action) => {
    setSelectedPermissions(prev => {
      const updated = { ...prev };
      if (!updated[category]) {
        updated[category] = {};
      }
      
      // Toggle the specific action
      updated[category][action] = !updated[category][action];
      
      // Clean up empty categories
      if (Object.keys(updated[category]).length === 0 || 
          Object.values(updated[category]).every(v => !v)) {
        delete updated[category];
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(user.id, selectedPermissions);
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[var(--color-primary-700)]">
            تعديل صلاحيات المستخدم
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <AiOutlineClose size={24} />
          </button>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">معلومات المستخدم:</h4>
          <p><strong>الاسم:</strong> {user.name}</p>
          <p><strong>الإيميل:</strong> {user.email}</p>
          <p><strong>الدور:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${ROLE_CONFIG[user.role]?.color}`}>
              {ROLE_CONFIG[user.role]?.name}
            </span>
          </p>
        </div>

        {/* Permission Categories */}
        <div className="space-y-6">
          {Object.entries(permissionStructure).map(([categoryKey, actions]) => (
            <div key={categoryKey} className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-4 text-[var(--color-primary-700)]">
                {getCategoryDisplayName(categoryKey)}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(actions).map(([actionKey, actionName]) => (
                  <label key={`${categoryKey}-${actionKey}`} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded" dir="rtl">
                    <input
                      type="checkbox"
                      checked={selectedPermissions[categoryKey]?.[actionKey] || false}
                      onChange={() => handlePermissionToggle(categoryKey, actionKey)}
                      className="w-4 h-4 text-blue-600 ml-2"
                    />
                    <span className="text-sm">{actionName}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-md hover:bg-[var(--color-primary-600)] disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PrivilegeManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/privileges`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let allUsers = [];
      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        allUsers = response.data.users;
      }

      setUsers(allUsers);
      setError("");
    } catch (err) {
      setError("فشل في تحميل المستخدمين");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
  };

  const handleSavePermissions = async (userId, permissions) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/privileges/${userId}`, {
        permissions: permissions
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, permissions: permissions }
          : user
      ));
    } catch (error) {
      throw new Error(error.response?.data?.error || 'فشل في حفظ الصلاحيات');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesSearch = searchTerm === "" || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesSearch;
  });

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
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة الصلاحيات</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">تصفية حسب الدور</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأدوار</option>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <option key={role} value={role}>{config.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالاسم أو الإيميل..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4 font-semibold">المستخدم</th>
                <th className="text-right p-4 font-semibold">الدور</th>
                <th className="text-right p-4 font-semibold">الحالة</th>
                <th className="text-right p-4 font-semibold">الصلاحيات المخصصة</th>
                <th className="text-right p-4 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || {};
                let customPermissions = [];
                try {
                  customPermissions = user.permissions || {};
                } catch {
                  customPermissions = [];
                }

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${roleConfig.color}`}>
                        {roleConfig.name || user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {customPermissions.length > 0 ? (
                          <span className="text-blue-600">
                            {customPermissions.length} صلاحية مخصصة
                          </span>
                        ) : (
                          <span className="text-gray-500">صلاحيات افتراضية</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleEditPermissions(user)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        <AiOutlineEdit />
                        تعديل الصلاحيات
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => {
          const count = users.filter(user => user.role === role).length;
          return (
            <div key={role} className="bg-white p-4 rounded-lg shadow-sm border text-center">
              <div className={`w-12 h-12 rounded-full ${config.color} mx-auto mb-2 flex items-center justify-center`}>
                <config.icon className="text-xl" />
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-gray-600">{config.name}</div>
            </div>
          );
        })}
      </div>

      {/* Permission Editor Modal */}
      <PermissionEditorModal
        user={selectedUser}
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onSave={handleSavePermissions}
        allPermissions={ALL_PERMISSIONS}
      />
    </div>
  );
}