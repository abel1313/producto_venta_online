import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { FavoritosRoutingModule } from './favoritos-routing.module';
import { FavoritosComponent } from './favoritos.component';

@NgModule({
  declarations: [FavoritosComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    FavoritosRoutingModule
  ]
})
export class FavoritosModule {}
