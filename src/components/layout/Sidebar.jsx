import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Monitor, PackagePlus, ClipboardList, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Stock de Equipos", path: "/stock", icon: Monitor },
  { label: "Nueva Entrega", path: "/nueva-entrega", icon: PackagePlus },
  { label: "Historial", path: "/historial", icon: ClipboardList },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4">
      <div className="mb-8 px-3">
        <h1 className="text-xl font-bold text-foreground tracking-tight">IT Assets</h1>
        <p className="text-xs text-muted-foreground mt-1">Control de Equipamiento</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => base44.auth.logout()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 mt-4"
      >
        <LogOut className="w-4 h-4" />
        Cerrar Sesión
      </button>
    </aside>
  );
}