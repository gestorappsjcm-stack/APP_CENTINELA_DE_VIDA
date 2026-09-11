import React from 'react';
import { useApp } from '../context/AppContext';
import { ModuleId } from '../types';
import {
  LayoutDashboard,
  CalendarDays,
  Stethoscope,
  Activity,
  Tv,
  UserCheck,
  Clock,
  CalendarRange,
  BarChart3,
  ShieldCheck,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';

interface TabItem {
  id: string;
  moduleId: ModuleId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: TabItem[] = [
  { id: 'dashboard', moduleId: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', moduleId: 'agenda', label: 'Agenda de Citas', icon: CalendarDays },
  { id: 'triaje', moduleId: 'triaje', label: 'Triaje', icon: Stethoscope },
  { id: 'atencion', moduleId: 'atencion', label: 'Consultorios / Atención', icon: Activity },
  { id: 'fua', moduleId: 'fua', label: 'Gestión FUA (SIS)', icon: FileSpreadsheet },
  { id: 'display_turnos', moduleId: 'display_turnos', label: 'Pantalla TV Turnos', icon: Tv },
  { id: 'profesionales', moduleId: 'profesionales', label: 'Profesionales', icon: UserCheck },
  { id: 'programacion_turnos', moduleId: 'programacion_turnos', label: 'Programación de Turnos', icon: Clock },
  { id: 'programacion_anual', moduleId: 'programacion_anual', label: 'Programación Anual', icon: CalendarRange },
  { id: 'reportes', moduleId: 'reportes', label: 'Reportes', icon: BarChart3 },
  { id: 'gestion_usuarios', moduleId: 'gestion_usuarios', label: 'Gestión Usuarios', icon: ShieldCheck },
];

export const NavTabs: React.FC = () => {
  const { currentTab, setCurrentTab, canAccess } = useApp();

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-none shadow-xs">
      {TABS.map((tab) => {
        const hasAccess = canAccess(tab.moduleId);
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;

        if (!hasAccess) {
          // If not accessible, render disabled with lock
          return (
            <div
              key={tab.id}
              title="Módulo no autorizado para su perfil"
              className="py-3.5 px-3.5 text-slate-300 dark:text-slate-700 text-[13px] font-medium flex items-center gap-1.5 opacity-60 cursor-not-allowed whitespace-nowrap select-none"
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <Lock size={12} className="text-slate-400" />
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`py-3 px-3.5 text-[13px] font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'text-[#1A2B4A] dark:text-teal-300 border-teal-600 dark:border-teal-400 font-bold bg-teal-50/60 dark:bg-teal-950/40'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <Icon size={16} className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
