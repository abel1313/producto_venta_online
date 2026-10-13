import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { AdminService, IAvanceDatosPrueba, IEscenarioPreparado, IEscenarioPrueba, IGenerarDatosPrueba } from '../admin.service';

@Component({
  selector: 'app-cache',
  templateUrl: './cache.component.html',
  styleUrls: ['./cache.component.scss']
})
export class CacheComponent implements OnInit, OnDestroy {
  limpiando = false;
  cachesLimpiadas: string[] = [];

  // ── Datos de prueba (solo QA, solo administrador) ──────────────────────
  plan: IGenerarDatosPrueba = { modelos: 20000, articulosMin: 1, articulosMax: 4, pedidos: 1000 };
  avance: IAvanceDatosPrueba | null = null;
  enviando = false;
  private sondeo?: Subscription;

  // ── Preparar prueba N: los pedidos que pide cada prueba del documento de pruebas ──
  escenarios: IEscenarioPrueba[] = [];
  /** Número de la prueba que se está preparando (para el texto del botón); 'todas' con Preparar todas. */
  preparando: string | null = null;
  /** Lo último que se preparó: una prueba, o todas con "Preparar todas". */
  preparados: IEscenarioPreparado[] = [];

  constructor(private readonly adminService: AdminService,
              private readonly authService: AuthService) {}

  /** El back exige ROLE_ADMIN; la sección ni se muestra a quien solo tiene la pantalla de caché. */
  get esAdmin(): boolean {
    return this.authService.isAdminService;
  }

  get corriendo(): boolean {
    return this.enviando || this.avance?.estado === 'EN_CURSO';
  }

  /** De 0 a 100: el catálogo cuenta la mitad y los pedidos la otra mitad. */
  get porcentaje(): number {
    const a = this.avance;
    if (!a) return 0;
    if (a.estado === 'TERMINADO') return 100;
    const catalogo = a.modelosPedidos ? a.modelosCreados / a.modelosPedidos : 1;
    const pedidos = a.pedidosPedidos ? (a.pedidosCreados + a.pedidosConError) / a.pedidosPedidos : 1;
    return Math.min(100, Math.round(a.pedidosPedidos ? catalogo * 50 + pedidos * 50 : catalogo * 100));
  }

  ngOnInit(): void {
    if (!this.esAdmin) return;
    this.consultarAvance();
    this.adminService.escenariosPrueba().subscribe({
      next: lista => { this.escenarios = lista; },
      error: () => { this.escenarios = []; }
    });
  }

  ngOnDestroy(): void {
    this.sondeo?.unsubscribe();
  }

  generarDatosPrueba(): void {
    const p = this.plan;
    Swal.fire({
      title: '¿Generar datos de prueba?',
      html: `Se van a crear <b>${p.modelos}</b> modelos con <b>${p.articulosMin} a ${p.articulosMax}</b> artículos cada uno
             y <b>${p.pedidos}</b> pedidos, todo con la marca <b>"Prueba QA"</b>.<br><br>
             Corre en segundo plano: puedes salir de esta pantalla. Solo funciona en QA.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.enviando = true;
      this.adminService.generarDatosPrueba(p).subscribe({
        next: avance => {
          this.enviando = false;
          this.avance = avance;
          this.seguirAvance();
        },
        error: err => {
          this.enviando = false;
          Swal.fire({ icon: 'error', title: 'No se pudo empezar',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  darDeBajaDatosPrueba(): void {
    Swal.fire({
      title: '¿Dar de baja los datos de prueba?',
      text: 'Los modelos y artículos con marca "Prueba QA" dejan de salir en la tienda y en Modelos. '
          + 'No se borra ninguna foto ni ningún producto real. Los pedidos de prueba se quedan como historial.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.enviando = true;
      this.adminService.darDeBajaDatosPrueba().subscribe({
        next: res => {
          this.enviando = false;
          Swal.fire({ icon: 'success', title: 'Listo', text: res?.mensaje ?? 'Datos de prueba dados de baja.' });
        },
        error: err => {
          this.enviando = false;
          Swal.fire({ icon: 'error', title: 'No se pudo dar de baja',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  /**
   * Crea un artículo nuevo y los pedidos de esa prueba (solo QA). Cada vez que se toca salen
   * pedidos nuevos: una prueba no depende de lo que otra ya canceló, pagó o unió.
   */
  prepararPrueba(e: IEscenarioPrueba): void {
    this.preparando = e.prueba;
    this.preparados = [];
    this.adminService.prepararPrueba(e.prueba).subscribe({
      next: listo => {
        this.preparando = null;
        this.preparados = [listo];
      },
      error: err => {
        this.preparando = null;
        Swal.fire({ icon: 'error', title: `No se pudo preparar la prueba ${e.prueba}`,
          text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
      }
    });
  }

  /** Todas las pruebas de una vez: deja listo lo que pide cada una. Si una falla, las demás siguen. */
  prepararTodas(): void {
    Swal.fire({
      title: '¿Preparar todas las pruebas?',
      text: `Se dan de alta los modelos, artículos y pedidos de las ${this.escenarios.length} pruebas, `
          + 'todos nuevos y con la marca "Prueba QA". Tarda unos segundos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, preparar todas',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.preparando = 'todas';
      this.preparados = [];
      this.adminService.prepararTodas().subscribe({
        next: todas => {
          this.preparando = null;
          this.preparados = todas;
        },
        error: err => {
          this.preparando = null;
          Swal.fire({ icon: 'error', title: 'No se pudieron preparar las pruebas',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  /** Copia el código de barras para pegarlo en un buscador. */
  copiar(texto: string | null): void {
    if (!texto) return;
    navigator.clipboard?.writeText(texto).catch(() => {});
  }

  private consultarAvance(): void {
    this.adminService.avanceDatosPrueba().subscribe({
      next: avance => {
        this.avance = avance;
        if (avance.estado === 'EN_CURSO') this.seguirAvance();
      },
      error: () => { this.avance = null; }
    });
  }

  /** Cada 3 segundos mientras corre; se detiene sola al terminar o fallar. */
  private seguirAvance(): void {
    this.sondeo?.unsubscribe();
    this.sondeo = timer(3000, 3000)
      .pipe(switchMap(() => this.adminService.avanceDatosPrueba()))
      .subscribe({
        next: avance => {
          this.avance = avance;
          if (avance.estado !== 'EN_CURSO') this.sondeo?.unsubscribe();
        },
        error: () => this.sondeo?.unsubscribe()
      });
  }

  limpiarCache(): void {
    Swal.fire({
      title: '¿Limpiar toda la caché?',
      text: 'Las próximas solicitudes serán más lentas mientras se reconstruye.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--pk-danger)'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.limpiando = true;
      this.cachesLimpiadas = [];

      this.adminService.limpiarCache().subscribe({
        next: caches => {
          this.cachesLimpiadas = caches ?? [];
          this.limpiando = false;
          Swal.fire({
            icon: 'success',
            title: `¡${this.cachesLimpiadas.length} cachés limpiadas!`,
            timer: 1800,
            showConfirmButton: false
          });
        },
        error: (err) => {
          this.limpiando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error al limpiar la caché',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo limpiar la caché.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      });
    });
  }
}
