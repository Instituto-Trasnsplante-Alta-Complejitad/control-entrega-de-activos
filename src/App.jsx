import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Stock from '@/pages/Stock';
import NewDelivery from '@/pages/NewDelivery';
import AcceptDelivery from '@/pages/AcceptDelivery';
import Contracts from '@/pages/Contracts';
import EquipmentDetail from '@/pages/EquipmentDetail';
import Printers from '@/pages/Printers';
import Mapa from '@/pages/Mapa';


const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/aceptar" element={<AcceptDelivery />} />
      <Route path="/equipo/:id" element={<EquipmentDetail />} />
      <Route element={<ProtectedRoute unauthenticatedElement={null} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/impresoras" element={<Printers />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/nueva-entrega" element={<NewDelivery />} />
          <Route path="/contratos" element={<Contracts />} />
          <Route path="/stock-componentes" element={<Navigate to="/" replace />} />
          <Route path="/historial" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
