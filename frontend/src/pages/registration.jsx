import { useNavigate, Link } from "react-router-dom";
export default function Registration() {
  const navigate = useNavigate();

  return (
    <div className="bg-[url('/baground.svg')] bg-cover bg-fixed bg-center bg-no-repeat bg-blend-overlay min-h-screen flex flex-col items-center justify-center font-[var(--font-family-arabic)] py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-[var(--color-primary-700)] bg-gradient-to-r from-background-dark to-text-muted bg-clip-text text-transparent">
        اختر نوع التسجيل
      </h1>

      <div className="bg-white/90 p-8 rounded-xl w-full max-w-2xl shadow-xl space-y-6" style={{ backdropFilter: "blur(2px)" }}>
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-primary-500)]">
          يرجى اختيار نوع التسجيل المناسب
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parent Registration Card */}
          <div className="bg-primary-50 p-6 rounded-lg border-2 border-transparent hover:border-[var(--color-primary-300)] transition-all duration-300 group">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-[var(--color-primary-500)] rounded-full flex items-center justify-center text-white text-2xl">
                  👨‍👩‍👧‍👦
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[var(--color-primary-700)] group-hover:text-[var(--color-primary-800)]">
                تسجيل ولي أمر
              </h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                إذا كنت ولي أمر وتريد تسجيل نفسك وربط أبنائك بحسابك. يمكنك إدخال أرقام هوية الأبناء المسجلين مسبقاً أو الذين سيتم تسجيلهم لاحقاً.
              </p>
              <Link 
                to="/parent-registration"
                className="w-full bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-700)] text-white py-3 px-6 rounded-lg font-semibold transition-colors inline-block text-center"
              >
                تسجيل ولي أمر
              </Link>
            </div>
          </div>

          {/* Student Registration Card */}
          <div className="bg-background-secondary p-6 rounded-lg border-2 border-transparent hover:border-[var(--color-primary-300)] transition-all duration-300 group">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-[var(--color-primary-600)] rounded-full flex items-center justify-center text-white text-2xl">
                  🎓
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[var(--color-primary-700)] group-hover:text-[var(--color-primary-800)]">
                تسجيل طالب
              </h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                إذا كنت طالباً وتريد تسجيل نفسك مباشرة في الحلقة. يمكنك ربط حسابك بولي أمر إذا كان مسجلاً مسبقاً.
              </p>
              <Link 
                to="/student-registration"
                className="w-full bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-800)] text-white py-3 px-6 rounded-lg font-semibold transition-colors inline-block text-center"
              >
                تسجيل طالب
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 mb-3">
            لديك حساب بالفعل؟
          </p>
          <Link 
            to="/login" 
            className="text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)] font-semibold text-lg"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
