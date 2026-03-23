import { Button } from "@/components/ui/button";

interface PreviewFallbackAppProps {
  detail?: string;
}

export default function PreviewFallbackApp({ detail }: PreviewFallbackAppProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full border border-border bg-secondary px-4 py-1 text-sm text-muted-foreground">
          Vista previa segura
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          La app ya no se rompe aunque falte la configuración del backend.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          En este entorno de preview no llegaron las variables del backend, así que cargué una versión degradada para evitar la pantalla en blanco.
        </p>
        {detail ? (
          <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground">
            {detail}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Recargar preview</Button>
          <Button variant="outline" onClick={() => window.open("https://pymaiaskills.lovable.app", "_blank", "noopener,noreferrer")}>Ver sitio publicado</Button>
        </div>
      </section>
    </main>
  );
}