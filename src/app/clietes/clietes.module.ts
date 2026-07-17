import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClietesRoutingModule } from './clietes-routing.module';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { ClientesBuscarComponent } from './clientes-buscar/clientes-buscar.component';
import { ClientesMostrarComponent } from './clientes-mostrar/clientes-mostrar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { CambiarPasswordComponent } from './cambiar-password/cambiar-password.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { AgregarCompraComponent } from './agregar-compra/agregar-compra.component';
import { NbAutocompleteModule, NbCardModule, NbDatepickerModule, NbFormFieldModule, NbSelectModule, NbStepperModule } from '@nebular/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { InputTextModule } from 'primeng/inputtext';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { CalendarModule } from 'primeng/calendar';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent,
    MisDatosComponent,
    CambiarPasswordComponent,
    MiPerfilComponent,
    AgregarCompraComponent
  ],
  imports: [
    CommonModule,
    ClietesRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NzStepsModule,
    NbStepperModule,
    NbCardModule,
    NzButtonModule,
    InputTextModule,
    NbDatepickerModule,
    NzDatePickerModule,
    CalendarModule,
    NbSelectModule,
    NbAutocompleteModule,
    NbFormFieldModule,
    NzSwitchModule,
    SharedModule
  ],
  exports: [
    ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent
  ]
})
export class ClietesModule { }
