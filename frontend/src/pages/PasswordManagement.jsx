import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlineSearch, AiOutlineLock, AiOutlineUser, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineKey } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function PasswordManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Get user role from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.role);
      // For administrators, default to showing only students
      if (user.role === 'administrator') {
        setRoleFilter('student');
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/user-management/password-reset-users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUsers(response.data.users || []);
      setFilteredUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل قائمة المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
      );
    }
    
    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const handlePasswordReset = async () => {
    setError("");
    setSuccess("");
    
    if (!newPassword || !confirmPassword) {
      setError("يرجى إدخال كلمة المرور الجديدة وتأكيدها");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    
    if (newPassword.length < 10) {
      setError("يجب أن تكون كلمة المرور 10 أحرف على الأقل");
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/api/user-management/reset-password`, {
        userId: selectedUser.id,
        newPassword: newPassword
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSuccess(`تم تغيير كلمة المرور للمستخدم ${selectedUser.first_name} ${selectedUser.last_name} بنجاح`);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير كلمة المرور");
    }
  };

  const getRoleDisplay = (role) => {
    const roles = {
      admin: "مدير عام",
      administrator: "مدير مجمع",
      supervisor: "مشرف",
      teacher: "معلم",
      parent: "ولي أمر",
      student: "طالب"
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "bg-red-100 text-red-800",
      administrator: "bg-purple-100 text-purple-800",
      supervisor: "bg-blue-100 text-blue-800",
      teacher: "bg-green-100 text-green-800",
      parent: "bg-yellow-100 text-yellow-800",
      student: "bg-cyan-100 text-cyan-800"
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري تحميل قائمة المستخدمين...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AiOutlineKey className="text-3xl text-[var(--color-primary-700)]" />
          <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة كلمات المرور</h1>
        </div>
        
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4">
          <p className="font-bold">تنبيه أمني:</p>
          <p>
            {userRole === 'admin' 
              ? "هذه الصفحة مخصصة للمسؤولين فقط. يتم تسجيل جميع عمليات تغيير كلمات المرور."
              : "يمكنك تغيير كلمات المرور للطلاب في مجمعك فقط. يتم تسجيل جميع العمليات."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، رقم الهوية، البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {userRole === 'admin' ? (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأدوار</option>
              <option value="admin">مدير عام</option>
              <option value="administrator">مدير مجمع</option>
              <option value="supervisor">مشرف</option>
              <option value="teacher">معلم</option>
              <option value="parent">ولي أمر</option>
              <option value="student">طالب</option>
            </select>
          ) : (
            <div className="p-3 bg-gray-100 rounded-lg text-gray-700">
              الطلاب في مجمعك
            </div>
          )}
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المستخدم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رقم الهوية
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                البريد الإلكتروني
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الدور
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--color-primary-100)] p-2 rounded-full">
                      <AiOutlineUser className="text-[var(--color-primary-700)]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.second_name} {user.third_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                    {getRoleDisplay(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)] transition-colors"
                  >
                    <AiOutlineLock />
                    تغيير كلمة المرور
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد نتائج مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full m-4">
            <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
              تغيير كلمة المرور
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">المستخدم:</p>
              <p className="font-semibold">
                {selectedUser.first_name} {selectedUser.last_name}
              </p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أدخل كلمة المرور الجديدة"
                    minLength="10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أعد إدخال كلمة المرور"
                    minLength="10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                  </button>
                </div>
              </div>
              
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-500 text-sm">كلمات المرور غير متطابقة</p>
              )}
              
              {newPassword && newPassword.length < 10 && (
                <p className="text-amber-500 text-sm">يجب أن تكون كلمة المرور 10 أحرف على الأقل</p>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 10}
                className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
