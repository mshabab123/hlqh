// Certificate design modelled on the "شهادة تقدير" template of
// جامع الخلفاء الراشدين بالتعاون مع الجمعية الخيرية لتحفيظ القرآن الكريم بعسير (تذكرة).
// Shared by the certificate management screen and the student/parent "شهاداتي" screen,
// and captured to PDF via src/utils/certificatePdf.js.

// Institution-specific text kept as constants so it is easy to adjust in one place.
const SUPERVISOR_NAME = "إبراهيم عبده جبران";
const DEFAULT_SCHOOL_NAME = "جامع الخلفاء الراشدين بحي النسيم";

const COLORS = {
  teal: "#0f6f79",
  tealDark: "#0a4f57",
  gold: "#c2a15a",
  goldDark: "#a5843b",
  ink: "#1f2937",
  cream: "#ffffff",
};

const toArabicDigits = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
};

const gregorianYear = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
};

// Real Hijri year from the issue date, using the Umm al-Qura calendar
// (the official Saudi calendar). Returns Arabic-Indic digits already.
const hijriYearOf = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year");
    return year ? year.value : "";
  } catch {
    return "";
  }
};

// Decorative flowing ribbons in the corners (teal + gold), drawn as SVG so they
// rasterize cleanly when the certificate is captured to a PDF.
function CornerDecor() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-[130px] w-full"
      >
        <path d="M0,0 H360 C250,55 150,55 90,120 C55,155 25,150 0,135 Z" fill={COLORS.gold} opacity="0.9" />
        <path d="M0,0 H300 C210,60 120,70 70,140 C40,180 15,175 0,160 Z" fill={COLORS.teal} />
        <path d="M0,0 H210 C150,55 90,80 55,150 C30,195 12,190 0,180 Z" fill={COLORS.tealDark} opacity="0.85" />
        <path d="M1000,0 H720 C820,50 900,60 960,130 C980,155 990,120 1000,90 Z" fill={COLORS.gold} opacity="0.9" />
        <path d="M1000,0 H780 C860,55 930,75 975,150 C988,175 995,120 1000,80 Z" fill={COLORS.teal} />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 1000 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[130px] w-full"
      >
        <path d="M1000,220 H620 C740,165 850,160 920,90 C955,55 985,70 1000,85 Z" fill={COLORS.gold} opacity="0.9" />
        <path d="M1000,220 H700 C800,170 890,150 945,80 C972,45 990,60 1000,75 Z" fill={COLORS.teal} />
        <path d="M1000,220 H790 C860,175 920,150 960,80 C978,50 992,60 1000,70 Z" fill={COLORS.tealDark} opacity="0.85" />
        <path d="M0,220 H320 C210,170 120,160 60,95 C30,60 12,140 0,170 Z" fill={COLORS.teal} opacity="0.9" />
      </svg>
    </>
  );
}

function SignatureBlock({ label, name }) {
  return (
    <div className="text-center">
      <p className="text-lg font-black" style={{ color: COLORS.ink }}>
        {label}
      </p>
      <p className="mt-2 text-base" style={{ color: "#475569" }}>
        {name || "—"}
      </p>
    </div>
  );
}

export default function CertificateTemplate({ certificate }) {
  const schoolName = certificate.school_name || DEFAULT_SCHOOL_NAME;
  // Always the primary ("main") teacher of the class, resolved by the backend
  // certificates query (teacher_role = 'primary'). Never fabricate a name.
  const teacherName = certificate.teacher_name || "—";
  const hijriYear = hijriYearOf(certificate.issued_at);
  const miladiYear = toArabicDigits(gregorianYear(certificate.issued_at));
  const teacherLabel = certificate.class_name ? `معلم حلقة ${certificate.class_name}` : "معلم الحلقة";

  return (
    <div
      dir="rtl"
      className="certificate-print-area relative mx-auto flex aspect-[1.6/1] w-full max-w-5xl flex-col overflow-hidden rounded-lg shadow-xl"
      style={{ backgroundColor: COLORS.cream, color: COLORS.ink }}
    >
      <CornerDecor />

      {/* تذكرة logo — top corner */}
      <img
        src="/Logo.png"
        alt="الجمعية الخيرية لتحفيظ القرآن الكريم بعسير - تذكرة"
        className="absolute right-8 top-6 z-10 h-24 w-auto object-contain"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />

      {/* جامع الخلفاء الراشدين logo — bottom corner */}
      <img
        src="/g2648.png"
        alt="جامع الخلفاء الراشدين"
        className="absolute bottom-5 left-8 z-10 h-24 w-auto object-contain"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />

      {/* Official seal — centered on the certificate, over the signature band */}
      <img
        src="/stamp.png"
        alt="ختم مجمع حلقات جامع الخلفاء الراشدين"
        className="pointer-events-none absolute bottom-20 left-1/2 z-20 h-28 w-28 object-contain opacity-90"
        style={{ transform: "translateX(-50%) rotate(-8deg)" }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center px-14 pb-6 pt-10 text-center">
        <p className="text-lg font-bold tracking-wide" style={{ color: COLORS.goldDark }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        <h1 className="mt-3 text-5xl font-black" style={{ color: COLORS.gold }}>
          شهادة تقدير
        </h1>

        <p className="mt-6 max-w-4xl text-lg leading-9" style={{ color: "#374151" }}>
          يسر مجمع حلقات <strong style={{ color: COLORS.tealDark }}>{schoolName}</strong> بالتعاون مع الجمعية
          الخيرية لتحفيظ القرآن الكريم بعسير (تذكرة) أن تمنح هذه الشهادة للطالب:
        </p>

        <div
          className="mt-5 rounded-lg px-10 py-3"
          style={{ backgroundColor: "#ecf6f6", border: `1px solid ${COLORS.teal}33` }}
        >
          <h2 className="text-4xl font-black" style={{ color: COLORS.ink }}>
            {certificate.student_name || "—"}
          </h2>
        </div>

        <p className="mt-6 text-lg leading-9" style={{ color: "#374151" }}>
          حيث أتم  <strong style={{ color: COLORS.tealDark }}>{certificate.semester_name || "—"}</strong> من عام{" "}
          <strong style={{ color: COLORS.tealDark }}>{hijriYear || "—"}</strong> هـ /{" "}
          <strong style={{ color: COLORS.tealDark }}>{miladiYear}</strong> م.
          بنجاح، واضهر التزاماً واجتهاداً في حفظ كتاب الله عز وجل. 
           ونسأل الله له التوفيق في حفظ القرآن
          والعمل به.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-10 pt-8">
          <SignatureBlock label={teacherLabel} name={teacherName} />
          <SignatureBlock label="المشرف الإداري المتطوع" name={SUPERVISOR_NAME} />
        </div>
      </div>

      {certificate.certificate_number ? (
        <p className="absolute bottom-2 right-6 z-10 text-[10px]" style={{ color: "#94a3b8" }}>
          رقم الشهادة: {certificate.certificate_number}
        </p>
      ) : null}
    </div>
  );
}
