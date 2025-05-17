import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarRifaComponent } from './buscar-rifa.component';

describe('BuscarRifaComponent', () => {
  let component: BuscarRifaComponent;
  let fixture: ComponentFixture<BuscarRifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BuscarRifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuscarRifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
