"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ProductoRoutingModule = void 0;
var core_1 = require("@angular/core");
var router_1 = require("@angular/router");
var add_component_1 = require("./add/add.component");
var update_component_1 = require("./update/update.component");
var busca_component_1 = require("./busca/busca.component");
var routes = [
    {
        path: 'agregar', component: add_component_1.AddComponent
    },
    {
        path: 'update', component: update_component_1.UpdateComponent
    },
    {
        path: 'buscar', component: busca_component_1.BuscaComponent
    },
    {
        path: '', redirectTo: 'agregar', pathMatch: 'full'
    }
];
var ProductoRoutingModule = /** @class */ (function () {
    function ProductoRoutingModule() {
    }
    ProductoRoutingModule = __decorate([
        core_1.NgModule({
            imports: [router_1.RouterModule.forChild(routes)],
            exports: [router_1.RouterModule]
        })
    ], ProductoRoutingModule);
    return ProductoRoutingModule;
}());
exports.ProductoRoutingModule = ProductoRoutingModule;
