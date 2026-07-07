import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaEspanol'
})
export class FechaEspanolPipe implements PipeTransform {

  private meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  transform(value: string): string {
    if (!value) return '';

    // El back manda "dd/mm/yyyy" o "dd/mm/yyyy HH:mm" (con hora, desde 2026-07-07).
    const [fechaParte, horaParte] = value.trim().split(' ');
    const [diaStr, mesStr, añoStr] = fechaParte.split('/');
    const dia = parseInt(diaStr, 10);
    const mes = this.meses[parseInt(mesStr, 10) - 1]; // -1 porque los meses van de 0 a 11
    const año = parseInt(añoStr, 10);

    const fechaTexto = `${dia} de ${mes} del ${año}`;
    return horaParte ? `${fechaTexto}, ${horaParte} hrs` : fechaTexto;
  }

}
