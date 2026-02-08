// ═══════════════════════════════════════════════════
// MOLTY CORE: MODULE REGISTRY
// Dodaj novi modul = 1 linija ovde. App.jsx se NE MENJA.
//
// Kako dodati novi modul:
// 1. Kreiraj src/modules/mojmodul.jsx sa: export default function MojModul({store}) {...}
// 2. Importuj ovde i dodaj u MODULES niz
// 3. Gotovo — pojavljuje se automatski kao tab
// ═══════════════════════════════════════════════════
import Dashboard from "../modules/dashboard.jsx";
import Customers from "../modules/customers.jsx";
import Materials from "../modules/materials.jsx";
import Engineering from "../modules/engineering.jsx";
import Pipeline from "../modules/pipeline.jsx";
import Quotes from "../modules/quotes.jsx";
import Actions from "../modules/actions.jsx";
import Alerts from "../modules/alerts.jsx";
import Brain from "../modules/brain.jsx";

// ── MODULE REGISTRATION ──
// Svaki modul: { id, label, icon, component, badge? }
// badge je funkcija (store) => string|number|null za dinamički badge
export const MODULES = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    component: Dashboard,
  },
  {
    id: "customers",
    label: "Kupci",
    icon: "🏭",
    badge: (s) => s.customers.length,
    component: Customers,
  },
  {
    id: "materials",
    label: "Materijali",
    icon: "🧱",
    badge: (s) => s.materials.length,
    component: Materials,
  },
  {
    id: "engineering",
    label: "Engineering",
    icon: "⚙️",
    component: Engineering,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: "💰",
    badge: (s) => s.pipeline.length,
    component: Pipeline,
  },
  {
    id: "quotes",
    label: "Ponude",
    icon: "📄",
    component: Quotes,
  },
  {
    id: "actions",
    label: "Akcije",
    icon: "🎯",
    badge: (s) => s.actions.filter(a=>a.status!=="done").length,
    component: Actions,
  },
  {
    id: "alerts",
    label: "Alarmi",
    icon: "🔔",
    badge: (s) => s.customers.filter(c=>c.daysIdle>90).length,
    component: Alerts,
  },
  {
    id: "brain",
    label: "🧠 Brain",
    icon: "🧠",
    component: Brain,
  },
];
