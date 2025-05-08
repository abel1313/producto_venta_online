"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.BuscarVentaComponent = void 0;
var core_1 = require("@angular/core");
var BuscarVentaComponent = /** @class */ (function () {
    function BuscarVentaComponent() {
        this.columnsDetalle = [
            { field: 'nombre', headerName: 'Nombre Producto' },
            { field: 'cantidad', headerName: 'cantidad' },
            { field: 'precioProducto', headerName: 'Precio Producto' },
            { field: 'subTotal', headerName: 'Sub Total' }
        ];
        this.paginacion = {
            rows: [
                {
                    nombre: '1',
                    cantidad: '1',
                    precioProducto: '1',
                    subTotal: '1'
                }
            ]
        };
    }
    BuscarVentaComponent.prototype.ngOnInit = function () {
    };
    BuscarVentaComponent.prototype.obtenerTextoBuscar = function (dato) {
        console.log('data ', dato);
    };
    BuscarVentaComponent.prototype.primeraPagina = function (data) {
    };
    BuscarVentaComponent.prototype.sigPagina = function (data) {
    };
    BuscarVentaComponent.prototype.antPagina = function (data) {
    };
    BuscarVentaComponent.prototype.ultPagina = function (data) {
    };
    BuscarVentaComponent = __decorate([
        core_1.Component({
            selector: 'app-buscar-venta',
            templateUrl: './buscar-venta.component.html',
            styleUrls: ['./buscar-venta.component.scss']
        })
    ], BuscarVentaComponent);
    return BuscarVentaComponent;
}());
exports.BuscarVentaComponent = BuscarVentaComponent;
