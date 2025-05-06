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
exports.AddVentaComponent = void 0;

var core_1 = require("@angular/core");

var AddVentaComponent =
/** @class */
function () {
  function AddVentaComponent(service) {
    this.service = service;
    this.styleTableWidth1 = '100%';
    this.styleTableheight1 = '400px';
    this.rows = [];
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

  AddVentaComponent.prototype.ngOnInit = function () {
    this.getData(1);
  };

  AddVentaComponent.prototype.ngOnChanges = function (changes) {
    var _a;

    if (changes['paginacion'] && ((_a = this.dataTabla) === null || _a === void 0 ? void 0 : _a.t)) {
      this.rows = __spreadArrays(this.dataTabla.t); // 🔥 Actualiza `rows` cuando `paginacion` cambie
    }
  };

  AddVentaComponent.prototype.getData = function (pagina) {
    var _this = this;

    this.service.getData(pagina, 10).subscribe({
      next: function next(res) {
        _this.dataTabla = res;
        _this.rows = _this.dataTabla.t;
      },
      error: function error(err) {
        console.error('Error en la petición:', err);
      },
      complete: function complete() {
        console.log('Petición completada');
      }
    });
  };

  AddVentaComponent.prototype.primeraPagina = function (primerPagina) {
    console.log('primrita ', primerPagina);
    this.getData(primerPagina);
  };

  AddVentaComponent.prototype.siguientePagina = function (sigPagina) {
    this.getData(sigPagina);
  };

  AddVentaComponent.prototype.anteriorPagina = function (antPagina) {
    console.log('primrita ', antPagina);
    this.getData(antPagina);
  };

  AddVentaComponent.prototype.ultimaPagina = function (ultPagina) {
    console.log('primrita ', ultPagina);
    this.getData(ultPagina);
  };

  __decorate([core_1.Input()], AddVentaComponent.prototype, "styleTableWidth1");

  __decorate([core_1.Input()], AddVentaComponent.prototype, "styleTableheight1");

  AddVentaComponent = __decorate([core_1.Component({
    selector: 'app-add-venta',
    templateUrl: './add-venta.component.html',
    styleUrls: ['./add-venta.component.scss']
  })], AddVentaComponent);
  return AddVentaComponent;
}();

exports.AddVentaComponent = AddVentaComponent;