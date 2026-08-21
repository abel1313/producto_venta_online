import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';
import { onImagenError } from 'src/app/shared/imagen-placeholder';
import Swal from 'sweetalert2';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IPedidoVarianteDTO } from '../models/pedido-variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { IItemPromoCarrito } from 'src/app/promociones/models/promocion.model';
import { VarianteService } from '../service/variante.service';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { LugarEntregaService } from 'src/app/lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from 'src/app/lugares-entrega/models/lugar-entrega.model';

@Component({
  selector: 'app-venta-variante',
  templateUrl: './venta-variante.component.html',
  styleUrls: ['./venta-variante.component.scss']
})
export class VentaVarianteComponent implements OnInit, OnDestroy {

  // ── Carrito ────────────────────────────────────────────────────────
  carrito: IDetalleVariante[] = [];
  promos:  IItemPromoCarrito[] = [];
  totalUnidades = 0;
  totalImporte  = 0;

  // ── Tipo de pedido (admin) ─────────────────────────────────────────
  tipoPedido: 'NORMAL' | 'APARTADO' | 'FIADO' = 'NORMAL';

  get tienePromos(): boolean { return this.promos.length > 0; }

  // ── Búsqueda de clientes (admin) ───────────────────────────────────
  isAdminUser = false;
  idUsuario   = 0;
  nombreBusqueda    = '';
  clientes: IClienteBusquedaDto[] = [];
  totalClientes     = 0;
  pageClientes      = 0;
  sizeClientes      = 10;
  cargandoClientes  = false;
  busquedaIniciada  = false;
  clienteSeleccionado: IClienteBusquedaDto | null = null;

  private inputBusqueda$ = new Subject<string>();
  private subBusqueda!: Subscription;

  constructor(
    private readonly carritoService: CarritoVarianteService,
    private readonly varianteService: VarianteService,
    private readonly authService: AuthService,
    private readonly clienteService: ClienteService,
    private readonly router: Router,
    private readonly usuarioService: UsuarioService,
    private readonly lugarEntregaService: LugarEntregaService
  ) {}

  lugares: ILugarEntrega[] = [];
  lugarEntregaId: number | null = null;

  // El png de reemplazo no existía: cada fallo encadenaba otro y no paraba. Ver imagen-placeholder.
  onImgError = onImagenError;

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userId$.subscribe(id => { this.idUsuario = id; });

    this.lugarEntregaService.getAll().subscribe({
      next: data => { this.lugares = data; },
      error: () => {}
    });

    this.carritoService.carrito$.subscribe(items => {
      this.carrito = items;
      this.recalcularTotales();
    });
    this.carritoService.promos$.subscribe(promos => {
      this.promos = promos;
      this.recalcularTotales();
    });

    this.subBusqueda = this.inputBusqueda$.pipe(
      filter(v => v.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.busquedaIniciada = true;
      this.pageClientes = 0;
      this.cargarClientes();
    });
  }

  ngOnDestroy(): void { this.subBusqueda?.unsubscribe(); }

  private recalcularTotales(): void {
    const unidadesV = this.carrito.reduce((s, i) => s + i.cantidad, 0);
    const unidadesP = this.promos.reduce((s, p) => s + p.cantidadCombos, 0);
    this.totalUnidades = unidadesV + unidadesP;
    const importeV = this.carrito.reduce((s, i) => s + i.subTotal, 0);
    const importeP = this.promos.reduce((s, p) => s + p.precioTotal * p.cantidadCombos, 0);
    this.totalImporte = importeV + importeP;
  }

  // ── Carrito ────────────────────────────────────────────────────────

  quitarUna(item: IDetalleVariante): void {
    this.carritoService.eliminar(item.varianteId);
  }

  quitarPromo(promocionId: number): void {
    this.carritoService.quitarPromo(promocionId);
  }

  limpiar(): void {
    Swal.fire({
      title: '¿Limpiar carrito de variantes?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar', confirmButtonText: 'Limpiar'
    }).then(r => { if (r.isConfirmed) this.carritoService.limpiar(); });
  }

  // ── Clientes (admin) ───────────────────────────────────────────────

  onInputBusquedaCliente(): void { this.inputBusqueda$.next(this.nombreBusqueda); }

  buscarClientes(): void {
    if (!this.nombreBusqueda.trim()) return;
    this.busquedaIniciada = true;
    this.pageClientes = 0;
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.cargandoClientes = true;
    this.clienteService.buscarClientes(this.nombreBusqueda, this.pageClientes, this.sizeClientes)
      .subscribe({
        next: res => {
          this.clientes      = res.data?.list ?? [];
          this.totalClientes = res.data?.totalElementos ?? 0;
          this.cargandoClientes = false;
        },
        error: () => { this.cargandoClientes = false; }
      });
  }

  onLazyLoadClientes(event: any): void {
    if (!this.busquedaIniciada) return;
    this.pageClientes = event.first / event.rows;
    this.sizeClientes = event.rows;
    this.cargarClientes();
  }

  seleccionarCliente(c: IClienteBusquedaDto): void { this.clienteSeleccionado = c; }
  limpiarCliente(): void { this.clienteSeleccionado = null; }

  // ── Generar pedido ─────────────────────────────────────────────────

  generarPedido(): void {
    if (!this.carrito.length) {
      Swal.fire({ icon: 'warning', title: 'Carrito vacío', text: 'Agrega variantes antes de generar el pedido.' });
      return;
    }

    if (this.clienteSeleccionado) {
      this.armarYConfirmar(this.clienteSeleccionado.id);
    } else {
      if (this.idUsuario === 0) {
        Swal.fire({
          title: 'Generar pedido',
          icon: 'info',
          html: '<p>Para poder generar un pedido es necesario registrarse.</p>',
          showCancelButton: true,
          confirmButtonText: 'Ir a registro',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33'
        }).then(result => {
          if (result.isConfirmed) this.router.navigate(['/usuarios/registrar']);
        });
        return;
      }
      this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
        next: (res: any) => {
          if (res) this.armarYConfirmar(res);
          else {
            Swal.fire({
              title: 'Generar pedido',
              icon: 'info',
              html: '<p>Para completar tu pedido necesitas registrarte como cliente.</p>',
              showCancelButton: true,
              confirmButtonText: 'Registrarme como cliente',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33'
            }).then(result => {
              if (result.isConfirmed) this.router.navigate(['/clientes/agregar']);
            });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener el cliente.' })
      });
    }
  }

  private armarYConfirmar(clienteId: number): void {
    // Si hay promos, el pedido siempre es de contado
    const tipoPedidoFinal: 'NORMAL' | 'APARTADO' | 'FIADO' =
      this.tienePromos ? 'NORMAL' : (this.isAdminUser ? this.tipoPedido : 'NORMAL');
    const esCreditoPedido = this.isAdminUser && !this.tienePromos && this.tipoPedido !== 'NORMAL';

    const detallesVariantes = this.carrito.map(d => ({
      producto:       { id: d.productoId ?? 0 },
      cantidad:       d.cantidad,
      precioUnitario: d.precio,
      subTotal:       d.precio * d.cantidad,
      varianteId:     d.varianteId
    }));

    const detallesPromos = this.promos.flatMap(p =>
      p.detalles.map(d => ({
        producto:       { id: 0 },
        cantidad:       d.cantidad * p.cantidadCombos,
        precioUnitario: d.precioEnPromocion,
        subTotal:       d.precioEnPromocion * d.cantidad * p.cantidadCombos,
        varianteId:     d.varianteId,
        promocionId:    p.promocionId
      }))
    );

    const pedido: IPedidoVarianteDTO = {
      cliente:       { id: clienteId },
      tipoPedido:    tipoPedidoFinal,
      estadoPedido:  esCreditoPedido ? this.tipoPedido : 'Pendiente',
      fechaPedido:   new Date().toISOString().split('T')[0],
      observaciones: '',
      lugarEntregaId: this.lugarEntregaId ?? undefined,
      detalles:      [...detallesVariantes, ...detallesPromos]
    };

    const total = this.totalImporte.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    Swal.fire({
      title: 'Confirmar pedido de variantes',
      icon: 'question',
      html: `
        <p>${this.carrito.length} variante(s) — ${this.totalUnidades} unidad(es)</p>
        <p class="fw-bold fs-5">Total: ${total}</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText:  'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor:  '#d33'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.varianteService.guardarPedidoVariante(pedido).subscribe({
        next: (res: any) => {
          if (res?.data != null) {
            this.carritoService.limpiar();
            this.varianteService.invalidarCache();
            if (esCreditoPedido) {
              const label = this.tipoPedido === 'APARTADO' ? 'Apartado' : 'Ir pagando';
              Swal.fire({
                icon: 'success',
                title: 'Pedido registrado',
                html: `
                  <p>Pedido #${res.data.id} registrado como <strong>${label}</strong>.</p>
                  <p>Puedes agregar los abonos desde <strong>Créditos / Abonos</strong>.</p>
                `,
                confirmButtonText: '💳 Ir a Créditos / Abonos',
                showCancelButton: true,
                cancelButtonText: 'Cerrar',
                confirmButtonColor: '#6366f1'
              }).then(r => {
                if (r.isConfirmed) this.router.navigate(['/abonos']);
                else this.router.navigate(['/tienda/buscar']);
              });
            } else {
              Swal.fire({
                icon: 'success',
                title: 'Pedido registrado',
                text: `Número de pedido: ${res.data.id}`,
              }).then(() => this.router.navigate(['/tienda/buscar']));
            }
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: res?.mensaje ?? 'No se pudo guardar el pedido.' });
          }
        },
        error: (err) => {
          const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
          if (msg.toLowerCase().includes('verificar')) {
            this.flujoVerificacion(clienteId);
          } else if (msg.toLowerCase().includes('completar tus datos')) {
            Swal.fire({
              icon: 'info',
              title: 'Completa tu perfil',
              text: 'Necesitamos tu nombre, apellido paterno y teléfono antes de generar un pedido.',
              confirmButtonText: 'Completar datos',
              showCancelButton: true,
              cancelButtonText: 'Cancelar'
            }).then(result => {
              if (result.isConfirmed) this.router.navigate(['/mis-datos']);
            });
          } else if (msg.toLowerCase().includes('no es valido') || msg.toLowerCase().includes('no es válido')) {
            Swal.fire({
              icon: 'warning',
              title: 'Precio desactualizado',
              html: `<p>${msg}</p><p>El precio de uno o más productos cambió mientras tenías el carrito abierto. <strong>Actualiza el catálogo y vuelve a intentarlo.</strong></p>`,
              confirmButtonText: '🔄 Ir al catálogo',
              showCancelButton: true,
              cancelButtonText: 'Cerrar'
            }).then(r => { if (r.isConfirmed) this.router.navigate(['/tienda/buscar']); });
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: msg || 'No se pudo guardar el pedido.' });
          }
        }
      });
    });
  }

  private flujoVerificacion(clienteId: number): void {
    // Primero enviamos el código
    this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
      next: () => this.mostrarSwalCodigo(clienteId),
      error: () => this.mostrarSwalCodigo(clienteId) // mostrar igual aunque falle el envío
    });
  }

  private mostrarSwalCodigo(clienteId: number): void {
    Swal.fire({
      icon: 'info',
      title: 'Verifica tu correo',
      html: `
        <p style="margin-bottom:12px">Tu correo no está verificado.<br>
        Ingresa el código de <strong>6 dígitos</strong> que enviamos a tu correo electrónico.</p>
        <input id="swal-codigo" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:160px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;outline:none">
        <div id="swal-resend" style="margin-top:12px;font-size:0.85rem;color:#64748b">
          ¿No llegó?
          <span id="swal-resend-btn" style="color:var(--brand-1);cursor:pointer;text-decoration:underline">
            Reenviar código
          </span>
        </div>
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-1)',
      didOpen: () => {
        const btn = document.getElementById('swal-resend-btn');
        if (btn) {
          btn.addEventListener('click', () => {
            btn.textContent = 'Enviando…';
            (btn as HTMLElement).style.pointerEvents = 'none';
            this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
              next: () => { btn.textContent = '¡Enviado!'; },
              error: () => { btn.textContent = 'Reintentar'; (btn as HTMLElement).style.pointerEvents = 'auto'; }
            });
          });
        }
      },
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(clienteId, codigo).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) {
        // Cerrar en silencio dejaba al cliente sin saber si su pedido se generó o no. NO se
        // generó: el back rechaza el guardado mientras el correo no esté verificado, así que no
        // quedó nada. Su carrito sí sigue en pantalla y puede reintentar.
        Swal.fire({
          icon: 'info',
          title: 'Tu pedido no se generó',
          html: `<p>Necesitamos verificar tu correo antes de tomarlo, así que
                 <b>no guardamos nada</b>.</p>
                 <p>Tu carrito sigue aquí — vuelve a pulsar el botón y te mandamos el código
                 otra vez.</p>`,
          confirmButtonText: 'Entendido'
        });
        return;
      }
      Swal.fire({
        icon: 'success',
        title: '¡Correo verificado!',
        text: 'Ahora generaremos tu pedido.',
        timer: 1800,
        showConfirmButton: false
      }).then(() => this.armarYConfirmar(clienteId));
    });
  }

  // ── Ir a Venta Directa (admin) ────────────────────────────────────

  irAVentaDirecta(): void {
    this.router.navigate(['/tienda/venta-directa']);
  }

  // ── Visor de imagen ────────────────────────────────────────────────

  mostrarVisor = false;
  imagenVisor  = '';
  nombreVisor  = '';

  verImagen(item: IDetalleVariante): void {
    if (!item.imagenUrl) return;
    this.imagenVisor  = item.imagenUrl;
    this.nombreVisor  = this.labelItem(item);
    this.mostrarVisor = true;
  }

  cerrarVisor(): void { this.mostrarVisor = false; }

  // ── Helper ─────────────────────────────────────────────────────────

  labelItem(item: IDetalleVariante): string {
    return [item.talla, item.color, item.marca].filter(Boolean).join(' · ') || `Variante #${item.varianteId}`;
  }

  get carritoVacio(): boolean { return this.carrito.length === 0 && this.promos.length === 0; }
}
