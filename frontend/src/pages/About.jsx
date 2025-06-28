export default function Home() {
  return (
    <div
      className="bg-[url('/baground.svg')] bg-cover bg-center bg-no-repeat
       bg-blend-overlay min-h-screen flex flex-col items-center justify-center 
       font-[var(--font-family-arabic)] py-12" // "   min-h-[90vh] w-full flex flex-col items-center justify-center  bg-gradient-to-br from-[var(--color-primary-400)] via-[var(--color-primary-500)] to-[var(--color-primary-800)]  relative overflow-hidden         font-[var(--font-family-arabic)]       "
      dir="rtl"
    >
      {/* Subtle SVG decoration (waves) */}

      {/* Glassmorphism Card */}
      <div
        className="
          relative z-10 bg-white/80 backdrop-blur-md border border-light
          rounded-3xl shadow-2xl px-8 py-12 max-w-2xl w-full mx-4
          flex flex-col items-center
        "
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-primary-700)] mb-4 tracking-tight drop-shadow-md">
          عن المنصة
        </h1>
        <p className="text-xl leading-loose text-primary font-semibold mb-2">
          سوف نطلق المنصة قريباً لتخدم حلقات تحفيظ القرآن في كل مكان{" "}
          <span className="text-[var(--color-primary-600)]">ومجاناً</span>
        </p>
        <p className="text-lg leading-loose text-secondary mb-2">
          نسعى لكي تكون{" "}
          <span className="font-bold text-[var(--color-primary-700)]">
            أكثر أماناً
          </span>{" "}
          وأكثر موثوقية
        </p>
        <p className="text-lg leading-loose text-secondary mb-2">
          وسوف ندعم فيها أفضل التقنيات للذكاء الاصطناعي، الأمن السيبراني العالي،
          والتخزين السحابي الموثوق وغير ذلك.
        </p>
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
  );
}
