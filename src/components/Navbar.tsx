import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Moon, Sun, Shield, LogOut, ChevronDown, Check, UserPlus, Database } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    usuarios,
    theme,
    toggleTheme,
    setActiveModal,
    logoutUser,
    supabaseStatus,
  } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="bg-[#1A2B4A] text-white px-4 md:px-8 h-16 flex justify-between items-center sticky top-0 z-50 shadow-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white p-1 flex items-center justify-center shadow-inner overflow-hidden border border-teal-500">
          <img
            src="/assets/aistudio/logo.png"
            alt="Logo Centinela"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback icon si la imagen aún no está cargada
              (e.target as HTMLElement).style.display = 'none';
              const parent = (e.target as HTMLElement).parentElement;
              if (parent) {
                parent.innerHTML = '<span class="text-xs font-bold text-teal-700">CV</span>';
              }
            }}
          />
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold tracking-wide text-white flex items-center gap-2">
            Centinela de Vida
            <span className="hidden sm:inline-block text-[10px] bg-teal-600/60 text-teal-200 px-2 py-0.5 rounded-full font-medium">
              CSMC
            </span>
          </h1>
          <span className="text-[11px] text-white/70 block">
            Centro de Salud Mental Comunitario
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Supabase Database Status Pill */}
        <button
          onClick={() => setActiveModal('supabaseStatus')}
          title="Ver estado de la base de datos Supabase"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
            supabaseStatus === 'connected'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
              : supabaseStatus === 'connecting'
              ? 'bg-blue-950/60 border-blue-500/40 text-blue-300 hover:bg-blue-900/60'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
          }`}
        >
          <Database size={13} className={supabaseStatus === 'connecting' ? 'animate-spin' : ''} />
          <span className="hidden md:inline text-[11px]">
            {supabaseStatus === 'connected'
              ? 'Supabase Conectado'
              : supabaseStatus === 'connecting'
              ? 'Conectando Supabase...'
              : 'BD Supabase'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              supabaseStatus === 'connected'
                ? 'bg-emerald-400'
                : supabaseStatus === 'connecting'
                ? 'bg-blue-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          ></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all text-sm cursor-pointer"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User Pill with fast switcher */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border border-white/10"
          >
            <div className="w-7 h-7 rounded-full bg-[#2D9C8B] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {currentUser.nombres[0]}
              {currentUser.apellidos[0]}
            </div>
            <div className="hidden sm:block text-left">
              <span className="font-semibold block leading-tight">
                {currentUser.nombres.split(' ')[0]} {currentUser.apellidos.split(' ')[0]}
              </span>
              <span className="text-[10px] text-teal-300 uppercase block font-mono">
                {currentUser.rol}
              </span>
            </div>
            <ChevronDown size={14} className="text-white/60 ml-0.5" />
          </button>

          {/* Switcher Dropdown to test permissions */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                  Cambiar Usuario Activo
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prueba permisos por rol y módulo al instante:
                </p>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {usuarios.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setShowUserMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                      currentUser.id === u.id ? 'bg-teal-50 text-teal-900 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {u.nombres[0]}
                        {u.apellidos[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {u.nombres} {u.apellidos}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">
                          {u.rol} • {u.permisosModulos.length} módulos
                        </div>
                      </div>
                    </div>
                    {currentUser.id === u.id && <Check size={16} className="text-teal-600" />}
                  </button>
                ))}
              </div>

              <div className="px-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setActiveModal('gestionUsuarios');
                  }}
                  className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserPlus size={13} />
                  Crear / Configurar Usuarios
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Salir Button */}
        <button
          onClick={() => {
            logoutUser();
          }}
          className="text-white bg-red-600 hover:bg-red-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
};
