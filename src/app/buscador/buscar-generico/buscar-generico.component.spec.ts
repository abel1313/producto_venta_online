import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarGenericoComponent } from './buscar-generico.component';

describe('BuscarGenericoComponent', () => {
  let component: BuscarGenericoComponent;
  let fixture: ComponentFixture<BuscarGenericoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BuscarGenericoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuscarGenericoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
