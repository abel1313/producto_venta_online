import { TestBed } from '@angular/core/testing';

import { AccederService } from './acceder.service';

describe('AccederService', () => {
  let service: AccederService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccederService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
