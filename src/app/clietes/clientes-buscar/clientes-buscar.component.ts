import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ClienteService } from '../cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clientes-buscar',
  templateUrl: './clientes-buscar.component.html',
  styleUrls: ['./clientes-buscar.component.scss']
})
export class ClientesBuscarComponent implements OnInit, OnDestroy {

  termino        = '';
  clientes: IClienteBusquedaDto[] = [];
  cargando       = false;
  totalElementos = 0;
  pagina         = 0;
  size           = 10;

  private input$ = new Subject<string>();
  private sub!: Subscription;

  constructor(private readonly clienteService: ClienteService) {}

  ngOnInit(): void {
    this.sub = this.input$.pipe(
      filter(v => v.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => { this.pagina = 0; this.buscar(); });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onInput(): void { this.input$.next(this.termino); }

  buscar(): void {
    if (!this.termino.trim()) return;
    this.cargando = true;
    this.clienteService.buscarClientes(this.termino, this.pagina, this.size).subscribe({
      next: res => {
        this.clientes      = res.data?.list ?? [];
        this.totalElementos = res.data?.totalElementos ?? 0;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo buscar.' });
      }
    });
  }

  resetVerificacion(c: IClienteBusquedaDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Resetear verificación?',
      html: `El correo de <strong>${c.nombrePersona} ${c.apeidoPaterno}</strong> quedará como <em>no verificado</em>. Útil para re-probar el flujo.`,
      showCancelButton: true,
      confirmButtonText: 'Resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.clienteService.resetVerificacion(c.id).subscribe({
        next: () => {
          c.correoVerificado = false;
          Swal.fire({ icon: 'success', title: 'Reseteado', text: 'El cliente deberá verificar su correo de nuevo.', timer: 2000, showConfirmButton: false });
        },
        error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo resetear.' })
      });
    });
  }

  get totalPaginas(): number { return Math.ceil(this.totalElementos / this.size); }

  paginaAnterior(): void { if (this.pagina > 0) { this.pagina--; this.buscar(); } }
  paginaSiguiente(): void { if (this.pagina < this.totalPaginas - 1) { this.pagina++; this.buscar(); } }
}
