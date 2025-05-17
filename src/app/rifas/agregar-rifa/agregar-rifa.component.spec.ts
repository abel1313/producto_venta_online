import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarRifaComponent } from './agregar-rifa.component';

describe('AgregarRifaComponent', () => {
  let component: AgregarRifaComponent;
  let fixture: ComponentFixture<AgregarRifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AgregarRifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarRifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
