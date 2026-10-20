import { Component, ElementRef, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';

type TipoQr = 'tienda' | 'articulo' | 'red' | 'libre';
type Red = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp';

/**
 * Generador de códigos QR (2026-10-14). Se elige el tipo, la pantalla pide solo lo que ese tipo
 * necesita, y el QR se genera en el navegador (no llama al back). Se puede copiar el enlace, copiar
 * o descargar la imagen y, en celular, compartirla. Pública a propósito: no maneja datos.
 */
@Component({
  selector: 'app-qr-ventas-jade',
  templateUrl: './qr-ventas-jade.component.html',
  styleUrls: ['./qr-ventas-jade.component.scss']
})
export class QrVentasJadeComponent {
  @ViewChild('qrBox') qrBox?: ElementRef<HTMLElement>;

  readonly tipos: Array<{ id: TipoQr; etiqueta: string; ayuda: string }> = [
    { id: 'tienda',   etiqueta: '🛍️ Tienda',              ayuda: 'Lleva a la tienda en línea.' },
    { id: 'articulo', etiqueta: '👜 Artículo',           ayuda: 'Lleva al detalle de un artículo de la tienda.' },
    { id: 'red',      etiqueta: '📱 Red social',           ayuda: 'Lleva a tu perfil o a tu WhatsApp.' },
    { id: 'libre',    etiqueta: '🔗 Enlace libre',         ayuda: 'Cualquier enlace que escribas.' }
  ];
  readonly redes: Array<{ id: Red; etiqueta: string; ejemplo: string }> = [
    { id: 'facebook',  etiqueta: 'Facebook',  ejemplo: 'novedadesjade' },
    { id: 'instagram', etiqueta: 'Instagram', ejemplo: 'novedadesjade' },
    { id: 'tiktok',    etiqueta: 'TikTok',    ejemplo: 'novedadesjade' },
    { id: 'whatsapp',  etiqueta: 'WhatsApp',  ejemplo: '5512345678 (con lada)' }
  ];

  tipo: TipoQr = 'tienda';
  red: Red = 'facebook';
  articuloId = '';
  usuarioRed = '';
  enlaceLibre = '';

  private get origen(): string { return window.location.origin; }

  get ayudaActual(): string { return this.tipos.find(t => t.id === this.tipo)?.ayuda ?? ''; }

  get redActual() { return this.redes.find(r => r.id === this.red)!; }

  /** Enlace que lleva el QR; vacío si todavía faltan datos o no es válido. */
  get enlace(): string {
    switch (this.tipo) {
      case 'tienda':   return `${this.origen}/tienda/buscar`;
      case 'articulo': return /^\d+$/.test(this.articuloId.trim()) ? `${this.origen}/tienda/detalle/${this.articuloId.trim()}` : '';
      case 'red':      return this.enlaceRed();
      case 'libre':    return this.normalizarUrl(this.enlaceLibre);
    }
  }

  get aviso(): string {
    if (this.enlace) return '';
    switch (this.tipo) {
      case 'articulo': return 'Escribe el número del artículo (solo dígitos).';
      case 'red':      return 'Escribe tu usuario (o el enlace completo).';
      case 'libre':    return 'Escribe un enlace válido, por ejemplo https://…';
      default:         return '';
    }
  }

  private enlaceRed(): string {
    const dato = this.usuarioRed.trim();
    if (!dato) return '';
    if (/^https?:\/\//i.test(dato)) return this.normalizarUrl(dato);
    const usuario = dato.replace(/^@/, '').replace(/\s+/g, '');
    switch (this.red) {
      case 'facebook':  return `https://www.facebook.com/${usuario}`;
      case 'instagram': return `https://www.instagram.com/${usuario}`;
      case 'tiktok':    return `https://www.tiktok.com/@${usuario}`;
      case 'whatsapp':  return /^\d{10,15}$/.test(usuario) ? `https://wa.me/${usuario.length === 10 ? '52' + usuario : usuario}` : '';
    }
  }

  private normalizarUrl(texto: string): string {
    const t = texto.trim();
    if (!t) return '';
    const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    try { const u = new URL(conEsquema); return u.hostname.includes('.') ? u.toString() : ''; } catch { return ''; }
  }

  private canvas(): HTMLCanvasElement | null {
    return this.qrBox?.nativeElement.querySelector('canvas') ?? null;
  }

  private aBlob(): Promise<Blob | null> {
    return new Promise(resolve => {
      const c = this.canvas();
      c ? c.toBlob(b => resolve(b), 'image/png') : resolve(null);
    });
  }

  async copiarEnlace(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.enlace);
      this.avisar('Enlace copiado');
    } catch { this.avisar('No se pudo copiar. Selecciona el enlace y cópialo a mano.', true); }
  }

  async copiarImagen(): Promise<void> {
    const blob = await this.aBlob();
    const ClipboardItemCtor = (window as any).ClipboardItem;
    if (!blob || !ClipboardItemCtor || !navigator.clipboard?.write) {
      this.avisar('Tu navegador no deja copiar la imagen. Usa Descargar.', true);
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      this.avisar('Imagen copiada: pégala con Ctrl + V');
    } catch { this.avisar('No se pudo copiar la imagen. Usa Descargar.', true); }
  }

  async descargar(): Promise<void> {
    const blob = await this.aBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${this.tipo}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  get puedeCompartir(): boolean { return !!(navigator as any).share; }

  async compartir(): Promise<void> {
    const blob = await this.aBlob();
    if (!blob) return;
    const archivo = new File([blob], `qr-${this.tipo}.png`, { type: 'image/png' });
    const datos: any = { title: 'Código QR', text: this.enlace };
    if ((navigator as any).canShare?.({ files: [archivo] })) datos.files = [archivo];
    try { await (navigator as any).share(datos); } catch { /* el usuario canceló */ }
  }

  private avisar(texto: string, error = false): void {
    Swal.fire({ icon: error ? 'error' : 'success', title: texto, timer: 1800, showConfirmButton: false, toast: true, position: 'top-end' });
  }
}
