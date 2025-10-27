import { TestBed } from '@angular/core/testing';

import { SinRegistroGuard } from './sin-registro.guard';

describe('SinRegistroGuard', () => {
  let guard: SinRegistroGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(SinRegistroGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
