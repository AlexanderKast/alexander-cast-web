'use client';

import { useId, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { conMarca } from '@/lib/brief/schema';
import type { BriefCampo } from '@/types/brief';

interface CampoBriefProps {
  campo: BriefCampo;
  marca: string;
  acento: string;
  valor: string | string[] | undefined;
  conError: boolean;
  onChange: (campo: BriefCampo, valor: string | string[]) => void;
}

/**
 * Un campo del cuestionario. El tipo lo decide el schema, no el componente:
 * agregar una pregunta nueva en content/brief/schema.ts no requiere tocar UI.
 */
export function CampoBrief({ campo, marca, acento, valor, conError, onChange }: CampoBriefProps) {
  const idBase = useId();
  const idControl = `${idBase}-${campo.id}`;
  const idAyuda = campo.h ? `${idControl}-ayuda` : undefined;
  const etiqueta = conMarca(campo.l, marca);

  const claseCampo =
    'w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/25 outline-none transition-colors focus:bg-white/[0.05]';
  const borde = conError ? 'border-red-400/60' : 'border-white/10 focus:border-white/30';

  const esOpciones = campo.ty === 'radio' || campo.ty === 'check';
  const seleccionadas = Array.isArray(valor) ? valor : valor ? [valor] : [];

  function alternarCheck(opcion: string) {
    const actual = Array.isArray(valor) ? valor : [];
    onChange(
      campo,
      actual.includes(opcion) ? actual.filter((v) => v !== opcion) : [...actual, opcion],
    );
  }

  return (
    <div data-campo={campo.id} className="scroll-mt-24">
      {/* En radio/check el grupo se etiqueta con el texto de la pregunta */}
      {esOpciones ? (
        <p id={`${idControl}-label`} className="text-[15px] font-medium text-white">
          {etiqueta}
          {campo.r ? <span className="ml-1 text-amber-400">*</span> : null}
        </p>
      ) : (
        <label htmlFor={idControl} className="block text-[15px] font-medium text-white">
          {etiqueta}
          {campo.r ? <span className="ml-1 text-amber-400">*</span> : null}
        </label>
      )}

      {campo.h && (
        <p id={idAyuda} className="mt-1 text-[13px] leading-relaxed text-white/40">
          {campo.h}
        </p>
      )}

      <div className="mt-2.5">
        {campo.ty === 'area' && (
          <textarea
            id={idControl}
            name={campo.id}
            rows={4}
            value={typeof valor === 'string' ? valor : ''}
            placeholder={campo.ph}
            aria-required={campo.r ? true : undefined}
            aria-invalid={conError || undefined}
            aria-describedby={idAyuda}
            onChange={(e) => onChange(campo, e.target.value)}
            className={`${claseCampo} ${borde} resize-y leading-relaxed`}
          />
        )}

        {(campo.ty === 'text' || campo.ty === 'tel' || campo.ty === 'email') && (
          <input
            id={idControl}
            name={campo.id}
            type={campo.ty === 'text' ? 'text' : campo.ty}
            inputMode={campo.ty === 'tel' ? 'tel' : campo.ty === 'email' ? 'email' : undefined}
            autoComplete={campo.ty === 'tel' ? 'tel' : campo.ty === 'email' ? 'email' : undefined}
            value={typeof valor === 'string' ? valor : ''}
            placeholder={campo.ph}
            aria-required={campo.r ? true : undefined}
            aria-invalid={conError || undefined}
            aria-describedby={idAyuda}
            onChange={(e) => onChange(campo, e.target.value)}
            className={`${claseCampo} ${borde}`}
          />
        )}

        {campo.ty === 'archivo' && (
          <CampoArchivo
            id={idControl}
            nombre={campo.id}
            placeholder={campo.ph}
            describedBy={idAyuda}
            valor={typeof valor === 'string' ? valor : ''}
            clase={`${claseCampo} ${borde}`}
            acento={acento}
            onChange={(nuevo) => onChange(campo, nuevo)}
          />
        )}

        {esOpciones && (
          <div
            role={campo.ty === 'radio' ? 'radiogroup' : 'group'}
            aria-labelledby={`${idControl}-label`}
            aria-describedby={idAyuda}
            className="grid gap-2 sm:grid-cols-2"
          >
            {(campo.o ?? []).map((opcion, i) => {
              const marcada = seleccionadas.includes(opcion);
              const idOpcion = `${idControl}-${i}`;
              return (
                <label
                  key={opcion}
                  htmlFor={idOpcion}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    marcada ? 'text-white' : 'border-white/10 text-white/70 hover:border-white/25'
                  }`}
                  style={marcada ? { borderColor: acento, backgroundColor: `${acento}14` } : undefined}
                >
                  <input
                    id={idOpcion}
                    type={campo.ty === 'radio' ? 'radio' : 'checkbox'}
                    name={campo.id}
                    value={opcion}
                    checked={marcada}
                    onChange={() =>
                      campo.ty === 'radio' ? onChange(campo, opcion) : alternarCheck(opcion)
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                      campo.ty === 'radio' ? 'rounded-full' : 'rounded'
                    }`}
                    style={{
                      borderColor: marcada ? acento : 'rgba(255,255,255,.25)',
                      backgroundColor: marcada ? acento : 'transparent',
                    }}
                  >
                    {marcada && <Check className="h-3 w-3 text-black" />}
                  </span>
                  {opcion}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {conError && (
        <p className="mt-1.5 text-[13px] text-red-300">
          Esta respuesta la necesitamos para avanzar.
        </p>
      )}
    </div>
  );
}

interface CampoArchivoProps {
  id: string;
  nombre: string;
  placeholder?: string;
  describedBy?: string;
  valor: string;
  clase: string;
  acento: string;
  onChange: (valor: string) => void;
}

/**
 * Dos formas de responder lo mismo: pegar el link (Drive, Dropbox, web) o
 * subir el archivo. En ambos casos lo que queda guardado es una URL.
 */
function CampoArchivo({
  id,
  nombre,
  placeholder,
  describedBy,
  valor,
  clase,
  acento,
  onChange,
}: CampoArchivoProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [subido, setSubido] = useState('');

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setError('');
    setSubiendo(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append('archivo', archivo);
      const res = await fetch('/api/brief/upload', { method: 'POST', body: cuerpo });
      const datos = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !datos.ok || !datos.url) {
        setError(datos.error ?? 'No pudimos subir el archivo.');
        return;
      }
      setSubido(archivo.name);
      onChange(datos.url);
    } catch {
      setError('Se cayó la conexión mientras subía el archivo.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        id={id}
        name={nombre}
        type="url"
        inputMode="url"
        value={valor}
        placeholder={placeholder ?? 'https://…'}
        aria-describedby={describedBy}
        onChange={(e) => {
          setSubido('');
          onChange(e.target.value);
        }}
        className={clase}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-[13px] text-white/70 transition-colors hover:border-white/30 hover:text-white ${
            subiendo ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {subiendo ? 'Subiendo…' : 'Subir archivo'}
          <input
            type="file"
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.zip"
            disabled={subiendo}
            onChange={(e) => void subir(e.target.files?.[0])}
          />
        </label>

        {subido && !error && (
          <span className="text-[13px]" style={{ color: acento }}>
            Listo: {subido}
          </span>
        )}
        {!subido && valor && !error && (
          <a
            href={valor}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[13px] text-white/50 underline underline-offset-4 hover:text-white/80"
          >
            Abrir enlace
          </a>
        )}
        {error && <span className="text-[13px] text-red-300">{error}</span>}
      </div>

      <p className="text-[12px] text-white/30">
        Hasta 10 MB · PNG, JPG, WEBP, GIF, PDF o ZIP. También podés pegar un link de Drive.
      </p>
    </div>
  );
}
