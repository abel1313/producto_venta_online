import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IProductoPaginable } from 'src/app/productos/producto/models';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { IUsuarioDto } from '../models/usuario.dto';
import { IconService } from 'src/app/Icon/icon.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AccederService } from 'src/app/login/acceder.service';

@Component({
  selector: 'app-all-usuarios',
  templateUrl: './all-usuarios.component.html',
  styleUrls: ['./all-usuarios.component.scss']
})
export class AllUsuariosComponent implements OnInit {

  buscarScrool = false;
  paginaPrimera: number = 1;
  paginaUltima: number = 0;
  totalPaginas: number = 0;
  paginacion: IProductoPaginable<IUsuarioDto[]> = {
    pagina: 0,
    t: [],
    totalPaginas: 0,
    totalRegistros: 0
  };

  rows: IUsuarioDto[] = [];
  mostrandoInactivos = false;

  constructor(
    private readonly serviceUser: UsuarioService,
    public  readonly iconImagen:  IconService,
    private readonly router:      Router,
    private readonly acceder:     AccederService,
  ) { }

  ngOnInit(): void {

    // this.getDataInit(1);
  }


  onScroll(event: any): void {

    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMore(); // Carga más datos
    }
  }
  loadMore(): void {
    this.paginaPrimera + 1;
    if (this.totalPaginas >= this.paginaPrimera) {
      this.buscarProductoSinKey(this.paginaPrimera, "");
    }
  }


  buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    this.serviceUser.getDataPage(paginaPrimera, 10, buscarProd)//no es
      .subscribe({
        next: (res: any) => {
          this.paginaPrimera = this.paginaPrimera + 1;
          this.paginacion = res.data;
          this.totalPaginas = this.paginacion?.totalPaginas || 0
          this.rows = [...this.rows, ...this.paginacion.t]; // Agrega sin borrar los anteriores
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error al cargar usuarios', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de usuarios.' });
        }
      });
  }

  usuariosResponse(event: any) {

    this.paginaPrimera = this.paginaPrimera + 1;
    this.paginacion = event.data;
    this.totalPaginas = this.paginacion?.totalPaginas || 0
    this.rows = [...this.paginacion.t]; // Agrega sin borrar los anteriores
  }

  onModoCambio(mostrandoInactivos: boolean): void {
    this.mostrandoInactivos = mostrandoInactivos;
    this.rows = []; // el nuevo resultado llega por usuariosResponse() justo después
  }
  updateUsuario(item: any) {
    this.router.navigate(['usuarios/update']);
    this.serviceUser.userUpdate.next(item);
  }

  initials(username: string): string {
    return (username ?? '?').slice(0, 2).toUpperCase();
  }

  avatarColor(username: string): string {
    const palette = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#3b82f6,#2563eb)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'linear-gradient(135deg,#ef4444,#dc2626)',
      'linear-gradient(135deg,#14b8a6,#0d9488)',
    ];
    const idx = (username ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  }

  resetearPassword(item: IUsuarioDto): void {
    Swal.fire({
      title: `¿Resetear contraseña de ${item.username}?`,
      text: 'Se generará una contraseña temporal que deberás compartir con el usuario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.serviceUser.resetearPassword(item.id!).subscribe({
        next: (res: any) => {
          const nuevaPass: string = res?.data ?? '—';
          Swal.fire({
            icon: 'success',
            title: 'Contraseña reseteada',
            html: `
              <p>La contraseña temporal de <strong>${item.username}</strong> es:</p>
              <div style="font-size:1.7rem;font-weight:800;letter-spacing:5px;
                          padding:12px 16px;background:rgba(0,0,0,0.06);
                          border-radius:10px;margin:10px 0;font-family:monospace">
                ${nuevaPass}
              </div>
              <p style="font-size:0.82rem;color:#64748b">
                Dásela al usuario. Deberá cambiarla en su siguiente inicio de sesión.
              </p>
            `,
            confirmButtonText: 'Entendido'
          });
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo resetear la contraseña.' });
        }
      });
    });
  }

  verificarCorreoUsuario(item: IUsuarioDto): void {
    this.acceder.enviarCodigoVerificacionUsuario(item.username).subscribe({
      next:  () => this.mostrarSwalCodigoAdmin(item),
      error: (err: any) => {
        const raw = err?.error;
        const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message)
          ?? 'No se pudo enviar el código de verificación.';
        Swal.fire({ icon: 'error', title: 'No se pudo enviar el código', text: msg });
      }
    });
  }

  private mostrarSwalCodigoAdmin(item: IUsuarioDto): void {
    Swal.fire({
      title: `Verificar correo — ${item.username}`,
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código al correo de <strong>${item.username}</strong>.<br>
          Pídele que te dicte el código de 6 dígitos por teléfono.
        </p>
        <input id="swal-codigo-admin" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-admin') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.acceder.verificarCorreoUsuario(item.username, codigo).toPromise();
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
      Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: `El correo de ${item.username} fue verificado correctamente.` });
    });
  }

  removeUsuario(item: any) {
    this.serviceUser.eliminarUsuarioDto(item.id).subscribe(eliminado=>{
              Swal.fire({
                title: `Se elimino el usuario correctamente`,
                icon: "success",
                draggable: true
              });
      // router.navigate a la MISMA ruta en la que ya estás no recarga nada (Angular no
      // reejecuta el componente si la URL no cambia) -- por eso el usuario "eliminado" seguía
      // viéndose hasta refrescar la página a mano. Se quita de la lista en memoria directo.
      this.rows = this.rows.filter(u => u.id !== item.id);
    },err=>{
              Swal.fire({
                title: `Ocurrio un erro al eliminar el usuario`,
                icon: "error",
                draggable: true
              });
    });
  }

  activarUsuario(item: IUsuarioDto): void {
    Swal.fire({
      title: `¿Reactivar a ${item.username}?`,
      text: 'Podrá volver a iniciar sesión normalmente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.serviceUser.activarUsuario(item.id!).subscribe({
        next: () => {
          this.rows = this.rows.filter(u => u.id !== item.id);
          Swal.fire({ icon: 'success', title: 'Usuario reactivado', timer: 1400, showConfirmButton: false });
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error al reactivar', text: err?.error?.mensaje ?? err?.error?.message });
        }
      });
    });
  }

}
