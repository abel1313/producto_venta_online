export interface ILogo {
  id: number;
  extension?: string;
  nombreOriginal?: string;
  activo: boolean;
  creadoEn?: string;
  /** Ruta relativa -- se antepone environment.api_Url para armar la URL completa. */
  urlImagen: string;
}
