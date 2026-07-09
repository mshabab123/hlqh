import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

// Renders a DOM element (the certificate) to a real, downloadable PDF file.
// Uses html2canvas-pro (not html2canvas) because the design relies on Tailwind v4
// colors that use the oklch() color function, which the original library cannot parse.

// Fixed capture size (1.6:1 like the on-screen design). Pinning the clone to
// explicit dimensions makes the PDF identical to the screen regardless of the
// current window size or aspect-ratio CSS support in html2canvas.
const CAPTURE_WIDTH = 1152;
const CAPTURE_HEIGHT = 720;

const resolvePrintArea = (element) =>
  element?.classList?.contains("certificate-print-area")
    ? element
    : element?.querySelector?.(".certificate-print-area") || element;

export async function downloadElementAsPdf(element, fileName = "certificate.pdf") {
  if (!element) return;
  const target = resolvePrintArea(element);

  // Make sure the Arabic web fonts are fully loaded before rasterizing,
  // otherwise the PDF falls back to a different font than the screen.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: CAPTURE_WIDTH,
    height: CAPTURE_HEIGHT,
    windowWidth: CAPTURE_WIDTH + 80,
    onclone: (doc) => {
      const area = doc.querySelector(".certificate-print-area");
      if (area) {
        area.style.width = `${CAPTURE_WIDTH}px`;
        area.style.maxWidth = `${CAPTURE_WIDTH}px`;
        area.style.height = `${CAPTURE_HEIGHT}px`;
        area.style.aspectRatio = "auto";
        area.style.margin = "0";
        area.style.borderRadius = "0";
        area.style.boxShadow = "none";
      }
    },
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

// Prints the certificate ALONE in a hidden iframe: exactly one landscape page,
// completely isolated from the page behind it (which is what used to cause the
// portrait orientation and the many repeated/blank pages).
export function printElementIsolated(element) {
  if (!element) return;
  const target = resolvePrintArea(element);

  // Copy only the stylesheets (not scripts) so Tailwind and fonts apply.
  const styleTags = [...document.head.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((node) => node.outerHTML)
    .join("\n");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
${styleTags}
<style>
  @page { size: A4 landscape; margin: 0; }
  /* المتصفح يحذف ألوان وخلفيات العناصر عند الطباعة افتراضياً — نجبره على إبقائها */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  .certificate-print-area {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    aspect-ratio: auto !important;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
</style>
</head>
<body>${target.outerHTML}</body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;
  const whenImagesReady = Promise.all(
    [...doc.images].map((img) =>
      img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; })
    )
  );
  const whenFontsReady = doc.fonts?.ready?.catch?.(() => {}) || Promise.resolve();

  Promise.all([whenImagesReady, whenFontsReady]).then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      // Give the print dialog time to grab the document before cleanup.
      setTimeout(() => iframe.remove(), 2000);
    }, 150);
  });
}
