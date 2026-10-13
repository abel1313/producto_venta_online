import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import {
  AdminService, IAvanceDatosPrueba, IEscenarioPreparado, IEscenarioPrueba, IGenerarDatosPrueba, IPruebaQuitada
} from '../admin.service';

/** Una prueba preparada, con la hora en que se preparó. */
export type PreparadoGuardado = IEscenarioPreparado & { preparadoEn: string };

/** Dónde se recuerda la lista de pruebas preparadas. */
const CLAVE_PREPARADOS = 'cache:pruebas-preparadas';

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
  /** Número de la prueba que se está quitando; 'todas' con Quitar todas. */
  quitando: string | null = null;
  /**
   * Lo que se preparó, una entrada por prueba (la más reciente). Se guarda en el navegador: sin eso, al
   * cambiar de pantalla se perdían los números de los pedidos (K4, K6, T1…) y no había cómo encontrarlos.
   */
  preparados: PreparadoGuardado[] = [];

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
    this.preparados = this.leerPreparados();
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
   * Deja lista esa prueba (solo QA). Si ya estaba preparada, el back primero quita lo de la vez anterior
   * (pedidos cancelados, modelos dados de baja) y luego la vuelve a crear: tocarlo otra vez la reinicia.
   */
  prepararPrueba(e: IEscenarioPrueba): void {
    this.preparando = e.prueba;
    this.adminService.prepararPrueba(e.prueba).subscribe({
      next: listo => {
        this.preparando = null;
        this.recordar([listo]);
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
      this.adminService.prepararTodas().subscribe({
        next: todas => {
          this.preparando = null;
          this.recordar(todas);
        },
        error: err => {
          this.preparando = null;
          Swal.fire({ icon: 'error', title: 'No se pudieron preparar las pruebas',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  /** Quita lo de esa prueba sin volver a crearlo: los pedidos se cancelan y los modelos se dan de baja. */
  quitarPrueba(e: IEscenarioPrueba): void {
    Swal.fire({
      title: `¿Quitar lo de la prueba ${e.prueba}?`,
      text: 'Sus pedidos se cancelan (el stock regresa) y sus modelos se dan de baja. No se borra nada. '
          + 'Después puedes volver a prepararla.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.quitando = e.prueba;
      this.adminService.quitarPrueba(e.prueba).subscribe({
        next: quitada => {
          this.quitando = null;
          this.terminarDeQuitar([quitada]);
        },
        error: err => {
          this.quitando = null;
          Swal.fire({ icon: 'error', title: `No se pudo quitar la prueba ${e.prueba}`,
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  /** Quita lo de todas las pruebas. Si una falla, las demás se quitan y esa se avisa. */
  quitarTodas(): void {
    Swal.fire({
      title: '¿Quitar lo de todas las pruebas?',
      text: 'Los pedidos de todas las pruebas se cancelan (el stock regresa) y sus modelos se dan de baja. '
          + 'No se borra nada. Después puedes volver a prepararlas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar todas',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.quitando = 'todas';
      this.adminService.quitarTodas().subscribe({
        next: todas => {
          this.quitando = null;
          this.terminarDeQuitar(todas);
        },
        error: err => {
          this.quitando = null;
          Swal.fire({ icon: 'error', title: 'No se pudieron quitar las pruebas',
            text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
        }
      });
    });
  }

  /** Saca de la lista lo que ya se quitó y dice cuánto fue (o qué prueba falló). */
  private terminarDeQuitar(quitadas: IPruebaQuitada[]): void {
    this.olvidar(quitadas.filter(q => !q.error).map(q => q.prueba));
    const pedidos = quitadas.reduce((n, q) => n + q.pedidosCancelados, 0);
    const modelos = quitadas.reduce((n, q) => n + q.modelosDadosDeBaja, 0);
    const sinCancelar = quitadas.reduce((n, q) => n + q.pedidosSinCancelar, 0);
    const conError = quitadas.filter(q => q.error);
    const lineas: string[] = [];
    lineas.push(pedidos || modelos
      ? `${pedidos} pedido(s) cancelado(s) y ${modelos} modelo(s) dado(s) de baja.`
      : 'No había nada que quitar.');
    if (sinCancelar) lineas.push(`${sinCancelar} pedido(s) no se pudieron cancelar (ver el log del servidor).`);
    conError.forEach(q => lineas.push(`Prueba ${q.prueba}: ${q.error}`));
    Swal.fire({
      icon: conError.length || sinCancelar ? 'warning' : 'success',
      title: conError.length ? 'Se quitó, con avisos' : 'Listo',
      text: lineas.join(' ')
    });
  }

  /** Copia un código de barras o un número de pedido para pegarlo en un buscador. */
  copiar(texto: string | number | null): void {
    if (texto === null || texto === '') return;
    navigator.clipboard?.writeText(String(texto)).catch(() => {});
  }

  /** Quita la lista de la pantalla. No borra nada de la base: los pedidos y artículos siguen ahí. */
  limpiarLista(): void {
    this.preparados = [];
    try {
      localStorage.removeItem(CLAVE_PREPARADOS);
    } catch { /* sin almacenamiento: no hay nada que quitar */ }
  }

  /** Una prueba preparada de nuevo reemplaza a la anterior de esa prueba; las demás se quedan. */
  private recordar(nuevos: IEscenarioPreparado[]): void {
    const ahora = new Date().toISOString();
    const porPrueba = new Map(this.preparados.map(p => [p.prueba, p] as [string, PreparadoGuardado]));
    nuevos.forEach(n => porPrueba.set(n.prueba, { ...n, preparadoEn: ahora }));
    const orden = this.escenarios.map(e => e.prueba);
    this.preparados = [...porPrueba.values()]
      .sort((a, b) => orden.indexOf(a.prueba) - orden.indexOf(b.prueba));
    this.guardarPreparados();
  }

  private guardarPreparados(): void {
    try {
      localStorage.setItem(CLAVE_PREPARADOS, JSON.stringify(this.preparados));
    } catch { /* sin almacenamiento: la lista dura mientras no se salga de la pantalla */ }
  }

  /** Lo que se quitó de la base ya no existe: sale de la lista guardada. */
  private olvidar(pruebas: string[]): void {
    this.preparados = this.preparados.filter(p => !pruebas.includes(p.prueba));
    this.guardarPreparados();
  }

  private leerPreparados(): PreparadoGuardado[] {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_PREPARADOS) ?? '[]');
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
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
