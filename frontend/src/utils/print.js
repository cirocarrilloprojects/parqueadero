// frontend/src/utils/print.js
// `title` debe ser una constante del código, nunca un dato del usuario (se inserta sin escapar).
export function ticketDocument(html, { widthMm = 80, title = "Ticket" } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page{size:${widthMm}mm auto;margin:3mm}
    body{width:${widthMm - 6}mm;margin:0;font:11px Arial,sans-serif;color:#000}
    hr{border:0;border-top:1px dashed #999;margin:6px 0}
    img{display:block;margin:0 auto 6px;max-width:100%;max-height:60px}
    svg{display:block;margin:6px auto 0;max-width:100%}
    .c{text-align:center}.b{font-weight:bold}.row{display:flex;justify-content:space-between;gap:8px}
  </style></head><body>${html}</body></html>`;
}

export async function printHtml(html, opts = {}) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketDocument(html, opts));
  doc.close();

  const win = iframe.contentWindow;
  const imgs = [...doc.images].filter((i) => !i.complete);

  await Promise.race([
    Promise.all(
      imgs.map(
        (i) =>
          new Promise((r) => {
            i.onload = i.onerror = r;
          }),
      ),
    ),
    new Promise((r) => setTimeout(r, 2500)),
  ]);

  const limpiar = () => {
    if (iframe.parentNode) iframe.remove();
  };
  win.onafterprint = limpiar;

  // Pausa breve para que el navegador pinte el documento antes de imprimir.
  // Sin esto, algunos navegadores ignoran print() sobre iframes ocultos.
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // El navegador puede bloquear print() si no viene de un gesto de usuario.
      // En ese caso, el usuario puede reimprimir con los botones del modal.
    }
  }, 50);

  setTimeout(limpiar, 60_000);
}
