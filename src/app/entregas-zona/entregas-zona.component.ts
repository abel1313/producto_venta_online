import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ILugarEntrega } from '../lugares-entrega/models/lugar-entrega.model';
import { LugarEntregaService } from '../lugares-entrega/service/lugar-entrega.service';
import { EntregaZonaService } from './service/entrega-zona.service';
import { IEntregaZonaSemana } from './models/entrega-zona.model';

// "Entregas por zona" (2026-09-04): el cliente en el checkout solo elige la ZONA (Zacazonapan,
// Tejupilco, Luvianos...), nunca un punto exacto -- el dueño hace un viaje por semana a cada
// zona y decide un único punto de encuentro para todos los que pidieron ahí esa semana. Aquí se
// arma ese viaje: elegir zona, ver cuántos pedidos hay pendientes esta semana, poner
// fecha/hora/punto de encuentro, y avisarles a todos por correo de un jalón.
@Component({
  selector: 'app-entregas-zona',
  templateUrl: './entregas-zona.component.html',
  styleUrls: ['./entregas-zona.component.scss']
})
export class EntregasZonaComponent implements OnInit {

  zonas: ILugarEntrega[] = [];
  zonaId: number | null = null;
  cargandoZonas = true;

  semana: IEntregaZonaSemana | null = null;
  cargandoSemana = false;

  form!: FormGroup;
  enviando = false;

  constructor(
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly entregaZonaService: EntregaZonaService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      puntoEncuentro: ['', Validators.required]
    });

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

  onZonaChange(): void {
    this.semana = null;
    this.form.reset();
    if (this.zonaId == null) return;

    this.cargandoSemana = true;
    this.entregaZonaService.pendientes(this.zonaId).subscribe({
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
      this.entregaZonaService.programar(this.zonaId, { fecha, hora, puntoEncuentro }).subscribe({
        next: enviados => {
          this.enviando = false;
          Swal.fire({ icon: 'success', title: 'Listo', text: `Se avisó a ${enviados} cliente(s).` });
          this.onZonaChange();
        },
        error: err => {
          this.enviando = false;
          Swal.fire({ icon: 'error', title: 'Error al programar', text: (err?.error?.mensaje ?? err?.error?.message) ?? undefined });
        }
      });
    });
  }
}
