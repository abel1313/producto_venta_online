
export interface ImagenUpdateDto {
    id: string;
    urlImagen: string;
    extension: string;
    nombreImagen: string;
    base64?: string | null;
}