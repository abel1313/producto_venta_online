import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloresRoutingModule } from './flores-routing.module';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';

// `FormsModule` es obligatorio: las pantallas usan [(ngModel)] en los formularios de alta y
// en la edición en línea. Sin él los inputs no reaccionan.
@NgModule({
  declarations: [CatalogosFloresComponent],
  imports: [CommonModule, FormsModule, FloresRoutingModule]
})
export class FloresModule {}
