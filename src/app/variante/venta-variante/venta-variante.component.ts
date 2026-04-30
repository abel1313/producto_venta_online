import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';
import Swal from 'sweetalert2';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IPedidoVarianteDTO } from '../models/pedido-variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { VarianteService } from '../service/variante.service';
import { UsuarioService } from 'src/app/shared/usuario.service';

@Component({
  selector: 'app-venta-variante',
  templateUrl: './venta-variante.component.html',
  styleUrls: ['./venta-variante.component.scss']
})
export class VentaVarianteComponent implements OnInit, OnDestroy {

  // ── Carrito ────────────────────────────────────────────────────────
  carrito: IDetalleVariante[] = [];
  totalUnidades = 0;
  totalImporte  = 0;

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
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userId$.subscribe(id => { this.idUsuario = id; });

    this.carritoService.carrito$.subscribe(items => {
      this.carrito       = items;
      this.totalUnidades = items.reduce((s, i) => s + i.cantidad, 0);
      this.totalImporte  = items.reduce((s, i) => s + i.subTotal, 0);
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

  // ── Carrito ────────────────────────────────────────────────────────

  quitarUna(item: IDetalleVariante): void {
    this.carritoService.eliminar(item.varianteId);
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
    const pedido: IPedidoVarianteDTO = {
      cliente:       { id: clienteId },
      estadoPedido:  'Pendiente',
      fechaPedido:   new Date().toISOString().split('T')[0],
      observaciones: '',
      detalles: this.carrito.map(d => ({
        producto:       { id: d.productoId ?? 0 },
        cantidad:       d.cantidad,
        precioUnitario: d.precio,
        subTotal:       d.precio * d.cantidad,
        varianteId:     d.varianteId
      }))
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
            this.varianteService.invalidarCache(); // fuerza fetch fresco con stock actualizado
            Swal.fire({
              icon: 'success',
              title: 'Pedido registrado',
              text: `Número de pedido: ${res.data.id}`,
            }).then(() => this.router.navigate(['/variantes/buscar']));
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: res?.mensaje ?? 'No se pudo guardar el pedido.' });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el pedido.' })
      });
    });
  }

  // ── Visor de imagen ────────────────────────────────────────────────

  mostrarVisor = false;
  imagenVisor  = '';
  nombreVisor  = '';

  verImagen(item: IDetalleVariante): void {
    if (!item.imagenBase64) return;
    this.imagenVisor = item.imagenBase64.startsWith('data:')
      ? item.imagenBase64
      : `data:image/jpeg;base64,${item.imagenBase64}`;
    this.nombreVisor  = this.labelItem(item);
    this.mostrarVisor = true;
  }

  cerrarVisor(): void { this.mostrarVisor = false; }

  // ── Helper ─────────────────────────────────────────────────────────

  labelItem(item: IDetalleVariante): string {
    return [item.talla, item.color, item.marca].filter(Boolean).join(' · ') || `Variante #${item.varianteId}`;
  }

  get carritoVacio(): boolean { return this.carrito.length === 0; }
}
