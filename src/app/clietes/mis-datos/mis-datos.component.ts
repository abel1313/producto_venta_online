import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService, ICodigoPostalInfo } from '../cliente.service';
import { limpiarNombre, MENSAJE_NOMBRE, PATRON_NOMBRE, soloDigitos, soloTelefono } from '../validaciones-cliente';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { MensajesGenericos } from './../../swife/swal.model';
import { ICliente, InitCliente } from './models/index.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mis-datos',
  templateUrl: './mis-datos.component.html',
  styleUrls: ['./mis-datos.component.scss']
})
export class MisDatosComponent implements OnInit {
  date = null;
  isEnglish = false;
  datosCliente: ICliente = InitCliente.initCliente();

  switchValue = false;
  isDisabled = true;

  idUusario: number = 0;
  clienteId: number = 0;
  correoVerificado: boolean | undefined = undefined;
  // Lo que el back tiene guardado de verdad (pendiente de verificar, o el correo ya cargado)
  // -- NO el valor que se este escribiendo ahora mismo en el input sin haber guardado. Sirve
  // para deshabilitar "Verificar mi correo" hasta que primero se guarde el formulario, y avisar
  // por que (2026-09-04: sin esto, dar clic en verificar antes de guardar tronaba con "el
  // cliente no tiene correo registrado" sin explicarle al usuario que le faltaba un paso).
  correoPendiente: string | null = null;
  correoElectronicoGuardado: string | null = null;
  recibirCorreos = true;
  guardandoPreferenciaCorreo = false;
  recibirPromociones = true;
  guardandoPreferenciaPromociones = false;

  constructor(private readonly fb: FormBuilder,
    private readonly clienteServoce: ClienteService,
    private readonly authService: AuthService,
    private readonly usuarioService: UsuarioService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    // Valores por default vacios a proposito (2026-09-03): antes tenian datos de prueba quemados
    // ("abel"/"tibu"/"abel@gmail.com"/telefono) que se quedaban visibles en pantalla cuando la
    // carga real fallaba (cargarCliente() no limpia el form en su rama error) -- parecia que
    // habian cargado datos de una cuenta ajena, cuando en realidad eran restos de prueba.
    this.formDatosCliente = this.fb.group({
      // Con espacios (QA 2026-10-14): antes el patrón era solo letras pegadas y "María José" o
      // "De la Cruz" salían en rojo con "Campo requerido" aunque estuvieran llenos.
      nombrePersona: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE)]],
      segundoNombre: ['', [Validators.pattern(PATRON_NOMBRE)]],
      apeidoPaterno: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE)]],
      apeidoMaterno: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE)]],
      fechaNacimiento: [null, [Validators.required]],
      sexo: [''],
      correoElectronico: ['', [Validators.required, Validators.email]],
      // required: el back no deja comprar sin teléfono (Cliente.datosCompletos). La etiqueta ya
      // tenía el *, pero sin el validador se podía guardar vacío y el carrito volvía a pedirlo.
      numeroTelefonico: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      listDirecciones: this.fb.array([])

    });
  }
  formDatosCliente: FormGroup;

  readonly mensajeNombre = MENSAJE_NOMBRE;

  /** Por dirección: buscando el código postal, el aviso si no se encontró y las colonias sugeridas. */
  cpBuscando: Record<number, boolean> = {};
  cpMensaje: Record<number, string> = {};
  cpColonias: Record<number, string[]> = {};
  private cpBuscado: Record<number, string> = {};

  /** Nombre de cada campo tal como se ve en pantalla, para decir cuál falta al guardar. */
  private static readonly ETIQUETAS: Record<string, string> = {
    nombrePersona: 'Nombre', segundoNombre: 'Segundo nombre', apeidoPaterno: 'Apellido paterno',
    apeidoMaterno: 'Apellido materno', fechaNacimiento: 'Fecha de nacimiento',
    correoElectronico: 'Correo electrónico', numeroTelefonico: 'Número de contacto',
    calle: 'Calle', colonia: 'Colonia', codigoPostal: 'Código postal', municipio: 'Municipio'
  };

  /**
   * A dónde regresar al guardar (el carrito manda `?volver=/tienda/carrito` cuando faltan datos
   * para hacer el pedido). Solo rutas de la propia app: algo como `//otro-sitio.com` o
   * `https://...` se ignora para que el enlace no sirva para mandar a la gente a otra página.
   */
  get volver(): string | null {
    const v = this.route.snapshot.queryParamMap.get('volver');
    return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
  }

  ngOnInit(): void {
    this.authService.userId$.subscribe(idUser => {
      this.idUusario = idUser;
    });
    // ⚠️ `buscarPorIdCliente` espera el id de **cliente**, no el de usuario — confirmado por el
    // back (2026-08-16). Antes se le mandaba el `idUsuario` y respondía "No autorizado", así que
    // el formulario quedaba en blanco y (sin `error`) sin ninguna explicación.
    this.usuarioService.buscarClientePorIdUsuario(this.idUusario).subscribe({
      next: (clienteId: any) => {
        if (!clienteId) {
          Swal.fire({
            icon: 'info',
            title: 'Completa tu registro',
            text: 'Todavía no tienes datos de cliente guardados. Llénalos aquí para poder comprar.'
          });
          return;
        }
        this.cargarCliente(clienteId);
      },
      error: () => {
        Swal.fire({
          icon: 'info',
          title: 'No pudimos cargar tus datos',
          text: 'Si es la primera vez, completa tu registro de cliente para poder comprar.'
        });
      }
    });
  }

  private cargarCliente(clienteId: number): void {
    this.clienteServoce.getDataOneCliente(clienteId).subscribe({
      error: () => {
        Swal.fire({
          icon: 'info',
          title: 'No pudimos cargar tus datos',
          text: 'Si es la primera vez, completa tu registro de cliente para poder comprar.'
        });
      },
      next: (data: any) => {
      if (data && data.data) {
        this.clienteId = data.data.id ?? 0;
        this.correoVerificado = data.data.correoVerificado;
        this.correoPendiente = data.data.correoPendiente ?? null;
        this.correoElectronicoGuardado = data.data.correoElectronico ?? null;
        this.recibirCorreos = data.data.recibirCorreos ?? true;
        this.recibirPromociones = data.data.recibirPromociones ?? true;
        this.formDatosCliente.patchValue({
          nombrePersona: data.data.nombrePersona,
          segundoNombre: data.data.segundoNombre,
          apeidoPaterno: data.data.apeidoPaterno,
          apeidoMaterno: data.data.apeidoMaterno,
          fechaNacimiento: this.aFechaIso(data.data.fechaNacimiento),
          sexo: data.data.sexo,
          correoElectronico: data.data.correoElectronico,
          numeroTelefonico: data.data.numeroTelefonico,
        });

        // .clear() antes de repoblar -- este metodo tambien se llama despues de guardar (para
        // refrescar correoPendiente/correoVerificado), y sin esto cada llamada apilaba las
        // direcciones encima de las que ya estaban en el FormArray en vez de reemplazarlas
        // (2026-09-04: "guarde y aparecio otra direccion" -- la BD estaba bien, era el front).
        this.listDirecciones.clear();

        if (data.data.listDirecciones && data.data.listDirecciones.length > 0) {
          data.data.listDirecciones.forEach((dir: any, index: number) => {
            const direccionForm = this.fb.group({
              calle: [dir.calle, Validators.required],
              colonia: [dir.colonia, Validators.required],
              codigoPostal: [dir.codigoPostal, [Validators.required, Validators.pattern(/^\d{5}$/)]],
              municipio: [dir.municipio, Validators.required],
              referencias: [dir.referencias],
              predefinida: [dir.predefinida]
            });

            this.listDirecciones.push(direccionForm);
            this.suscribirCambioPredefinida(direccionForm, index);
          });

        } else {
          // Si no hay direcciones, agrega una vacía
          const nueva = this.crearDireccion(true);
          this.listDirecciones.push(nueva);
          this.suscribirCambioPredefinida(nueva, 0);
        }
      }
      }
    })

    if (this.listDirecciones.length > 0) {
      const primeraDireccion = this.listDirecciones.at(0) as FormGroup;

      const yaHayActiva = this.listDirecciones.controls.some(c => c.get('predefinida')?.value);
      if (!yaHayActiva) {
        primeraDireccion.get('predefinida')?.setValue(true, { emitEvent: false });
      }

      this.suscribirCambioPredefinida(primeraDireccion, 0);
    }


    // Suscribirse a cambios
  }


  /** Antes de validar: quita espacios de más en nombre y apellidos. */
  private limpiarNombres(): void {
    for (const campo of ['nombrePersona', 'segundoNombre', 'apeidoPaterno', 'apeidoMaterno']) {
      const ctrl = this.formDatosCliente.get(campo);
      const limpio = limpiarNombre(ctrl?.value);
      if (ctrl && ctrl.value !== limpio && !(ctrl.value == null && limpio === '')) ctrl.setValue(limpio);
    }
  }

  /** "Nombre", "Calle (dirección 2)"… de los campos que no pasan. */
  private camposConError(): string[] {
    const nombres: string[] = [];
    for (const [campo, ctrl] of Object.entries(this.formDatosCliente.controls)) {
      if (campo !== 'listDirecciones' && ctrl.invalid) nombres.push(MisDatosComponent.ETIQUETAS[campo] ?? campo);
    }
    this.listDirecciones.controls.forEach((dir, i) => {
      for (const [campo, ctrl] of Object.entries((dir as FormGroup).controls)) {
        if (ctrl.invalid) {
          const etiqueta = MisDatosComponent.ETIQUETAS[campo] ?? campo;
          nombres.push(this.listDirecciones.length > 1 ? `${etiqueta} (dirección ${i + 1})` : etiqueta);
        }
      }
    });
    return nombres;
  }

  /** Lleva la pantalla al primer campo en rojo. */
  private irAlPrimerError(): void {
    setTimeout(() => {
      const primero = document.querySelector<HTMLElement>(
        '.md-form .md-input.ng-invalid, .md-form app-selector-fecha.ng-invalid');
      primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (primero instanceof HTMLInputElement) primero.focus({ preventScroll: true });
    });
  }

  /** Teléfono: solo dígitos y máximo 10 mientras se escribe. */
  alEscribirTelefono(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const limpio = soloTelefono(input.value);
    if (input.value !== limpio) input.value = limpio;
    this.formDatosCliente.get('numeroTelefonico')?.setValue(limpio, { emitEvent: false });
  }

  get digitosTelefono(): number {
    return String(this.formDatosCliente.get('numeroTelefonico')?.value ?? '').length;
  }

  guardarCliente() {
    this.limpiarNombres();
    // El boton antes se deshabilitaba solo con [disabled]="!formDatosCliente.valid" en el html
    // -- si CUALQUIER campo del formulario era invalido (no solo el que se estaba editando), el
    // boton se veia inactivo sin explicar por que, y daba la sensacion de "no me deja guardar"
    // sin ningun error visible (2026-09-04). Ahora el boton siempre se puede presionar, y si el
    // formulario no es valido se marcan todos los campos como tocados (asi salen los .md-error
    // ya existentes) y se explica.
    if (this.formDatosCliente.invalid) {
      this.formDatosCliente.markAllAsTouched();
      // Se dice cuáles: antes solo decía "Revisa los campos marcados en rojo" y había casos sin
      // ningún campo en rojo (Referencias), así que no había forma de saber qué faltaba.
      const faltan = this.camposConError();
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos obligatorios',
        html: `<p>Revisa ${faltan.length === 1 ? 'este campo (está' : 'estos campos (están'} en rojo):</p>`
          + `<p><b>${faltan.map(f => f.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join(' · ')}</b></p>`,
        confirmButtonText: 'Entendido'
      }).then(() => this.irAlPrimerError());
      return;
    }

    this.datosCliente = this.formDatosCliente.value;
    const fechaRaw = this.formDatosCliente.get('fechaNacimiento')?.value;
    const fecha = new Date(fechaRaw);

    if (fechaRaw) {
      const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(fecha);
      this.datosCliente.fechaNacimiento = fecha;
    }
    //return;



    this.authService.userId$.subscribe(idUser => {
      const usr = {
        id: idUser,
        email: "",
        enabled: false,
        password: "",
        rol: "",
        username: ''
      }
      this.datosCliente.usuario = usr;
    });

    this.clienteServoce.saveData(this.datosCliente).subscribe(save => {

      const volver = this.volver;
      // saveData() tipa la respuesta con el modelo viejo de cliente, que no trae datosCompletos.
      const completos = (save?.data as { datosCompletos?: boolean } | undefined)?.datosCompletos;
      if (volver && completos) {
        Swal.fire({
          icon: 'success',
          title: 'Datos guardados',
          text: 'Ya puedes terminar tu pedido.',
          confirmButtonText: '🛒 Regresar al carrito'
        }).then(() => this.router.navigateByUrl(volver));
        return;
      }
      MensajesGenericos.mostrarMensajeSuccess(save.mensaje, save.code);
      // Refresca correoVerificado/correoPendiente -- si el guardado acaba de dejar un correo
      // nuevo como pendiente de verificar, "Verificar mi correo" necesita saberlo para dejar de
      // estar deshabilitado.
      if (this.clienteId) {
        this.cargarCliente(this.clienteId);
      }

    }, error => {
      MensajesGenericos.mostrarMensajeSuccess(error?.error?.mensaje ?? "Ocurrio un error, intente de nuevo", 500);
    });
  }

  /**
   * El campo de fecha (`app-selector-fecha`) trabaja con texto `yyyy-MM-dd`, igual que
   * `<input type="date">`. Antes se le pasaba un `Date` y el componente tronaba al pintarse en
   * cada ciclo: los datos se veian, pero el spinner global ya no se quitaba y la pantalla
   * quedaba bloqueada (hotfix 2026-10-06).
   */
  private aFechaIso(valor: unknown): string | null {
    if (!valor) return null;
    if (typeof valor === 'string') return valor.substring(0, 10);
    const d = new Date(valor as any);
    if (isNaN(d.getTime())) return null;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Hay algo guardado (pendiente o ya cargado) a donde mandar el codigo -- controla si "Verificar mi correo" esta habilitado. */
  get puedeVerificarCorreo(): boolean {
    return !!(this.correoPendiente || this.correoElectronicoGuardado);
  }

  /** Código postal: solo dígitos; al llegar a 5 busca el municipio solo (sin esperar a salir del campo). */
  alEscribirCodigoPostal(evento: Event, indice: number): void {
    const input = evento.target as HTMLInputElement;
    const limpio = soloDigitos(input.value, 5);
    if (input.value !== limpio) input.value = limpio;
    const ctrl = (this.listDirecciones.at(indice) as FormGroup).get('codigoPostal');
    ctrl?.setValue(limpio, { emitEvent: false });
    this.cpMensaje[indice] = '';
    if (limpio.length === 5) this.buscarCodigoPostal(limpio, indice);
  }

  getCodigoPostal(evento: any, iteracion: number) {
    const codigo = soloDigitos(evento?.target?.value, 5);
    if (codigo.length === 5) this.buscarCodigoPostal(codigo, iteracion);
  }

  /**
   * Llena el municipio con el código postal y sugiere las colonias. Si no lo encuentra o el
   * servicio no contesta, lo dice debajo del campo y deja escribir el municipio a mano
   * (QA 2026-10-14: antes no pasaba nada y no decía por qué).
   */
  private buscarCodigoPostal(codigo: string, indice: number): void {
    if (this.cpBuscado[indice] === codigo || this.cpBuscando[indice]) return;
    this.cpBuscado[indice] = codigo;
    this.cpBuscando[indice] = true;
    this.clienteServoce.buscarCodigoPostal(codigo).subscribe((info: ICodigoPostalInfo) => {
      this.cpBuscando[indice] = false;
      const direccion = this.listDirecciones.at(indice) as FormGroup;
      if (!direccion) return;
      if (!info.encontrado) {
        this.cpMensaje[indice] = info.mensaje;
        this.cpColonias[indice] = [];
        this.cpBuscado[indice] = '';   // se puede volver a intentar con el mismo código
        return;
      }
      this.cpMensaje[indice] = '';
      this.cpColonias[indice] = info.colonias;
      direccion.patchValue({ municipio: info.municipio });
      if (!direccion.get('colonia')?.value && info.colonias.length === 1) {
        direccion.patchValue({ colonia: info.colonias[0] });
      }
    });
  }

  get listDirecciones(): FormArray {
    return this.formDatosCliente?.get('listDirecciones') as FormArray;
  }

  agregarDireccion(): void {
    const yaHayActiva = this.listDirecciones.controls.some(c => {
      return c instanceof FormGroup && c.get('predefinida')?.value;
    });

    const nuevaDireccion = this.crearDireccion(!yaHayActiva); // solo si no hay activa

    this.listDirecciones.push(nuevaDireccion);
    this.suscribirCambioPredefinida(nuevaDireccion, this.listDirecciones.length - 1);
  }


  crearDireccion(predefinida: boolean = false): FormGroup {
    return this.fb.group({
      calle: ['', Validators.required],
      colonia: ['', Validators.required],
      codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      municipio: ['', Validators.required],
      // Opcional (QA 2026-10-14): era obligatorio sin asterisco ni mensaje, y con todo lleno salía
      // "Faltan datos obligatorios" sin ningún campo en rojo. El back tampoco lo pide.
      referencias: [''],
      predefinida: [predefinida]
    });
  }

  eliminarDireccion(index: number): void {
    this.listDirecciones.removeAt(index);

    const activas = this.listDirecciones.controls.filter(c => c.get('predefinida')?.value);
    if (activas.length === 0 && this.listDirecciones.length > 0) {
      this.listDirecciones.at(0).get('predefinida')?.setValue(true, { emitEvent: false });
    }
  }



  cambiarDireccion(): void {

    const direcciones = this.formDatosCliente.get('listDirecciones') as FormArray;

    direcciones.controls.forEach((control, index) => {
      const direccion = control as FormGroup;

      direccion.get('predefinida')?.valueChanges.subscribe(valor => {
        if (valor) {
          // Activar solo esta dirección, desactivar todas las demás
          direcciones.controls.forEach((c, i) => {
            if (i !== index) {
              (c as FormGroup).patchValue({ predefinida: false }, { emitEvent: false });
            }
          });
        } else {
          // Evitar desactivar la única activa
          const activas = direcciones.controls.filter(c => c.get('predefinida')?.value);
          if (activas.length === 0) {
            direccion.patchValue({ predefinida: true }, { emitEvent: false });
          }
        }
      });
    });
  }


  // chk se recibe por referencia para poder revertir el DOM a mano si falla -- [checked] es de
  // un solo sentido y el navegador ya marco visualmente el checkbox al hacer clic, asi que si
  // "recibirCorreos" nunca cambia (por el error), Angular no vuelve a aplicar el binding y el
  // checkbox se queda marcado aunque el dato real no cambio (2026-09-04).
  toggleRecibirCorreos(chk: HTMLInputElement): void {
    if (!this.clienteId || this.guardandoPreferenciaCorreo) return;
    const nuevoValor = !this.recibirCorreos;
    this.guardandoPreferenciaCorreo = true;
    this.clienteServoce.actualizarPreferenciaCorreo(this.clienteId, nuevoValor).subscribe({
      next: () => {
        this.recibirCorreos = nuevoValor;
        this.guardandoPreferenciaCorreo = false;
      },
      error: (err: any) => {
        this.guardandoPreferenciaCorreo = false;
        chk.checked = this.recibirCorreos;
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar la preferencia de correos.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  toggleRecibirPromociones(chk: HTMLInputElement): void {
    if (!this.clienteId || this.guardandoPreferenciaPromociones) return;
    const nuevoValor = !this.recibirPromociones;
    this.guardandoPreferenciaPromociones = true;
    this.clienteServoce.actualizarPreferenciaPromociones(this.clienteId, nuevoValor).subscribe({
      next: () => {
        this.recibirPromociones = nuevoValor;
        this.guardandoPreferenciaPromociones = false;
      },
      error: (err: any) => {
        this.guardandoPreferenciaPromociones = false;
        chk.checked = this.recibirPromociones;
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar la preferencia de promociones.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  verificarCorreoPropio(): void {
    if (!this.clienteId) return;
    this.clienteServoce.enviarCodigoVerificacion(this.clienteId).subscribe({
      next:  () => this.mostrarSwalVerificacion(),
      error: (err: any) => {
        const raw = err?.error;
        const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message)
          ?? 'No se pudo enviar el código de verificación.';
        Swal.fire({ icon: 'error', title: 'No se pudo enviar el código', text: msg });
      }
    });
  }

  private mostrarSwalVerificacion(): void {
    // correoPendiente primero -- si el codigo se mando por onCorreoBlur() (cambio de correo ya
    // verificado), el campo del formulario se revierte al correo viejo para no interferir con
    // "Guardar cambios" del resto del form, asi que ya no refleja a donde se mando el codigo.
    const correo = this.correoPendiente || this.formDatosCliente.get('correoElectronico')?.value || '';
    Swal.fire({
      title: 'Verificar correo',
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${correo}</strong>.<br>
          Ingresa el código de 6 dígitos que recibiste.
        </p>
        <input id="swal-codigo-propio" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-propio') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteServoce.verificarCorreo(this.clienteId, codigo).toPromise();
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
      if (this.correoPendiente) {
        this.correoElectronicoGuardado = this.correoPendiente;
        this.formDatosCliente.patchValue({ correoElectronico: this.correoPendiente });
        this.correoPendiente = null;
      }
      Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: 'Tu correo fue verificado correctamente.', timer: 2500, showConfirmButton: false });
    });
  }

  // Se dispara al salir del campo de correo -- si ya cambio respecto al que esta guardado de
  // verdad, manda el codigo directo sin depender de que se guarde el resto del formulario
  // primero (pedido 2026-09-04: "si el correo ya lo tengo verificado y quiero cambiar el correo
  // debe permitir cambiar solo el correo"). Si el campo esta vacio o con formato invalido, no
  // hace nada -- los errores de formato ya los muestra el .md-error de siempre.
  onCorreoBlur(): void {
    if (!this.clienteId) return;
    const ctrl = this.formDatosCliente.get('correoElectronico');
    const nuevoCorreo = (ctrl?.value ?? '').trim();
    if (!nuevoCorreo || ctrl?.invalid) return;
    if (nuevoCorreo.toLowerCase() === (this.correoElectronicoGuardado ?? '').toLowerCase()) return;

    this.clienteServoce.solicitarCambioCorreo(this.clienteId, nuevoCorreo).subscribe({
      next: () => {
        this.correoPendiente = nuevoCorreo;
        // Revierte el campo al correo real -- todavia no cambio nada hasta confirmar el codigo,
        // y asi "Guardar cambios" del resto del formulario no vuelve a disparar el cambio de
        // correo por su cuenta (esa rama vive en ClienteControllerImpl.save()).
        this.formDatosCliente.patchValue({ correoElectronico: this.correoElectronicoGuardado ?? '' });
        this.mostrarSwalVerificacion();
      },
      error: (err: any) => {
        const raw = err?.error;
        const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message)
          ?? 'No se pudo enviar el código de verificación.';
        this.formDatosCliente.patchValue({ correoElectronico: this.correoElectronicoGuardado ?? '' });
        Swal.fire({ icon: 'error', title: 'No se pudo cambiar el correo', text: msg });
      }
    });
  }

  suscribirCambioPredefinida(direccion: FormGroup, index: number): void {
    direccion.get('predefinida')?.valueChanges.subscribe(valor => {
      const direcciones = this.listDirecciones;

      if (valor) {
        // Desactiva todas las demás
        direcciones.controls.forEach((c, i) => {
          if (i !== index) {
            c.get('predefinida')?.setValue(false, { emitEvent: false });
          }
        });
      } else {
        // Evita que todas estén desactivadas
        const activas = direcciones.controls.filter(c => c.get('predefinida')?.value);
        if (activas.length === 0) {
          direccion.get('predefinida')?.setValue(true, { emitEvent: false });
        }
      }
    });
  }



}
