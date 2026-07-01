import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Monitor, PackagePlus, FileText, Printer, Map as MapIcon } from "lucide-react";

const navItems = [
  { label: "Inicio", path: "/", icon: LayoutDashboard },
  { label: "Equipos", path: "/stock", icon: Monitor },
  { label: "Mapa", path: "/mapa", icon: MapIcon },
  { label: "Entregar", path: "/nueva-entrega", icon: PackagePlus },
  { label: "Contratos", path: "/contratos", icon: FileText },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}