import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { CacheComponent } from './cache/cache.component';

@NgModule({
  declarations: [CacheComponent],
  imports: [CommonModule, AdminRoutingModule]
})
export class AdminModule {}
