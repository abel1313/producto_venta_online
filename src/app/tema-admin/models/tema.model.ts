// Re-exporta el modelo del servicio global de tema (src/app/services/tema) -- se mantiene un
// solo lugar de verdad para el shape del DTO (services/tema/tema.model.ts es el que también usa
// TemaService en tiempo de ejecución, cargado eager desde app.component.ts).
export { ITemaVariable, SOMBRAS_CARD } from '../../services/tema/tema.model';
