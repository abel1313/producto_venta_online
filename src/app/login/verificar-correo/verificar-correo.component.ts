import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';

@Component({
  selector: 'app-verificar-correo',
  templateUrl: './verificar-correo.component.html',
  styleUrls: ['./verificar-correo.component.scss']
})
export class VerificarCorreoComponent implements OnInit, OnDestroy {

  userName   = '';
  codigo     = '';
  verificando = false;
  enviando    = false;
  errorMsg    = '';
  cooldown    = 0;

  private cooldownTimer: any;

  constructor(
    private readonly route:   ActivatedRoute,
    private readonly router:  Router,
    private readonly acceder: AccederService
  ) {}

  ngOnInit(): void {
    this.userName = this.route.snapshot.queryParamMap.get('u') ?? '';
    if (!this.userName) {
      this.router.navigate(['/login']);
      return;
    }
    // El código ya fue enviado por quien navegó aquí (login 403 o registro),
    // pero si llegamos por URL directa volvemos a enviarlo.
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
        Swal.fire({
          icon: 'success',
          title: '¡Correo verificado!',
          text: 'Ya puedes iniciar sesión.',
          confirmButtonText: 'Ir al login'
        }).then(() => this.router.navigate(['/login']));
      },
      error: (err) => {
        this.verificando = false;
        this.errorMsg = err?.error?.mensaje ?? err?.error?.message ?? err?.error ?? 'Código inválido o expirado.';
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
        const msg: string = err?.error?.mensaje ?? err?.error?.message ?? err?.error ?? '';
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

  soloNumeros(e: KeyboardEvent): void {
    if (!/^\d$/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  }
}
