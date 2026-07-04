import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

// Renders a DOM element (the certificate) to a real, downloadable PDF file.
// Uses html2canvas-pro (not html2canvas) because the design relies on Tailwind v4
// colors that use the oklch() color function, which the original library cannot parse.
export async function downloadElementAsPdf(element, fileName = "certificate.pdf") {
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  // The certificate is wider than it is tall, so use landscape A4.
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Fit the captured image within the page while preserving aspect ratio.
  let renderWidth = pageWidth;
  let renderHeight = (canvas.height * renderWidth) / canvas.width;
  if (renderHeight > pageHeight) {
    renderHeight = pageHeight;
    renderWidth = (canvas.width * renderHeight) / canvas.height;
  }

  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;

  pdf.addImage(imgData, "PNG", offsetX, offsetY, renderWidth, renderHeight);
  pdf.save(fileName);
}
