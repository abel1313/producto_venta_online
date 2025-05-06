"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
    if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  }
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var __spreadArrays = void 0 && (void 0).__spreadArrays || function () {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
    s += arguments[i].length;
  }

  for (var r = Array(s), k = 0, i = 0; i < il; i++) {
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
      r[k] = a[j];
    }
  }

  return r;
};

exports.__esModule = true;
exports.AllComponent = void 0;

var core_1 = require("@angular/core");

var menu_1 = require("@angular/material/menu");

var AllComponent =
/** @class */
function () {
  function AllComponent(srvice) {
    this.srvice = srvice;
    this.styleTableWidth = '100%';
    this.styleTableheight = '400px';
    this.paginaPrimera = 1;
    this.paginaUltima = 0;
    this.rows = [];
    this.data = [];
    this.columns = [{
      field: 'nombre',
      headerName: 'Nombre'
    }, {
      field: 'precioCosto',
      headerName: 'Precio Costo'
    }, {
      field: 'piezas',
      headerName: 'Piezas'
    }, {
      field: 'color',
      headerName: 'Color'
    }, {
      field: 'precioVenta',
      headerName: 'Precio Venta'
    }, {
      field: 'precioRebaja',
      headerName: 'Precio Rebaja'
    }, {
      field: 'descripcion',
      headerName: 'Descripcion'
    }, {
      field: 'stock',
      headerName: 'Stock'
    }, {
      field: 'marca',
      headerName: 'Marca'
    }, {
      field: 'contenido',
      headerName: 'Contenido'
    }, {
      field: 'codigoBarras',
      headerName: 'Codigo Barras'
    }];
  }

  AllComponent.prototype.ngOnChanges = function (changes) {
    var _a;

    if (changes['paginacion'] && ((_a = this.paginacion) === null || _a === void 0 ? void 0 : _a.t)) {
      this.rows = __spreadArrays(this.paginacion.t); // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
  };

  AllComponent.prototype.blockContextMenu = function (event) {
    event.preventDefault(); // ✅ Bloquea el menú del navegador

    event.stopPropagation(); // ✅ Evita que otros eventos se propaguen
  };

  AllComponent.prototype.abrirMenu = function (event) {
    var _this = this;

    if (event.event instanceof MouseEvent) {
      // ✅ Verifica que sea un evento de ratón
      event.event.preventDefault(); // ✅ Bloquea el menú del navegador

      event.event.stopPropagation(); // ✅ Evita que otros eventos interfieran
      // 📌 Obtener el rectángulo de la celda seleccionada

      var cellElement = event.event.target;
      var rect = cellElement.getBoundingClientRect(); // ✅ Definir coordenadas dinámicas

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

    if (this.menuTrigger) {
      // ✅ Verifica que `menuTrigger` no es undefined
      this.menuTrigger.openMenu();
    } else {
      console.error('menuTrigger no está inicializado');
    }
  };

  AllComponent.prototype.agregarFila = function () {
    console.log(this.filaSeleccionada, 'das');
  };

  AllComponent.prototype.eliminarFila = function () {
    var _this = this;

    this.rows = this.rows.filter(function (row) {
      return row !== _this.filaSeleccionada;
    });
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
    var _this = this;

    this.getData(1);
    document.addEventListener('click', function (event) {
      if (_this.menuTrigger.menuOpen) {
        _this.menuTrigger.closeMenu();
      }
    });
    console.log(this.rows, 'buscando ');
  };

  AllComponent.prototype.getData = function (pagina) {
    var _this = this;

    this.srvice.getData(pagina, 10).subscribe({
      next: function next(res) {
        console.log('Datos obtenidos:', res);
        _this.paginacion = res;
        _this.rows = _this.paginacion.t;
      },
      error: function error(err) {
        console.error('Error en la petición:', err);
      },
      complete: function complete() {
        console.log('Petición completada');
      }
    });
  };

  AllComponent.prototype.primeraPagina = function () {
    this.paginaPrimera = 1;
    this.getData(this.paginaPrimera);
    console.error('EprimeraPagina:', this.paginaPrimera);
  };

  AllComponent.prototype.paginaAnterior = function () {
    this.paginaPrimera = this.paginaPrimera - 1;
    this.getData(this.paginaPrimera);
  };

  AllComponent.prototype.siguientePagina = function () {
    this.paginaPrimera = this.paginaPrimera + 1;
    this.getData(this.paginaPrimera);
  };

  AllComponent.prototype.ultimaPagina = function () {
    var _a, _b;

    this.paginaUltima = ((_a = this.paginacion) === null || _a === void 0 ? void 0 : _a.totalPaginas) || 0;
    this.paginaPrimera = ((_b = this.paginacion) === null || _b === void 0 ? void 0 : _b.totalPaginas) || 0;
    this.getData(this.paginaUltima);
    console.error('ultimaPagina:', this.paginaUltima);
  };

  __decorate([core_1.ViewChild(menu_1.MatMenuTrigger)], AllComponent.prototype, "menuTrigger");

  __decorate([core_1.ViewChild('agGrid')], AllComponent.prototype, "agGrid");

  __decorate([core_1.Input()], AllComponent.prototype, "buscar");

  __decorate([core_1.Input()], AllComponent.prototype, "paginacion");

  __decorate([core_1.Input()], AllComponent.prototype, "itemAgregar");

  __decorate([core_1.Input()], AllComponent.prototype, "itemEliminar");

  __decorate([core_1.Input()], AllComponent.prototype, "styleTableWidth");

  __decorate([core_1.Input()], AllComponent.prototype, "styleTableheight");

  AllComponent = __decorate([core_1.Component({
    selector: 'app-all',
    templateUrl: './all.component.html',
    styleUrls: ['./all.component.scss']
  })], AllComponent);
  return AllComponent;
}();

exports.AllComponent = AllComponent;