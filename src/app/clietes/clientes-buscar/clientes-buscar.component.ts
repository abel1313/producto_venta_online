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
      filter(v => v.trim().length === 0 || v.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => { this.pagina = 0; this.buscar(); });
    this.buscar();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onInput(): void { this.input$.next(this.termino); }

  buscar(): void {
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

  verificarCorreoCliente(c: IClienteBusquedaDto): void {
    this.clienteService.enviarCodigoVerificacion(c.id).subscribe({
      next:  () => this.mostrarSwalCodigo(c),
      error: () => this.mostrarSwalCodigo(c)
    });
  }

  private mostrarSwalCodigo(c: IClienteBusquedaDto): void {
    Swal.fire({
      title: `Verificar correo — ${c.nombrePersona} ${c.apeidoPaterno}`,
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${c.correoElectronico}</strong>.<br>
          Pídele al cliente que te dicte el código de 6 dígitos.
        </p>
        <input id="swal-codigo-cliente" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #B08A4E;border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-cliente') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(c.id, codigo).toPromise();
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
      c.correoVerificado = true;
      Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: `El correo de ${c.nombrePersona} fue verificado correctamente.`, timer: 2500, showConfirmButton: false });
    });
  }

  get totalPaginas(): number { return Math.ceil(this.totalElementos / this.size); }

  paginaAnterior(): void { if (this.pagina > 0) { this.pagina--; this.buscar(); } }
  paginaSiguiente(): void { if (this.pagina < this.totalPaginas - 1) { this.pagina++; this.buscar(); } }
}
