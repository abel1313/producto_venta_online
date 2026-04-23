import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateVarianteComponent } from './update-variante.component';

describe('UpdateVarianteComponent', () => {
  let component: UpdateVarianteComponent;
  let fixture: ComponentFixture<UpdateVarianteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateVarianteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateVarianteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
