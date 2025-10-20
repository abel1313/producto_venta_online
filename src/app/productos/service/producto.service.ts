import { IDetalleVenta } from './../../ventas/venta-producto/models/detalleVenta.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IProducto, IProductoDTO, IProductoPaginable } from '../producto/models';
import { IGastos } from 'src/app/gastos/models';
import { ICliente } from 'src/app/clietes/models';
import { IRifa } from 'src/app/rifas/agregar-rifa/rifa/rifa.model';
import { IProductoDTORec } from '../producto/models/producto.dto.model';

@Injectable({
    providedIn: 'root'
})
export class ProductoService {

    private readonly url: string = `${environment.api_Url}/productos`;
    private readonly urlImg: string = `${environment.api_Url}/imagen`;

    public productoUpdate = new BehaviorSubject<IProductoDTORec | null>(null);
    productoUpdate$ = this.productoUpdate.asObservable();
    constructor(
        private readonly http: HttpClient
    ) { }

    // 🌐 Obtener datos
    getData(page: number, size: number): Observable<IProductoPaginable<IProductoDTO[]>> {
        return this.http.get<IProductoPaginable<IProductoDTO[]>>(`${this.url}/getProductos2?size=${size}&page=${page}`);
    }

    // 🌐 Obtener datos
    getDataImg(id: number, page: number, size: number): Observable<any> {
        return this.http.get<any>(`${this.urlImg}/${id}/detalle?size=${size}&page=${page}`);
    }

    getDataGeneric<R>(id: number): Observable<R> {
        return this.http.get<R>(`${this.url}/findById/${id}`);
    }


    // 🌐 Obtener datos
    getDataNombreCodigoBarra(page: number, size: number, buscar: string): Observable<IProductoPaginable<IProductoDTO[]>> {
        return this.http.get<IProductoPaginable<IProductoDTO[]>>(`${this.url}/buscarNombreOrCodigoBarra?size=${size}&page=${page}&nombre=${buscar}`);
    }

    // 🌐 Obtener datos
    saveVenta(det: IDetalleVenta[]): Observable<any> {
        return this.http.post(`${environment.api_Url}/ventas/save`, det);
    }

    // 🌐 Obtener datos
    getTotalVenta(): Observable<any> {
        return this.http.get(`${environment.api_Url}/ventas/getTotalVentas`);
    }

    // 🌐 Obtener datos
    saveGasto(det: IGastos): Observable<any> {
        return this.http.post(`${environment.api_Url}/gastos/save`, det);
    }
    getDataGastos(page: number, size: number): Observable<IProductoPaginable<IGastos[]>> {
        return this.http.get<IProductoPaginable<IGastos[]>>(`${environment.api_Url}/gastos/getGastos?size=${size}&page=${page}`);
    }

    // 🌐 Obtener datos
    saveProducto(det: IProducto): Observable<any> {
        return this.http.post(`${environment.api_Url}/productos/save`, det);
    }


    // 🌐 Obtener datos
    saveCliente(det: ICliente): Observable<any> {
        return this.http.post(`${environment.api_Url}/clientes/save`, det);
    }

    // 🌐 Obtener datos
    getClientesRifaPorHora(inicio: string, fin: string, palabraRifa: string): Observable<any> {
        return this.http.get(`${environment.api_Url}/rifa/getRifasPorHora?inicio=${inicio}&fin=${fin}&palabraRifa=${palabraRifa}`);
    }

    // 🌐 Obtener datos
    saveRifa(det: IRifa): Observable<any> {
        return this.http.post(`${environment.api_Url}/rifa/save`, det);
    }

    agregarProducto(producto: IProductoDTORec) {
        this.productoUpdate.next(producto);
        console.log('Carrito actualizado:', producto);
    }

    limpiarCarrito() {
        this.productoUpdate.next(null);
    }

    get obtenerProducto(): IProductoDTORec | null {
        return this.productoUpdate.getValue();
    }
}
