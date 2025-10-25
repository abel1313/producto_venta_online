import { TestBed } from '@angular/core/testing';

import { RegistrosGuard } from './registros.guard';

describe('RegistrosGuard', () => {
  let guard: RegistrosGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(RegistrosGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
