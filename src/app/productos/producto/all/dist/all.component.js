"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AllComponent = void 0;
var core_1 = require("@angular/core");
var menu_1 = require("@angular/material/menu");
var AllComponent = /** @class */ (function () {
    function AllComponent() {
        this.rows = [
            { name: 'Austin', gender: 'Male', company: 'Swimlane' },
            { name: 'Dany', gender: 'Male', company: 'KFC' },
            { name: 'Molly', gender: 'Female', company: 'Burger King' }
        ];
        this.columns = [
            { field: 'name', headerName: 'Nombre' },
            { field: 'gender', headerName: 'Género' },
            { field: 'company', headerName: 'Empresa' }
        ];
    }
    AllComponent.prototype.blockContextMenu = function (event) {
        event.preventDefault(); // ✅ Bloquea el menú del navegador
        event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
    };
    AllComponent.prototype.abrirMenu = function (event) {
        if (event.event instanceof MouseEvent) { // ✅ Verifica que sea un evento de ratón
            event.event.preventDefault(); // ✅ Bloquea el menú del navegador
            event.event.stopPropagation(); // ✅ Evita que otros eventos interfieran
            console.log(event);
            // 📌 Obtener el elemento de la celda seleccionada
            var cellElement = event.event.target;
            var gridElement = document.querySelector('ag-grid-angular');
            // ✅ Calcula coordenadas basadas en la celda dentro del grid
            var x = cellElement.offsetLeft + gridElement.offsetLeft + 'px';
            var y = cellElement.offsetTop + gridElement.offsetTop + 'px';
            var button = document.getElementById('menuTrigger');
            if (button) {
                button.style.position = 'absolute';
                button.style.left = x;
                button.style.top = y;
            }
            console.log("Men\u00FA en posici\u00F3n: X=" + x + ", Y=" + y);
        }
        this.filaSeleccionada = event.data; // ✅ Obtiene la fila seleccionada
        //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
        if (this.menuTrigger) { // ✅ Verifica que `menuTrigger` no es undefined
            this.menuTrigger.openMenu();
        }
        else {
            console.error('menuTrigger no está inicializado');
        }
    };
    AllComponent.prototype.agregarFila = function () {
        this.rows.push({ name: 'Nuevo Producto', gender: 'N/A', company: 'Nuevo' });
    };
    AllComponent.prototype.eliminarFila = function () {
        var _this = this;
        this.rows = this.rows.filter(function (row) { return row !== _this.filaSeleccionada; });
    };
    AllComponent.prototype.ngAfterViewInit = function () {
        if (!this.menuTrigger) {
            console.error('menuTrigger no está inicializado');
        }
        var button = document.getElementById('menuTrigger');
        if (button) {
            button.setAttribute("style", "background-color: red !important;");
        }
    };
    AllComponent.prototype.ngOnInit = function () {
    };
    __decorate([
        core_1.ViewChild(menu_1.MatMenuTrigger)
    ], AllComponent.prototype, "menuTrigger");
    AllComponent = __decorate([
        core_1.Component({
            selector: 'app-all',
            templateUrl: './all.component.html',
            styleUrls: ['./all.component.scss']
        })
    ], AllComponent);
    return AllComponent;
}());
exports.AllComponent = AllComponent;
