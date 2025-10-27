import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClietesRoutingModule } from './clietes-routing.module';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { ClientesBuscarComponent } from './clientes-buscar/clientes-buscar.component';
import { ClientesMostrarComponent } from './clientes-mostrar/clientes-mostrar.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { NbAutocompleteModule, NbCardModule, NbDatepickerModule, NbFormFieldModule, NbSelectModule, NbStepperModule } from '@nebular/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { InputTextModule } from 'primeng/inputtext';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { CalendarModule } from 'primeng/calendar';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@NgModule({
  declarations: [
    ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent,
    MisDatosComponent
  ],
  imports: [
    CommonModule,
    ClietesRoutingModule,
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
    NzSwitchModule

  ],
  exports: [
    ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent
  ]
})
export class ClietesModule { }
