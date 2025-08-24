import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineCheck, AiOutlineClose, AiOutlineUser } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// AdministratorForm component for add/edit
const AdministratorForm = ({ administrator, onSubmit, onCancel, isEditing = false, onAdministratorChange }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل مدير المجمع" : "إضافة مدير مجمع جديد"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
            <input
              type="text"
              value={administrator.id}
              onChange={(e) => onAdministratorChange({...administrator, id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="[0-9]{10}"
              maxLength="10"
              required
              disabled={isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الدور الإداري *</label>
            <select
              value={administrator.role || "administrator"}
              onChange={(e) => onAdministratorChange({...administrator, role: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="administrator">مدير</option>
              <option value="assistant_admin">مساعد مدير</option>
              <option value="coordinator">منسق</option>
              <option value="supervisor">مشرف</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={administrator.first_name}
              onChange={(e) => onAdministratorChange({...administrator, first_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الثاني *</label>
            <input
              type="text"
              value={administrator.second_name}
              onChange={(e) => onAdministratorChange({...administrator, second_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الجد *</label>
            <input
              type="text"
              value={administrator.third_name}
              onChange={(e) => onAdministratorChange({...administrator, third_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={administrator.last_name}
              onChange={(e) => onAdministratorChange({...administrator, last_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={administrator.email}
              onChange={(e) => onAdministratorChange({...administrator, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال *</label>
            <input
              type="text"
              value={administrator.phone}
              onChange={(e) => onAdministratorChange({...administrator, phone: e.target.value})}
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
              value={administrator.password}
              onChange={(e) => onAdministratorChange({...administrator, password: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength="6"
              required
            />
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الراتب</label>
            <input
              type="number"
              value={administrator.salary || ""}
              onChange={(e) => onAdministratorChange({...administrator, salary: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="100"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={administrator.address || ""}
              onChange={(e) => onAdministratorChange({...administrator, address: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">المؤهلات</label>
          <textarea
            value={administrator.qualifications || ""}
            onChange={(e) => onAdministratorChange({...administrator, qualifications: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="الشهادات والمؤهلات العلمية والإدارية..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الصلاحيات</label>
          <textarea
            value={administrator.permissions || ""}
            onChange={(e) => onAdministratorChange({...administrator, permissions: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="صلاحيات المدير في النظام (JSON format أو وصف نصي)..."
          />
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

export default function AdministratorManagement() {
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdministrator, setEditingAdministrator] = useState(null);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "active", "inactive"
  const [roleFilter, setRoleFilter] = useState("all"); // Filter by role
  
  const [newAdministrator, setNewAdministrator] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    role: "administrator",
    salary: "",
    qualifications: "",
    permissions: "",
    user_type: "administrator"
  });

  useEffect(() => {
    fetchAdministrators();
  }, [activeFilter, roleFilter]);

  const fetchAdministrators = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ user_type: 'administrator' });
      if (activeFilter !== "all") {
        params.append('is_active', activeFilter === "active" ? 'true' : 'false');
      }
      if (roleFilter !== "all") {
        params.append('role', roleFilter);
      }
      
      const response = await axios.get(`${API_BASE}/api/administrators?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setAdministrators(response.data.administrators || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل مديري المجمعات");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdministrator = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/administrators`, newAdministrator, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowAddModal(false);
      setNewAdministrator({
        id: "",
        first_name: "",
        second_name: "",
        third_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        role: "administrator",
        salary: "",
        qualifications: "",
        permissions: "",
        user_type: "administrator"
      });
      fetchAdministrators();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة مدير المجمع");
    }
  };

  const handleEditAdministrator = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        first_name: editingAdministrator.first_name,
        second_name: editingAdministrator.second_name,
        third_name: editingAdministrator.third_name,
        last_name: editingAdministrator.last_name,
        email: editingAdministrator.email,
        phone: editingAdministrator.phone,
        address: editingAdministrator.address,
        role: editingAdministrator.role,
        salary: editingAdministrator.salary,
        qualifications: editingAdministrator.qualifications,
        permissions: editingAdministrator.permissions
      };
      
      await axios.put(`${API_BASE}/api/administrators/${editingAdministrator.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setEditingAdministrator(null);
      fetchAdministrators();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث مدير المجمع");
    }
  };

  const handleDeleteAdministrator = async (administratorId) => {
    if (window.confirm("هل أنت متأكد من حذف مدير المجمع هذا؟")) {
      try {
        await axios.delete(`${API_BASE}/api/administrators/${administratorId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchAdministrators();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف مدير المجمع");
      }
    }
  };

  const toggleActivation = async (administratorId, currentStatus) => {
    try {
      await axios.patch(`${API_BASE}/api/administrators/${administratorId}/activate`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAdministrators();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة التفعيل");
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      administrator: "مدير مجمع",
      assistant_admin: "مساعد مدير مجمع",
      coordinator: "منسق",
      supervisor: "مشرف"
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة مديري المجمعات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة مدير مجمع جديد
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">تصفية حسب الدور:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الأدوار</option>
            <option value="administrator">مدير مجمع</option>
            <option value="assistant_admin">مساعد مدير مجمع</option>
            <option value="coordinator">منسق</option>
            <option value="supervisor">مشرف</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">تصفية حسب الحالة:</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع مديري المجمعات</option>
            <option value="active">مديري المجمعات النشطين</option>
            <option value="inactive">مديري المجمعات غير النشطين</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {administrators.map((administrator) => (
          <div key={administrator.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
                  <AiOutlineUser className="text-[var(--color-primary-700)] text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-primary-700)]">
                    {administrator.first_name} {administrator.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{getRoleDisplayName(administrator.role)}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-col">
                <span className={`px-2 py-1 rounded text-xs text-center ${
                  administrator.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {administrator.is_active ? 'نشط' : 'غير نشط'}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 text-center">
                  مدير مجمع
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>رقم الهوية:</strong> {administrator.id}</p>
              <p><strong>البريد:</strong> {administrator.email}</p>
              <p><strong>الجوال:</strong> {administrator.phone}</p>
              {administrator.salary && <p><strong>الراتب:</strong> {Number(administrator.salary).toLocaleString()} ريال</p>}
              {administrator.qualifications && <p><strong>المؤهلات:</strong> {administrator.qualifications}</p>}
              {administrator.hire_date && (
                <p><strong>تاريخ التوظيف:</strong> {new Date(administrator.hire_date).toLocaleDateString('ar-SA')}</p>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setEditingAdministrator(administrator)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <AiOutlineEdit /> تعديل
              </button>
              
              <button
                onClick={() => toggleActivation(administrator.id, administrator.is_active)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-white text-sm ${
                  administrator.is_active 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {administrator.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                {administrator.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
              </button>
              
              <button
                onClick={() => handleDeleteAdministrator(administrator.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                <AiOutlineDelete /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {administrators.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد مديري مجمعات مسجلين</p>
        </div>
      )}

      {showAddModal && (
        <AdministratorForm
          administrator={newAdministrator}
          onSubmit={handleAddAdministrator}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onAdministratorChange={setNewAdministrator}
        />
      )}

      {editingAdministrator && (
        <AdministratorForm
          administrator={editingAdministrator}
          onSubmit={handleEditAdministrator}
          onCancel={() => setEditingAdministrator(null)}
          isEditing={true}
          onAdministratorChange={setEditingAdministrator}
        />
      )}
    </div>
  );
}