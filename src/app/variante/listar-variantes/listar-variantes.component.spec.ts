import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarVariantesComponent } from './listar-variantes.component';

describe('ListarVariantesComponent', () => {
  let component: ListarVariantesComponent;
  let fixture: ComponentFixture<ListarVariantesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListarVariantesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarVariantesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
