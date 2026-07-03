import { Injectable } from '@angular/core';

export interface IBannerPromo {
  imagenBase64?: string;  // data URL (base64)
  imagenUrl?: string;     // URL externa alternativa
  titulo?: string;
  texto?: string;
  link?: string;
  activo: boolean;
}

const KEY_LEFT  = 'promo_banner_left';
const KEY_RIGHT = 'promo_banner_right';

const DEFAULT: IBannerPromo = { activo: false };

@Injectable({ providedIn: 'root' })
export class BannerPromoService {

  getBannerLeft(): IBannerPromo {
    return this.load(KEY_LEFT);
  }

  getBannerRight(): IBannerPromo {
    return this.load(KEY_RIGHT);
  }

  saveBannerLeft(b: IBannerPromo): void {
    this.save(KEY_LEFT, b);
  }

  saveBannerRight(b: IBannerPromo): void {
    this.save(KEY_RIGHT, b);
  }

  private load(key: string): IBannerPromo {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : { ...DEFAULT };
    } catch {
      return { ...DEFAULT };
    }
  }

  private save(key: string, b: IBannerPromo): void {
    localStorage.setItem(key, JSON.stringify(b));
  }
}
