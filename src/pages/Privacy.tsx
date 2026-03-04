import Navbar from "@/components/Navbar";
import Footer from "@/components/landing/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground mb-8">Última actualización: 4 de marzo de 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6 [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <h2>1. Información que recopilamos</h2>
          <p>Recopilamos la siguiente información cuando usás Pymaia Skills:</p>
          <ul>
            <li><strong>Datos de cuenta:</strong> email, nombre y foto de perfil al registrarte.</li>
            <li><strong>Datos de uso:</strong> páginas visitadas, skills consultadas e instaladas, interacciones con la Plataforma.</li>
            <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo, para mejorar la seguridad y el rendimiento.</li>
          </ul>

          <h2>2. Cómo usamos tu información</h2>
          <ul>
            <li>Para operar y mantener la Plataforma.</li>
            <li>Para personalizar tu experiencia y recomendar skills relevantes.</li>
            <li>Para generar estadísticas agregadas y anónimas sobre el uso de la Plataforma.</li>
            <li>Para comunicarnos con vos sobre actualizaciones o cambios importantes.</li>
            <li>Para prevenir fraude y proteger la seguridad de la Plataforma.</li>
          </ul>

          <h2>3. Compartición de datos</h2>
          <p>No vendemos ni alquilamos tu información personal. Podemos compartir datos con:</p>
          <ul>
            <li><strong>Proveedores de servicios:</strong> que nos ayudan a operar la Plataforma (hosting, autenticación, analytics), bajo acuerdos de confidencialidad.</li>
            <li><strong>Requerimientos legales:</strong> cuando sea necesario para cumplir con la ley o proteger nuestros derechos.</li>
          </ul>

          <h2>4. Almacenamiento y seguridad</h2>
          <p>Tus datos se almacenan en servidores seguros. Implementamos medidas técnicas y organizativas para proteger tu información, incluyendo encriptación en tránsito y en reposo. Sin embargo, ningún sistema es 100% seguro.</p>

          <h2>5. Tus derechos</h2>
          <p>Tenés derecho a:</p>
          <ul>
            <li>Acceder a los datos personales que tenemos sobre vos.</li>
            <li>Solicitar la corrección de datos inexactos.</li>
            <li>Solicitar la eliminación de tu cuenta y datos asociados.</li>
            <li>Retirar tu consentimiento en cualquier momento.</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>Utilizamos cookies esenciales para el funcionamiento de la Plataforma (autenticación, preferencias de idioma). No utilizamos cookies de terceros con fines publicitarios.</p>

          <h2>7. Menores</h2>
          <p>La Plataforma no está dirigida a menores de 18 años. No recopilamos intencionalmente información de menores.</p>

          <h2>8. Cambios a esta política</h2>
          <p>Podemos actualizar esta política periódicamente. Publicaremos cualquier cambio en esta página con la fecha de actualización.</p>

          <h2>9. Contacto</h2>
          <p>Para consultas sobre privacidad o para ejercer tus derechos, escribinos a <a href="mailto:info@pymaia.com" className="text-foreground underline">info@pymaia.com</a>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
