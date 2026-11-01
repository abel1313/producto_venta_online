import { aRgb } from '../services/tema/tema.model';

/**
 * Chart.js pinta en un canvas y no entiende `var(--x)`: se lee el valor del token del diseño al dibujar, así las gráficas
 * cambian con Personalización y con día/noche (se vuelven a dibujar al cargar la pantalla).
 * `alfa` 1 = color sólido; menor = con transparencia.
 */
export function temaColor(token: string, alfa = 1): string {
  const valor = getComputedStyle(document.body).getPropertyValue(token).trim();
  const rgb = aRgb(valor);
  if (!rgb) return valor;
  return alfa === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${alfa})`;
}
