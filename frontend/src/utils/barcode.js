// frontend/src/utils/barcode.js
import JsBarcode from "jsbarcode";

// Code128 como SVG en string (se incrusta en el ticket estático).
export function barcodeSvg(text) {
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, text, {
      format: "CODE128",
      displayValue: false,
      height: 40,
      margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return "";
  }
}
