// src/components/SuccessModal.jsx
export default function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4 text-[var(--color-primary-600)]">
          تم التسجيل بنجاح!
        </h2>
        <p className="mb-6 text-gray-700">
          تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.
        </p>
        <button
          className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-2 rounded-lg font-semibold"
          onClick={onClose}
        >
          الذهاب لتسجيل الدخول
        </button>
      </div>
    </div>
  );
}
