import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllVentaComponent } from './all-venta.component';

describe('AllVentaComponent', () => {
  let component: AllVentaComponent;
  let fixture: ComponentFixture<AllVentaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllVentaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
