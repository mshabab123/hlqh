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
  AiOutlineSearch
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Role display names and colors
const ROLE_CONFIG = {
  admin: { 
    name: 'مدير النظام', 
    color: 'bg-red-500 text-white',
    level: 5 
  },
  administrator: { 
    name: 'مدير مدرسة', 
    color: 'bg-purple-500 text-white',
    level: 4 
  },
  supervisor: { 
    name: 'مشرف', 
    color: 'bg-blue-500 text-white',
    level: 3 
  },
  teacher: { 
    name: 'معلم', 
    color: 'bg-green-500 text-white',
    level: 2 
  },
  parent: { 
    name: 'ولي أمر', 
    color: 'bg-orange-500 text-white',
    level: 1 
  },
  student: { 
    name: 'طالب', 
    color: 'bg-gray-500 text-white',
    level: 0 
  }
};

// Role Edit Modal Component
const RoleEditModal = ({ user, onClose, onUpdate }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedSchoolId, setSelectedSchoolId] = useState(user.school_id || '');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchRoles();
    fetchSchools();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/user-management/roles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRoles(response.data.roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = { 
        role: selectedRole,
        school_id: ['administrator', 'supervisor', 'teacher'].includes(selectedRole) ? selectedSchoolId : null
      };

      await axios.put(`${API_BASE}/api/user-management/users/${user.id}/role`, updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('فشل في تحديث الصلاحية: ' + (error.response?.data?.error || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const requiresSchool = ['administrator', 'supervisor', 'teacher'].includes(selectedRole);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineSafety className="text-2xl" />
          تعديل صلاحيات المستخدم
        </h3>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">معلومات المستخدم:</h4>
          <p><strong>الاسم:</strong> {user.first_name} {user.second_name} {user.third_name} {user.last_name}</p>
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
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {roles.map(role => (
                <option key={role.name} value={role.name}>
                  {role.displayName} - {role.description}
                </option>
              ))}
            </select>
          </div>

          {requiresSchool && (
            <div>
              <label className="block text-sm font-medium mb-2">المدرسة المخصصة:</label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر المدرسة</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Permissions Preview */}
          {selectedRole && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold mb-2">صلاحيات هذا الدور:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                {roles.find(r => r.name === selectedRole)?.permissions.map((permission, index) => (
                  <li key={index}>{permission}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="bg-[var(--color-primary-700)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <AiOutlineCheck />
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineUser className="text-2xl" />
          تفاصيل المستخدم
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>الاسم الكامل:</strong>
              <p>{user.first_name} {user.second_name} {user.third_name} {user.last_name}</p>
            </div>
            <div>
              <strong>رقم الهوية:</strong>
              <p>{user.id}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>البريد الإلكتروني:</strong>
              <p>{user.email || "غير محدد"}</p>
            </div>
            <div>
              <strong>الهاتف:</strong>
              <p>{user.phone || "غير محدد"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>الصلاحية:</strong>
              <span className={`px-2 py-1 rounded text-sm ${ROLE_CONFIG[user.role]?.color}`}>
                {ROLE_CONFIG[user.role]?.name}
              </span>
            </div>
            <div>
              <strong>حالة الحساب:</strong>
              <span className={`px-2 py-1 rounded text-sm ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </div>

          {user.school_name && (
            <div>
              <strong>المدرسة:</strong>
              <p>{user.school_name}</p>
            </div>
          )}

          {user.employment_status && (
            <div>
              <strong>حالة التوظيف:</strong>
              <span className={`px-2 py-1 rounded text-sm ${
                user.employment_status === 'active' ? 'bg-green-100 text-green-800' :
                user.employment_status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {user.employment_status === 'active' ? 'نشط' :
                 user.employment_status === 'on_leave' ? 'في إجازة' : 'غير نشط'}
              </span>
            </div>
          )}

          <div>
            <strong>تاريخ الانضمام:</strong>
            <p>{new Date(user.created_at).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [currentUserRole, setCurrentUserRole] = useState("");

  useEffect(() => {
    // Check if current user is admin
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserRole(payload.role);
        if (payload.role !== 'admin') {
          setError('غير مسموح لك بالوصول لهذه الصفحة');
          return;
        }
      } catch (err) {
        setError('خطأ في التحقق من الصلاحيات');
        return;
      }
    }

    fetchUsers();
  }, [currentPage, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
      });
      
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(`${API_BASE}/api/user-management/users?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setUsers(response.data.users || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError("فشل في تحميل المستخدمين: " + (err.response?.data?.error || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = !user.is_active;
      await axios.put(`${API_BASE}/api/user-management/users/${user.id}/status`, 
        { is_active: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('فشل في تغيير حالة المستخدم');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.includes(searchTerm);
    return matchesSearch;
  });

  if (currentUserRole !== 'admin') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
          <AiOutlineWarning className="inline text-xl mr-2" />
          {error || 'ليس لديك صلاحية للوصول لهذه الصفحة'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)] flex items-center gap-2">
          <AiOutlineSafety className="text-4xl" />
          إدارة المستخدمين والصلاحيات
        </h1>
        <div className="text-sm text-gray-600 bg-yellow-100 px-3 py-2 rounded">
          <AiOutlineWarning className="inline mr-1" />
          صفحة خاصة بمديري النظام فقط
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">البحث:</label>
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الإيميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الصلاحية:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الصلاحيات</option>
            <option value="admin">مدير النظام</option>
            <option value="administrator">مدير مدرسة</option>
            <option value="supervisor">مشرف</option>
            <option value="teacher">معلم</option>
            <option value="parent">ولي أمر</option>
            <option value="student">طالب</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الحالة:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchUsers}
            className="w-full bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)] flex items-center justify-center gap-2"
          >
            <AiOutlineSearch />
            تطبيق الفلاتر
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المستخدم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الصلاحية
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المدرسة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ROLE_CONFIG[user.role]?.color}`}>
                    {ROLE_CONFIG[user.role]?.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.school_name || 'غير محدد'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleViewDetails(user)}
                    className="text-blue-600 hover:text-blue-900 ml-3"
                  >
                    <AiOutlineEye className="inline text-lg" />
                  </button>
                  <button
                    onClick={() => handleEditRole(user)}
                    className="text-indigo-600 hover:text-indigo-900 ml-3"
                  >
                    <AiOutlineEdit className="inline text-lg" />
                  </button>
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    className={`ml-3 ${user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                  >
                    {user.is_active ? <AiOutlineClose className="inline text-lg" /> : <AiOutlineCheck className="inline text-lg" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد مستخدمين</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            صفحة {pagination.page} من {pagination.pages} ({pagination.total} مستخدم)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              السابق
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
              disabled={currentPage === pagination.pages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditModal && selectedUser && (
        <RoleEditModal
          user={selectedUser}
          onClose={() => setShowEditModal(false)}
          onUpdate={fetchUsers}
        />
      )}

      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}