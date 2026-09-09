import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { ILugarEntrega } from '../lugares-entrega/models/lugar-entrega.model';
import { LugarEntregaService } from '../lugares-entrega/service/lugar-entrega.service';
import { EntregaZonaService } from './service/entrega-zona.service';
import { IEntregaZonaSemana } from './models/entrega-zona.model';

// "Entregas por zona" (2026-09-04): el cliente en el checkout solo elige la ZONA (Zacazonapan,
// Tejupilco, Luvianos...), nunca un punto exacto -- el dueño hace un viaje por semana a cada
// zona y decide un único punto de encuentro para todos los que pidieron ahí esa semana. Aquí se
// arma ese viaje: elegir zona, ver qué pedidos hay pendientes, poner fecha/hora/punto de
// encuentro, y avisarles a todos por correo de un jalón.
//
// Rango de fechas (2026-09-09): antes la pantalla SIEMPRE mostraba la semana en curso, calculada
// en el back, sin forma de pedir otra -- un pedido de la semana pasada que nunca se entregó
// quedaba invisible aquí y no había manera de avisarle a ese cliente desde esta pantalla. Ahora
// el rango se elige con dos calendarios y se manda tanto al listar como al programar, para que
// el correo le llegue exactamente a los pedidos que están a la vista.
@Component({
  selector: 'app-entregas-zona',
  templateUrl: './entregas-zona.component.html',
  styleUrls: ['./entregas-zona.component.scss']
})
export class EntregasZonaComponent implements OnInit {

  zonas: ILugarEntrega[] = [];
  zonaId: number | null = null;
  cargandoZonas = true;

  // Rango de FECHA DE PEDIDO (yyyy-MM-dd). Arranca en la semana en curso, que es lo que la
  // pantalla mostraba antes de que el rango fuera elegible.
  desde = '';
  hasta = '';

  semana: IEntregaZonaSemana | null = null;
  cargandoSemana = false;

  form!: FormGroup;
  enviando = false;

  constructor(
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly entregaZonaService: EntregaZonaService,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService
  ) {}

  // Permisos finos (Fase 3, 2026-09-05): recién se le dio pantalla propia a esta pantalla -- ver
  // migration_submenu_entregas_zona.sql. Ver zona/pendientes es el View general de la pantalla
  // (PantallaGuard ya lo cubre); "programar" (el botón que manda correos reales a los clientes)
  // es la única acción de escritura -- no hay nada más que separar en esta pantalla.
  get puedeProgramar(): boolean {
    return this.authService.tieneEscritura('entregas-zona');
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      puntoEncuentro: ['', Validators.required]
    });

    this.aplicarSemanaEnCurso();

    this.lugarEntregaService.getAll().subscribe({
      next: data => {
        // Solo zonas reales -- "recoger en tienda" no aplica, ese cliente ya elige su propia
        // fecha en el checkout (ver venta-variante.component.ts).
        this.zonas = data.filter(l => !l.esRecogerEnTienda);
        this.cargandoZonas = false;
      },
      error: () => { this.cargandoZonas = false; }
    });
  }

  /** Lunes a viernes de esta semana -- el rango que la pantalla usaba fijo hasta ahora. */
  aplicarSemanaEnCurso(): void {
    const hoy = new Date();
    // getDay(): 0 = domingo. La semana de trabajo arranca en lunes.
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const viernes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 4);
    this.desde = this.aIso(lunes);
    this.hasta = this.aIso(viernes);
    this.recargar();
  }

  aplicarUltimos(dias: number): void {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
    this.desde = this.aIso(inicio);
    this.hasta = this.aIso(hoy);
    this.recargar();
  }

  // ⚠️ Local a propósito: `new Date('2026-09-09')` se parsea como UTC y en México devuelve el
  // día anterior.
  private aIso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  get problemaConElRango(): string | null {
    if (!this.desde || !this.hasta) return 'Selecciona el rango de fechas de los pedidos.';
    if (this.desde > this.hasta) return 'La fecha inicial no puede ser posterior a la final.';
    return null;
  }

  onZonaChange(): void { this.recargar(); }

  /** Se dispara al cambiar la zona o cualquiera de las dos fechas -- el filtro es la combinación. */
  recargar(): void {
    this.semana = null;
    this.form.reset();
    if (this.zonaId == null || this.problemaConElRango) return;

    this.cargandoSemana = true;
    this.entregaZonaService.pendientes(this.zonaId, this.desde, this.hasta).subscribe({
      next: res => {
        this.semana = res;
        this.cargandoSemana = false;
        this.form.patchValue({ fecha: res.fechaSugerida ?? '' });
      },
      error: err => {
        this.cargandoSemana = false;
        Swal.fire({ icon: 'error', title: 'Error al cargar', text: (err?.error?.mensaje ?? err?.error?.message) ?? undefined });
      }
    });
  }

  get nombreZonaActual(): string {
    return this.zonas.find(z => z.id === this.zonaId)?.nombre ?? '';
  }

  programar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.zonaId || !this.semana || this.semana.pedidos.length === 0) return;

    const { fecha, hora, puntoEncuentro } = this.form.value;
    const n = this.semana.pedidos.length;

    Swal.fire({
      title: `¿Avisar a ${n} cliente${n === 1 ? '' : 's'}?`,
      html: `<p>Se les avisará que la entrega en <b>${this.nombreZonaActual}</b> es el ` +
            `<b>${fecha}</b> a las <b>${hora}</b>, en <b>${puntoEncuentro}</b>.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar avisos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6'
    }).then(result => {
      if (!result.isConfirmed || !this.zonaId) return;
      this.enviando = true;
      // Va el mismo rango que se listó: si no, el back recalcularía la semana en curso y el
      // correo le llegaría a un conjunto de pedidos distinto del que está en pantalla.
      this.entregaZonaService.programar(this.zonaId, {
        fecha, hora, puntoEncuentro, desde: this.desde, hasta: this.hasta
      }).subscribe({
        next: enviados => {
          this.enviando = false;
          Swal.fire({ icon: 'success', title: 'Listo', text: `Se avisó a ${enviados} cliente(s).` });
          this.recargar();
        },
        error: err => {
          this.enviando = false;
          Swal.fire({ icon: 'error', title: 'Error al programar', text: (err?.error?.mensaje ?? err?.error?.message) ?? undefined });
        }
      });
    });
  }
}
