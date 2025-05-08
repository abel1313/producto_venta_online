"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.VentaProductoModule = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var venta_producto_routing_module_1 = require("./venta-producto-routing.module");
var add_venta_component_1 = require("./add-venta/add-venta.component");
var buscar_venta_component_1 = require("./buscar-venta/buscar-venta.component");
var all_venta_component_1 = require("./all-venta/all-venta.component");
var producto_module_1 = require("src/app/productos/producto/producto.module");
var table_generico_module_1 = require("src/app/tablas/table-generico/table-generico.module");
var ag_grid_angular_1 = require("ag-grid-angular");
var menu_1 = require("@angular/material/menu");
var http_1 = require("@angular/common/http");
var forms_1 = require("@angular/forms");
var buscar_generico_component_1 = require("src/app/buscador/buscar-generico/buscar-generico.component");
var VentaProductoModule = /** @class */ (function () {
    function VentaProductoModule() {
    }
    VentaProductoModule = __decorate([
        core_1.NgModule({
            declarations: [
                add_venta_component_1.AddVentaComponent,
                buscar_venta_component_1.BuscarVentaComponent,
                all_venta_component_1.AllVentaComponent,
                buscar_generico_component_1.BuscarGenericoComponent
            ],
            imports: [
                common_1.CommonModule,
                venta_producto_routing_module_1.VentaProductoRoutingModule,
                producto_module_1.ProductoModule,
                table_generico_module_1.TableGenericoModule,
                ag_grid_angular_1.AgGridModule,
                menu_1.MatMenuModule,
                http_1.HttpClientModule,
                forms_1.FormsModule,
            ]
        })
    ], VentaProductoModule);
    return VentaProductoModule;
}());
exports.VentaProductoModule = VentaProductoModule;
