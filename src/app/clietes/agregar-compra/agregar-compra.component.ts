import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { VarianteService } from 'src/app/variante/service/variante.service';

@Component({
  selector: 'app-agregar-compra',
  templateUrl: './agregar-compra.component.html',
  styleUrls: ['./agregar-compra.component.scss']
})
export class AgregarCompraComponent {

  codigo = '';
  enviando = false;
  error = '';
  exito = false;

  constructor(
    private readonly varianteService: VarianteService,
    private readonly router: Router,
  ) {}

  agregarCompra(): void {
    const valor = this.codigo.trim();
    if (!valor || this.enviando) return;

    this.enviando = true;
    this.error = '';

    this.varianteService.reclamarVenta(valor).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
      },
      error: (err: any) => {
        this.enviando = false;
        this.error = this.mapearError(err?.error?.mensaje ?? '');
      }
    });
  }

  private mapearError(mensaje: string): string {
    if (mensaje.includes('ya fue utilizado')) return 'Este código ya fue usado.';
    if (mensaje.includes('Código inválido')) return 'No encontramos ese código, revisa que esté bien copiado.';
    if (mensaje.includes('no coincide')) return 'Este código pertenece a otra cuenta.';
    return mensaje || 'No se pudo agregar la compra. Intenta de nuevo.';
  }

  otroCodigo(): void {
    this.codigo = '';
    this.error = '';
    this.exito = false;
  }

  irAMisDatos(): void {
    this.router.navigate(['/clientes/mis-datos']);
  }
}
