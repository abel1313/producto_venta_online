import { of } from 'rxjs';
import { AltaArticulosComponent, ModeloParaArticulos } from './alta-articulos.component';

/**
 * QA 2026-11-04: "Mismo stock para todos" pisaba la cantidad que la persona escribio con
 * libre / stock (1000 libres + stock 5 creaba 200 articulos aunque hubiera pedido 1).
 * Ahora la cantidad escrita manda y solo se recorta si no caben.
 */
describe('AltaArticulosComponent · mismo stock', () => {
  function crear(stock: number, enArticulos: number): AltaArticulosComponent {
    const modelo: ModeloParaArticulos = { id: 265, nombre: 'prod', stock, enArticulos, tieneImagen: false };
    const c = new AltaArticulosComponent({} as any, { producto: () => of(null) } as any);
    c.modelo = modelo;
    c.ngOnInit();
    return c;
  }

  it('1000 libres, 1 articulo, mismo stock 5 -> 1 articulo de 5 (quedan 995)', () => {
    const c = crear(1000, 0);
    c.cantidad = 1;
    c.mismoStock = 5;
    c.aplicarMismoStock();
    expect(c.cantidad).toBe(1);
    expect(c.formularios.length).toBe(1);
    expect(c.formularios[0].stock).toBe(5);
    expect(c.teQuedan).toBe(995);
  });

  it('1000 libres, 5 articulos de 5 -> 5 articulos, 25 piezas, quedan 975', () => {
    const c = crear(1000, 0);
    c.cantidad = 5;
    c.mismoStock = 5;
    c.aplicarMismoStock();
    expect(c.formularios.length).toBe(5);
    expect(c.formularios.every(f => f.stock === 5)).toBeTrue();
    expect(c.repartido).toBe(25);
    expect(c.teQuedan).toBe(975);
    expect(c.puedeGuardar).toBeTrue();
  });

  it('20 libres, 5 articulos de 5 -> se recorta a 4 y avisa', () => {
    const c = crear(20, 0);
    c.cantidad = 5;
    c.mismoStock = 5;
    c.aplicarMismoStock();
    expect(c.formularios.length).toBe(4);
    expect(c.teQuedan).toBe(0);
    expect(c.avisoMismoStock).toContain('Solo caben 4');
  });

  it('un articulo de 30 con 20 libres no cabe: avisa y no cambia nada', () => {
    const c = crear(20, 0);
    c.cantidad = 2;
    c.ajustarFormularios();
    c.mismoStock = 30;
    c.aplicarMismoStock();
    expect(c.avisoMismoStock).toContain('Solo hay 20 libres');
    expect(c.formularios.length).toBe(2);
  });

  it('con 1 libre el articulo ya viene con stock 1 (producto 265: 11130 de 11131)', () => {
    const c = crear(11131, 11130);
    expect(c.libre).toBe(1);
    expect(c.formularios.length).toBe(1);
    expect(c.formularios[0].stock).toBe(1);
  });

  it('mismo stock invalido (0 o decimal) no hace nada', () => {
    const c = crear(100, 0);
    c.cantidad = 3;
    c.ajustarFormularios();
    c.mismoStock = 0;
    c.aplicarMismoStock();
    expect(c.formularios.length).toBe(3);
    c.mismoStock = 2.5;
    c.aplicarMismoStock();
    expect(c.formularios.length).toBe(3);
  });
});
