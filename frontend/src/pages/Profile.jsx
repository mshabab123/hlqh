import { useState, useEffect } from "react";
import axios from "axios";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { AiOutlineUser, AiOutlineLock, AiOutlineEdit, AiOutlineMail, AiOutlinePhone, AiOutlineCalendar, AiOutlineHome, AiOutlineCheck } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setProfile(response.data.user);
      setEditData({
        phone: response.data.user.phone || "",
        email: response.data.user.email || "",
        address: response.data.user.address || "",
        date_of_birth: response.data.user.date_of_birth ? 
          response.data.user.date_of_birth.split('T')[0] : ""
      });
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الملف الشخصي");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_BASE}/api/profile/me`, editData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setProfile(response.data.user);
      setEditMode(false);
      setSuccess("تم تحديث الملف الشخصي بنجاح");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث الملف الشخصي");
    }
  };

  const handlePasswordChangeSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 5000);
  };

  const getRoleDisplayName = (role) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري تحميل الملف الشخصي...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AiOutlineUser className="text-3xl text-[var(--color-primary-700)]" />
          <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">الملف الشخصي</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <AiOutlineCheck />
          {success}
        </div>
      )}

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">المعلومات الشخصية</h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <AiOutlineEdit />
                  {editMode ? "إلغاء التعديل" : "تعديل المعلومات"}
                </button>
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">رقم الجوال</label>
                      <input
                        type="text"
                        value={editData.phone}
                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        pattern="^05[0-9]{8}$"
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">العنوان</label>
                      <input
                        type="text"
                        value={editData.address}
                        onChange={(e) => setEditData({...editData, address: e.target.value})}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">تاريخ الميلاد</label>
                      <input
                        type="date"
                        value={editData.date_of_birth}
                        onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)] transition-colors"
                    >
                      حفظ التغييرات
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">المعلومات الأساسية</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">الاسم الكامل</p>
                          <p className="font-medium">
                            {`${profile.first_name} ${profile.second_name || ''} ${profile.third_name || ''} ${profile.last_name}`.trim()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">رقم الهوية</p>
                          <p className="font-medium">{profile.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">الدور</p>
                          <span className="inline-block px-3 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded-full text-sm font-medium">
                            {getRoleDisplayName(profile.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">معلومات الاتصال</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <AiOutlineMail className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                            <p className="font-medium">{profile.email || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <AiOutlinePhone className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">رقم الجوال</p>
                            <p className="font-medium">{profile.phone || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <AiOutlineHome className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">العنوان</p>
                            <p className="font-medium">{profile.address || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Info */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-gray-700 mb-3">معلومات إضافية</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <AiOutlineCalendar className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">تاريخ الميلاد</p>
                          <p className="font-medium">{formatDate(profile.date_of_birth)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AiOutlineUser className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">تاريخ التسجيل</p>
                          <p className="font-medium">{formatDate(profile.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">الإعدادات الأمنية</h2>
              <div className="space-y-4">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <AiOutlineLock className="text-xl" />
                  <div className="text-right">
                    <p className="font-semibold">تغيير كلمة المرور</p>
                    <p className="text-sm opacity-90">قم بتحديث كلمة المرور لحماية حسابك</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 mb-2">نصائح أمنية</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• غيّر كلمة المرور بانتظام</li>
                <li>• لا تشارك بيانات دخولك مع أحد</li>
                <li>• تأكد من تسجيل الخروج عند الانتهاء</li>
                <li>• استخدم كلمات مرور قوية ومعقدة</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </div>
  );
}