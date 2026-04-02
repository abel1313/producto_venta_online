import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrVentasJadeComponent } from './qr-ventas-jade.component';

describe('QrVentasJadeComponent', () => {
  let component: QrVentasJadeComponent;
  let fixture: ComponentFixture<QrVentasJadeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QrVentasJadeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrVentasJadeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
