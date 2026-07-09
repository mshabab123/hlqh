import { AiOutlineUser, AiOutlineEye, AiOutlineCheck, AiOutlineClose, AiOutlineDelete, AiOutlineMail, AiOutlinePhone } from "react-icons/ai";
import { FaUserTie } from "react-icons/fa";

const AdministratorCard = ({ administrator, onView, onToggleActive, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
            <FaUserTie className="text-[var(--color-primary-700)] text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              {administrator.first_name} {administrator.last_name}
            </h3>
            <p className="text-sm text-gray-600">الهوية: {administrator.id || administrator.user_id}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                administrator.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800'
                  : administrator.role === 'administrator'
                  ? 'bg-blue-100 text-blue-800'
                  : administrator.role === 'supervisor'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {administrator.role === 'admin' ? 'مدير عام' :
                 administrator.role === 'administrator' ? 'مدير مجمع' :
                 administrator.role === 'supervisor' ? 'مشرف' : administrator.role}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${
            administrator.is_active ? 'bg-green-500' : 'bg-red-500'
          }`} title={administrator.is_active ? 'نشط' : 'غير نشط'}></span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {administrator.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AiOutlineMail className="text-gray-400" />
            <span>{administrator.email}</span>
          </div>
        )}
        {administrator.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AiOutlinePhone className="text-gray-400" />
            <span>{administrator.phone}</span>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات كأيقونات فقط، مع تلميح يظهر عند التمرير */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => onView(administrator)}
          className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          title="عرض المعلومات وتعديلها"
          aria-label="عرض المعلومات وتعديلها"
        >
          <AiOutlineEye className="text-lg" />
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onToggleActive(administrator.id || administrator.user_id)}
            className={`p-2.5 rounded-lg transition-colors ${
              administrator.is_active
                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : 'text-green-600 bg-green-50 hover:bg-green-100'
            }`}
            title={administrator.is_active ? 'إلغاء التفعيل' : 'تفعيل الحساب'}
            aria-label={administrator.is_active ? 'إلغاء التفعيل' : 'تفعيل الحساب'}
          >
            {administrator.is_active ? <AiOutlineClose className="text-lg" /> : <AiOutlineCheck className="text-lg" />}
          </button>
          <button
            onClick={() => onDelete(administrator.id || administrator.user_id)}
            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            title="حذف المدير"
            aria-label="حذف المدير"
          >
            <AiOutlineDelete className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdministratorCard;