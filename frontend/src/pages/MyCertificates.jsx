import { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { FaAward, FaDownload, FaUserGraduate } from "react-icons/fa";
import CertificatePreviewModal from "../components/CertificatePreviewModal";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-SA");
};

export default function MyCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewCertificate, setPreviewCertificate] = useState(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    axios
      .get("/api/certificates/my")
      .then((response) => {
        if (!mounted) return;
        setCertificates(response.data.certificates || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.error || "فشل تحميل الشهادات");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8 font-[var(--font-family-arabic)]">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <FaAward className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">شهاداتي</h1>
              <p className="mt-1 text-sm text-slate-500">
                الشهادات الممنوحة عند اجتياز الفصول الدراسية. يمكنك تحميلها أو طباعتها كملف PDF.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">جاري التحميل...</div>
        ) : certificates.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">
            لا توجد شهادات متاحة حتى الآن.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {certificates.map((certificate) => (
              <div key={certificate.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900">{certificate.student_name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{certificate.semester_name}</p>
                    {certificate.class_name && (
                      <p className="mt-1 text-sm text-slate-500">حلقة: {certificate.class_name}</p>
                    )}
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <FaUserGraduate />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">متوسط الدرجات</p>
                    <p className="font-black text-teal-700">{Number(certificate.average_grade || 0).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">تاريخ الإصدار</p>
                    <p className="font-bold">{formatDate(certificate.issued_at)}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">رقم الشهادة: {certificate.certificate_number}</p>

                <button
                  type="button"
                  onClick={() => setPreviewCertificate(certificate)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 font-bold text-white hover:bg-teal-700"
                >
                  <FaDownload /> عرض وتحميل الشهادة
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CertificatePreviewModal
        certificate={previewCertificate}
        onClose={() => setPreviewCertificate(null)}
      />
    </div>
  );
}
