import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'totalPedido'
})
export class TotalPedidoPipe implements PipeTransform {

  transform(detalles: any[]): number {
    return detalles.reduce((sum, item) => sum + item.sub_total, 0);
  }

}
