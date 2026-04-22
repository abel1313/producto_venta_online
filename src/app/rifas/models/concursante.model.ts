export interface IConcursante {
  id?: number;
  nombre: string;
  apellidoPaterno: string;
  palabraRifa: string;
  telefono: string;
  configurarRifa?: { id: number };
}
