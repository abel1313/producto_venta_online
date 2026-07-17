import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';
import { AuthenticateService as AuthStorage } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import { CarritoVarianteService } from 'src/app/variante/service/carrito-variante.service';
import { CarritoService } from 'src/app/services/carrito/carrito.service';

@Component({
  selector: 'app-verificar-correo',
  templateUrl: './verificar-correo.component.html',
  styleUrls: ['./verificar-correo.component.scss']
})
export class VerificarCorreoComponent implements OnInit, OnDestroy {

  userName    = '';
  codigo      = '';
  verificando = false;
  enviando    = false;
  errorMsg    = '';
  cooldown    = 0;

  private password       = '';
  private cooldownTimer: any;

  constructor(
    private readonly route:          ActivatedRoute,
    private readonly router:         Router,
    private readonly acceder:        AccederService,
    private readonly authStorage:    AuthStorage,
    private readonly authService:    AuthService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly carritoService:  CarritoService
  ) {}

  ngOnInit(): void {
    this.userName = this.route.snapshot.queryParamMap.get('u') ?? '';
    if (!this.userName) {
      this.router.navigate(['/login']);
      return;
    }
    // El password viene en el state (en memoria) — lo necesitamos para el auto-login
    // después de verificar. Si no viene (URL directa), el usuario va al login manual.
    this.password = history.state?.password ?? '';

    const yaEnviado = history.state?.codigoEnviado === true;
    if (!yaEnviado) {
      this.reenviarCodigo();
    } else {
      this.iniciarCooldown();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.cooldownTimer);
  }

  verificar(): void {
    if (!this.codigo || this.codigo.length !== 6 || this.verificando) return;
    this.verificando = true;
    this.errorMsg = '';
    this.acceder.verificarCorreoUsuario(this.userName, this.codigo).subscribe({
      next: () => {
        this.verificando = false;
        if (this.password) {
          // Auto-login con las mismas credenciales (spec punto 3e)
          this.acceder.login({ userName: this.userName, password: this.password } as any).subscribe({
            next: (res: any) => {
              const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
              const debeCambiar: boolean = res?.debeCambiarPassword ?? false;
              if (token) {
                this.carritoVariante.limpiar();
                this.carritoService.limpiarCarrito();
                this.authStorage.setAccessToken(token);
                this.authService.setRolesFromToken(token);
                if (debeCambiar) {
                  this.forzarCambioPassword(this.password);
                } else {
                  this.router.navigate(['/productos/buscar']);
                }
              } else {
                this.router.navigate(['/login']);
              }
            },
            error: () => this.router.navigate(['/login'])
          });
        } else {
          // Sin password en state (URL directa) — ir al login manual
          Swal.fire({
            icon: 'success',
            title: '¡Correo verificado!',
            text: 'Ya puedes iniciar sesión.',
            confirmButtonText: 'Ir al login'
          }).then(() => this.router.navigate(['/login']));
        }
      },
      error: (err) => {
        this.verificando = false;
        const raw = err?.error;
        this.errorMsg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código inválido o expirado.';
      }
    });
  }

  reenviarCodigo(): void {
    if (this.cooldown > 0 || this.enviando) return;
    this.enviando = true;
    this.errorMsg = '';
    this.acceder.enviarCodigoVerificacionUsuario(this.userName).subscribe({
      next:  () => { this.enviando = false; this.iniciarCooldown(); },
      error: (err) => {
        this.enviando = false;
        const raw = err?.error;
        const msg: string = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? '';
        if (err?.status === 429) {
          this.errorMsg = 'Demasiados intentos. Espera antes de solicitar otro código.';
          this.iniciarCooldown();
        } else {
          this.errorMsg = msg || 'No se pudo enviar el código. Intenta de nuevo.';
        }
      }
    });
  }

  private iniciarCooldown(): void {
    this.cooldown = 60;
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }

  private forzarCambioPassword(passwordActual: string): void {
    Swal.fire({
      title: '🔑 Cambia tu contraseña',
      html: `
        <p style="font-size:0.88rem;color:#64748b;margin-bottom:12px">
          Tu contraseña fue reseteada por un administrador.<br>
          Debes crear una nueva contraseña para continuar.
        </p>
        <input id="swal-pwd-nueva" type="password" class="swal2-input" placeholder="Nueva contraseña (mín. 8 caracteres)">
        <input id="swal-pwd-confirm" type="password" class="swal2-input" placeholder="Confirmar nueva contraseña">
      `,
      icon: 'warning',
      confirmButtonText: 'Cambiar y entrar',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      preConfirm: async () => {
        const nueva   = (document.getElementById('swal-pwd-nueva')   as HTMLInputElement)?.value ?? '';
        const confirm = (document.getElementById('swal-pwd-confirm') as HTMLInputElement)?.value ?? '';
        if (nueva.length < 8) {
          Swal.showValidationMessage('La contraseña debe tener al menos 8 caracteres');
          return false;
        }
        if (nueva !== confirm) {
          Swal.showValidationMessage('Las contraseñas no coinciden');
          return false;
        }
        try {
          await this.acceder.cambiarPassword(passwordActual, nueva).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Error al cambiar la contraseña.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (result.isConfirmed) this.router.navigate(['/productos/buscar']);
    });
  }

  soloNumeros(e: KeyboardEvent): void {
    if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }
}
