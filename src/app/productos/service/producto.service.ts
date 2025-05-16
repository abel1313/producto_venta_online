import { IDetalleVenta } from './../../ventas/venta-producto/models/detalleVenta.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IProducto, IProductoDTO, IProductoPaginable } from '../producto/models';
import { IGastos } from 'src/app/gastos/models';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private readonly url: string = `${environment.api_Url}/productos`;
  constructor(
    private readonly http: HttpClient
  ) { }

    // 🌐 Obtener datos
    getData(page:number,size:number): Observable<IProductoPaginable<IProductoDTO[]>> {
      return this.http.get<IProductoPaginable<IProductoDTO[]>>(`${this.url}/getProductos2?size=${size}&page=${page}`);
    }



    
    // 🌐 Obtener datos
    getDataNombreCodigoBarra(page:number,size:number, buscar:string): Observable<IProductoPaginable<IProductoDTO[]>> {
      return this.http.get<IProductoPaginable<IProductoDTO[]>>(`${this.url}/buscarNombreOrCodigoBarra?size=${size}&page=${page}&nombre=${buscar}`);
    }
  
    // 🌐 Obtener datos
    saveVenta(det: IDetalleVenta[]): Observable<any> {
      return this.http.post(`${environment.api_Url}/ventas/save`,det);
    }

        // 🌐 Obtener datos
    getTotalVenta(): Observable<any> {
      return this.http.get(`${environment.api_Url}/ventas/getTotalVentas`);
    }

        // 🌐 Obtener datos
    saveGasto(det: IGastos): Observable<any> {
      return this.http.post(`${environment.api_Url}/gastos/save`,det);
    }
            getDataGastos(page:number,size:number): Observable<IProductoPaginable<IGastos[]>> {
      return this.http.get<IProductoPaginable<IGastos[]>>(`${environment.api_Url}/gastos/getGastos?size=${size}&page=${page}`);
    }

            // 🌐 Obtener datos
    saveProducto(det: IProducto): Observable<any> {
      console.log(JSON.stringify(det))
      return this.http.post(`${environment.api_Url}/productos/save`,det);
    }
}
