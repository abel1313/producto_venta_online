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

    carrito.actualizarPrecios(7, 450, 300, true);
    expect(carrito.obtener()[0].precio).toBe(300);
    expect(carrito.obtener()[0].subTotal).toBe(600);

    carrito.actualizarPrecios(7, 450, 300, false);
    expect(carrito.obtener()[0].precio).toBe(450);
    expect(carrito.obtener()[0].precioOtro).toBe(300);

    carrito.actualizarPrecios(7, 450, 0, true);
    expect(carrito.obtener()[0].precio).toBe(450);
    expect(carrito.obtener()[0].precioOtro).toBeNull();
  });

  it('con "Precio descuento" activo entra al descuento, y quitar Usar cobra el normal solo en esta venta', () => {
    // Así llega al admin un artículo con descuento activo: precio = al que se vende.
    const conDescuento = { id: 7, precio: 350, precioNormal: 400, precioRebaja: 350, usarDescuento: true, stock: 5 } as IVarianteResumen;
    carrito.agregar(conDescuento);
    expect(carrito.obtener()[0].precio).toBe(350);
    expect(carrito.obtener()[0].precioOtro).toBe(350);
    expect(carrito.obtener()[0].precioNormal).toBe(400);

    carrito.usarOtroPrecio(7, false);
    expect(carrito.obtener()[0].precio).toBe(400);
  });

  it('a un cliente, un artículo con descuento activo le llega ya con el descuento como precio', () => {
    carrito.agregar({ id: 7, precio: 350, stock: 5 } as IVarianteResumen);
    expect(carrito.obtener()[0].precio).toBe(350);
    expect(carrito.obtener()[0].precioOtro).toBeNull();
  });

  it('el otro precio no se guarda en el navegador', () => {
    carrito.agregar(articulo(400, 350));
    const guardado = localStorage.getItem('carritoVariante') ?? '';
    expect(guardado).not.toContain('precioOtro');
    expect(guardado).not.toContain('350');
  });

  it('al recargar: con Usar marcado recupera el otro precio; sin Usar lo completa la tienda', () => {
    carrito.agregar(articulo(400, 350));
    carrito.agregar({ id: 8, precio: 300, precioRebaja: 250, stock: 5 } as IVarianteResumen);
    carrito.usarOtroPrecio(7, true);

    const recargado = new CarritoVarianteService();
    const [conUsar, sinUsar] = recargado.obtener();
    expect(conUsar.precioOtro).toBe(350);
    expect(sinUsar.precioOtro).toBeUndefined();

    recargado.completarOtrosPrecios([{ id: 8, precio: 300, precioRebaja: 250 } as IVarianteResumen]);
    expect(recargado.obtener()[1].precioOtro).toBe(250);
    expect(recargado.obtener()[1].precio).toBe(300);
  });
});
