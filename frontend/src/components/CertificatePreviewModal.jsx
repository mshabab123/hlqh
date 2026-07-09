import { useRef, useState } from "react";
import { FaDownload, FaPrint } from "react-icons/fa";
import CertificateTemplate from "./CertificateTemplate";
import { downloadElementAsPdf, printElementIsolated } from "../utils/certificatePdf";

// Full-screen certificate preview with a real PDF download and a print action.
// Reused by the certificate management screen and the student/parent screen.
export default function CertificatePreviewModal({ certificate, onClose }) {
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!certificate) return null;

  const fileName = `شهادة-${certificate.student_name || certificate.student_id || "الطالب"}.pdf`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadElementAsPdf(contentRef.current, fileName);
    } catch (error) {
      console.error("Error generating certificate PDF:", error);
      // Fall back to the isolated print dialog if canvas rendering fails.
      printElementIsolated(contentRef.current);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => printElementIsolated(contentRef.current);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-950/70 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="certificate-preview-toolbar mb-3 flex flex-wrap justify-between gap-2 rounded-lg bg-white p-3 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 font-bold text-slate-800 hover:bg-slate-300"
          >
            إغلاق
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-800"
            >
              <FaPrint /> طباعة
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <FaDownload /> {downloading ? "جاري التحميل..." : "تحميل PDF"}
            </button>
          </div>
        </div>
        <div id="certificate-preview-content" ref={contentRef}>
          <CertificateTemplate certificate={certificate} />
        </div>
      </div>
    </div>
  );
}
