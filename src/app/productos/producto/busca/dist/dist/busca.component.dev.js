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

exports.__esModule = true;
exports.BuscaComponent = void 0;

var core_1 = require("@angular/core");

var BuscaComponent =
/** @class */
function () {
  function BuscaComponent(service) {
    this.service = service;
    this.buscarProd = '';
    this.itemAgregar = 'AgregarProd';
    this.itemEliminar = 'DeleteProd';
    this.styleTableWidth1 = '100%';
    this.styleTableheight1 = '400px';
  }

  BuscaComponent.prototype.ngOnInit = function () {};

  BuscaComponent.prototype.buscarProductos = function (event) {
    var texto = event.target.value.toLowerCase();
    this.buscarProd = texto;
    this.buscarPorNombreCodigoPostal(1, 10, this.buscarProd);
  };

  BuscaComponent.prototype.buscarPorNombreCodigoPostal = function (pagina, size, nombre) {
    var _this = this;

    this.service.getDataNombreCodigoBarra(pagina, size, nombre).subscribe({
      next: function next(res) {
        _this.paginacionBuscar = res;
      },
      error: function error(err) {
        console.error('Error en la petición:', err);
      },
      complete: function complete() {
        console.log('Petición completada');
      }
    });
  };

  __decorate([core_1.Input()], BuscaComponent.prototype, "itemAgregar");

  __decorate([core_1.Input()], BuscaComponent.prototype, "itemEliminar");

  __decorate([core_1.Input()], BuscaComponent.prototype, "styleTableWidth1");

  __decorate([core_1.Input()], BuscaComponent.prototype, "styleTableheight1");

  BuscaComponent = __decorate([core_1.Component({
    selector: 'app-busca',
    templateUrl: './busca.component.html',
    styleUrls: ['./busca.component.scss']
  })], BuscaComponent);
  return BuscaComponent;
}();

exports.BuscaComponent = BuscaComponent;