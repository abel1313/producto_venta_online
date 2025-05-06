import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableGenericoComponent } from './table-generico.component';

describe('TableGenericoComponent', () => {
  let component: TableGenericoComponent;
  let fixture: ComponentFixture<TableGenericoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableGenericoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableGenericoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
