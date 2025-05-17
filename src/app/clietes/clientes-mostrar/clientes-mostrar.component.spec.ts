import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesMostrarComponent } from './clientes-mostrar.component';

describe('ClientesMostrarComponent', () => {
  let component: ClientesMostrarComponent;
  let fixture: ComponentFixture<ClientesMostrarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClientesMostrarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientesMostrarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
