import Swal, { SweetAlertIcon } from "sweetalert2";



export class MensajesGenericos{


    public static mostrarMensajeSuccess(mensaje: string, code: number){
        let icon: SweetAlertIcon = "error";
        if(code == 200){
            icon = 'success'
        }
        Swal.fire({
            title: mensaje,
            icon: icon,
            draggable: true
        });

    }
}