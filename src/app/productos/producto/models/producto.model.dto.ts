export interface IProductoDTO{

    nombre:string;
    descripcion:string;
    stock: number;
    precioVenta: number;
    codigoBarras:string;
    cantidad: number;
    subTotal: number;
    idProducto: number;
    imagen?: Imagen | null;
    marca?: string;
    color?: string;
    // campos extra que solo devuelve el backend cuando el token es admin
    habilitado?: string | boolean;
    precioCosto?: number;
    piezas?: number;
    precioRebaja?: number;
    contenido?: string;
    // Puede venir null en productos creados antes de la migracion del back (2026-08-22) —
    // sin backfill retroactivo, mismo criterio que correoVerificado en clientes.
    fechaCreacion?: string | null;
    // Categoría del modelo (solo admin). Agregar producto la precarga en el artículo nuevo.
    palabraClave?: { id: number; nombre: string } | null;
}


export interface Imagen{
    id: number;
    nombreImagen: string;
    imagen: string;
    contentType: string;
    urlImagen?: string;
}