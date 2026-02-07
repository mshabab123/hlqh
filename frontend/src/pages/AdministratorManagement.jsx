import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus } from "react-icons/ai";
import AdministratorForm from "../components/AdministratorForm";
import AdministratorCard from "../components/AdministratorCard";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdministratorManagement() {
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingAdministrator, setEditingAdministrator] = useState(null);
  const [selectedAdministrator, setSelectedAdministrator] = useState(null);

  const [currentAdministrator, setCurrentAdministrator] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    role: "administrator",
    permissions: "",
    is_active: true
  });

  useEffect(() => {
    fetchAdministrators();
  }, []);

  const fetchAdministrators = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with administrator-type roles
      const response = await axios.get(`${API_BASE}/api/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let allUsers = [];
      // Handle different response formats
      if (Array.isArray(response.data)) {
        allUsers = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        allUsers = response.data.users;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        allUsers = response.data.data;
      }
      
      // Filter for administrator-type roles
      const adminRoles = ['administrator', 'admin', 'supervisor', 'assistant_admin', 'coordinator'];
      let filteredAdmins = allUsers.filter(user => 
        adminRoles.includes(user.role?.toLowerCase())
      );

      setAdministrators(filteredAdmins);
      setError("");
    } catch (err) {
      console.error("Error fetching administrators:", err);
      setError(err.response?.data?.error || "فشل في تحميل مديري المجمعات");
      setAdministrators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const administratorData = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      role: formData.get('role'),
      permissions: formData.get('permissions'),
      is_active: formData.get('is_active') === 'on'
    };

    // Add password fields for new administrator
    if (!editingAdministrator) {
      administratorData.password = formData.get('password');
      administratorData.confirm_password = formData.get('confirm_password');
      
      if (administratorData.password !== administratorData.confirm_password) {
        setError("كلمتا المرور غير متطابقتين");
        return;
      }
    }

    try {
      if (editingAdministrator) {
        await axios.put(
          `${API_BASE}/api/users/${editingAdministrator.id || editingAdministrator.user_id}`, 
          administratorData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        await axios.post(`${API_BASE}/api/users`, administratorData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      
      setShowForm(false);
      setEditingAdministrator(null);
      setCurrentAdministrator({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        role: "administrator",
        permissions: "",
        is_active: true
      });
      fetchAdministrators();
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ بيانات المدير");
    }
  };

  const handleAdd = () => {
    setEditingAdministrator(null);
    setCurrentAdministrator({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      role: "administrator",
      permissions: "",
      is_active: true
    });
    setShowForm(true);
  };

  const handleEdit = (administrator) => {
    setEditingAdministrator(administrator);
    setCurrentAdministrator(administrator);
    setShowForm(true);
  };

  const handleView = (administrator) => {
    setSelectedAdministrator(administrator);
    setShowDetails(true);
  };

  const handleToggleActive = async (administratorId) => {
    try {
      await axios.patch(`${API_BASE}/api/users/${administratorId}/toggle-active`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAdministrators();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة التفعيل");
    }
  };

  const handleDeleteAdministrator = async (administratorId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المدير؟")) {
      try {
        await axios.delete(`${API_BASE}/api/users/${administratorId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchAdministrators();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف المدير");
      }
    }
  };

  // Filter administrators based on search and status
  const filteredAdministrators = administrators.filter(admin => {
    const matchesSearch = admin.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && admin.is_active) ||
                         (statusFilter === "inactive" && !admin.is_active);
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">إدارة مديري المجمعات</h1>
          <p className="text-gray-600 mt-2">إدارة وتتبع مديري المجمعات والمشرفين</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <AiOutlinePlus />
          إضافة مدير جديد
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البحث
            </label>
            <input
              type="text"
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              حالة الحساب
            </label>
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

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              إجمالي المديرين: {filteredAdministrators.length}
            </div>
          </div>
        </div>
      </div>

      {/* Administrator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdministrators.map(admin => (
          <AdministratorCard
            key={admin.id || admin.user_id}
            administrator={admin}
            onView={handleView}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
            onDelete={handleDeleteAdministrator}
          />
        ))}
      </div>

      {filteredAdministrators.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد مديرين مطابقين لمعايير البحث</p>
        </div>
      )}

      {/* Administrator Form Modal */}
      <AdministratorForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAdministrator(null);
        }}
        onSubmit={handleSubmit}
        administrator={currentAdministrator}
        isEditing={!!editingAdministrator}
      />

      {/* Administrator Details Modal */}
      {showDetails && selectedAdministrator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">تفاصيل المدير</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">الاسم الأول</label>
                  <p className="text-gray-900">{selectedAdministrator.first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">اسم العائلة</label>
                  <p className="text-gray-900">{selectedAdministrator.last_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <p className="text-gray-900">{selectedAdministrator.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                  <p className="text-gray-900">{selectedAdministrator.phone || "غير محدد"}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">الدور الوظيفي</label>
                <p className="text-gray-900">
                  {selectedAdministrator.role === 'admin' ? 'مدير عام' :
                   selectedAdministrator.role === 'administrator' ? 'مدير مجمع' :
                   selectedAdministrator.role === 'supervisor' ? 'مشرف' : selectedAdministrator.role}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">العنوان</label>
                <p className="text-gray-900">{selectedAdministrator.address || "غير محدد"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">الصلاحيات</label>
                <p className="text-gray-900">{selectedAdministrator.permissions || "غير محدد"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">حالة الحساب</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedAdministrator.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedAdministrator.is_active ? 'مفعل' : 'غير مفعل'}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}