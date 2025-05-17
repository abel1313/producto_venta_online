import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MostrarRifasComponent } from './mostrar-rifas.component';

describe('MostrarRifasComponent', () => {
  let component: MostrarRifasComponent;
  let fixture: ComponentFixture<MostrarRifasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MostrarRifasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MostrarRifasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
