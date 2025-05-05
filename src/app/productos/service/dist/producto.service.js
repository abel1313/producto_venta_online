"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ProductoService = void 0;
var core_1 = require("@angular/core");
var environment_1 = require("src/environments/environment");
var ProductoService = /** @class */ (function () {
    function ProductoService(http) {
        this.http = http;
        this.url = environment_1.environment.api_Url + "/productos";
    }
    // 🌐 Obtener datos
    ProductoService.prototype.getData = function (page, size) {
        return this.http.get(this.url + "/getProductos2?size=" + size + "&page=" + page);
    };
    // 🌐 Obtener datos
    ProductoService.prototype.getDataNombreCodigoBarra = function (page, size, buscar) {
        return this.http.get(this.url + "/buscarNombreOrCodigoBarra?size=" + size + "&page=" + page + "&nombre=" + buscar);
    };
    ProductoService = __decorate([
        core_1.Injectable({
            providedIn: 'root'
        })
    ], ProductoService);
    return ProductoService;
}());
exports.ProductoService = ProductoService;
