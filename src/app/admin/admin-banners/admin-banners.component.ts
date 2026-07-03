import { Component, OnInit } from '@angular/core';
import { BannerPromoService, IBannerPromo } from 'src/app/shared/services/banner-promo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-banners',
  templateUrl: './admin-banners.component.html',
  styleUrls: ['./admin-banners.component.scss']
})
export class AdminBannersComponent implements OnInit {

  bannerLeft:  IBannerPromo = { activo: false };
  bannerRight: IBannerPromo = { activo: false };

  previewLeft:  string | null = null;
  previewRight: string | null = null;

  guardandoLeft  = false;
  guardandoRight = false;

  constructor(private readonly bannerService: BannerPromoService) {}

  ngOnInit(): void {
    this.bannerLeft  = { ...this.bannerService.getBannerLeft() };
    this.bannerRight = { ...this.bannerService.getBannerRight() };
    this.previewLeft  = this.bannerLeft.imagenBase64  || this.bannerLeft.imagenUrl  || null;
    this.previewRight = this.bannerRight.imagenBase64 || this.bannerRight.imagenUrl || null;
  }

  onFileLeft(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readFile(file, (b64) => {
      this.bannerLeft.imagenBase64 = b64;
      this.bannerLeft.imagenUrl    = '';
      this.previewLeft = b64;
    });
  }

  onFileRight(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.readFile(file, (b64) => {
      this.bannerRight.imagenBase64 = b64;
      this.bannerRight.imagenUrl    = '';
      this.previewRight = b64;
    });
  }

  urlLeftChange(url: string): void {
    this.bannerLeft.imagenUrl    = url;
    this.bannerLeft.imagenBase64 = '';
    this.previewLeft = url || null;
  }

  urlRightChange(url: string): void {
    this.bannerRight.imagenUrl    = url;
    this.bannerRight.imagenBase64 = '';
    this.previewRight = url || null;
  }

  guardarLeft(): void {
    this.guardandoLeft = true;
    this.bannerService.saveBannerLeft(this.bannerLeft);
    setTimeout(() => {
      this.guardandoLeft = false;
      Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'Banner izquierdo actualizado.', timer: 1500, showConfirmButton: false });
    }, 400);
  }

  guardarRight(): void {
    this.guardandoRight = true;
    this.bannerService.saveBannerRight(this.bannerRight);
    setTimeout(() => {
      this.guardandoRight = false;
      Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'Banner derecho actualizado.', timer: 1500, showConfirmButton: false });
    }, 400);
  }

  limpiarLeft(): void {
    this.bannerLeft  = { activo: false };
    this.previewLeft = null;
    this.bannerService.saveBannerLeft(this.bannerLeft);
  }

  limpiarRight(): void {
    this.bannerRight  = { activo: false };
    this.previewRight = null;
    this.bannerService.saveBannerRight(this.bannerRight);
  }

  private readFile(file: File, cb: (b64: string) => void): void {
    const reader = new FileReader();
    reader.onload = (e) => cb(e.target?.result as string);
    reader.readAsDataURL(file);
  }
}
