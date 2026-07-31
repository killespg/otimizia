"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Campo de senha com alternância de visibilidade.
 *
 * Digitar senha às cegas no teclado do celular (sem poder conferir letra por
 * letra) é o ponto onde cadastro e login mais travam em trânsito — todo app
 * nativo resolve com o olho que revela o texto. Os três formulários de auth
 * (login, cadastro, nova senha) usavam `type="password"` fixo; este campo
 * substitui os três, contido ou não (funciona tanto com `name` + FormData
 * quanto com `value`/`onChange` controlado, como a tela de nova senha usa).
 */
export function AuthPasswordField({
  label,
  name,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required ? (
          <>
            <span className="ml-1 text-od-text-2" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        ) : null}
      </label>
      <div className="relative mt-1.5">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          className={`field pr-11 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-od-text-3 transition-colors hover:text-od-text-2"
        >
          {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
