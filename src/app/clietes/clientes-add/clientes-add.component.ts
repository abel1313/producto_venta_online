import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from '../cliente.service';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { ICliente } from '../models';
import { Constants } from 'src/app/Constants';

@Component({
  selector: 'app-clientes-add',
  templateUrl: './clientes-add.component.html',
  styleUrls: ['./clientes-add.component.scss']
})
export class ClientesAddComponent implements OnInit, OnDestroy {

  @Input() nombreCard: string = '';
  @Output() $hideComponent = new EventEmitter<boolean>();

  formCliente: FormGroup;
  private idUsuario = 0;

  // ── Paso 2: verificación ─────────────────────────────────────────────
  pasoVerif       = false;
  correoGuardado  = '';
  clienteIdGuardado = 0;
  codigoVerif     = '';
  verificando     = false;
  enviandoCodigo  = false;
  cooldown        = 0;
  private cooldownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly fb:             FormBuilder,
    private readonly service:        ProductoService,
    private readonly clienteService: ClienteService,
    private readonly authService:    AuthService,
    private readonly router:         Router
  ) {
    if (this.nombreCard === '') this.nombreCard = 'Nuevo cliente';

    this.formCliente = this.fb.group({
      nombrePersona:     ['', [Validators.required]],
      segundoNombre:     [''],
      apeidoPaterno:     ['', Validators.required],
      apeidoMaterno:     ['', Validators.required],
      sexo:              [''],
      correoElectronico: ['', [Validators.required, Validators.email]],
      numeroTelefonico:  ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
    });
  }

  ngOnInit(): void {
    this.authService.userId$.subscribe(id => { this.idUsuario = id; });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  guardar(): void {
    if (this.formCliente.invalid) return;

    const cliente: ICliente = {
      ...this.formCliente.value,
      ...(this.idUsuario ? { usuario: { id: this.idUsuario } } : {})
    };

    this.service.saveCliente(cliente).subscribe({
      next: (res) => {
        const saved = res?.data ?? res;
        sessionStorage.setItem(Constants.DATA_CLIENTE, JSON.stringify(saved));
        this.clienteIdGuardado = saved?.id ?? 0;
        this.correoGuardado    = saved?.correoElectronico ?? this.formCliente.value.correoElectronico;
        this.formCliente.reset();
        this.iniciarVerificacion();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el cliente.' });
      }
    });
  }

  // ── Verificación ──────────────────────────────────────────────────────

  private iniciarVerificacion(): void {
    // Verificación de correo desactivada temporalmente para pruebas
    this.omitirVerificacion();
    // Para reactivar: descomentar las 3 líneas siguientes y comentar omitirVerificacion()
    // this.pasoVerif = true;
    // this.codigoVerif = '';
    // this.enviarCodigo();
  }

  enviarCodigo(): void {
    if (this.enviandoCodigo || this.cooldown > 0 || !this.clienteIdGuardado) return;
    this.enviandoCodigo = true;

    this.clienteService.enviarCodigoVerificacion(this.clienteIdGuardado).subscribe({
      next: () => {
        this.enviandoCodigo = false;
        this.startCooldown(60);
      },
      error: (err) => {
        this.enviandoCodigo = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo enviar el código.' });
      }
    });
  }

  verificar(): void {
    if (!this.codigoVerif || this.codigoVerif.length !== 6 || this.verificando) return;
    this.verificando = true;

    this.clienteService.verificarCorreo(this.clienteIdGuardado, this.codigoVerif).subscribe({
      next: () => {
        this.verificando = false;
        this.clearTimer();
        Swal.fire({
          icon: 'success',
          title: '¡Correo verificado!',
          text: 'Tu cuenta está lista para generar pedidos.',
          confirmButtonColor: '#4f46e5'
        }).then(() => {
          this.$hideComponent.emit(true);
          if (this.idUsuario) this.router.navigate(['/variantes/buscar']);
        });
      },
      error: (err) => {
        this.verificando = false;
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
        Swal.fire({ icon: 'error', title: 'Código inválido', text: msg });
      }
    });
  }

  omitirVerificacion(): void {
    this.clearTimer();
    this.$hideComponent.emit(true);
    if (this.idUsuario) this.router.navigate(['/variantes/buscar']);
  }

  private startCooldown(seconds: number): void {
    this.clearTimer();
    this.cooldown = seconds;
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) this.clearTimer();
    }, 1000);
  }

  private clearTimer(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = undefined;
    }
  }

  update(): void {}
}
