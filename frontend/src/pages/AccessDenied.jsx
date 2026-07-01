import { useState, useEffect } from 'react';
import { AiOutlineWarning, AiOutlineHome, AiOutlinePhone } from 'react-icons/ai';

export default function AccessDenied() {
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Get the access denied message from localStorage
    const message = localStorage.getItem('accessDeniedMessage');
    if (message) {
      setErrorMessage(message);
      // Clear the message after displaying it
      localStorage.removeItem('accessDeniedMessage');
    } else {
      setErrorMessage('ليس لديك صلاحية للوصول لهذا المحتوى');
    }
  }, []);

  const handleGoHome = () => {
    // Redirect to appropriate home page based on user role
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role;
        
        // Redirect based on role
        switch (role) {
          case 'admin':
            window.location.href = '/admin-dashboard';
            break;
          case 'administrator':
          case 'supervisor':
          case 'teacher':
            window.location.href = '/dashboard';
            break;
          case 'parent':
            window.location.href = '/parent-dashboard';
            break;
          case 'student':
            window.location.href = '/student-dashboard';
            break;
          default:
            window.location.href = '/';
        }
      } catch (err) {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  };

  const getErrorDetails = (message) => {
    if (message.includes('employment is inactive')) {
      return {
        title: 'حالة التوظيف غير نشطة',
        description: 'تم إيقاف حالة التوظيف الخاصة بك. يرجى التواصل مع الإدارة لتفعيل حسابك.',
        icon: '🚫',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else if (message.includes('on leave')) {
      return {
        title: 'في إجازة',
        description: 'أنت حالياً في إجازة. يرجى التواصل مع الإدارة إذا كان هناك خطأ أو لتحديث حالة الإجازة.',
        icon: '🏖️',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800'
      };
    } else if (message.includes('deactivated')) {
      return {
        title: 'حساب معطل',
        description: 'تم إلغاء تفعيل حسابك. يرجى التواصل مع مدير النظام لإعادة تفعيل الحساب.',
        icon: '⛔',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else {
      return {
        title: 'وصول مرفوض',
        description: message || 'ليس لديك صلاحية للوصول لهذا المحتوى.',
        icon: '🔒',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800'
      };
    }
  };

  const errorDetails = getErrorDetails(errorMessage);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className={`${errorDetails.bgColor} ${errorDetails.borderColor} border-b px-6 py-4`}>
          <div className="flex items-center">
            <div className="text-3xl ml-3">{errorDetails.icon}</div>
            <div>
              <h1 className={`text-xl font-bold ${errorDetails.textColor}`}>
                {errorDetails.title}
              </h1>
              <AiOutlineWarning className={`inline ${errorDetails.textColor} ml-1`} />
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <p className="text-gray-700 text-base leading-relaxed mb-6">
            {errorDetails.description}
          </p>

          <div className="space-y-4">
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <AiOutlineHome />
              العودة للصفحة الرئيسية
            </button>

            <div className={`${errorDetails.bgColor} ${errorDetails.borderColor} border rounded-lg p-4`}>
              <h3 className={`font-semibold ${errorDetails.textColor} mb-2 flex items-center gap-2`}>
                <AiOutlinePhone />
                تحتاج مساعدة؟
              </h3>
              <p className="text-sm text-gray-600">
                تواصل مع الإدارة أو مدير النظام لحل هذه المشكلة وإعادة تفعيل حسابك.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني
          </p>
        </div>
      </div>
    </div>
  );
}
