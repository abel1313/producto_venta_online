"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.VentaProductoRoutingModule = void 0;
var core_1 = require("@angular/core");
var router_1 = require("@angular/router");
var add_venta_component_1 = require("./add-venta/add-venta.component");
var buscar_venta_component_1 = require("./buscar-venta/buscar-venta.component");
var routes = [
    {
        path: 'venta', component: add_venta_component_1.AddVentaComponent
    },
    {
        path: 'buscar', component: buscar_venta_component_1.BuscarVentaComponent
    },
    {
        path: '', redirectTo: 'venta', pathMatch: 'full'
    }
];
var VentaProductoRoutingModule = /** @class */ (function () {
    function VentaProductoRoutingModule() {
    }
    VentaProductoRoutingModule = __decorate([
        core_1.NgModule({
            imports: [router_1.RouterModule.forChild(routes)],
            exports: [router_1.RouterModule]
        })
    ], VentaProductoRoutingModule);
    return VentaProductoRoutingModule;
}());
exports.VentaProductoRoutingModule = VentaProductoRoutingModule;
