import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatRoutingModule } from './chat-routing.module';
import { ChatUsuarioComponent } from './chat-usuario/chat-usuario.component';

@NgModule({
  declarations: [ChatUsuarioComponent],
  imports: [
    CommonModule,
    FormsModule,
    ChatRoutingModule
  ]
})
export class ChatModule {}
