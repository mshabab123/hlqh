import { useState } from "react";
import axios from "../utils/axiosConfig";
import { FaCertificate, FaDownload } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";
import CertificatePreviewModal from "./CertificatePreviewModal";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-SA");
};

// Self-contained "student certificates" quick action for staff (teacher /
// supervisor / administrator / admin) shown inside the student profile.
// Backend access is enforced by canAccessStudent on /api/certificates/student/:id.
export default function StudentCertificatesButton({
  studentId,
  semesterId = null,
  emptyMessage = "لا توجد شهادات ممنوحة لهذا الطالب.",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [previewCertificate, setPreviewCertificate] = useState(null);

  const openModal = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`/api/certificates/student/${studentId}`);
      const all = response.data.certificates || [];
      // When rendered inside a specific semester, show only that semester's certificate.
      const filtered = semesterId
        ? all.filter((certificate) => String(certificate.semester_id) === String(semesterId))
        : all;
      setCertificates(filtered);
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحميل شهادات الطالب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 ${className}`}
      >
        <FaCertificate />
        الشهادات
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" dir="rtl">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">شهادات الطالب</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                <AiOutlineClose />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>
            )}

            {loading ? (
              <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
            ) : certificates.length === 0 ? (
              <div className="p-8 text-center text-slate-500">{emptyMessage}</div>
            ) : (
              <div className="space-y-3">
                {certificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{certificate.semester_name}</p>
                      <p className="text-sm text-slate-500">
                        متوسط: {Number(certificate.average_grade || 0).toFixed(1)}% — أُصدرت: {formatDate(certificate.issued_at)}
                      </p>
                      <p className="text-xs text-slate-400">رقم الشهادة: {certificate.certificate_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewCertificate(certificate)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
                    >
                      <FaDownload /> عرض وتحميل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CertificatePreviewModal
        certificate={previewCertificate}
        onClose={() => setPreviewCertificate(null)}
      />
    </>
  );
}
