import { CarritoVarianteService } from './carrito-variante.service';
import { IVarianteResumen } from '../models/variante.model';

describe('CarritoVarianteService — precio', () => {
  let carrito: CarritoVarianteService;

  const articulo = (precio: number, extra: Partial<IVarianteResumen> = {}): IVarianteResumen =>
    ({ id: 7, precio, stock: 5, ...extra } as IVarianteResumen);

  beforeEach(() => {
    localStorage.removeItem('carritoVariante');
    carrito = new CarritoVarianteService();
  });

  it('entra al precio de la card y sin descuento aplicado', () => {
    carrito.agregar(articulo(400));
    carrito.agregar(articulo(400));
    const [linea] = carrito.obtener();
    expect(linea.precio).toBe(400);
    expect(linea.subTotal).toBe(800);
    expect(linea.usaOtroPrecio).toBeFalse();
  });

  it('aplicar el descuento que trajo la pantalla y quitarlo regresa al normal', () => {
    carrito.agregar(articulo(400));
    carrito.agregar(articulo(400));

    carrito.aplicarOtroPrecio(7, 350);
    expect(carrito.obtener()[0].precio).toBe(350);
    expect(carrito.obtener()[0].subTotal).toBe(700);
    expect(carrito.obtener()[0].usaOtroPrecio).toBeTrue();

    carrito.quitarOtroPrecio(7);
    expect(carrito.obtener()[0].precio).toBe(400);
    expect(carrito.obtener()[0].usaOtroPrecio).toBeFalse();
  });

  it('con "Precio descuento" activo entra al descuento, y quitarlo cobra el normal solo en esta venta', () => {
    carrito.agregar(articulo(350, { precioNormal: 400, usarDescuento: true }));
    expect(carrito.obtener()[0].precio).toBe(350);
    expect(carrito.obtener()[0].usaOtroPrecio).toBeTrue();

    carrito.quitarOtroPrecio(7);
    expect(carrito.obtener()[0].precio).toBe(400);
  });

  it('si le cambian el precio al artículo en el 💲, la línea toma el nuevo', () => {
    carrito.agregar(articulo(400));
    carrito.actualizarPrecios(7, 450, 300, true);
    expect(carrito.obtener()[0].precio).toBe(300);
    expect(carrito.obtener()[0].usaOtroPrecio).toBeTrue();

    carrito.actualizarPrecios(7, 450, 450, false);
    expect(carrito.obtener()[0].precio).toBe(450);
    expect(carrito.obtener()[0].usaOtroPrecio).toBeFalse();
  });

  it('en el navegador no queda ningún descuento sin aplicar', () => {
    carrito.agregar(articulo(400));
    const guardado = localStorage.getItem('carritoVariante') ?? '';
    expect(guardado).not.toContain('precioOtro');
    expect(guardado).not.toContain('precioRebaja');
  });

  it('un carrito guardado antes del cambio pierde su precioOtro al leerse', () => {
    localStorage.setItem('carritoVariante', JSON.stringify([
      { varianteId: 7, precio: 350, precioNormal: 400, precioOtro: 350, cantidad: 1, subTotal: 350, stock: 5 },
      { varianteId: 8, precio: 300, precioNormal: 300, precioOtro: 250, cantidad: 1, subTotal: 300, stock: 5 }
    ]));
    const [usaba, noUsaba] = new CarritoVarianteService().obtener() as any[];
    expect(usaba.precioOtro).toBeUndefined();
    expect(usaba.usaOtroPrecio).toBeTrue();
    expect(noUsaba.precioOtro).toBeUndefined();
    expect(noUsaba.usaOtroPrecio).toBeFalse();
  });
});
