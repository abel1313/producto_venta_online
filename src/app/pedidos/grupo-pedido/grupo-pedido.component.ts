import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { GrupoPedidoService } from '../grupo-pedido.service';
import { GrupoPedidos, TipoPorPedido } from '../models/grupo-pedido.model';

/**
 * Unir pedidos para cobrarlos y recogerlos juntos, y deshacerlo (back 2026-09-23).
 *
 * Los pedidos no se fusionan: cada uno conserva sus artículos, su cliente y sus abonos. El grupo
 * muestra la suma y reparte cada abono del pedido más viejo al más nuevo. Deshacer no mueve dinero.
 */
@Component({
  selector: 'app-grupo-pedido',
  templateUrl: './grupo-pedido.component.html',
  styleUrls: ['./grupo-pedido.component.scss']
})
export class GrupoPedidoComponent implements OnChanges {
  @Input() pedidoId!: number;
  /** No entregado, no cancelado, no pagado: solo esos se pueden unir. */
  @Input() pedidoAbierto = false;
  /** Cualquier cambio de este valor vuelve a leer el grupo (el detalle se recargó). */
  @Input() refrescarCon: unknown;
  @Output() cambio = new EventEmitter<void>();
  /** Cada vez que se lee el grupo, para que el detalle muestre el total y los artículos de todos. */
  @Output() grupoCargado = new EventEmitter<GrupoPedidos | null>();

  grupo: GrupoPedidos | null = null;

  mostrarFormUnir = false;
  otrosPedidosTexto = '';
  titularId: number | null = null;
  notaUnir = '';
  uniendo = false;
  errorUnir = '';
  tiposDistintos: TipoPorPedido[] = [];

  mostrarFormAbono = false;
  abonando = false;
  abono = { monto: 0, metodoPago: 'EFECTIVO' as 'EFECTIVO' | 'TRANSFERENCIA', montoDado: 0, nota: '' };
  readonly metodos: ('EFECTIVO' | 'TRANSFERENCIA')[] = ['EFECTIVO', 'TRANSFERENCIA'];

  mostrarFormSeparar = false;
  separando = false;
  /** Una fila por pedido del grupo (sin cancelados): si sale y cuánto de lo abonado se queda. */
  filasSeparar: { pedidoId: number; cliente: string; total: number; pagado: number; sale: boolean; monto: number }[] = [];
  nuevoTitularId: number | null = null;
  motivoSeparar = '';

  cambiandoTitular = false;

  constructor(
    private readonly grupoService: GrupoPedidoService,
    private readonly authService: AuthService
  ) {}

  get puedeUnir(): boolean {
    return this.authService.tieneAccion('pedidos/mis-pedidos', 'unir-pedidos');
  }

  get puedeAbonar(): boolean {
    return this.authService.tieneAccion('pedidos/mis-pedidos', 'abonar');
  }

  get puedeVer(): boolean {
    return this.puedeUnir || this.puedeAbonar;
  }

  get esCredito(): boolean {
    const tipo = (this.grupo?.tipoPedido ?? '').toUpperCase();
    return tipo === 'APARTADO' || tipo === 'FIADO';
  }

  /** Los números que escribió, sin repetir y sin este mismo pedido. */
  get otrosIds(): number[] {
    const ids = this.otrosPedidosTexto
      .split(/[\s,;#]+/)
      .map(t => Number(t))
      .filter(n => Number.isInteger(n) && n > 0 && n !== this.pedidoId);
    return [...new Set(ids)];
  }

  get candidatosTitular(): number[] {
    return [this.pedidoId, ...this.otrosIds];
  }

  get cambioDelAbono(): number {
    if (this.abono.metodoPago !== 'EFECTIVO' || !this.abono.montoDado) return 0;
    return Math.max(0, this.abono.montoDado - this.abono.monto);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidoId'] || changes['refrescarCon']) {
      this.cargar();
    }
  }

  private cargar(): void {
    if (!this.puedeVer || !this.pedidoId) {
      this.grupo = null;
      return;
    }
    this.grupoService.porPedido(this.pedidoId).subscribe({
      next: r => { this.grupo = r?.data ?? null; this.grupoCargado.emit(this.grupo); },
      // Sin la migración el back contesta 500: se oculta la sección en vez de molestar en cada
      // detalle que se abra.
      error: () => { this.grupo = null; this.grupoCargado.emit(null); }
    });
  }

  // ── Unir ──────────────────────────────────────────────────────────────────────────

  abrirFormUnir(): void {
    this.otrosPedidosTexto = '';
    this.titularId = this.pedidoId;
    this.notaUnir = '';
    this.errorUnir = '';
    this.tiposDistintos = [];
    this.mostrarFormUnir = true;
  }

  cerrarFormUnir(): void {
    this.mostrarFormUnir = false;
  }

  /** Si el titular elegido deja de estar en la lista (lo borró), vuelve a ser este pedido. */
  otrosCambiaron(): void {
    if (this.titularId == null || !this.candidatosTitular.includes(this.titularId)) {
      this.titularId = this.pedidoId;
    }
  }

  unir(): void {
    if (this.uniendo) return;
    if (this.otrosIds.length === 0) {
      Swal.fire({ icon: 'info', title: 'Falta el otro pedido', text: 'Escribe el número de al menos otro pedido para unirlo con este.' });
      return;
    }
    this.uniendo = true;
    this.errorUnir = '';
    this.tiposDistintos = [];
    this.grupoService.unir({
      pedidoIds: this.candidatosTitular,
      pedidoTitularId: this.titularId ?? this.pedidoId,
      nota: this.notaUnir.trim() || undefined
    }).subscribe({
      next: r => {
        this.uniendo = false;
        this.mostrarFormUnir = false;
        this.grupo = r?.data ?? null;
        Swal.fire({
          icon: 'success',
          title: `Pedidos unidos en el grupo #${this.grupo?.grupoId ?? ''}`,
          text: 'Cada pedido conserva lo suyo; el saldo se cobra junto.',
          timer: 2500,
          showConfirmButton: false
        });
        this.cambio.emit();
      },
      error: err => {
        this.uniendo = false;
        // 400 de distinta forma de cobro: se queda abierto con los datos para reintentar después
        // de cambiar el tipo del que no coincide.
        if (err?.status === 400 && Array.isArray(err?.error?.data)) {
          this.tiposDistintos = err.error.data;
          this.errorUnir = err.error.mensaje ?? 'Los pedidos no tienen la misma forma de cobro.';
          return;
        }
        if (err?.status === 400) {
          this.errorUnir = err?.error?.mensaje ?? 'No se pudieron unir los pedidos.';
          return;
        }
        this.avisarError(err, 'No se pudieron unir los pedidos.');
      }
    });
  }

  // ── Abonar al grupo ───────────────────────────────────────────────────────────────

  abrirFormAbono(): void {
    this.abono = { monto: 0, metodoPago: 'EFECTIVO', montoDado: 0, nota: '' };
    this.mostrarFormAbono = true;
  }

  cerrarFormAbono(): void {
    this.mostrarFormAbono = false;
  }

  abonar(): void {
    if (this.abonando || !this.grupo) return;
    const saldo = this.grupo.saldoGrupo;
    if (!(this.abono.monto > 0)) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El abono tiene que ser mayor a cero.' });
      return;
    }
    if (this.abono.monto - saldo > 0.001) {
      Swal.fire({ icon: 'warning', title: 'Monto mayor al saldo', text: `El saldo del grupo es de $${saldo.toFixed(2)}.` });
      return;
    }
    const efectivo = this.abono.metodoPago === 'EFECTIVO';
    if (efectivo && this.abono.montoDado > 0 && this.abono.montoDado < this.abono.monto) {
      Swal.fire({ icon: 'warning', title: 'Falta efectivo', text: 'Lo que entregó el cliente es menos que el abono.' });
      return;
    }

    this.abonando = true;
    this.grupoService.abonar(this.grupo.grupoId, {
      monto: this.abono.monto,
      metodoPago: this.abono.metodoPago,
      montoDado: efectivo && this.abono.montoDado > 0 ? this.abono.montoDado : undefined,
      nota: this.abono.nota.trim() || undefined
    }).subscribe({
      next: r => {
        this.abonando = false;
        this.mostrarFormAbono = false;
        const res = r?.data;
        if (res) this.grupo = res.grupo;
        const lineas = (res?.repartos ?? [])
          .map(x => `<li>Pedido #${x.pedidoId}: $${x.monto.toFixed(2)}${x.liquida ? ' — <b>queda pagado</b>' : ''}</li>`)
          .join('');
        const cambio = res && res.cambio > 0 ? `<p>Cambio: <b>$${res.cambio.toFixed(2)}</b></p>` : '';
        Swal.fire({
          icon: 'success',
          title: 'Abono registrado',
          html: `<p>Se repartió así:</p><ul style="text-align:left">${lineas}</ul>${cambio}`
        });
        this.cambio.emit();
      },
      error: err => {
        this.abonando = false;
        this.avisarError(err, 'No se pudo registrar el abono.');
      }
    });
  }

  // ── Quién recoge ──────────────────────────────────────────────────────────────────

  get candidatosRecoger(): number[] {
    return (this.grupo?.pedidos ?? []).filter(p => !this.estaCancelado(p.estadoPedido)).map(p => p.pedidoId);
  }

  cambiarTitular(pedidoTitularId: number): void {
    if (!this.grupo || this.cambiandoTitular || pedidoTitularId === this.grupo.pedidoTitularId) return;
    this.cambiandoTitular = true;
    this.grupoService.cambiarTitular(this.grupo.grupoId, pedidoTitularId).subscribe({
      next: r => {
        this.cambiandoTitular = false;
        this.grupo = r?.data ?? this.grupo;
        Swal.fire({ icon: 'success', title: 'Listo', text: `Ahora paga y recoge el cliente del pedido #${pedidoTitularId}.`,
                    timer: 2200, showConfirmButton: false });
        this.cambio.emit();
      },
      error: err => {
        this.cambiandoTitular = false;
        this.cargar();
        this.avisarError(err, 'No se pudo cambiar quién recoge.');
      }
    });
  }

  // ── Separar ───────────────────────────────────────────────────────────────────────

  abrirFormSeparar(): void {
    if (!this.grupo) return;
    // Arranca con todos saliendo y cada uno con lo que ya tiene: así ya cuadra y solo se ajusta.
    this.filasSeparar = this.grupo.pedidos
      .filter(p => !this.estaCancelado(p.estadoPedido))
      .map(p => ({ pedidoId: p.pedidoId, cliente: p.cliente, total: p.total, pagado: p.pagado,
                   sale: true, monto: this.esCredito ? p.pagado : 0 }));
    this.nuevoTitularId = null;
    this.motivoSeparar = '';
    this.mostrarFormSeparar = true;
  }

  cerrarFormSeparar(): void {
    this.mostrarFormSeparar = false;
  }

  private redondear(n: number): number {
    return Math.round((n || 0) * 100) / 100;
  }

  /** Solo se reparte si el cliente ya dio dinero: sin abonos no hay nada que repartir y no se piden montos. */
  get hayQueRepartir(): boolean {
    return this.esCredito && this.abonadoGrupo > 0;
  }

  /** Lo que el cliente ha dado entre todos los pedidos: eso es lo que se reparte. */
  get abonadoGrupo(): number {
    return this.redondear(this.filasSeparar.reduce((s, f) => s + f.pagado, 0));
  }

  get repartido(): number {
    return this.redondear(this.filasSeparar.filter(f => f.sale).reduce((s, f) => s + (f.monto || 0), 0));
  }

  get quedan(): number[] {
    return this.filasSeparar.filter(f => !f.sale).map(f => f.pedidoId);
  }

  /** Si queda uno solo, también sale: un grupo de uno no existe. */
  get terminaGrupo(): boolean {
    return this.quedan.length < 2;
  }

  get necesitaTitular(): boolean {
    return !this.terminaGrupo && !!this.grupo && !this.quedan.includes(this.grupo.pedidoTitularId);
  }

  /** Lo que no se reparte se queda en los que siguen unidos (o en el único que queda). */
  get restoParaLosQueQuedan(): number {
    return this.redondear(this.abonadoGrupo - this.repartido);
  }

  /** null = se puede separar; si no, qué falta arreglar. */
  get problemaSeparar(): string | null {
    const salen = this.filasSeparar.filter(f => f.sale);
    if (salen.length === 0) return 'Marca al menos un pedido para separar.';
    if (this.esCredito) {
      const excedido = salen.find(f => (f.monto || 0) - f.total > 0.001);
      if (excedido) return `El pedido #${excedido.pedidoId} cuesta ${excedido.total.toFixed(2)}: no se le puede dejar más.`;
      if (salen.some(f => (f.monto || 0) < 0)) return 'Los montos no pueden ser negativos.';
      const resto = this.restoParaLosQueQuedan;
      if (resto < -0.001) return `Repartiste $${this.repartido.toFixed(2)} y el cliente solo ha dado $${this.abonadoGrupo.toFixed(2)}.`;
      if (this.quedan.length === 0 && Math.abs(resto) > 0.001) {
        return `Faltan $${resto.toFixed(2)} por repartir: tiene que sumar exacto $${this.abonadoGrupo.toFixed(2)}.`;
      }
      const capacidad = this.filasSeparar.filter(f => !f.sale).reduce((s, f) => s + f.total, 0);
      if (resto - capacidad > 0.001) return `Sobran $${(resto - capacidad).toFixed(2)}: no caben en los que siguen unidos.`;
    }
    if (this.necesitaTitular && !this.nuevoTitularId) return 'Elige quién recoge los pedidos que siguen unidos.';
    return null;
  }

  separar(): void {
    if (!this.grupo || this.separando || this.problemaSeparar) return;
    const salen = this.filasSeparar.filter(f => f.sale);
    this.separando = true;
    this.grupoService.separar(this.grupo.grupoId, {
      pedidosQueSalen: salen.map(f => f.pedidoId),
      reparto: this.esCredito ? salen.map(f => ({ pedidoId: f.pedidoId, monto: this.redondear(f.monto) })) : [],
      nuevoTitularId: this.necesitaTitular ? this.nuevoTitularId ?? undefined : undefined,
      motivo: this.motivoSeparar.trim() || undefined
    }).subscribe({
      next: r => {
        this.separando = false;
        this.mostrarFormSeparar = false;
        const res = r?.data;
        const lineas = (res?.grupo?.pedidos ?? [])
          .map(p => `<li>Pedido #${p.pedidoId}: pagado $${p.pagado.toFixed(2)}, debe $${p.saldo.toFixed(2)}`
                  + `${p.estadoPedido === 'PAGADO' ? ' — <b>queda pagado</b>' : ''}</li>`)
          .join('');
        const siguen = res?.grupoNuevoId ? `<p>Los demás siguen unidos en el grupo #${res.grupoNuevoId}.</p>` : '';
        Swal.fire({ icon: 'success', title: 'Pedidos separados',
                    html: `<ul style="text-align:left">${lineas}</ul>${siguen}` });
        this.grupo = null;
        this.cambio.emit();
      },
      error: err => {
        this.separando = false;
        this.avisarError(err, 'No se pudieron separar los pedidos.');
      }
    });
  }

  private estaCancelado(estado: string | null | undefined): boolean {
    return (estado ?? '').toLowerCase() === 'cancelado';
  }

  etiquetaTipo(tipo: string | null | undefined): string {
    switch ((tipo ?? '').toUpperCase()) {
      case 'NORMAL':   return 'Contado';
      case 'APARTADO': return 'Apartado';
      case 'FIADO':    return 'Ir pagando';
      default:         return tipo ?? '';
    }
  }

  private avisarError(err: any, porDefecto: string): void {
    if (err?.status === 403) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'Si el permiso ya se dio de alta, cierra sesión y vuelve a entrar: los permisos '
            + 'viajan dentro del token y uno viejo no los trae.'
      });
      return;
    }
    Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? porDefecto });
  }
}
