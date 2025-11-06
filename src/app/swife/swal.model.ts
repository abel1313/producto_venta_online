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
    public static mostrarMensajeSuccess2(mensaje: string, code: number){
        let icon: SweetAlertIcon = "error";
        if(code == 200){
            icon = 'success'
        }
      Swal.fire({
        title: "Generar pedido",
        icon: "info",
        html: `
        <p>Para poder generar un pedido es necesario registrarse.</p>
        `,
        showCancelButton: true,
        confirmButtonText: "Ir a registro",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33"
      }).then((result) => {
        if (result.isConfirmed) {
        }
      });

    }
}