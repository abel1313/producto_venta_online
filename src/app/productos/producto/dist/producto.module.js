"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ProductoModule = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var producto_routing_module_1 = require("./producto-routing.module");
var add_component_1 = require("./add/add.component");
var all_component_1 = require("./all/all.component");
var forms_1 = require("@angular/forms");
var busca_component_1 = require("./busca/busca.component");
var update_component_1 = require("./update/update.component");
var menu_1 = require("@angular/material/menu");
var ag_grid_angular_1 = require("ag-grid-angular");
var http_1 = require("@angular/common/http");
var ProductoModule = /** @class */ (function () {
    function ProductoModule() {
    }
    ProductoModule = __decorate([
        core_1.NgModule({
            declarations: [
                add_component_1.AddComponent,
                all_component_1.AllComponent,
                busca_component_1.BuscaComponent,
                update_component_1.UpdateComponent
            ],
            imports: [
                common_1.CommonModule,
                producto_routing_module_1.ProductoRoutingModule,
                forms_1.ReactiveFormsModule,
                ag_grid_angular_1.AgGridModule,
                menu_1.MatMenuModule,
                http_1.HttpClientModule
            ],
            exports: [
                all_component_1.AllComponent,
                busca_component_1.BuscaComponent,
            ]
        })
    ], ProductoModule);
    return ProductoModule;
}());
exports.ProductoModule = ProductoModule;
