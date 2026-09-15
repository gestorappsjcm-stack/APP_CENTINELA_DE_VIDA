import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NavTabs } from './components/NavTabs';
import { DashboardView } from './components/DashboardView';
import { PacientesView } from './components/views/PacientesView';
import { AgendaView } from './components/views/AgendaView';
import { TriajeView } from './components/views/TriajeView';
import { AtencionView } from './components/views/AtencionView';
import { DisplayTurnosView } from './components/views/DisplayTurnosView';
import { ProfesionalesView } from './components/views/ProfesionalesView';
import { ProgramacionTurnosView } from './components/views/ProgramacionTurnosView';
import { ProgramacionAnualView } from './components/ProgramacionAnualView';
import { ReportesView } from './components/ReportesView';
import { GestionUsuariosView } from './components/GestionUsuariosView';
import { FuaView } from './components/views/FuaView';
import { FichaPacienteView } from './components/views/FichaPacienteView';
import { LoginView } from './components/views/LoginView';
import { ModalRegistrarPaciente } from './components/modals/ModalRegistrarPaciente';
import { ModalVerPacientes } from './components/modals/ModalVerPacientes';
import { ModalSupabaseStatus } from './components/modals/ModalSupabaseStatus';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, canAccess, currentUser } = useApp();

  // Validación estricta de autorización de módulo para el usuario activo
  const hasAccess = canAccess(currentTab as any);

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Acceso al Módulo No Autorizado
          </h2>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Su usuario <strong className="font-mono text-slate-800 dark:text-slate-200">@{currentUser.usuario}</strong> ({currentUser.nombres} {currentUser.apellidos}) con rol <strong className="capitalize text-teal-600">{currentUser.rol}</strong> no cuenta con autorización expresa para ingresar a este módulo.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
          Para solicitar permisos adicionales, contacte al Administrador del sistema o cambie de usuario en la barra superior.
        </div>

        <button
          onClick={() => setCurrentTab('dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1A2B4A] hover:bg-[#243b5e] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
        >
          <ArrowLeft size={14} />
          <span>Volver al Dashboard Principal</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {currentTab === 'dashboard' && <DashboardView />}
      {currentTab === 'pacientes' && <PacientesView />}
      {currentTab === 'ficha_paciente' && <FichaPacienteView />}
      {currentTab === 'fua' && <FuaView />}
      {currentTab === 'agenda' && <AgendaView />}
      {currentTab === 'triaje' && <TriajeView />}
      {currentTab === 'atencion' && <AtencionView />}
      {currentTab === 'display_turnos' && <DisplayTurnosView />}
      {currentTab === 'profesionales' && <ProfesionalesView />}
      {currentTab === 'programacion_turnos' && <ProgramacionTurnosView />}
      {currentTab === 'programacion_anual' && <ProgramacionAnualView />}
      {currentTab === 'reportes' && <ReportesView />}
      {currentTab === 'gestion_usuarios' && <GestionUsuariosView />}
    </>
  );
};

const AppShell: React.FC = () => {
  const { isLoggedOut } = useApp();

  if (isLoggedOut) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Barra Superior con Identidad y Selector Rápido de Usuario */}
      <Navbar />

      {/* Pestañas de Navegación de Módulos con Indicadores de Bloqueo por Rol */}
      <NavTabs />

      {/* Contenedor Principal de Vistas */}
      <main className="flex-1 pb-16">
        <MainContent />
      </main>

      {/* Footer Institucional / Autoría */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>
          CSMC Centinela de Vida • Proyecto de la Unidad de Seguros (U.E. 401)
        </span>
        <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
          Desarrollado por: Juan Carlos Castillo Magallanes (Informático U.E. 401)
        </span>
      </footer>

      {/* Modales Globales */}
      <ModalRegistrarPaciente />
      <ModalVerPacientes />
      <ModalSupabaseStatus />
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary capturó un error:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-850 p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Recuperación de Vista
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ocurrió una inconsistencia transitoria al cargar la información. Puede regresar a la vista principal o reiniciar el módulo.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Recargar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AppErrorBoundary>
  );
}
