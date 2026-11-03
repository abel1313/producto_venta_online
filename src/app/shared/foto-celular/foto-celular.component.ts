import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { EscanerReceptorService } from '../escaner-celular/escaner-receptor.service';

/**
 * «📱 Foto del celular»: junto a «Elegir foto» / «Tomar foto» de las pantallas que suben imágenes. Mientras la pantalla está abierta queda lista
 * para recibir las fotos que el CELULAR de la misma cuenta toma desde `/escaner-celular` («📷 Tomar foto»): llegan como un archivo (`foto`) y la
 * pantalla las trata igual que una foto elegida de la galería. Solo con sesión iniciada (las fotos viajan por el canal de la cuenta).
 */
@Component({
  selector: 'app-foto-celular',
  templateUrl: './foto-celular.component.html',
  styleUrls: ['./foto-celular.component.scss']
})
export class FotoCelularComponent implements OnInit, OnDestroy {
  /** La foto que llegó del celular, como archivo JPEG. */
  @Output() foto = new EventEmitter<File>();

  conectado = false;
  direccion = '';
  ayuda = false;
  private desregistrar: (() => void) | null = null;
  private suscripcion: Subscription | null = null;

  constructor(private readonly receptor: EscanerReceptorService, private readonly authService: AuthService) {}

  get disponible(): boolean { return this.authService.rolesValue.length > 0; }

  ngOnInit(): void {
    if (!this.disponible) return;
    this.direccion = `${window.location.origin}/escaner-celular`;
    this.suscripcion = this.receptor.conectado$.subscribe(c => { this.conectado = c; });
    this.desregistrar = this.receptor.registrarFotos(dataUrl => {
      const archivo = FotoCelularComponent.aArchivo(dataUrl);
      if (!archivo) return;
      this.foto.emit(archivo);
    });
  }

  ngOnDestroy(): void {
    this.desregistrar?.();
    this.suscripcion?.unsubscribe();
  }

  alternarAyuda(): void { this.ayuda = !this.ayuda; }

  /** `data:image/jpeg;base64,…` → archivo. Si el contenido no se puede leer, se ignora. */
  static aArchivo(dataUrl: string): File | null {
    try {
      const binario = atob(dataUrl.split(',')[1] ?? '');
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
      return new File([bytes], `foto_celular_${Date.now()}.jpg`, { type: 'image/jpeg' });
    } catch { return null; }
  }
}
