import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { CodigoPublicoComponent } from './codigo-publico.component';

const routes: Routes = [{ path: '', component: CodigoPublicoComponent }];

@NgModule({
  declarations: [CodigoPublicoComponent],
  imports: [CommonModule, QRCodeModule, RouterModule.forChild(routes)],
})
export class CodigoPublicoModule {}
