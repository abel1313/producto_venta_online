import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImagenVersionService {
  private _useV2 = new BehaviorSubject<boolean>(false);
  useV2$ = this._useV2.asObservable();

  get useV2(): boolean { return this._useV2.getValue(); }

  toggle(): void { this._useV2.next(!this._useV2.getValue()); }
}
