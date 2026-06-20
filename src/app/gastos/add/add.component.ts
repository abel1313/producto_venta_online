import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CATEGORIA_LABELS, CATEGORIAS, IGasto } from '../models/IGastos.model';
import { GastosService } from '../service/gastos.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {

  readonly categorias      = CATEGORIAS;
  readonly categoriaLabels = CATEGORIA_LABELS;

  gastoForm!: FormGroup;
  gastoEditando: IGasto | null = null;
  guardando  = false;
  eliminando = false;

  get esEdicion(): boolean { return !!this.gastoEditando?.id; }
  get titulo():    string  { return this.esEdicion ? '✏️ Editar gasto' : '➕ Nuevo gasto'; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly gastosService: GastosService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.gastoEditando = this.gastosService['_gastoEditar'].getValue();
    this.buildForm(this.gastoEditando ?? undefined);
  }

  private hoy(): string { return new Date().toISOString().slice(0, 10); }

  private buildForm(g?: IGasto): void {
    this.gastoForm = this.fb.group({
      descripcion: [g?.descripcion ?? '',           Validators.required],
      monto:       [g?.monto       ?? '',           [Validators.required, Validators.min(0.01)]],
      fecha:       [g?.fecha       ?? this.hoy(),   Validators.required],
      categoria:   [g?.categoria   ?? 'INVENTARIO', Validators.required],
      proveedor:   [g?.proveedor   ?? ''],
      comprobante: [g?.comprobante ?? ''],
      notas:       [g?.notas       ?? '']
    });
  }

  guardar(): void {
    if (this.gastoForm.invalid || this.guardando) return;
    this.guardando = true;
    const val  = this.gastoForm.value;
    const body: Partial<IGasto> = {
      descripcion: val.descripcion,
      monto:       +val.monto,
      fecha:       val.fecha,
      categoria:   val.categoria,
      proveedor:   val.proveedor   || null,
      comprobante: val.comprobante || null,
      notas:       val.notas       || null
    };

    const op = this.esEdicion
      ? this.gastosService.updateGasto(this.gastoEditando!.id!, body)
      : this.gastosService.saveGasto(body);

    op.subscribe({
      next: () => {
        this.guardando = false;
        this.gastosService.setGastoEditar(null);
        Swal.fire({ icon: 'success', title: this.esEdicion ? 'Gasto actualizado' : 'Gasto guardado', timer: 1500, showConfirmButton: false })
          .then(() => this.router.navigate(['gastos/buscar']));
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar.' });
      }
    });
  }

  eliminar(): void {
    if (!this.gastoEditando?.id || this.eliminando) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar gasto?',
      text: `${this.gastoEditando.descripcion} — $${this.gastoEditando.monto}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.eliminando = true;
      this.gastosService.deleteGasto(this.gastoEditando!.id!).subscribe({
        next: () => {
          this.eliminando = false;
          this.gastosService.setGastoEditar(null);
          Swal.fire({ icon: 'success', title: 'Gasto eliminado', timer: 1200, showConfirmButton: false })
            .then(() => this.router.navigate(['gastos/buscar']));
        },
        error: err => {
          this.eliminando = false;
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo eliminar.' });
        }
      });
    });
  }

  cancelar(): void {
    this.gastosService.setGastoEditar(null);
    this.router.navigate(['gastos/buscar']);
  }
}
