import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteService } from '../cliente.service';
import { ICliente } from '../mis-datos/models/index.model';
import Swal from 'sweetalert2';

// Pantalla ADMIN de ver/editar cliente completo -- reutiliza el mismo patrón de formulario que
// "Mis datos" (mismas clases .md-*, mismo manejo de direcciones), pero:
// - carga por :id de la RUTA (el cliente que el admin eligió en clientes/buscar), no por el
//   usuario logueado.
// - usa obtenerDetalleAdmin() en vez de getDataOneCliente(), porque Cliente.usuario no viaja en
//   el JSON normal (@JsonBackReference) y sin el usuarioId no se puede guardar después
//   (ClienteControllerImpl.save() lo necesita para saber a qué usuario pertenece el cliente).
@Component({
  selector: 'app-clientes-mostrar',
  templateUrl: './clientes-mostrar.component.html',
  styleUrls: ['./clientes-mostrar.component.scss']
})
export class ClientesMostrarComponent implements OnInit {

  formDatosCliente: FormGroup;
  datosCliente: ICliente | null = null;

  clienteId = 0;
  usuarioId = 0;
  username = '';
  correoVerificado: boolean | undefined = undefined;
  cargando = true;
  guardando = false;
  recibirCorreos = true;
  guardandoPreferenciaCorreo = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly clienteService: ClienteService
  ) {
    this.formDatosCliente = this.fb.group({
      nombrePersona:     ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)]],
      segundoNombre:     ['', [Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]*$/)]],
      apeidoPaterno:     ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)]],
      apeidoMaterno:     ['', [Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]*$/)]],
      fechaNacimiento:   [null],
      sexo:              [''],
      correoElectronico: ['', [Validators.required, Validators.email]],
      numeroTelefonico:  ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      listDirecciones:   this.fb.array([])
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.clienteId = idParam ? Number(idParam) : 0;
    if (!this.clienteId) {
      this.cargando = false;
      Swal.fire({ icon: 'error', title: 'Cliente inválido' }).then(() => this.volver());
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    this.clienteService.obtenerDetalleAdmin(this.clienteId).subscribe({
      next: (res) => {
        this.cargando = false;
        const detalle = res?.data;
        if (!detalle || !detalle.cliente) {
          Swal.fire({ icon: 'error', title: 'No se encontró el cliente' }).then(() => this.volver());
          return;
        }
        this.datosCliente     = detalle.cliente;
        this.usuarioId         = detalle.usuarioId;
        this.username           = detalle.username;
        this.correoVerificado = detalle.cliente.correoVerificado;
        this.recibirCorreos = detalle.cliente.recibirCorreos ?? true;

        this.formDatosCliente.patchValue({
          nombrePersona:     detalle.cliente.nombrePersona,
          segundoNombre:     detalle.cliente.segundoNombre,
          apeidoPaterno:     detalle.cliente.apeidoPaterno,
          apeidoMaterno:     detalle.cliente.apeidoMaterno,
          fechaNacimiento:   detalle.cliente.fechaNacimiento ? new Date(detalle.cliente.fechaNacimiento) : null,
          sexo:              detalle.cliente.sexo,
          correoElectronico: detalle.cliente.correoElectronico,
          numeroTelefonico:  detalle.cliente.numeroTelefonico,
        });

        const direcciones = (detalle.cliente as any).listDirecciones as any[] | undefined;
        if (direcciones && direcciones.length > 0) {
          direcciones.forEach((dir, index) => {
            const direccionForm = this.crearDireccion(dir.predefinida);
            direccionForm.patchValue(dir);
            this.listDirecciones.push(direccionForm);
            this.suscribirCambioPredefinida(direccionForm, index);
          });
        } else {
          const nueva = this.crearDireccion(true);
          this.listDirecciones.push(nueva);
          this.suscribirCambioPredefinida(nueva, 0);
        }
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo cargar el cliente', text: err?.error?.mensaje ?? err?.error?.message })
          .then(() => this.volver());
      }
    });
  }

  guardarCliente(): void {
    if (this.formDatosCliente.invalid || !this.usuarioId) return;
    this.guardando = true;

    const payload: ICliente = {
      ...(this.datosCliente as ICliente),
      ...this.formDatosCliente.value,
      id: this.clienteId,
      usuario: { id: this.usuarioId } as any,
      listDirecciones: this.listDirecciones.value
    };

    this.clienteService.updateData(this.clienteId, payload).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1400, showConfirmButton: false });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: err?.error?.mensaje ?? err?.error?.message ?? 'Intenta de nuevo.' });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/clientes/buscar']);
  }

  // ── Preferencia de correos (admin, por cliente) ───────────────────────
  toggleRecibirCorreos(): void {
    if (!this.clienteId || this.guardandoPreferenciaCorreo) return;
    const nuevoValor = !this.recibirCorreos;
    this.guardandoPreferenciaCorreo = true;
    this.clienteService.actualizarPreferenciaCorreo(this.clienteId, nuevoValor).subscribe({
      next: () => {
        this.recibirCorreos = nuevoValor;
        this.guardandoPreferenciaCorreo = false;
      },
      error: () => {
        this.guardandoPreferenciaCorreo = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la preferencia de correos.' });
      }
    });
  }

  // ── Verificación de correo (admin) ────────────────────────────────────
  verificarCorreo(): void {
    if (!this.clienteId) return;
    this.clienteService.enviarCodigoVerificacion(this.clienteId).subscribe({
      next:  () => this.mostrarSwalVerificacion(),
      error: () => this.mostrarSwalVerificacion()
    });
  }

  private mostrarSwalVerificacion(): void {
    const correo = this.formDatosCliente.get('correoElectronico')?.value ?? '';
    Swal.fire({
      title: 'Verificar correo',
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${correo}</strong>.<br>
          Pídele al cliente el código de 6 dígitos, o pregúntale directamente.
        </p>
        <input id="swal-codigo-cliente-admin" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-cliente-admin') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(this.clienteId, codigo).toPromise();
          return true;
        } catch (err: any) {
          const raw = err?.error;
          const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) return;
      this.correoVerificado = true;
      Swal.fire({ icon: 'success', title: '¡Correo verificado!', timer: 2000, showConfirmButton: false });
    });
  }

  // ── Direcciones (mismo patrón que mis-datos.component.ts) ────────────
  get listDirecciones(): FormArray {
    return this.formDatosCliente.get('listDirecciones') as FormArray;
  }

  crearDireccion(predefinida = false): FormGroup {
    return this.fb.group({
      calle:         ['', Validators.required],
      colonia:       ['', Validators.required],
      codigoPostal:  ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      municipio:     ['', Validators.required],
      referencias:   [''],
      predefinida:   [predefinida]
    });
  }

  agregarDireccion(): void {
    const yaHayActiva = this.listDirecciones.controls.some(c => c.get('predefinida')?.value);
    const nueva = this.crearDireccion(!yaHayActiva);
    this.listDirecciones.push(nueva);
    this.suscribirCambioPredefinida(nueva, this.listDirecciones.length - 1);
  }

  eliminarDireccion(index: number): void {
    this.listDirecciones.removeAt(index);
    const activas = this.listDirecciones.controls.filter(c => c.get('predefinida')?.value);
    if (activas.length === 0 && this.listDirecciones.length > 0) {
      this.listDirecciones.at(0).get('predefinida')?.setValue(true, { emitEvent: false });
    }
  }

  suscribirCambioPredefinida(direccion: FormGroup, index: number): void {
    direccion.get('predefinida')?.valueChanges.subscribe(valor => {
      const direcciones = this.listDirecciones;
      if (valor) {
        direcciones.controls.forEach((c, i) => {
          if (i !== index) c.get('predefinida')?.setValue(false, { emitEvent: false });
        });
      } else {
        const activas = direcciones.controls.filter(c => c.get('predefinida')?.value);
        if (activas.length === 0) direccion.get('predefinida')?.setValue(true, { emitEvent: false });
      }
    });
  }

  getCodigoPostal(event: any, iteracion: number): void {
    const codigo = event.target.value;
    this.clienteService.getCodigoPostal(codigo).subscribe(res => {
      const direccion = this.listDirecciones.at(iteracion) as FormGroup;
      direccion.patchValue({ municipio: res.codigo_postal.municipio });
    });
  }
}
