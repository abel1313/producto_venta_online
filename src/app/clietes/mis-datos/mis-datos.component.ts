import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from '../cliente.service';
import { MensajesGenericos } from './../../swife/swal.model';
import { ICliente, InitCliente } from './models/index.model';

@Component({
  selector: 'app-mis-datos',
  templateUrl: './mis-datos.component.html',
  styleUrls: ['./mis-datos.component.scss']
})
export class MisDatosComponent implements OnInit {
  date = null;
  isEnglish = false;
  datosCliente: ICliente = InitCliente.initCliente();

  switchValue = false;
  isDisabled = true;

  idUusario: number = 0;
  constructor(private readonly fb: FormBuilder,
    private readonly clienteServoce: ClienteService,
    private readonly authService: AuthService
  ) {

    this.formDatosCliente = this.fb.group({
      nombrePersona: ['abel', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      segundoNombre: ['', [Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      apeidoPaterno: ['tibu', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      apeidoMaterno: ['fel', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/)]],
      fechaNacimiento: [new Date(), [Validators.required]],
      sexo: ['Hombre'],
      correoElectronico: ['abel@gmail.com', [Validators.required, Validators.email]],
      numeroTelefonico: ['7223475214', Validators.pattern(/^[0-9]{10}$/)],
      listDirecciones: this.fb.array([])

    });
  }
  formDatosCliente: FormGroup;

  ngOnInit(): void {
    this.authService.userId$.subscribe(idUser => {
      this.idUusario = idUser;
    });
    this.clienteServoce.getDataOneCliente(this.idUusario).subscribe((data: any) => {
      if (data && data.data) {
        this.formDatosCliente.patchValue({
          nombrePersona: data.data.nombrePersona,
          segundoNombre: data.data.segundoNombre,
          apeidoPaterno: data.data.apeidoPaterno,
          apeidoMaterno: data.data.apeidoMaterno,
          fechaNacimiento: new Date(data.data.fechaNacimiento),
          sexo: data.data.sexo,
          correoElectronico: data.data.correoElectronico,
          numeroTelefonico: data.data.numeroTelefonico,
        });

        if (data.data.listDirecciones && data.data.listDirecciones.length > 0) {
          data.data.listDirecciones.forEach((dir: any, index: number) => {
            const direccionForm = this.fb.group({
              calle: [dir.calle, Validators.required],
              colonia: [dir.colonia, Validators.required],
              codigoPostal: [dir.codigoPostal, [Validators.required, Validators.pattern(/^\d{5}$/)]],
              municipio: [dir.municipio, Validators.required],
              referencias: [dir.referencias, Validators.required],
              predefinida: [dir.predefinida]
            });

            this.listDirecciones.push(direccionForm);
            this.suscribirCambioPredefinida(direccionForm, index);
          });

        } else {
          // Si no hay direcciones, agrega una vacía
          const nueva = this.crearDireccion(true);
          this.listDirecciones.push(nueva);
          this.suscribirCambioPredefinida(nueva, 0);
        }
      }

    })

    if (this.listDirecciones.length > 0) {
      const primeraDireccion = this.listDirecciones.at(0) as FormGroup;

      const yaHayActiva = this.listDirecciones.controls.some(c => c.get('predefinida')?.value);
      if (!yaHayActiva) {
        primeraDireccion.get('predefinida')?.setValue(true, { emitEvent: false });
      }

      this.suscribirCambioPredefinida(primeraDireccion, 0);
    }


    // Suscribirse a cambios
  }


  guardarCliente() {

    this.datosCliente = this.formDatosCliente.value;
    const fechaRaw = this.formDatosCliente.get('fechaNacimiento')?.value;
    const fecha = new Date(fechaRaw);

    if (fechaRaw) {
      const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(fecha);
      this.datosCliente.fechaNacimiento = fecha;
    }
    //return;



    this.authService.userId$.subscribe(idUser => {
      const usr = {
        id: idUser,
        email: "",
        enabled: false,
        password: "",
        rol: "",
        username: ''
      }
      this.datosCliente.usuario = usr;
    });

    this.clienteServoce.saveData(this.datosCliente).subscribe(save => {

      MensajesGenericos.mostrarMensajeSuccess(save.mensaje, save.code);

    }, error => {
      MensajesGenericos.mostrarMensajeSuccess("Ocurrio un error, intente de nuevo", 500);
    });
  }

  getCodigoPostal(codigoPostal: any, iteracion: number) {
    const codigo = codigoPostal.target.value;
    this.clienteServoce.getCodigoPostal(codigo).subscribe(res => {
      const direcciones = this.formDatosCliente.get('listDirecciones') as FormArray;
      const direccion = direcciones.at(iteracion) as FormGroup;
      const calle = direccion.get('calle')?.value;
 
      direccion.patchValue({
        municipio: res.codigo_postal.municipio
      });

    });

  }
  get listDirecciones(): FormArray {
    return this.formDatosCliente?.get('listDirecciones') as FormArray;
  }

  agregarDireccion(): void {
    const yaHayActiva = this.listDirecciones.controls.some(c => {
      return c instanceof FormGroup && c.get('predefinida')?.value;
    });

    const nuevaDireccion = this.crearDireccion(!yaHayActiva); // solo si no hay activa

    this.listDirecciones.push(nuevaDireccion);
    this.suscribirCambioPredefinida(nuevaDireccion, this.listDirecciones.length - 1);
  }


  crearDireccion(predefinida: boolean = false): FormGroup {
    return this.fb.group({
      calle: ['', Validators.required],
      colonia: ['', Validators.required],
      codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      municipio: ['', Validators.required],
      referencias: ['', Validators.required],
      predefinida: [predefinida]
    });
  }

  eliminarDireccion(index: number): void {
    this.listDirecciones.removeAt(index);

    const activas = this.listDirecciones.controls.filter(c => c.get('predefinida')?.value);
    if (activas.length === 0 && this.listDirecciones.length > 0) {
      this.listDirecciones.at(0).get('predefinida')?.setValue(true, { emitEvent: false });
    }
  }



  cambiarDireccion(): void {

    const direcciones = this.formDatosCliente.get('listDirecciones') as FormArray;

    direcciones.controls.forEach((control, index) => {
      const direccion = control as FormGroup;

      direccion.get('predefinida')?.valueChanges.subscribe(valor => {
        if (valor) {
          // Activar solo esta dirección, desactivar todas las demás
          direcciones.controls.forEach((c, i) => {
            if (i !== index) {
              (c as FormGroup).patchValue({ predefinida: false }, { emitEvent: false });
            }
          });
        } else {
          // Evitar desactivar la única activa
          const activas = direcciones.controls.filter(c => c.get('predefinida')?.value);
          if (activas.length === 0) {
            direccion.patchValue({ predefinida: true }, { emitEvent: false });
          }
        }
      });
    });
  }


  suscribirCambioPredefinida(direccion: FormGroup, index: number): void {
    direccion.get('predefinida')?.valueChanges.subscribe(valor => {
      const direcciones = this.listDirecciones;

      if (valor) {
        // Desactiva todas las demás
        direcciones.controls.forEach((c, i) => {
          if (i !== index) {
            c.get('predefinida')?.setValue(false, { emitEvent: false });
          }
        });
      } else {
        // Evita que todas estén desactivadas
        const activas = direcciones.controls.filter(c => c.get('predefinida')?.value);
        if (activas.length === 0) {
          direccion.get('predefinida')?.setValue(true, { emitEvent: false });
        }
      }
    });
  }



}
