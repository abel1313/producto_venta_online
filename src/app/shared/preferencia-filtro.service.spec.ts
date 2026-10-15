import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth.service';
import { PreferenciaFiltroService } from './preferencia-filtro.service';

describe('PreferenciaFiltroService', () => {
  let service: PreferenciaFiltroService;
  let http: HttpTestingController;
  const auth = { rolesValue: ['ROLE_EMPLEADO'], tienePantalla: (_: string) => true };

  beforeEach(() => {
    auth.rolesValue = ['ROLE_EMPLEADO'];
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: auth }]
    });
    service = TestBed.inject(PreferenciaFiltroService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('un cliente no pide ni guarda nada', fakeAsync(() => {
    auth.rolesValue = ['ROLE_USUARIO', 'LEER_PRODUCTOS'];
    let resultado: unknown = 'sin respuesta';
    service.obtener('tienda-buscar').subscribe(f => resultado = f);
    service.guardar('tienda-buscar', { filtroTalla: 'M' });
    tick(1000);
    expect(resultado).toBeNull();
    http.expectNone(() => true);
  }));

  it('lee los filtros de data.filtros, y 204 es null', () => {
    let f1: unknown; let f2: unknown = 'x';
    service.obtener('tienda-buscar').subscribe(f => f1 = f);
    http.expectOne(r => r.url.endsWith('/v1/preferencias-filtro/tienda-buscar'))
      .flush({ data: { filtros: { filtroTalla: 'M' } } });
    service.obtener('productos-buscar').subscribe(f => f2 = f);
    http.expectOne(r => r.url.endsWith('/productos-buscar')).flush(null, { status: 204, statusText: 'No Content' });
    expect(f1).toEqual({ filtroTalla: 'M' });
    expect(f2).toBeNull();
  });

  it('espera una pausa y manda solo el último cambio de cada pantalla', fakeAsync(() => {
    service.guardar('tienda-buscar', { filtroTalla: 'M' });
    service.guardar('tienda-buscar', { filtroTalla: 'G' });
    service.guardar('productos-buscar', { mostrarConStock: true });
    tick(500);
    http.expectNone(() => true);
    tick(400);
    const tienda = http.expectOne(r => r.url.endsWith('/tienda-buscar'));
    expect(tienda.request.method).toBe('PUT');
    expect(tienda.request.body).toEqual({ filtros: { filtroTalla: 'G' } });
    http.expectOne(r => r.url.endsWith('/productos-buscar')).flush({});
    tienda.flush({});
  }));

  it('Limpiar después de un cambio manda DELETE, no el cambio', fakeAsync(() => {
    service.guardar('tienda-buscar', { filtroTalla: 'M' });
    service.borrar('tienda-buscar');
    tick(900);
    const req = http.expectOne(r => r.url.endsWith('/tienda-buscar'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  }));
});
