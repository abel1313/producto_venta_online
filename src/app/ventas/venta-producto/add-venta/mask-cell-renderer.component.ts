import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-mask-cell-renderer',
  template: `
    <span class="mask-cell" (click)="toggle()" [title]="shown ? 'Clic para ocultar' : 'Clic para ver'">
      <ng-container *ngIf="shown; else masked">{{ formatValue() }}</ng-container>
      <ng-template #masked><span class="mask-dots">••••</span></ng-template>
    </span>
  `,
  styles: [`
    .mask-cell {
      cursor: pointer;
      display: inline-block;
      width: 100%;
      user-select: none;
    }
    .mask-dots {
      color: #adb5bd;
      letter-spacing: 3px;
      font-size: 0.85rem;
    }
  `]
})
export class MaskCellRendererComponent implements ICellRendererAngularComp {
  value: any;
  shown = false;

  agInit(params: ICellRendererParams): void {
    this.value = params.value;
  }

  refresh(params: ICellRendererParams): boolean {
    this.value = params.value;
    return true;
  }

  toggle() {
    this.shown = !this.shown;
  }

  formatValue(): string {
    if (this.value == null) return '-';
    return '$' + Number(this.value).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
