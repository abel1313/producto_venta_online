"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.BuscaComponent = void 0;
var core_1 = require("@angular/core");
var BuscaComponent = /** @class */ (function () {
    function BuscaComponent() {
    }
    BuscaComponent.prototype.ngOnInit = function () {
    };
    BuscaComponent.prototype.buscarProductos = function (event) {
        var texto = event.target.value.toLowerCase();
        console.log(texto);
    };
    BuscaComponent = __decorate([
        core_1.Component({
            selector: 'app-busca',
            templateUrl: './busca.component.html',
            styleUrls: ['./busca.component.scss']
        })
    ], BuscaComponent);
    return BuscaComponent;
}());
exports.BuscaComponent = BuscaComponent;
