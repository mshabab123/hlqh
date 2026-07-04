const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-SA");
};

// Shared certificate design used both by the management screen and the
// student/parent "شهاداتي" screen.
export default function CertificateTemplate({ certificate }) {
  const average = Number(certificate.average_grade || 0);

  return (
    <div
      dir="rtl"
      className="certificate-print-area mx-auto bg-white text-slate-900 border-[10px] border-double border-teal-700 p-10 rounded-lg shadow-xl max-w-5xl min-h-[680px]"
    >
      <div className="flex items-center justify-between border-b border-teal-200 pb-6">
        <div className="text-right">
          <p className="text-sm text-slate-500">منصة الحلقات</p>
          <h1 className="text-3xl font-black text-teal-800">شهادة إتمام فصل دراسي</h1>
        </div>
        <img src="/logo.svg" alt="شعار المنصة" className="h-24 w-24 object-contain" />
      </div>

      <div className="mt-12 text-center space-y-5">
        <p className="text-xl text-slate-600">تشهد إدارة</p>
        <h2 className="text-3xl font-black text-teal-900">{certificate.school_name || "مجمع الحلقات"}</h2>
        <p className="text-xl text-slate-600">بأن الطالب</p>
        <div className="mx-auto max-w-3xl rounded-lg border border-teal-200 bg-teal-50 px-6 py-5">
          <h3 className="text-4xl font-black text-slate-950">{certificate.student_name}</h3>
          <p className="mt-2 text-slate-600">رقم الهوية: {certificate.student_id}</p>
        </div>
        <p className="text-xl leading-9 text-slate-700">
          قد أتم متطلبات <strong>{certificate.semester_name}</strong>
          {certificate.class_name ? <> في حلقة <strong>{certificate.class_name}</strong></> : null}
          {certificate.teacher_name ? <> بإشراف المعلم <strong>{certificate.teacher_name}</strong></> : null}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">المستوى</p>
          <p className="mt-2 text-xl font-bold">{certificate.school_level || "-"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">متوسط الدرجات</p>
          <p className="mt-2 text-2xl font-black text-teal-700">{average.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">عدد الدرجات</p>
          <p className="mt-2 text-xl font-bold">{certificate.grade_count}</p>
        </div>
      </div>

      <div className="mt-14 flex items-end justify-between text-sm text-slate-600">
        <div>
          <p>رقم الشهادة: {certificate.certificate_number || "-"}</p>
          <p>تاريخ الإصدار: {formatDate(certificate.issued_at || new Date())}</p>
        </div>
        <div className="text-center">
          <div className="h-16 w-52 border-b border-slate-400" />
          <p className="mt-2">توقيع الإدارة</p>
        </div>
      </div>
    </div>
  );
}
