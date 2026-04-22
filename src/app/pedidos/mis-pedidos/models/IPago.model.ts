export interface ITipoPago {
  id: number;
  formaPago: string;
}

export interface ITarifaTerminal {
  id: number;
  tarifa: number;
  descripcion: string;
}

export interface IIvaTerminal {
  id: number;
  iva: number;
  descripcion: string;
}

export interface IDetallePago {
  id: { tipoPagoId: number; tarifaTerminalId: number; ivaId: number };
  tipoPago: ITipoPago;
  tarifaTerminal: ITarifaTerminal;
  ivaTerminal: IIvaTerminal;
}

export interface IMesesIntereses {
  id: number;
  meses: string;
  descripcion: string;
  ivaTerminal: IIvaTerminal;
  tarifaTerminal: ITarifaTerminal;
}

export interface IPagosYMeses {
  id: number;
  tipoPago: ITipoPago;
  mesesIntereses: IMesesIntereses;
}

export interface IOpcionMesesDto {
  pagosYMesesId: number;
  descripcion: string;
}

export interface IOpcionPagoDto {
  tipoPagoId: number;
  formaPago: string;
  mostrarMeses: boolean;
  pagosYMesesId: number;
  opciones: IOpcionMesesDto[];
}
