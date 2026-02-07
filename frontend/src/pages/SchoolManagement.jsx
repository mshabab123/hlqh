import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineCheck, AiOutlineClose, AiOutlineDelete } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Move SchoolForm component outside to prevent re-creation on each render
const SchoolForm = ({ school, onSubmit, onCancel, isEditing = false, onSchoolChange, administrators }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل مجمع الحلقات" : "إضافة مجمع حلقات جديد"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم مجمع الحلقات *</label>
            <input
              type="text"
              value={school.name}
              onChange={(e) => onSchoolChange({...school, name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={school.phone}
              onChange={(e) => onSchoolChange({...school, phone: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^05[0-9]{8}$"
              placeholder="05xxxxxxxx"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الحي *</label>
            <input
              type="text"
              value={school.neighborhood || ""}
              onChange={(e) => onSchoolChange({...school, neighborhood: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المدينة *</label>
            <input
              type="text"
              value={school.city || ""}
              onChange={(e) => onSchoolChange({...school, city: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المنطقة *</label>
            <input
              type="text"
              value={school.region || ""}
              onChange={(e) => onSchoolChange({...school, region: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">المشرف (اختياري)</label>
            <select
              value={school.administrator_id || ""}
              onChange={(e) => onSchoolChange({...school, administrator_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر المشرف</option>
              {administrators.map(admin => (
                <option key={admin.id} value={admin.id}>
                  {admin.first_name} {admin.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={school.email || ""}
              onChange={(e) => onSchoolChange({...school, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ التأسيس</label>
            <input
              type="date"
              value={school.established_date || ""}
              onChange={(e) => onSchoolChange({...school, established_date: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={school.is_active}
              onChange={(e) => onSchoolChange({...school, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">مجمع حلقات نشط</label>
          </div>
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

export default function SchoolManagement() {
  const [schools, setSchools] = useState([]);
  const [administrators, setAdministrators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  
  const [newSchool, setNewSchool] = useState({
    name: "",
    neighborhood: "",
    city: "",
    region: "",
    phone: "",
    email: "",
    administrator_id: "",
    established_date: "",
    is_active: true
  });

  useEffect(() => {
    fetchSchools();
    fetchAdministrators();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSchools(response.data.schools || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل مجمع الحلقات");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdministrators = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/teachers?user_type=administrator`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setAdministrators(response.data.administrators || []);
    } catch (err) {
      console.error('Error fetching administrators:', err);
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    try {
      const schoolData = {
        name: newSchool.name,
        address: `${newSchool.neighborhood}, ${newSchool.city}, ${newSchool.region}`,
        phone: newSchool.phone,
        email: newSchool.email,
        established_date: newSchool.established_date,
        is_active: newSchool.is_active,
        administrator_id: newSchool.administrator_id
      };
      
      await axios.post(`${API_BASE}/api/schools`, schoolData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowAddModal(false);
      setNewSchool({
        name: "",
        neighborhood: "",
        city: "",
        region: "",
        phone: "",
        email: "",
        administrator_id: "",
        established_date: "",
        is_active: true
      });
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة مجمع الحلقات");
    }
  };

  const handleEditSchool = async (e) => {
    e.preventDefault();
    try {
      const schoolData = {
        name: editingSchool.name,
        address: `${editingSchool.neighborhood}, ${editingSchool.city}, ${editingSchool.region}`,
        phone: editingSchool.phone,
        email: editingSchool.email,
        established_date: editingSchool.established_date,
        is_active: editingSchool.is_active,
        administrator_id: editingSchool.administrator_id
      };
      
      await axios.put(`${API_BASE}/api/schools/${editingSchool.id}`, schoolData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setEditingSchool(null);
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث مجمع الحلقات");
    }
  };

  const toggleSchoolStatus = async (schoolId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/schools/${schoolId}`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة مجمع الحلقات");
    }
  };

  const handleDeleteSchool = async (school) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف مجمع الحلقات "${school.name}"؟\n\n` +
      `تحذير: هذا الإجراء سيقوم بما يلي:\n` +
      `• إلغاء تفعيل مجمع الحلقات\n` +
      `• منع إنشاء حلقات أو طلاب جدد\n` +
      `• إضافة "(محذوف)" لاسم المجمع\n\n` +
      `ملاحظة: إذا كان هناك حلقات أو طلاب مسجلين، سيتم رفض الحذف`
    );
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API_BASE}/api/schools/${school.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      fetchSchools();
    } catch (err) {
      setError(err.response?.data?.error || "حدث خطأ في حذف مجمع الحلقات");
      console.error("Error deleting school:", err);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-[var(--color-primary-700)]">إدارة مجمع الحلقات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة مجمع حلقات جديد
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schools.map((school) => (
          <div key={school.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--color-primary-700)]">{school.name}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                school.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {school.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>العنوان:</strong> {school.address}</p>
              {school.phone && <p><strong>الهاتف:</strong> {school.phone}</p>}
              {school.email && <p><strong>البريد:</strong> {school.email}</p>}
              {school.administrator_first_name ? (
                <p><strong>المشرف:</strong> {school.administrator_first_name} {school.administrator_second_name || ''} {school.administrator_third_name || ''} {school.administrator_last_name || ''}</p>
              ) : (
                <p><strong>المشرف:</strong> <span className="text-orange-600">لم يتم تعيين مشرف</span></p>
              )}
              {school.established_date && (
                <p><strong>تاريخ التأسيس:</strong> {new Date(school.established_date).toLocaleDateString('ar-SA')}</p>
              )}
              {school.principal_name && (
                <p><strong>المدير:</strong> {school.principal_name}</p>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  // Parse address back into components
                  const addressParts = school.address ? school.address.split(', ') : ['', '', ''];
                  setEditingSchool({
                    ...school,
                    neighborhood: addressParts[0] || '',
                    city: addressParts[1] || '',
                    region: addressParts[2] || ''
                  });
                }}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <AiOutlineEdit /> تعديل
              </button>
              
              <button
                onClick={() => toggleSchoolStatus(school.id, school.is_active)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-white text-sm ${
                  school.is_active 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {school.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                {school.is_active ? 'إيقاف' : 'تفعيل'}
              </button>
              
              <button
                onClick={() => handleDeleteSchool(school)}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                <AiOutlineDelete /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد مجمع حلقات مسجلة</p>
        </div>
      )}

      {showAddModal && (
        <SchoolForm
          school={newSchool}
          onSubmit={handleAddSchool}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onSchoolChange={setNewSchool}
          administrators={administrators}
        />
      )}

      {editingSchool && (
        <SchoolForm
          school={editingSchool}
          onSubmit={handleEditSchool}
          onCancel={() => setEditingSchool(null)}
          isEditing={true}
          onSchoolChange={setEditingSchool}
          administrators={administrators}
        />
      )}
    </div>
  );
}