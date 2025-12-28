import { useState, useEffect } from "react";
import axios from "axios";
import { 
  AiOutlineUser, 
  AiOutlineEdit, 
  AiOutlineEye, 
  AiOutlineCheck, 
  AiOutlineClose,
  AiOutlineWarning,
  AiOutlineSearch,
  AiOutlineDelete,
  AiOutlineTeam,
  AiOutlineIdcard,
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlinePlus,
  AiOutlineUserSwitch,
  AiOutlinePhone,
  AiOutlineMail
} from "react-icons/ai";
import SimpleChildrenManagement from "../components/SimpleChildrenManagement";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Role display names and colors - only parent role needed
const ROLE_CONFIG = {
  parent: { 
    name: 'ولي أمر', 
    color: 'bg-orange-500 text-white',
    icon: AiOutlineUser,
    level: 1 
  }
};

// Profile Edit Modal Component
const ProfileEditModal = ({ user, onClose, onSubmit }) => {
  const [formErrors, setFormErrors] = useState({});
  
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            تعديل الملف الشخصي - {user.first_name} {user.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            <AiOutlineClose />
          </button>
        </div>
        
        <form onSubmit={(e) => onSubmit(e, setFormErrors)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم الأول *
              </label>
              <input
                type="text"
                name="first_name"
                defaultValue={user.first_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم الثاني *
              </label>
              <input
                type="text"
                name="second_name"
                defaultValue={user.second_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم الجد *
              </label>
              <input
                type="text"
                name="third_name"
                defaultValue={user.third_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم العائلة *
              </label>
              <input
                type="text"
                name="last_name"
                defaultValue={user.last_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني *
              </label>
              <input
                type="email"
                name="email"
                defaultValue={user.email || ""}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
              {formErrors.email && (
                <p className="text-red-600 text-sm mt-1">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={user.phone || ""}
                pattern="^05\d{8}$"
                placeholder="05xxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ الميلاد
              </label>
              <input
                type="date"
                name="date_of_birth"
                defaultValue={user.date_of_birth ? user.date_of_birth.split('T')[0] : ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المستوى التعليمي
              </label>
              <select
                name="school_level"
                defaultValue={user.school_level || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر المستوى التعليمي</option>
                <option value="elementary">ابتدائي</option>
                <option value="middle">متوسط</option>
                <option value="high">ثانوي</option>
                <option value="university">جامعي</option>
                <option value="graduate">اكمل الجامعة</option>
                <option value="master">ماجستير</option>
                <option value="phd">دكتوراه</option>
                <option value="employee">موظف</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              العنوان
            </label>
            <textarea
              name="address"
              defaultValue={user.address || ""}
              rows="3"
              placeholder="العنوان الكامل"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحي
            </label>
            <input
              type="text"
              name="neighborhood"
              defaultValue={user.neighborhood || ""}
              placeholder="اسم الحي"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات
            </label>
            <textarea
              name="notes"
              defaultValue={user.notes || ""}
              rows="2"
              placeholder="ملاحظات إضافية"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">معلومات إضافية</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>الرقم التعريفي:</strong> {user.id || user.user_id}</p>
              <p><strong>الصلاحية:</strong> {ROLE_CONFIG[user.role]?.name}</p>
              <p><strong>تاريخ الإنشاء:</strong> {new Date(user.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">✅ معلومة:</p>
              <p>جميع الحقول في هذا النموذج يتم حفظها في قاعدة البيانات بما في ذلك: الأسماء، البريد الإلكتروني، رقم الهاتف، العنوان، تاريخ الميلاد، المستوى التعليمي، الحي، والملاحظات.</p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Parent Card Component
const ParentCard = ({ parent, onView, onToggleActive, onEditProfile, onDeleteUser, onManageChildren }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const RoleIcon = ROLE_CONFIG[parent.role]?.icon || AiOutlineUser;
  
  const getRoleGradient = (role) => {
    switch (role) {
      case 'parent': return 'from-orange-500 to-orange-600';
      case 'admin': return 'from-red-500 to-red-600';
      case 'administrator': return 'from-purple-500 to-purple-600';
      case 'teacher': return 'from-green-500 to-green-600';
      case 'student': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="group perspective-1000 h-[420px] sm:h-[400px] md:h-[420px] lg:h-[380px] cursor-pointer">
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''} group-hover:rotate-y-180`}
           onClick={() => setIsFlipped(!isFlipped)}>
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-full overflow-hidden">
            {/* Header */}
            <div className={`p-4 bg-gradient-to-br ${getRoleGradient(parent.role)} relative`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <RoleIcon className="text-white text-2xl drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white drop-shadow-sm">
                      {parent.first_name} {parent.last_name}
                    </h3>
                    <p className="text-white/80 text-sm">{parent.phone || 'لا يوجد رقم هاتف'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm`}>
                    {ROLE_CONFIG[parent.role]?.name || parent.role}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    parent.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {parent.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* ID */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <AiOutlineIdcard className="text-blue-500 text-xl flex-shrink-0" />
                <div>
                  <div className="text-xs text-blue-600 mb-1">الرقم التعريفي</div>
                  <div className="font-semibold text-blue-800">
                    {parent.id || parent.user_id}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg">
                <AiOutlinePhone className="text-indigo-500 text-xl flex-shrink-0" />
                <div>
                  <div className="text-xs text-indigo-600 mb-1">رقم الهاتف</div>
                  <div className="font-semibold text-indigo-800 text-sm">
                    {parent.phone || 'لا يوجد رقم هاتف'}
                  </div>
                </div>
              </div>

              {/* Email */}
              {parent.email && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <AiOutlineMail className="text-gray-500 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-600 mb-1">البريد الإلكتروني</div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {parent.email}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hover/Click Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-xs text-gray-600 hidden sm:block">مرر للخيارات</span>
                <span className="text-xs text-gray-600 block sm:hidden">اضغط للخيارات</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full overflow-hidden">
            {/* Back Header */}
            <div className={`p-4 bg-gradient-to-br ${getRoleGradient(parent.role)} relative`}>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 text-center">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm inline-block mb-2">
                  <AiOutlinePlus className="text-white text-2xl drop-shadow-sm" />
                </div>
                <h3 className="font-bold text-white drop-shadow-sm">خيارات ولي الأمر</h3>
                <p className="text-white/80 text-sm">{parent.first_name} {parent.last_name}</p>
              </div>
            </div>


            {/* Action Buttons */}
            <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onView(parent)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <AiOutlineEye />
                  التفاصيل
                </button>
                <button
                  onClick={() => onEditProfile(parent)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <AiOutlineUserSwitch />
                  الملف
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onToggleActive(parent)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    parent.is_active
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {parent.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                  {parent.is_active ? 'إلغاء' : 'تفعيل'}
                </button>
                
                <button
                  onClick={() => onManageChildren(parent)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <AiOutlineTeam />
                  الأبناء
                </button>
              </div>

              {/* Danger Zone */}
              <div className="pt-1 border-t border-red-100">
                <button
                  onClick={() => onDeleteUser(parent)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-colors text-sm font-medium"
                >
                  <AiOutlineDelete />
                  حذف نهائياً
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
              <div className="text-xs text-gray-400 text-center">
                {new Date(parent.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Parent Management Component
export default function ParentManagement() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChildrenModal, setShowChildrenModal] = useState(false);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Show parents and teachers
      const parentUsers = response.data.filter(
        (user) => user.role === 'parent' || user.role === 'teacher'
      );
      setParents(parentUsers);
    } catch (err) {
      setError("خطأ في جلب بيانات أولياء الأمور والمعلمين");
      console.error("Error fetching parents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (parent) => {
    setSelectedUser(parent);
    // You can implement a view modal here if needed
    console.log("Viewing parent:", parent);
  };

  const handleEditProfile = (parent) => {
    setSelectedUser(parent);
    setShowProfileModal(true);
  };

  const handleToggleActive = async (parent) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE}/api/users/${parent.id}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchParents(); // Refresh the list
    } catch (err) {
      setError("خطأ في تغيير حالة ولي الأمر");
      console.error("Error toggling parent status:", err);
    }
  };

  const handleDeleteUser = async (parent) => {
    if (window.confirm(`هل أنت متأكد من حذف ولي الأمر ${parent.first_name} ${parent.last_name}؟`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE}/api/users/${parent.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        fetchParents(); // Refresh the list
      } catch (err) {
        setError("خطأ في حذف ولي الأمر");
        console.error("Error deleting parent:", err);
      }
    }
  };

  const handleManageChildren = (parent) => {
    setSelectedUser(parent);
    setShowChildrenModal(true);
  };

  const handleUpdateProfile = async (e, setFormErrors = () => {}) => {
    e.preventDefault();
    setFormErrors({}); // Clear previous errors
    const formData = new FormData(e.target);
    
    // Send all profile fields that now exist in the database
    const profileData = {
      first_name: formData.get('first_name'),
      second_name: formData.get('second_name'),
      third_name: formData.get('third_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      date_of_birth: formData.get('date_of_birth'),
      school_level: formData.get('school_level'),
      neighborhood: formData.get('neighborhood'),
      notes: formData.get('notes')
    };

    try {
      await axios.put(`${API_BASE}/api/users/${selectedUser.id || selectedUser.user_id}/profile`, profileData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      
      setShowProfileModal(false);
      setSelectedUser(null);
      fetchParents(); // Refresh the list
      
    } catch (err) {
      const errorMessage = err.response?.data?.error;
      
      // Check if it's an email duplicate error
      if (errorMessage && errorMessage.includes('البريد الإلكتروني مستخدم من قبل مستخدم آخر')) {
        setFormErrors({ email: errorMessage });
      } else {
        setError(errorMessage || "خطأ في تحديث الملف الشخصي");
      }
      console.error("Error updating profile:", err);
    }
  };

  // Filter parents based on search and status
  const filteredParents = parents.filter(parent => {
    const matchesSearch = parent.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parent.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         parent.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && parent.is_active) ||
                         (statusFilter === "inactive" && !parent.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary-500)] mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات أولياء الأمور والمعلمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة أولياء الأمور والمعلمين</h1>
        <p className="text-gray-600">عرض وإدارة جميع أولياء الأمور والمعلمين المسجلين في النظام</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>عدد أولياء الأمور والمعلمين: {filteredParents.length}</span>
          <span>إجمالي أولياء الأمور والمعلمين: {parents.length}</span>
        </div>
      </div>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredParents.map((parent) => (
          <ParentCard
            key={parent.id}
            parent={parent}
            onView={handleView}
            onToggleActive={handleToggleActive}
            onEditProfile={handleEditProfile}
            onDeleteUser={handleDeleteUser}
            onManageChildren={handleManageChildren}
          />
        ))}
      </div>

      {filteredParents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <AiOutlineUser className="mx-auto text-6xl mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا يوجد أولياء أمور أو معلمين</h3>
            <p>لم يتم العثور على أولياء أمور أو معلمين مطابقين للبحث</p>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <ProfileEditModal
          user={selectedUser}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateProfile}
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
