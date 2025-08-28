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

      await axios.put(`${API_BASE}/api/users/${user.id || user.user_id}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الأول</label>
              <p className="text-gray-900">{user.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العائلة</label>
              <p className="text-gray-900">{user.last_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          {user.class_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحلقة</label>
              <p className="text-gray-900">{getUserClassName(user.class_id)}</p>
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

// Profile Edit Modal Component
const ProfileEditModal = ({ isOpen, user, onClose, onSubmit }) => {
  const [formErrors, setFormErrors] = useState({});
  
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            تعديل الملف الشخصي
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <AiOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={(e) => onSubmit(e, setFormErrors)} className="space-y-4">
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
                الاسم الثاني
              </label>
              <input
                type="text"
                name="second_name"
                defaultValue={user.second_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم الجد
              </label>
              <input
                type="text"
                name="third_name"
                defaultValue={user.third_name || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p><strong>رقم الهوية:</strong> {user.id || user.user_id}</p>
              {user.parent_id && (
                <p><strong>رقم هوية ولي الأمر:</strong> {user.parent_id}</p>
              )}
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

  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="group perspective-1000 h-[420px] sm:h-[400px] md:h-[420px] lg:h-[380px] cursor-pointer">
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''} group-hover:rotate-y-180`}
           onClick={() => setIsFlipped(!isFlipped)}>
        
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-full overflow-hidden">
            {/* Header */}
            <div className={`p-4 bg-gradient-to-br ${getRoleGradient(user.role)} relative`}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                    <RoleIcon className="text-white text-2xl drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white drop-shadow-sm">
                      {user.first_name} {user.last_name}
                    </h3>
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">
                      {roleConfig?.name || user.role}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < (roleConfig?.level || 1) ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`w-3 h-3 rounded-full inline-block ${
                    user.is_active ? 'bg-green-300' : 'bg-red-300'
                  } drop-shadow-sm`}></span>
                </div>
              </div>
            </div>

            {/* Main Info */}
            <div className="p-6 space-y-4">
              {/* ID */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                <AiOutlineUser className="text-gray-500 text-xl flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">رقم الهوية</div>
                  <div className="font-bold text-gray-800 text-lg">
                    {user.id || user.user_id}
                  </div>
                </div>
              </div>

              {/* Phone */}
              {user.phone && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <AiOutlineSafety className="text-blue-500 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-xs text-blue-600 mb-1">رقم الهاتف</div>
                    <div className="font-semibold text-blue-800 text-lg">
                      {user.phone}
                    </div>
                  </div>
                </div>
              )}

              {/* School */}
              {user.school_id && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <AiOutlineSearch className="text-green-500 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-xs text-green-600 mb-1">المجمع</div>
                    <div className="font-semibold text-green-800 truncate">
                      {getUserSchoolName(user.school_id)}
                    </div>
                  </div>
                </div>
              )}

              {/* Class */}
              {user.class_id && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <AiOutlineFilter className="text-purple-500 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-xs text-purple-600 mb-1">الحلقة</div>
                    <div className="font-semibold text-purple-800">
                      {getUserClassName(user.class_id)}
                    </div>
                  </div>
                </div>
              )}

              {/* Parent ID */}
              {user.parent_id && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                  <AiOutlineTeam className="text-orange-500 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-xs text-orange-600 mb-1">ولي الأمر</div>
                    <div className="font-semibold text-orange-800">
                      {user.parent_id}
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
            <div className={`p-4 bg-gradient-to-br ${getRoleGradient(user.role)} relative`}>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 text-center">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm inline-block mb-2">
                  <AiOutlinePlus className="text-white text-2xl drop-shadow-sm" />
                </div>
                <h3 className="font-bold text-white drop-shadow-sm">خيارات المستخدم</h3>
                <p className="text-white/80 text-sm">{user.first_name} {user.last_name}</p>
              </div>
            </div>

            {/* Email Section */}
            {user.email && (
              <div className="p-4 border-b border-gray-100" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AiOutlineSearch className="text-amber-500 text-lg flex-shrink-0" />
                    {hasDuplicateEmail(user.email) && (
                      <AiOutlineWarning className="text-red-500 text-sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-amber-600 mb-1">البريد الإلكتروني</div>
                    <div className="text-amber-800 text-sm truncate font-medium">
                      {user.email}
                    </div>
                    {hasDuplicateEmail(user.email) && (
                      <div className="text-xs text-red-600 mt-1">⚠️ بريد مكرر</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onView(user)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <AiOutlineEye />
                  التفاصيل
                </button>
                <button
                  onClick={() => onEditProfile(user)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <AiOutlineUserSwitch />
                  الملف
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm"
                >
                  <AiOutlineEdit />
                  صلاحية
                </button>
                
                <button
                  onClick={() => onToggleActive(user.id || user.user_id)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                    user.is_active
                      ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {user.is_active ? <AiOutlineClose /> : <AiOutlineCheck />}
                  {user.is_active ? 'إلغاء' : 'تفعيل'}
                </button>
              </div>

              {/* Children Management */}
              {(user.role === 'parent' || user.role === 'admin' || user.role === 'administrator' || user.role === 'teacher') && (
                <button
                  onClick={() => onManageChildren(user)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <AiOutlineTeam />
                  إدارة الابناء
                </button>
              )}

              {/* Danger Zone */}
              <div className="pt-1 border-t border-red-100">
                <button
                  onClick={() => onDeleteUser(user.id || user.user_id)}
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
                {new Date(user.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </div>
        </div>
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
  const [showProfileModal, setShowProfileModal] = useState(false);
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

      setUsers(allUsers);
      setError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("فشل في تحميل المستخدمين");
      setUsers([]);
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

  const handleEditProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleManageChildren = (user) => {
    setSelectedUser(user);
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
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowProfileModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.error;
      
      // Check if it's an email duplicate error
      if (errorMessage && errorMessage.includes('البريد الإلكتروني مستخدم من قبل مستخدم آخر')) {
        setFormErrors({ email: errorMessage });
      } else {
        setError(errorMessage || "فشل في تحديث الملف الشخصي");
      }
    }
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
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">إدارة المستخدمين</h1>
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
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          schools={schools}
          classes={classes}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && selectedUser && (
        <ProfileEditModal
          isOpen={showProfileModal}
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