import { useState, useEffect } from "react";
import { AiOutlineUser, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlinePhone, AiOutlineMail, AiOutlineInfoCircle } from "react-icons/ai";

export default function About() {
  const [user, setUser] = useState(null);
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      // Show modal for inactive users
      if (JSON.parse(userData).is_active === false) {
        setShowInactiveModal(true);
      }
    }
  }, []);

  return (
    <>
      {/* Inactive Account Modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-pulse">
            <div className="bg-orange-500 text-white p-6 rounded-t-2xl text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <AiOutlineCloseCircle className="text-4xl" />
                <h2 className="text-2xl font-bold">حسابك غير مفعل</h2>
              </div>
              <p className="text-lg font-semibold mb-2">
                للوصول إلى جميع خدمات المنصة
              </p>
              <p className="text-base opacity-90">
                يجب تفعيل حسابك أولاً
              </p>
            </div>
            
            <div className="p-6 text-center">
              <p className="text-gray-700 mb-4">
                يرجى التواصل مع إدارة النظام لتفعيل حسابك
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold mb-3 text-orange-800 flex items-center justify-center gap-2">
                  <AiOutlineInfoCircle />
                  معلومات التواصل
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlinePhone className="text-orange-600" />
                    <span>+966 5 33 69 33 55</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlineMail className="text-orange-600" />
                    <span>malrizah@gmail.com</span>
                  </div>
                </div>
                <p className="text-xs mt-2 text-gray-500">
                  Contact administrator to activate your account
                </p>
              </div>
              
              <button
                onClick={() => setShowInactiveModal(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                حسناً أكمل التصفح
              </button>
            </div>
          </div>
        </div>
      )}

    <div
      className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat
       bg-blend-overlay min-h-screen flex flex-col items-center justify-center 
       font-[var(--font-family-arabic)] py-12"
      dir="rtl"
    >

      {/* User Status Card */}
      {user && (
        <div className="relative z-10 w-full max-w-2xl mx-4 mb-6">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AiOutlineUser className="text-3xl text-[var(--color-primary-700)]" />
              <h2 className="text-xl font-bold text-[var(--color-primary-700)]">
                حالة الحساب
              </h2>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-800">
                مرحباً، {user.first_name} {user.last_name}
              </p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                user.is_active !== false 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {user.is_active !== false ? (
                  <>
                    <AiOutlineCheckCircle />
                    حساب مفعل
                  </>
                ) : (
                  <>
                    <AiOutlineCloseCircle />
                    حساب غير مفعل
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main About Content */}
      <div
        className="
          relative z-10 bg-white/80 backdrop-blur-md border border-light
          rounded-3xl shadow-2xl px-8 py-12 max-w-4xl w-full mx-4
          flex flex-col items-center
        "
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-primary-700)] mb-6 tracking-tight drop-shadow-md">
          منصة إدارة الحلقات القرآنية
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8 w-full mb-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--color-primary-700)] mb-4">
              عن المنصة
            </h2>
            <p className="text-lg leading-loose text-gray-700">
              منصة متكاملة لإدارة الحلقات القرآنية تهدف إلى تسهيل عملية إدارة وتنظيم 
              حلقات تحفيظ القرآن الكريم بطريقة عصرية وفعالة.
            </p>
            <p className="text-lg leading-loose text-gray-700">
              نسعى لكي تكون{" "}
              <span className="font-bold text-[var(--color-primary-700)]">
                أكثر أماناً
              </span>{" "}
              وأكثر موثوقية لخدمة المجتمع القرآني.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--color-primary-700)] mb-4">
              الميزات الرئيسية
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <AiOutlineCheckCircle className="text-green-600" />
                إدارة الطلاب والمعلمين
              </li>
              <li className="flex items-center gap-2">
                <AiOutlineCheckCircle className="text-green-600" />
                تتبع الحضور والغياب
              </li>
              <li className="flex items-center gap-2">
                <AiOutlineCheckCircle className="text-green-600" />
                نظام الدرجات والتقييم
              </li>
              <li className="flex items-center gap-2">
                <AiOutlineCheckCircle className="text-green-600" />
                إدارة الفصول الدراسية
              </li>
              <li className="flex items-center gap-2">
                <AiOutlineCheckCircle className="text-green-600" />
                تقارير شاملة ومفصلة
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full bg-[var(--color-primary-50)] rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-[var(--color-primary-700)] mb-4 text-center">
            رؤيتنا ومهمتنا
          </h2>
          <p className="text-lg leading-loose text-gray-700 text-center">
            سوف نطلق المنصة قريباً لتخدم حلقات تحفيظ القرآن في كل مكان{" "}
            <span className="text-[var(--color-primary-600)] font-bold">ومجاناً</span>
          </p>
          <p className="text-base leading-loose text-gray-600 text-center mt-2">
            وسوف ندعم فيها أفضل التقنيات للذكاء الاصطناعي، الأمن السيبراني العالي،
            والتخزين السحابي الموثوق وغير ذلك.
          </p>
        </div>

        {/* Contact Information */}
        <div className="w-full bg-white/50 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-[var(--color-primary-700)] mb-4 text-center">
            تواصل معنا
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/60 rounded-xl">
              <AiOutlinePhone className="text-3xl text-[var(--color-primary-600)] mx-auto mb-2" />
              <h3 className="font-bold text-gray-800 mb-1">الهاتف</h3>
              <p className="text-gray-600">+966533693355 </p>
            </div>
            <div className="text-center p-4 bg-white/60 rounded-xl">
              <AiOutlineMail className="text-3xl text-[var(--color-primary-600)] mx-auto mb-2" />
              <h3 className="font-bold text-gray-800 mb-1">البريد الإلكتروني</h3>
              <p className="text-gray-600">malrizah@gmail.com</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1">
          <span className="text-[var(--color-primary-800)] text-base font-bold">
            تابعونا قريباً!
          </span>
        </div>
      </div>

      {/* Optional: Extra SVG at bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full max-h-32 opacity-30"
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="var(--color-primary-100)"
          fillOpacity="1"
          d="M0,320L80,288C160,256,320,192,480,181.3C640,171,800,213,960,213.3C1120,213,1280,171,1360,149.3L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </svg>
    </div>
    </>
  );
}
