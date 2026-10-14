import Swal from 'sweetalert2';

// Ventana "Cambia tu contraseña" que sale cuando un administrador reseteó la contraseña. La usan
// el login y la verificación de correo (antes cada uno tenía su propia copia, con colores fijos y
// una validación distinta). Colores solo con tokens, así se lee igual de día y de noche.
const REGEX_ESPECIAL = /[!@#$%^&*()\-_=+\[\]{};:'",.<>?\/\\|`~]/;

export function cumpleRequisitosPassword(valor: string): boolean {
  return valor.length >= 8
    && /[A-Z]/.test(valor)
    && /[a-z]/.test(valor)
    && /[0-9]/.test(valor)
    && REGEX_ESPECIAL.test(valor);
}

const ESTILOS = `
  <style>
    .cp-texto { font-size: 0.88rem; color: var(--app-text-muted); margin: 0 0 14px; text-align: left; }
    .cp-campo { position: relative; margin: 0 0 12px; }
    .cp-input {
      box-sizing: border-box; width: 100%; height: 46px; margin: 0; padding: 0 44px 0 14px;
      font: inherit; font-size: 0.95rem; color: var(--input-text); background: var(--input-bg);
      border: 1px solid var(--input-border); border-radius: 10px; outline: none;
    }
    .cp-input::placeholder { color: var(--input-placeholder); }
    .cp-input:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 3px var(--input-focus-shadow); }
    .cp-ojo {
      position: absolute; top: 50%; right: 6px; transform: translateY(-50%); width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center; padding: 0; font-size: 1.05rem;
      background: transparent; border: 0; border-radius: 8px; color: var(--app-text-muted); cursor: pointer;
    }
    .cp-ojo:hover { color: var(--app-accent-text); background: var(--app-tint); }
    .cp-reqs { margin-top: 4px; text-align: left; background: var(--app-accent-soft); border: 1px solid var(--card-border); border-radius: 10px; padding: 12px 14px; }
    .cp-reqs__title { font-size: 0.7rem; font-weight: 700; color: var(--app-accent-text); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
    .cp-req { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--pk-danger); margin-bottom: 4px; transition: color 0.2s; }
    .cp-req.met { color: var(--app-text); }
    .cp-req.met .cp-req__icon { color: var(--pk-success); }
    .cp-bar { height: 4px; background: var(--app-border); border-radius: 99px; overflow: hidden; margin-top: 8px; }
    .cp-bar__fill { height: 100%; width: 0%; border-radius: 99px; background: var(--pk-danger); transition: width 0.3s ease, background-color 0.3s ease; }
  </style>`;

const REQUISITOS: Array<[string, string, (v: string) => boolean]> = [
  ['cp-req-longitud',  'Mínimo 8 caracteres',                         v => v.length >= 8],
  ['cp-req-mayuscula', 'Una mayúscula (A, B, C…)',                    v => /[A-Z]/.test(v)],
  ['cp-req-minuscula', 'Una minúscula (a, b, c…)',                    v => /[a-z]/.test(v)],
  ['cp-req-numero',    'Un número (0–9)',                             v => /[0-9]/.test(v)],
  ['cp-req-especial',  'Un carácter especial (! @ # $ % &amp; * - _ .)', v => REGEX_ESPECIAL.test(v)],
];

function campo(id: string, placeholder: string): string {
  return `
    <div class="cp-campo">
      <input id="${id}" class="cp-input" type="password" placeholder="${placeholder}" autocomplete="new-password">
      <button type="button" class="cp-ojo" data-ojo="${id}" aria-label="Mostrar u ocultar contraseña" title="Mostrar / ocultar">👁</button>
    </div>`;
}

/**
 * Abre la ventana. `cambiar(nueva)` hace la llamada al back y lanza si falla (el mensaje de la
 * excepción se muestra dentro de la ventana). Devuelve true si la contraseña quedó cambiada.
 */
export async function pedirCambioPasswordForzado(cambiar: (nueva: string) => Promise<void>): Promise<boolean> {
  const resultado = await Swal.fire({
    title: '🔑 Cambia tu contraseña',
    html: `
      ${ESTILOS}
      <p class="cp-texto">Tu contraseña fue reseteada por un administrador.<br>Debes crear una nueva contraseña para continuar.</p>
      ${campo('cp-nueva', 'Nueva contraseña')}
      ${campo('cp-confirmar', 'Confirmar nueva contraseña')}
      <div class="cp-reqs">
        <p class="cp-reqs__title">Tu contraseña debe tener:</p>
        ${REQUISITOS.map(([id, texto]) => `<div id="${id}" class="cp-req"><span class="cp-req__icon">○</span> ${texto}</div>`).join('')}
        <div class="cp-bar"><div id="cp-barra" class="cp-bar__fill"></div></div>
      </div>`,
    icon: 'warning',
    confirmButtonText: 'Cambiar y entrar',
    showCancelButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      const nueva = document.getElementById('cp-nueva') as HTMLInputElement | null;
      document.querySelectorAll<HTMLButtonElement>('.cp-ojo').forEach(boton => {
        boton.addEventListener('click', () => {
          const input = document.getElementById(boton.dataset['ojo'] ?? '') as HTMLInputElement | null;
          if (!input) return;
          const ver = input.type === 'password';
          input.type = ver ? 'text' : 'password';
          boton.textContent = ver ? '🙈' : '👁';
        });
      });
      nueva?.addEventListener('input', () => {
        const valor = nueva.value;
        let cumplidos = 0;
        for (const [id, , cumple] of REQUISITOS) {
          const ok = cumple(valor);
          if (ok) cumplidos++;
          const el = document.getElementById(id);
          el?.classList.toggle('met', ok);
          const icono = el?.querySelector('.cp-req__icon');
          if (icono) icono.textContent = ok ? '✓' : '○';
        }
        const barra = document.getElementById('cp-barra');
        if (barra) {
          barra.style.width = `${cumplidos * 20}%`;
          barra.style.background = cumplidos <= 2 ? 'var(--pk-danger)' : cumplidos <= 4 ? 'var(--pk-warning)' : 'var(--pk-success)';
        }
      });
    },
    preConfirm: async () => {
      const nuevaValor = (document.getElementById('cp-nueva') as HTMLInputElement)?.value ?? '';
      const confirmar  = (document.getElementById('cp-confirmar') as HTMLInputElement)?.value ?? '';
      if (!cumpleRequisitosPassword(nuevaValor)) {
        Swal.showValidationMessage('La contraseña no cumple todos los requisitos de arriba.');
        return false;
      }
      if (nuevaValor !== confirmar) {
        Swal.showValidationMessage('Las contraseñas no coinciden');
        return false;
      }
      try {
        await cambiar(nuevaValor);
        return true;
      } catch (err: any) {
        Swal.showValidationMessage(err?.error?.mensaje ?? err?.error?.message ?? 'Error al cambiar la contraseña.');
        return false;
      }
    }
  });
  return resultado.isConfirmed;
}
