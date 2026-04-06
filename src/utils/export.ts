function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const SVG_EXPORT_CUSTOM_PROPERTIES = [
  "--diagram-canvas-fill",
  "--diagram-node-fill",
  "--diagram-stroke",
  "--diagram-focus",
  "--diagram-pending",
  "--diagram-drag",
  "--diagram-warning",
  "--diagram-warning-fill",
  "--diagram-error",
  "--diagram-error-fill",
  "--diagram-selection-fill",
] as const;

function applyResolvedCustomProperties(source: SVGSVGElement, target: SVGSVGElement) {
  const sourceStyles = window.getComputedStyle(source);
  const rootStyles = window.getComputedStyle(document.documentElement);

  SVG_EXPORT_CUSTOM_PROPERTIES.forEach((propertyName) => {
    const value = sourceStyles.getPropertyValue(propertyName).trim() || rootStyles.getPropertyValue(propertyName).trim();
    if (value) {
      target.style.setProperty(propertyName, value);
    }
  });
}

export function serializeSvg(svgElement: SVGSVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const { width, height } = svgElement.getBoundingClientRect();

  applyResolvedCustomProperties(svgElement, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", Math.max(width, 1280).toString());
  clone.setAttribute("height", Math.max(height, 720).toString());

  return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
}

export function downloadSvg(svgElement: SVGSVGElement, fileName: string) {
  const svgMarkup = serializeSvg(svgElement);
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, fileName);
}

export async function downloadPng(svgElement: SVGSVGElement, fileName: string) {
  const svgMarkup = serializeSvg(svgElement);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";

    const { width, height } = svgElement.getBoundingClientRect();
    const exportWidth = Math.max(Math.round(width), 1280);
    const exportHeight = Math.max(Math.round(height), 720);

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Impossibile rasterizzare il canvas SVG."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = exportWidth * 2;
    canvas.height = exportHeight * 2;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D non disponibile.");
    }

    context.scale(2, 2);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, exportWidth, exportHeight);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Impossibile generare il PNG."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    downloadBlob(pngBlob, fileName);
  } finally {
    URL.revokeObjectURL(url);
  }
}
