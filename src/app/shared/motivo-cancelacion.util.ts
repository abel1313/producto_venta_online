export interface IMotivoOpcion {
  value: string;
  label: string;
}

// Mismos valores literales en ambas pantallas (mis-pedidos y abonos) — el back solo penaliza
// el score de la rifa cuando el motivo es exactamente 'TIMEOUT' o 'NO_SE_PRESENTO', cualquier
// otro valor (incluido 'CLIENTE_AVISO'/'ERROR_ADMIN') no afecta al cliente.
export const MOTIVOS_CANCELACION: IMotivoOpcion[] = [
  { value: 'NO_SE_PRESENTO', label: 'No se presentó' },
  { value: 'CLIENTE_AVISO',  label: 'El cliente avisó' },
  { value: 'ERROR_ADMIN',    label: 'Error al capturar (fue el admin, no el cliente)' }
];

// Fragmento reutilizable para Swal.fire({ html, didOpen, preConfirm }) — reemplaza el
// input:'radio' nativo (feo) y el <select> nativo por un grupo de botones tipo "pill", mismo
// patrón visual que el resto del proyecto (ej. método de pago EFECTIVO/TRANSFERENCIA). Usa
// variables CSS globales (--app-accent, --card-bg, etc.) porque SÍ cascadean hasta el DOM que
// SweetAlert2 inyecta en document.body, a diferencia de los estilos scoped de un componente.
export function motivoCancelacionSwalFragment(
  opciones: IMotivoOpcion[] = MOTIVOS_CANCELACION,
  valorInicial: string = opciones[0].value
): { html: string; didOpen: () => void; preConfirm: () => string } {
  let seleccion = valorInicial;

  const html = `
    <div class="mc-motivo-group">
      ${opciones.map(o => `<button type="button" class="mc-motivo-btn" data-value="${o.value}">${o.label}</button>`).join('')}
    </div>
    <style>
      .mc-motivo-group { display:flex; flex-direction:column; gap:8px; margin-top:4px; text-align:left; }
      .mc-motivo-btn {
        padding:10px 14px; border-radius:10px; font-size:.92rem; text-align:left;
        border:1.5px solid var(--app-border); background:var(--card-body-bg);
        color:var(--app-text); cursor:pointer; transition:all .15s ease;
      }
      .mc-motivo-btn:hover { border-color:var(--app-accent); }
      .mc-motivo-btn.mc-motivo-btn--activo {
        border-color:var(--app-accent);
        background:var(--app-tint);
        color:var(--app-accent-text);
        font-weight:600;
      }
    </style>`;

  const didOpen = () => {
    const marcar = (btn: Element) => {
      document.querySelectorAll('.mc-motivo-btn').forEach(b => b.classList.remove('mc-motivo-btn--activo'));
      btn.classList.add('mc-motivo-btn--activo');
    };
    document.querySelectorAll('.mc-motivo-btn').forEach(b => {
      b.addEventListener('click', () => {
        seleccion = (b as HTMLElement).dataset['value'] ?? valorInicial;
        marcar(b);
      });
    });
    const inicial = document.querySelector(`.mc-motivo-btn[data-value="${valorInicial}"]`);
    if (inicial) marcar(inicial);
  };

  const preConfirm = () => seleccion;

  return { html, didOpen, preConfirm };
}
