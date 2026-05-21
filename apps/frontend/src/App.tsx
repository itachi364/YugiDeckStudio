import { Database, Image, KeyRound, Layers3, Store, Upload } from "lucide-react";
import { StatusPanel } from "./components/StatusPanel";

const workflowItems = [
  {
    title: "Cargar deck list",
    description: "Imagen, jugador, torneo, resultado y nombre del deck.",
    icon: Upload
  },
  {
    title: "Revisar OCR",
    description: "Correccion obligatoria antes de generar la imagen.",
    icon: Layers3
  },
  {
    title: "Generar imagen",
    description: "Plantilla 1080x1350 con branding de la tienda.",
    icon: Image
  }
];

const adminItems = [
  {
    title: "Root global",
    description: "Unico usuario con acceso a todas las tiendas.",
    icon: KeyRound
  },
  {
    title: "Tiendas aisladas",
    description: "Usuarios no-root solo ven datos de su tienda.",
    icon: Store
  },
  {
    title: "PostgreSQL local",
    description: "Prisma, volumen Docker y assets locales.",
    icon: Database
  }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div>
          <p className="eyebrow">YugiDeckStudio</p>
          <h1>Operacion local</h1>
        </div>
        <nav>
          <a href="#workflow">Decks</a>
          <a href="#admin">Administracion</a>
          <a href="#status">Estado</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">v0.1.0</p>
            <h2>Panel inicial</h2>
          </div>
          <span className="mode-pill">Local-only</span>
        </header>

        <section id="workflow" className="section">
          <div className="section-header">
            <h3>Flujo de deck</h3>
            <p>Base visual para las pantallas operativas del MVP.</p>
          </div>
          <div className="grid">
            {workflowItems.map((item) => (
              <StatusPanel key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section id="admin" className="section">
          <div className="section-header">
            <h3>Administracion</h3>
            <p>Roles, tiendas y persistencia quedan preparados desde la base.</p>
          </div>
          <div className="grid">
            {adminItems.map((item) => (
              <StatusPanel key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section id="status" className="section status-band">
          <h3>Servicios locales esperados</h3>
          <dl>
            <div>
              <dt>Backend</dt>
              <dd>http://localhost:3000/health</dd>
            </div>
            <div>
              <dt>Frontend</dt>
              <dd>http://localhost:5173</dd>
            </div>
            <div>
              <dt>Imagenes</dt>
              <dd>http://localhost:8081</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}
