/**
 * Escapa texto para meterlo dentro de HTML (SweetAlert2 `html:`/`title:`, tickets, correos). Todo dato que escribió una persona o viene del servidor
 * (nombre, usuario, frase, producto, motivo…) tiene que pasar por aquí, o usar `text:`/`titleText:` de SweetAlert2: un nombre como
 * `<img src=x onerror=…>` ejecutaba script en la sesión del administrador (auditoría de seguridad 2026-11-03).
 */
export function escaparHtml(texto: unknown): string {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
