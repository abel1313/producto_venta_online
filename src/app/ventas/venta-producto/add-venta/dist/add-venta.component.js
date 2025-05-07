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
exports.AddVentaComponent = void 0;
var core_1 = require("@angular/core");
var menu_1 = require("@angular/material/menu");
var AddVentaComponent = /** @class */ (function () {
    function AddVentaComponent(service) {
        this.service = service;
        this.rowsBuscador = [];
        this.buscarProd = '';
        this.styleTableWidthBuscador = '100%';
        this.styleTableheightBusador = '200px';
        this.paginaPrimeraBuscador = 1;
        this.paginaUltimaBuscador = 0;
        this.rowsDetalle = [];
        this.styleTableWidthDetalle = '100%';
        this.styleTableheightDetalle = '200px';
        this.paginaPrimeraDetalle = 1;
        this.paginaUltimaDetalle = 0;
        this.columnsBuscador = [
            { field: 'nombre', headerName: 'Nombre' },
            { field: 'precioCosto', headerName: 'Precio Costo' },
            { field: 'piezas', headerName: 'Piezas' },
            { field: 'color', headerName: 'Color' },
            { field: 'precioVenta', headerName: 'Precio Venta' },
            { field: 'precioRebaja', headerName: 'Precio Rebaja' },
            { field: 'descripcion', headerName: 'Descripcion' },
            { field: 'stock', headerName: 'Stock' },
            { field: 'marca', headerName: 'Marca' },
            { field: 'contenido', headerName: 'Contenido' },
            { field: 'codigoBarras', headerName: 'Codigo Barras' }
        ];
        this.columnsDetalle = [
            { field: 'nombre', headerName: 'Nombre' },
            { field: 'descripcion', headerName: 'Descripcion' },
            { field: 'stock', headerName: 'Stock' },
            { field: 'precioVenta', headerName: 'Precio Venta' },
            { field: 'codigoBarras', headerName: 'Codigo Barras' },
            { field: 'cantidad', headerName: 'Cantidad' },
            { field: 'subTotal', headerName: 'Sub total' }
        ];
        this.detalle = [];
        this.totalDetalle = 0;
        this.usuario = {
            nombre: ''
        };
        this.venta = {
            usuario: this.usuario,
            totalVenta: 0
        };
        this.detalleVenta = [];
    }
    AddVentaComponent.prototype.ngOnInit = function () {
        this.getDataBuscador(1);
    };
    AddVentaComponent.prototype.ngOnChangesBuscador = function (changes) {
        var _a;
        if (changes['paginacion'] && ((_a = this.paginacionBuscador) === null || _a === void 0 ? void 0 : _a.t)) {
            this.rowsBuscador = __spreadArrays(this.paginacionBuscador.t); // 🔥 Actualiza `rows` cuando `paginacion` cambie
        }
    };
    AddVentaComponent.prototype.agregarFilaBuscador = function () {
        var _a = this.filaSeleccionadaBuscador, nombre = _a.nombre, descripcion = _a.descripcion, stock = _a.stock, precioVenta = _a.precioVenta, codigoBarras = _a.codigoBarras;
        var canti = 1;
        var prod = {
            nombre: nombre,
            descripcion: descripcion,
            stock: stock,
            precioVenta: precioVenta,
            codigoBarras: codigoBarras,
            cantidad: canti,
            subTotal: 0
        };
        // Buscar si ya existe el producto
        var index2 = this.detalleVenta.findIndex(function (item) { return item.codigoBarras === prod.codigoBarras && item.nombre === prod.nombre; });
        if (index2 !== -1) {
            // Si existe, incrementar la cantidad y actualizar el total
            this.detalleVenta[index2].cantidad += 1;
        }
        else {
            // Si no existe, agregarlo a la lista
            this.detalleVenta.push(prod);
        }
        // Calcular el total de cada producto
        this.detalleVenta.forEach(function (item) { return item.subTotal = item.cantidad * item.precioVenta; });
        console.log(this.detalleVenta, 'detalleVenta actualizado');
        this.rowsDetalle = __spreadArrays(this.detalleVenta);
        this.totalDetalle = this.rowsDetalle.reduce(function (sum, item) { return sum + item.subTotal; }, 0);
        console.log(this.totalDetalle, 'detalleVenta actualizado');
    };
    AddVentaComponent.prototype.saveDetalle = function () {
        this.service.saveVenta(this.detalleVenta).subscribe({
            next: function (res) {
                console.log(res, '------------------------------------------------ ');
            },
            error: function (err) {
                console.error('Error en la petición:', err);
            },
            complete: function () {
                console.log('Petición completada');
            }
        });
    };
    AddVentaComponent.prototype.eliminarFilaBuscador = function () {
        var _this = this;
        this.rowsBuscador = this.rowsBuscador.filter(function (row) { return row !== _this.filaSeleccionadaBuscador; });
    };
    AddVentaComponent.prototype.getDataBuscador = function (paginaBuscador) {
        var _this = this;
        this.service.getData(paginaBuscador, 10).subscribe({
            next: function (res) {
                _this.paginacionBuscador = res;
                _this.rowsBuscador = _this.paginacionBuscador.t;
            },
            error: function (err) {
                console.error('Error en la petición:', err);
            },
            complete: function () {
                console.log('Petición completada');
            }
        });
    };
    AddVentaComponent.prototype.blockContextMenuBuscador = function (event) {
        event.preventDefault(); // ✅ Bloquea el menú del navegador
        event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
    };
    AddVentaComponent.prototype.abrirMenuBuscador = function (event) {
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
                _this.menuTriggerBuscador.openMenu();
            }, 0);
        }
        this.filaSeleccionadaBuscador = event.data; // ✅ Obtiene la fila seleccionada
        //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
        if (this.menuTriggerBuscador) { // ✅ Verifica que `menuTrigger` no es undefined
            this.menuTriggerBuscador.openMenu();
        }
    };
    AddVentaComponent.prototype.primeraPaginaBuscador = function () {
        this.paginaPrimeraBuscador = 1;
        this.getDataBuscador(this.paginaPrimeraBuscador);
    };
    AddVentaComponent.prototype.paginaAnteriorBuscador = function () {
        this.paginaPrimeraBuscador = this.paginaPrimeraBuscador - 1;
        this.getDataBuscador(this.paginaPrimeraBuscador);
    };
    AddVentaComponent.prototype.siguientePaginaBuscador = function () {
        this.paginaPrimeraBuscador = this.paginaPrimeraBuscador + 1;
        this.getDataBuscador(this.paginaPrimeraBuscador);
    };
    AddVentaComponent.prototype.ultimaPaginaBuscador = function () {
        var _a, _b;
        this.paginaUltimaBuscador = ((_a = this.paginacionBuscador) === null || _a === void 0 ? void 0 : _a.totalPaginas) || 0;
        this.paginaPrimeraBuscador = ((_b = this.paginacionBuscador) === null || _b === void 0 ? void 0 : _b.totalPaginas) || 0;
        this.getDataBuscador(this.paginaUltimaBuscador);
    };
    AddVentaComponent.prototype.buscarProductos = function (event) {
        var texto = event.target.value.toLowerCase();
        this.buscarProd = texto;
        this.buscarPorNombreCodigoPostal(1, 10, this.buscarProd);
    };
    AddVentaComponent.prototype.buscarPorNombreCodigoPostal = function (pagina, size, nombre) {
        var _this = this;
        this.service.getDataNombreCodigoBarra(pagina, size, nombre).subscribe({
            next: function (res) {
                _this.paginacionBuscador = res;
                _this.rowsBuscador = _this.paginacionBuscador.t;
            },
            error: function (err) {
                console.error('Error en la petición:', err);
            },
            complete: function () {
                console.log('Petición completada');
            }
        });
    };
    AddVentaComponent.prototype.ngOnChangesDetalle = function (changes) {
        var _a;
        if (changes['paginacion'] && ((_a = this.paginacionDetalle) === null || _a === void 0 ? void 0 : _a.t)) {
            this.rowsDetalle = __spreadArrays(this.paginacionDetalle.t); // 🔥 Actualiza `rows` cuando `paginacion` cambie
        }
    };
    AddVentaComponent.prototype.eliminarFilaDetalle = function () {
        var _this = this;
        this.rowsDetalle = this.rowsDetalle.filter(function (row) { return row !== _this.filaSeleccionadaDetalle; });
    };
    AddVentaComponent.prototype.getDataDetalle = function (paginaDetalle) {
        var _this = this;
        this.service.getData(paginaDetalle, 10).subscribe({
            next: function (res) {
                _this.paginacionDetalle = res;
                _this.rowsDetalle = _this.paginacionDetalle.t;
            },
            error: function (err) {
                console.error('Error en la petición:', err);
            },
            complete: function () {
                console.log('Petición completada');
            }
        });
    };
    AddVentaComponent.prototype.blockContextMenuDetalle = function (event) {
        event.preventDefault(); // ✅ Bloquea el menú del navegador
        event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
    };
    AddVentaComponent.prototype.abrirMenuDetalle = function (event) {
        var _this = this;
        if (event.event instanceof MouseEvent) { // ✅ Verifica que sea un evento de ratón
            event.event.preventDefault(); // ✅ Bloquea el menú del navegador
            event.event.stopPropagation(); // ✅ Evita que otros eventos interfieran
            // 📌 Obtener el rectángulo de la celda seleccionada
            var cellElement = event.event.target;
            var rect = cellElement.getBoundingClientRect();
            // ✅ Definir coordenadas dinámicas
            var x_2 = rect.left + 'px'; // 📌 Posición horizontal según la celda seleccionada
            var y_2 = rect.top + 'px'; // 📌 Posición vertical alineada con la celda
            setTimeout(function () {
                var overlayPane = document.querySelector('.cdk-overlay-pane');
                if (overlayPane) {
                    overlayPane.style.position = 'absolute';
                    overlayPane.style.left = x_2;
                    overlayPane.style.top = y_2;
                }
                _this.menuTriggerDetalle.openMenu();
            }, 0);
        }
        this.filaSeleccionadaDetalle = event.data; // ✅ Obtiene la fila seleccionada
        //this.menuTrigger.openMenu(); // ✅ Abre el menú contextual
        if (this.menuTriggerDetalle) { // ✅ Verifica que `menuTrigger` no es undefined
            this.menuTriggerDetalle.openMenu();
        }
    };
    AddVentaComponent.prototype.primeraPaginaDetalle = function () {
        this.paginaPrimeraDetalle = 1;
        this.getDataDetalle(this.paginaPrimeraDetalle);
    };
    AddVentaComponent.prototype.paginaAnteriorDetalle = function () {
        this.paginaPrimeraDetalle = this.paginaPrimeraDetalle - 1;
        this.getDataDetalle(this.paginaPrimeraDetalle);
    };
    AddVentaComponent.prototype.siguientePaginaDetalle = function () {
        this.paginaPrimeraDetalle = this.paginaPrimeraDetalle + 1;
        this.getDataDetalle(this.paginaPrimeraDetalle);
    };
    AddVentaComponent.prototype.ultimaPaginaDetalle = function () {
        var _a, _b;
        this.paginaUltimaDetalle = ((_a = this.paginacionDetalle) === null || _a === void 0 ? void 0 : _a.totalPaginas) || 0;
        this.paginaPrimeraDetalle = ((_b = this.paginacionDetalle) === null || _b === void 0 ? void 0 : _b.totalPaginas) || 0;
        this.getDataDetalle(this.paginaUltimaDetalle);
    };
    __decorate([
        core_1.ViewChild(menu_1.MatMenuTrigger)
    ], AddVentaComponent.prototype, "menuTriggerBuscador");
    __decorate([
        core_1.ViewChild('agGrid')
    ], AddVentaComponent.prototype, "agGrid");
    __decorate([
        core_1.ViewChild(menu_1.MatMenuTrigger)
    ], AddVentaComponent.prototype, "menuTriggerDetalle");
    AddVentaComponent = __decorate([
        core_1.Component({
            selector: 'app-add-venta',
            templateUrl: './add-venta.component.html',
            styleUrls: ['./add-venta.component.scss']
        })
    ], AddVentaComponent);
    return AddVentaComponent;
}());
exports.AddVentaComponent = AddVentaComponent;
