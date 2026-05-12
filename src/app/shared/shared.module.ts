import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagenSrcPipe } from '../productos/producto/pipes/imagen-src.pipe';

@NgModule({
  declarations: [ImagenSrcPipe],
  imports:      [CommonModule],
  exports:      [ImagenSrcPipe]
})
export class SharedModule {}
