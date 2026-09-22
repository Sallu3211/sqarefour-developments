// Tailwind v4's default palette uses oklch()/lab() colors, which the
// original html2canvas can't parse (renders blank). html2canvas-pro is a
// maintained fork that adds support for modern CSS color functions.
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

async function captureCanvas(el: HTMLElement) {
  return html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
}

export async function exportElementAsImage(el: HTMLElement, filename: string) {
  const canvas = await captureCanvas(el);
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
  return url;
}

export async function exportElementAsPdf(el: HTMLElement, filename: string) {
  const canvas = await captureCanvas(el);
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "l" : "p",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
  return imgData;
}

/**
 * Capture the element to a PNG blob ahead of time (call this as soon as the
 * bill is ready, NOT inside the Share button's click handler). Web Share API
 * requires navigator.share() to run within the click's "user activation"
 * window — the multi-hundred-ms html2canvas capture alone is often enough to
 * lose that on mobile browsers, silently downgrading every share attempt to
 * the desktop fallback. Pre-capturing means the click handler only does
 * near-instant work before calling navigator.share().
 */
export async function captureElementToBlob(el: HTMLElement): Promise<Blob | null> {
  const canvas = await captureCanvas(el);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function shareImageBlob(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], `${filename}.png`, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch {
      return false;
    }
  }

  // Fallback for browsers without file-sharing support: download the image
  // and open WhatsApp Web so the user can attach it manually.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
  URL.revokeObjectURL(url);
  window.open(`https://wa.me/?text=${encodeURIComponent(title + " — bill image downloaded, attach it here.")}`, "_blank");
  return false;
}
