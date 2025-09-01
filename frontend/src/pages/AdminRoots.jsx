import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlinePlus, 
  AiOutlineEdit, 
  AiOutlineDelete, 
  AiOutlineEye, 
  AiOutlineCheck, 
  AiOutlineClose, 
  AiOutlineUser,
  AiOutlineSearch,
  AiOutlineCrown,
  AiOutlineKey,
  AiOutlineSetting,
  AiOutlineSafety
} from "react-icons/ai";
import { Link } from "react-router-dom";

const AdminRoots = () => {
  const [adminRoots, setAdminRoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    permissions: {
      users: false,
      schools: false,
      database: false,
      system: false,
      reports: false
    }
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchAdminRoots();
  }, []);

  const fetchAdminRoots = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      // Try to use existing users endpoint with admin role filter
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users?role=admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we always set an array
      const data = response.data;
      console.log("API Response:", data); // Debug log
      
      if (Array.isArray(data)) {
        setAdminRoots(data);
      } else if (data && Array.isArray(data.users)) {
        setAdminRoots(data.users);
      } else if (data && Array.isArray(data.data)) {
        setAdminRoots(data.data);
      } else {
        console.warn("Unexpected data format:", data);
        setAdminRoots([]);
      }
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل مديري المنصة");
      console.error("Error fetching admin roots:", err);
      // Set empty array on error to prevent crashes
      setAdminRoots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      
      // Use existing users endpoint
      const url = editingAdmin 
        ? `${import.meta.env.VITE_API_URL}/api/users/${editingAdmin.id}`
        : `${import.meta.env.VITE_API_URL}/api/users`;
      
      const method = editingAdmin ? 'put' : 'post';
      
      // Ensure role is set to admin
      const adminData = { ...formData, role: 'admin' };
      
      await axios[method](url, adminData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchAdminRoots();
      closeModal();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ البيانات");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المدير؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminRoots();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حذف مدير المنصة");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/users/${id}`, 
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAdminRoots();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة التفعيل");
    }
  };

  const openModal = (admin = null) => {
    setEditingAdmin(admin);
    if (admin) {
      setFormData({
        first_name: admin.first_name || "",
        last_name: admin.last_name || "",
        email: admin.email || "",
        password: "",
        phone: admin.phone || "",
        permissions: admin.permissions || {
          users: false,
          schools: false,
          database: false,
          system: false,
          reports: false
        }
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        phone: "",
        permissions: {
          users: false,
          schools: false,
          database: false,
          system: false,
          reports: false
        }
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
      permissions: {
        users: false,
        schools: false,
        database: false,
        system: false,
        reports: false
      }
    });
  };

  const filteredAdmins = Array.isArray(adminRoots) ? adminRoots.filter(admin =>
    admin.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Check if current user has permission to access this page
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
          <AiOutlineKey className="mx-auto text-6xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مسموح</h2>
          <p className="text-gray-600">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg">
              <AiOutlineCrown className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">مديري المنصة</h1>
              <p className="text-gray-600">إدارة مديري المنصة وصلاحياتهم</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
        </div>

        {/* Admin Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Privilege Management Card */}
          <Link to="/privilege-management" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 group-hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <AiOutlineSafety className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">إدارة الصلاحيات</h3>
                  <p className="text-gray-600 text-sm">التحكم في صلاحيات المستخدمين</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                إدارة شاملة لصلاحيات جميع المستخدمين في النظام مع إمكانية التحكم التفصيلي في كل وحدة
              </p>
              <div className="flex items-center justify-between">
                <span className="text-purple-600 font-medium">انتقل إلى الصفحة</span>
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <span className="text-purple-600 text-sm">←</span>
                </div>
              </div>
            </div>
          </Link>

          {/* User Management Card */}
          <Link to="/user-management" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 group-hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <AiOutlineUser className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">إدارة المستخدمين</h3>
                  <p className="text-gray-600 text-sm">إدارة جميع المستخدمين</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                عرض وإدارة جميع المستخدمين المسجلين في النظام
              </p>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">انتقل إلى الصفحة</span>
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <span className="text-blue-600 text-sm">←</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Database Management Card */}
          <Link to="/database" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 group-hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
                  <AiOutlineSetting className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">إدارة قاعدة البيانات</h3>
                  <p className="text-gray-600 text-sm">إعدادات قاعدة البيانات</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                إدارة وصيانة قاعدة البيانات والجداول
              </p>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">انتقل إلى الصفحة</span>
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <span className="text-green-600 text-sm">←</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Search and Add */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <AiOutlineSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="البحث عن مدير منصة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg"
            >
              <AiOutlinePlus />
              إضافة مدير منصة
            </button>
          </div>
        </div>

        {/* Admin Roots Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">جاري التحميل...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المدير
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      البريد الإلكتروني
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الهاتف
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الصلاحيات
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                              <AiOutlineUser className="text-white" />
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.first_name} {admin.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              معرف: {admin.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.phone || "غير محدد"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(admin.permissions || {}).map(([key, value]) => 
                            value && (
                              <span
                                key={key}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                              >
                                {key}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.is_active ? 'مفعل' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(admin)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="تعديل"
                          >
                            <AiOutlineEdit />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admin.id, admin.is_active)}
                            className={`p-1 rounded ${
                              admin.is_active 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={admin.is_active ? "تعطيل" : "تفعيل"}
                          >
                            {admin.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="حذف"
                          >
                            <AiOutlineDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAdmins.length === 0 && !loading && (
                <div className="text-center py-8">
                  <AiOutlineUser className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-gray-500">لا يوجد مديري منصة</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingAdmin ? "تعديل مدير منصة" : "إضافة مدير منصة"}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الأول
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الأخير
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {editingAdmin ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}
                    </label>
                    <input
                      type="password"
                      required={!editingAdmin}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Permissions */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    الصلاحيات
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries({
                      users: "إدارة المستخدمين",
                      schools: "إدارة المجمعات",
                      database: "قاعدة البيانات",
                      system: "إعدادات النظام",
                      reports: "التقارير"
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          id={key}
                          checked={formData.permissions[key]}
                          onChange={(e) => setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              [key]: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={key} className="mr-2 text-sm text-gray-700">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
                  >
                    {editingAdmin ? "تحديث" : "إضافة"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoots;