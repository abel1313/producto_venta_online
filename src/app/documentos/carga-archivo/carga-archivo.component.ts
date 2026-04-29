import { Component, ElementRef, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { DocumentosService, ICargaExcelResponse } from '../documentos.service';

@Component({
  selector: 'app-carga-archivo',
  templateUrl: './carga-archivo.component.html',
  styleUrls: ['./carga-archivo.component.scss']
})
export class CargaArchivoComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  archivo:        File | null = null;
  subiendo        = false;
  formatoInvalido = false;
  resultado:      ICargaExcelResponse | null = null;
  dragOver        = false;

  private readonly FORMATOS = ['xls', 'xlsx'];

  // ── Getters de template ───────────────────────────────────────────

  get archivoValido(): boolean {
    return !!this.archivo && !this.formatoInvalido;
  }

  get fileSize(): string {
    if (!this.archivo) return '';
    const kb = this.archivo.size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  get extension(): string {
    return this.archivo?.name.split('.').pop()?.toLowerCase() ?? '';
  }

  get tieneErrores(): boolean {
    return (this.resultado?.errores?.length ?? 0) > 0;
  }

  // ── Selección de archivo ──────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.setArchivo(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setArchivo(file);
  }

  private setArchivo(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    this.formatoInvalido = !this.FORMATOS.includes(ext);
    this.archivo  = file;
    this.resultado = null;
  }

  limpiar(): void {
    this.archivo        = null;
    this.resultado      = null;
    this.formatoInvalido = false;
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
  }

  // ── Subir ─────────────────────────────────────────────────────────

  subir(): void {
    if (!this.archivoValido || this.subiendo) return;
    this.subiendo  = true;
    this.resultado = null;

    this.documentosService.subirExcel(this.archivo!).subscribe({
      next: res => {
        this.resultado = res;
        this.subiendo  = false;
      },
      error: () => {
        this.subiendo = false;
        Swal.fire({ icon: 'error', title: 'Error al procesar el archivo', timer: 2200, showConfirmButton: false });
      }
    });
  }

  constructor(private readonly documentosService: DocumentosService) {}
}
