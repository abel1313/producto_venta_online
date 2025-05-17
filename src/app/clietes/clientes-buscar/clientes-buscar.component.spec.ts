import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesBuscarComponent } from './clientes-buscar.component';

describe('ClientesBuscarComponent', () => {
  let component: ClientesBuscarComponent;
  let fixture: ComponentFixture<ClientesBuscarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClientesBuscarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientesBuscarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
