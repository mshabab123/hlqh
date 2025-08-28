import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AiOutlineUser, 
  AiOutlinePlus, 
  AiOutlineDelete, 
  AiOutlineClose,
  AiOutlineLoading,
  AiOutlineCheck
} from 'react-icons/ai';

const API_BASE = import.meta.env.VITE_API_BASE || "";

const SimpleChildrenManagement = ({ user, isOpen, onClose }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchChildren();
    }
  }, [isOpen, user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/children/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChildren(response.data.children || []);
    } catch (err) {
      console.error('Error fetching children:', err);
      setError('خطأ في جلب بيانات الأطفال');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    const trimmedStudentId = studentId.trim();
    
    if (!trimmedStudentId) {
      setError('يرجى إدخال رقم هوية الطالب');
      return;
    }
    
    // Basic validation - ensure it's a number and reasonable length
    if (!/^\d+$/.test(trimmedStudentId)) {
      setError('رقم الهوية يجب أن يحتوي على أرقام فقط');
      return;
    }
    
    if (trimmedStudentId.length < 6 || trimmedStudentId.length > 15) {
      setError('رقم الهوية يجب أن يكون بين 6 و 15 رقم');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_BASE}/api/children/${user.id}/add`, {
        studentId: trimmedStudentId,
        relationshipType: 'parent',
        isPrimary: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStudentId('');
      // Use the detailed success message from the server if available
      const successMessage = response.data.message || 'تم ربط الطالب بنجاح';
      setSuccess(successMessage);
      fetchChildren();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في ربط الطالب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveChild = async (relationshipId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء ربط هذا الطالب؟')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/children/${user.id}/${relationshipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('تم إلغاء ربط الطالب بنجاح');
      fetchChildren();
    } catch (err) {
      setError(err.response?.data?.error || 'خطأ في إلغاء ربط الطالب');
    }
  };

  const getRelationshipText = (relationshipType) => {
    switch (relationshipType) {
      case 'parent': return 'ابن/ابنة';
      case 'guardian': return 'وصي';
      case 'relative': return 'قريب';
      default: return relationshipType;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            إدارة الأطفال - {user.first_name} {user.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <AiOutlineClose />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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

          {/* Add Child Form */}
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              <AiOutlinePlus className="inline ml-2" />
              ربط طالب جديد
            </h3>
            <form onSubmit={handleAddChild} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="أدخل رقم هوية الطالب"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !studentId.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <AiOutlineLoading className="animate-spin" />
                ) : (
                  <AiOutlinePlus />
                )}
                ربط
              </button>
            </form>
            <p className="text-sm text-gray-600 mt-2">
              * أدخل رقم هوية الطالب المسجل في النظام لربطه بهذا المستخدم (يمكن ربط الطلاب حتى لو كانوا غير نشطين)
            </p>
          </div>

          {/* Children List */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              الأطفال المربوطين ({children.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <AiOutlineLoading className="animate-spin text-3xl text-gray-400 mr-2" />
              <span className="text-gray-600">جاري تحميل البيانات...</span>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12">
              <AiOutlineUser className="mx-auto text-6xl text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">لا يوجد أطفال مربوطين</h3>
              <p className="text-gray-500">يمكنك ربط الطلاب بهذا المستخدم باستخدام رقم هوية الطالب</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <div key={child.relationship_id} className="bg-gray-50 rounded-lg p-4 border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <AiOutlineUser className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {child.first_name} {child.last_name}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <p>رقم الهوية: {child.student_id}</p>
                        {child.school_level && (
                          <p>المرحلة: {child.school_level}</p>
                        )}
                        <p>الحالة: 
                          <span className={`mr-1 ${child.is_active ? 'text-green-600' : 'text-orange-600'}`}>
                            {child.is_active ? 'نشط' : 'غير نشط (مسموح)'}
                          </span>
                        </p>
                        <p>العلاقة: 
                          <span className="mr-1 text-blue-600">
                            {getRelationshipText(child.relationship_type)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      child.is_active ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {child.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                    <button
                      onClick={() => handleRemoveChild(child.relationship_id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                      title="إلغاء الربط"
                    >
                      <AiOutlineDelete />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleChildrenManagement;