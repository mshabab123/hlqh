// src/components/SuccessModal.jsx
export default function SuccessModal({ onClose, title, message, buttonText, isInactive = false }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
        <div className="mb-4">
          {isInactive ? (
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-4 ${isInactive ? 'text-yellow-600' : 'text-[var(--color-primary-600)]'}`}>
          {title || (isInactive ? 'طلب قيد المراجعة!' : 'تم التسجيل بنجاح!')}
        </h2>
        
        <p className="mb-4 text-gray-700 leading-relaxed">
          {message || (isInactive 
            ? 'تم استلام طلب التسجيل وهو قيد المراجعة. سيتم إشعارك عند تفعيل حسابك.' 
            : 'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.'
          )}
        </p>
        
        {isInactive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>مهم:</strong> الحساب غير مفعل حتى موافقة الإدارة. سيتم التواصل معك عند الموافقة.
            </p>
          </div>
        )}
        
        <button
          className={`w-full ${isInactive ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)]'} text-white py-3 rounded-lg font-semibold transition-colors`}
          onClick={onClose}
        >
          {buttonText || (isInactive ? 'العودة للرئيسية' : 'الذهاب لتسجيل الدخول')}
        </button>
      </div>
    </div>
  );
}
