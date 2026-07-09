import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus } from "react-icons/ai";
import AdministratorForm from "../components/AdministratorForm";
import AdministratorCard from "../components/AdministratorCard";
import AdministratorInfoEditModal from "../components/AdministratorInfoEditModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
      return filteredAdmins;
    } catch (err) {
      console.error("Error fetching administrators:", err);
      setError(err.response?.data?.error || "فشل في تحميل مديري المجمعات");
      setAdministrators([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const administratorData = {
      first_name: formData.get('first_name'),
      second_name: formData.get('second_name'),
      third_name: formData.get('third_name'),
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
        <AdministratorInfoEditModal
          administrator={selectedAdministrator}
          onClose={() => {
            setShowDetails(false);
            setSelectedAdministrator(null);
          }}
          onUpdated={async () => {
            const list = await fetchAdministrators();
            const uid = selectedAdministrator.id || selectedAdministrator.user_id;
            const updated = list.find((a) => String(a.id || a.user_id) === String(uid));
            if (updated) {
              setSelectedAdministrator((prev) => ({ ...prev, ...updated }));
            }
          }}
        />
      )}
    </div>
  );
}