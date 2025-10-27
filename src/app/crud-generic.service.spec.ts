import { TestBed } from '@angular/core/testing';

import { CrudGenericService } from './crud-generic.service';

describe('CrudGenericService', () => {
  let service: CrudGenericService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrudGenericService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
