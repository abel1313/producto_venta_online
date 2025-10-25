import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { en_US, NzI18nService, zh_CN } from 'ng-zorro-antd/i18n';

@Component({
  selector: 'app-mis-datos',
  templateUrl: './mis-datos.component.html',
  styleUrls: ['./mis-datos.component.scss']
})
export class MisDatosComponent implements OnInit {
  date = null;
  isEnglish = false;
  constructor(private readonly fb: FormBuilder,
    private i18n: NzI18nService
  ) {

    this.formDatosCliente = this.fb.group({
      nombrePersona: ['abel', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      segundoNombre: ['', [Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      apeidoPaterno: ['tibu', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      apeidoMaterno: ['fel', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      fechaNacimiento: ['13-05-1994', [Validators.required]],
      sexo: ['Hombre'],
      correoElectronico: ['abel@gmail.com', [Validators.required, Validators.email]],
      numeroTelefonico: ['7223475214', Validators.pattern(/^[0-9]{10}$/)],
      direcciones: this.fb.array([this.crearDireccion()])
    });
  }
  formDatosCliente: FormGroup;

  ngOnInit(): void {
  }
  get direcciones(): FormArray {
    return this.formDatosCliente.get('direcciones') as FormArray;
  }
    agregarDireccion(): void {
    this.direcciones.push(this.crearDireccion());
  }
  crearDireccion(): FormGroup {
    return this.fb.group({
      calle: ['', Validators.required],
      colonia: ['', Validators.required],
      codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      municipio: ['', Validators.required],
      referencias: ['', Validators.required]
    });
  }
  eliminarDireccion(index: number): void {
    this.direcciones.removeAt(index);
  }

    onChange(result: Date): void {
    console.log('onChange: ', result);
  }

  getWeek(result: Date): void {
    console.log('week: ', result);
  }

  changeLanguage(): void {
    this.i18n.setLocale(this.isEnglish ? zh_CN : en_US);
    this.isEnglish = !this.isEnglish;
  }

}
