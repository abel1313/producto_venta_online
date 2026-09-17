


export class Constants{

    public static readonly DATA_CLIENTE = "dataCliente";

    /**
     * Minimo de caracteres para que un buscador de texto salga al back. Con 1 o 2 el LIKE '%x%'
     * barre casi todo el catalogo, tarda, y el resultado no le sirve a nadie. Vacio SI dispara:
     * significa "quitar el filtro y traer todo de nuevo".
     *
     * No aplica a buscadores por numero (ej. numero de pedido), donde 1 digito es valido.
     */
    public static readonly MIN_CARACTERES_BUSQUEDA = 3;
}