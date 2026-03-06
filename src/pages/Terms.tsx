import Footer from "@/components/landing/Footer";
import { useTranslation } from "react-i18next";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-muted-foreground mb-8">Última actualización: 4 de marzo de 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6 [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <h2>1. Aceptación de los términos</h2>
          <p>Al acceder y utilizar Pymaia Skills ("la Plataforma"), operada por Pymaia ("nosotros"), aceptás estos Términos y Condiciones. Si no estás de acuerdo, no utilices la Plataforma.</p>

          <h2>2. Descripción del servicio</h2>
          <p>Pymaia Skills es un directorio de skills (instrucciones y configuraciones) diseñadas para ser utilizadas con Claude Code de Anthropic. La Plataforma permite descubrir, compartir e instalar skills que potencian la productividad.</p>

          <h2>3. Requisitos de uso</h2>
          <ul>
            <li>Debés tener al menos 18 años o la mayoría de edad en tu jurisdicción.</li>
            <li>Sos responsable de mantener la seguridad de tu cuenta.</li>
            <li>No podés utilizar la Plataforma para actividades ilegales o no autorizadas.</li>
          </ul>

          <h2>4. Cuentas de usuario</h2>
          <p>Para acceder a ciertas funcionalidades, podés necesitar crear una cuenta. Sos responsable de toda la actividad que ocurra bajo tu cuenta y de mantener la confidencialidad de tus credenciales.</p>

          <h2>5. Contenido del usuario</h2>
          <ul>
            <li>Al publicar una skill, otorgás a Pymaia una licencia no exclusiva, mundial y libre de regalías para mostrar, distribuir y promover dicho contenido dentro de la Plataforma.</li>
            <li>Sos el único responsable del contenido que publiques y garantizás que tenés los derechos necesarios sobre él.</li>
            <li>Nos reservamos el derecho de eliminar contenido que viole estos términos.</li>
          </ul>

          <h2>6. Propiedad intelectual</h2>
          <p>La Plataforma, su diseño, marca, código y contenido original son propiedad de Pymaia. Las skills publicadas por usuarios pertenecen a sus respectivos autores, sujetas a la licencia otorgada en la sección 5.</p>

          <h2>7. Limitación de responsabilidad</h2>
          <ul>
            <li>Las skills son proporcionadas "tal cual" sin garantías de ningún tipo.</li>
            <li>Pymaia no es responsable por daños directos, indirectos o consecuentes derivados del uso de skills instaladas a través de la Plataforma.</li>
            <li>No garantizamos la disponibilidad ininterrumpida del servicio.</li>
          </ul>

          <h2>8. Uso de servicios de terceros</h2>
          <p>La Plataforma funciona en conjunto con Claude Code de Anthropic. El uso de Claude Code está sujeto a los términos de servicio de Anthropic. Pymaia no es responsable por cambios, interrupciones o problemas en servicios de terceros.</p>

          <h2>9. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán efectivos al publicarse en esta página. El uso continuado de la Plataforma constituye la aceptación de los términos modificados.</p>

          <h2>10. Terminación</h2>
          <p>Podemos suspender o cancelar tu acceso a la Plataforma en cualquier momento, con o sin causa, con o sin previo aviso.</p>

          <h2>11. Contacto</h2>
          <p>Para consultas sobre estos términos, escribinos a <a href="mailto:info@pymaia.com" className="text-foreground underline">info@pymaia.com</a>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
