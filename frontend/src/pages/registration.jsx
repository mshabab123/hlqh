import { Link } from "react-router-dom";

export default function Registration() {
  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat bg-blend-overlay h-[calc(100vh-5rem)] overflow-hidden flex flex-col items-center justify-center font-[var(--font-family-arabic)] p-4">
      <div
        className="bg-white/90 p-6 sm:p-8 rounded-xl w-full max-w-4xl shadow-xl space-y-6"
        style={{ backdropFilter: "blur(2px)" }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-[var(--color-primary-700)]">
          اختر نوع التسجيل
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/parent-registration"
            className="bg-primary-50 p-6 rounded-lg border-2 border-transparent hover:border-[var(--color-primary-300)] transition-all text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-[var(--color-primary-500)] rounded-full flex items-center justify-center text-white text-2xl">
              ولي
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[var(--color-primary-700)]">
              تسجيل ولي أمر
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              إنشاء حساب ولي أمر وربط الأبناء بالحساب.
            </p>
          </Link>

          <Link
            to="/student-registration"
            className="bg-background-secondary p-6 rounded-lg border-2 border-transparent hover:border-[var(--color-primary-300)] transition-all text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-[var(--color-primary-600)] rounded-full flex items-center justify-center text-white text-2xl">
              طالب
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[var(--color-primary-700)]">
              تسجيل طالب
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              إنشاء حساب طالب جديد في المنصة.
            </p>
          </Link>

          <Link
            to="/TeacherRegister"
            className="bg-primary-50 p-6 rounded-lg border-2 border-transparent hover:border-[var(--color-primary-300)] transition-all text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 bg-[var(--color-primary-700)] rounded-full flex items-center justify-center text-white text-base font-bold">
              معلم
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[var(--color-primary-700)]">
              تسجيل معلم أو مدير
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              إنشاء طلب حساب معلم أو مدير مجمع للمراجعة.
            </p>
          </Link>
        </div>

        <div className="text-center pt-4 border-t border-gray-200">
          <Link
            to="/"
            className="text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-semibold"
          >
            لديك حساب؟ تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
