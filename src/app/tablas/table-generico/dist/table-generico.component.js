"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.TableGenericoComponent = void 0;
var core_1 = require("@angular/core");
var menu_1 = require("@angular/material/menu");
var TableGenericoComponent = /** @class */ (function () {
    function TableGenericoComponent(srvice) {
        this.srvice = srvice;
        this.styleTableWidth = '100%';
        this.styleTableheight = '400px';
        this.$primeraPagina = new core_1.EventEmitter();
        this.$siguientePagina = new core_1.EventEmitter();
        this.$anteriorPagina = new core_1.EventEmitter();
        this.$ultimaPagina = new core_1.EventEmitter();
        this.paginaPrimera = 1;
        this.paginaUltima = 0;
        this.detalle = [];
        this.rows = [];
        this.data = [];
    }
    TableGenericoComponent.prototype.ngOnChanges = function (changes) {
        var _a;
        if (changes['paginacion'] && ((_a = this.paginacion) === null || _a === void 0 ? void 0 : _a.t)) {
            this.rows = __spreadArrays(this.paginacion.t); // 🔥 Actualiza `rows` cuando `paginacion` cambie
        }
    };
    TableGenericoComponent.prototype.blockContextMenu = function (event) {
        event.preventDefault(); // ✅ Bloquea el menú del navegador
        event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
    };
    TableGenericoComponent.prototype.abrirMenu = function (event) {
        var _this = this;
        if (event.event instanceof MouseEvent) { // ✅ Verifica que sea un evento de ratón
            event.event.preventDefault(); // ✅ Bloquea el menú del navegador
            event.event.stopPropagation(); // ✅ Evita que otros eventos interfieran
            // 📌 Obtener el rectángulo de la celda seleccionada
            var cellElement = event.event.target;
            var rect = cellElement.getBoundingClientRect();
            // ✅ Definir coordenadas dinámicas
            var x_1 = rect.left + 'px'; // 📌 Posición horizontal según la celda seleccionada
            var y_1 = rect.top + 'px'; // 📌 Posición vertical alineada con la celda
            setTimeout(function () {
                var overlayPane = document.querySelector('.cdk-overlay-pane');
                if (overlayPane) {
                    overlayPane.style.position = 'absolute';
                    overlayPane.style.left = x_1;
                    overlayPane.style.top = y_1;
                }
                _this.menuTrigger.openMenu();
            }, 0);
        }
        this.filaSeleccionada = event.data; // ✅ Obtiene la fila seleccionada
        //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
        if (this.menuTrigger) { // ✅ Verifica que `menuTrigger` no es undefined
            this.menuTrigger.openMenu();
        }
    };
    TableGenericoComponent.prototype.agregarFila = function () {
    };
    TableGenericoComponent.prototype.eliminarFila = function () {
    };
    TableGenericoComponent.prototype.ngAfterViewInit = function () {
        if (!this.menuTrigger) {
            console.error('menuTrigger no está inicializado');
        }
        var button = document.getElementById('menuTrigger');
        if (button) {
            button.setAttribute("style", "background-color: red !important;");
        }
    };
    TableGenericoComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.getData(1);
        document.addEventListener('click', function (event) {
            if (_this.menuTrigger.menuOpen) {
                _this.menuTrigger.closeMenu();
            }
        });
        console.log(this.rows, 'buscando ');
    };
    TableGenericoComponent.prototype.getData = function (pagina) {
        this.srvice.getData(pagina, 10).subscribe({
            next: function (res) {
                //this.paginacion = res;
                //this.rows = this.paginacion.t;
            },
            error: function (err) {
                console.error('Error en la petición:', err);
            },
            complete: function () {
                console.log('Petición completada');
            }
        });
    };
    TableGenericoComponent.prototype.primeraPagina = function () {
        this.paginaPrimera = 1;
        // this.getData(this.paginaPrimera);
        console.error('EprimeraPagina:', this.paginaPrimera);
        this.$primeraPagina.emit(this.paginaPrimera);
    };
    TableGenericoComponent.prototype.paginaAnterior = function () {
        this.paginaPrimera = this.paginaPrimera - 1;
        this.$anteriorPagina.emit(this.paginaPrimera);
    };
    TableGenericoComponent.prototype.siguientePagina = function () {
        this.paginaPrimera = this.paginaPrimera + 1;
        //this.getData(this.paginaPrimera );
        this.$siguientePagina.emit(this.paginaPrimera);
    };
    TableGenericoComponent.prototype.ultimaPagina = function () {
        var _a;
        this.paginaUltima = ((_a = this.paginacion) === null || _a === void 0 ? void 0 : _a.totalPaginas) || 0;
        //this.getData(this.paginaUltima);
        this.$ultimaPagina.emit(this.paginaUltima);
        console.error('ultimaPagina:', this.paginaUltima);
    };
    __decorate([
        core_1.ViewChild(menu_1.MatMenuTrigger)
    ], TableGenericoComponent.prototype, "menuTrigger");
    __decorate([
        core_1.ViewChild('agGrid')
    ], TableGenericoComponent.prototype, "agGrid");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "buscar");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "paginacion");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "itemAgregar");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "itemEliminar");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "styleTableWidth");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "styleTableheight");
    __decorate([
        core_1.Input()
    ], TableGenericoComponent.prototype, "columnas");
    __decorate([
        core_1.Output()
    ], TableGenericoComponent.prototype, "$primeraPagina");
    __decorate([
        core_1.Output()
    ], TableGenericoComponent.prototype, "$siguientePagina");
    __decorate([
        core_1.Output()
    ], TableGenericoComponent.prototype, "$anteriorPagina");
    __decorate([
        core_1.Output()
    ], TableGenericoComponent.prototype, "$ultimaPagina");
    TableGenericoComponent = __decorate([
        core_1.Component({
            selector: 'app-table-generico',
            templateUrl: './table-generico.component.html',
            styleUrls: ['./table-generico.component.scss']
        })
    ], TableGenericoComponent);
    return TableGenericoComponent;
}());
exports.TableGenericoComponent = TableGenericoComponent;
