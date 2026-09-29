import { CarritoVarianteService } from './carrito-variante.service';
import { IVarianteResumen } from '../models/variante.model';

describe('CarritoVarianteService — precio', () => {
  let carrito: CarritoVarianteService;

  const articulo = (precio: number, precioRebaja: number | null): IVarianteResumen =>
    ({ id: 7, precio, precioRebaja, stock: 5 } as IVarianteResumen);

  beforeEach(() => {
    localStorage.removeItem('carritoVariante');
    carrito = new CarritoVarianteService();
  });

  it('entra al precio normal aunque tenga descuento', () => {
    carrito.agregar(articulo(400, 350));
    carrito.agregar(articulo(400, 350));
    const [linea] = carrito.obtener();
    expect(linea.precio).toBe(400);
    expect(linea.subTotal).toBe(800);
    expect(linea.precioOtro).toBe(350);
  });

  it('Usar cobra el otro precio y Quitar regresa al normal', () => {
    carrito.agregar(articulo(400, 350));
    carrito.agregar(articulo(400, 350));

    carrito.usarOtroPrecio(7, true);
    expect(carrito.obtener()[0].precio).toBe(350);
    expect(carrito.obtener()[0].subTotal).toBe(700);

    carrito.usarOtroPrecio(7, false);
    expect(carrito.obtener()[0].precio).toBe(400);
    expect(carrito.obtener()[0].subTotal).toBe(800);
  });

  it('sin descuento real no hay otro precio', () => {
    carrito.agregar(articulo(400, 400));
    carrito.usarOtroPrecio(7, true);
    expect(carrito.obtener()[0].precioOtro).toBeNull();
    expect(carrito.obtener()[0].precio).toBe(400);
  });

  it('a un cliente no le llega la rebaja: normal y sin otro precio', () => {
    carrito.agregar(articulo(400, null));
    expect(carrito.obtener()[0].precio).toBe(400);
    expect(carrito.obtener()[0].precioOtro).toBeNull();
  });

  it('si le cambian el precio al artículo, la línea del carrito toma el nuevo', () => {
    carrito.agregar(articulo(400, 350));
    carrito.agregar(articulo(400, 350));
    carrito.usarOtroPrecio(7, true);

    carrito.actualizarPrecios(7, 450, 300);
    expect(carrito.obtener()[0].precio).toBe(300);
    expect(carrito.obtener()[0].subTotal).toBe(600);

    carrito.actualizarPrecios(7, 450, 0);
    expect(carrito.obtener()[0].precio).toBe(450);
    expect(carrito.obtener()[0].precioOtro).toBeNull();
  });
});
