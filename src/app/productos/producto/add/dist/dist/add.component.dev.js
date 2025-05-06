"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var __assign = void 0 && (void 0).__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __decorate = void 0 && (void 0).__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if ((typeof Reflect === "undefined" ? "undefined" : _typeof(Reflect)) === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) {
    if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  }
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var __rest = void 0 && (void 0).__rest || function (s, e) {
  var t = {};

  for (var p in s) {
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  }

  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
};

exports.__esModule = true;
exports.AddComponent = void 0;

var core_1 = require("@angular/core");

var forms_1 = require("@angular/forms");

var AddComponent =
/** @class */
function () {
  function AddComponent(fb) {
    var _this = this;

    var _a;

    this.fb = fb;
    this.nombreCard = '';

    if (this.nombreCard == '') {
      this.nombreCard = 'Agrgar Producto';
    }

    this.productoSave = {
      nombre: '',
      precioCosto: 0,
      piezas: 0,
      color: '',
      precioVenta: 0,
      precioRebaja: 0,
      descripcion: '',
      stock: 0,
      marca: '',
      contenido: '',
      codigoBarras: {
        codigoBarra: '',
        id: 0
      }
    };
    this.formProductos = this.fb.group({
      nombre: ['sdasd', [forms_1.Validators.required, forms_1.Validators.maxLength(10)]],
      precioCosto: ['asdsd', forms_1.Validators.required],
      piezas: ['asdas', forms_1.Validators.required],
      color: ['asdas'],
      precioVenta: ['asdas', forms_1.Validators.required],
      precioRebaja: ['asdas', forms_1.Validators.required],
      descipcion: ['asdas', forms_1.Validators.required],
      stock: ['asdas', forms_1.Validators.required],
      marca: ['asdas', forms_1.Validators.required],
      contenidoNeto: ['asdas', forms_1.Validators.required],
      codigoBarra: ['asdas', forms_1.Validators.required],
      sinCodigoBarra: [false]
    }); // Escuchar cambios en el checkbox para modificar validación

    (_a = this.formProductos.get('sinCodigoBarra')) === null || _a === void 0 ? void 0 : _a.valueChanges.subscribe(function (sinCodigo) {
      var _a;

      var codigoControl = _this.formProductos.get('codigoBarra');

      if (sinCodigo) {
        (_a = _this.formProductos.get('codigoBarra')) === null || _a === void 0 ? void 0 : _a.setValue('');
        codigoControl === null || codigoControl === void 0 ? void 0 : codigoControl.clearValidators(); // ✅ Quita la validación de requerido
      } else {
        codigoControl === null || codigoControl === void 0 ? void 0 : codigoControl.setValidators(forms_1.Validators.required); // ✅ Reactiva la validación de requerido
      }

      codigoControl === null || codigoControl === void 0 ? void 0 : codigoControl.updateValueAndValidity(); // ✅ Actualiza la validación en tiempo real
    });
  }

  AddComponent.prototype.ngOnInit = function () {};

  AddComponent.prototype.producto = function () {
    if (this.formProductos.valid) {
      var _a = this.formProductos.value,
          codigoBarra = _a.codigoBarra,
          productoData = __rest(_a, ["codigoBarra"]);

      var producto = __assign(__assign({}, productoData), {
        codigoBarras: {
          codigoBarra: codigoBarra
        } // ✅ Transformamos el código de barras en `ICodigoBarra`

      });

      if (!producto.codigoBarras) {
        producto.codigoBarras = {
          codigoBarra: '',
          id: 6
        }; // ✅ Si no está definido, lo inicializamos
      } else {
        producto.codigoBarras.id = 6; // ✅ Si ya está definido, solo asignamos `id`
      }

      this.productoSave = producto;
    }
  };

  AddComponent.prototype.guardar = function () {};

  AddComponent.prototype.update = function () {};

  __decorate([core_1.Input()], AddComponent.prototype, "nombreCard");

  AddComponent = __decorate([core_1.Component({
    selector: 'app-add',
    templateUrl: './add.component.html',
    styleUrls: ['./add.component.scss']
  })], AddComponent);
  return AddComponent;
}();

exports.AddComponent = AddComponent;