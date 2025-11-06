import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaEspanol'
})
export class FechaEspanolPipe implements PipeTransform {

  private meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  transform(value: string  | string): string {

  const [diaStr, mesStr, añoStr] = value.split('/');
  const dia = parseInt(diaStr, 10);
  const mes = this.meses[parseInt(mesStr, 10) - 1]; // -1 porque los meses van de 0 a 11
  const año = parseInt(añoStr, 10);

  return `${dia} de ${mes} del ${año}`;
  }

}
