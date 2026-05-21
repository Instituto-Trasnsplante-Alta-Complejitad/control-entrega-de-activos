import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Monitor, PackagePlus, ClipboardList, FileText, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
{ label: "Dashboard", path: "/", icon: LayoutDashboard },
{ label: "Stock de Equipos", path: "/stock", icon: Monitor },
{ label: "Nueva Entrega", path: "/nueva-entrega", icon: PackagePlus },
{ label: "Contratos", path: "/contratos", icon: FileText }];


export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border min-h-screen p-4">
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <span style={{fontFamily: 'Arial, sans-serif', fontSize: '28px', fontWeight: 'bold', color: '#E8896A', letterSpacing: '2px'}}>ITAC</span>
          <span style={{fontSize: '8px', color: '#E8896A', lineHeight: '1.2'}}>Instituto de Trasplantes</span>
          <span style={{fontSize: '8px', color: '#E8896A', lineHeight: '1.2'}}>y Alta Complejidad</span>
        </div>
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
                ? "bg-[#E8896A] text-white shadow-sm"
                : "text-muted-foreground hover:bg-orange-50 hover:text-foreground"}`
              }>
              
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>);

        })}
      </nav>

      <button
        onClick={() => base44.auth.logout()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 mt-4">
        
        <LogOut className="w-4 h-4" />
        Cerrar Sesión
      </button>
    </aside>);

}