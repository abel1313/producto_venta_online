"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.BuscarGenericoComponent = void 0;
var core_1 = require("@angular/core");
var BuscarGenericoComponent = /** @class */ (function () {
    function BuscarGenericoComponent() {
        this.buscarProd = '';
        this.$textBuscar = new core_1.EventEmitter();
    }
    BuscarGenericoComponent.prototype.ngOnInit = function () {
    };
    BuscarGenericoComponent.prototype.buscarProductos = function (event) {
        var texto = event.target.value.toLowerCase();
        this.buscarProd = texto;
        this.$textBuscar.emit(this.buscarProd);
    };
    __decorate([
        core_1.Output()
    ], BuscarGenericoComponent.prototype, "$textBuscar");
    BuscarGenericoComponent = __decorate([
        core_1.Component({
            selector: 'app-buscar-generico',
            templateUrl: './buscar-generico.component.html',
            styleUrls: ['./buscar-generico.component.scss']
        })
    ], BuscarGenericoComponent);
    return BuscarGenericoComponent;
}());
exports.BuscarGenericoComponent = BuscarGenericoComponent;
