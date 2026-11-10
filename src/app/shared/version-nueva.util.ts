/**
 * ¿Hay una versión nueva del front publicada? Compara el archivo principal (`main.<hash>.js`) del `index.html` actual con el que esta pestaña cargó.
 * Sin red, sin hash en el nombre (desarrollo) o con cualquier duda devuelve false: nunca recarga por error.
 */
export async function hayVersionNueva(): Promise<boolean> {
  try {
    const cargado = Array.from(document.scripts).map(s => s.getAttribute('src') || '').find(s => /(^|\/)main\.[0-9a-f]{8,}\.js/i.test(s));
    if (!cargado) return false;
    const resp = await fetch('/index.html', { cache: 'no-store' });
    if (!resp.ok) return false;
    const html = await resp.text();
    const nuevo = html.match(/main\.[0-9a-f]{8,}\.js/i)?.[0];
    return !!nuevo && !cargado.includes(nuevo);
  } catch {
    return false;
  }
}
