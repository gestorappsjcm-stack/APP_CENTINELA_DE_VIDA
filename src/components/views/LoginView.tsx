import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, Building2, HeartPulse } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginUser } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Seguridad de 3 intentos y 7 segundos de espera
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0); // Reiniciar intentos tras la espera
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    setErrorMsg('');

    const res = loginUser(username, password);
    if (!res.success) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setLockoutTimer(7); // 7 segundos de espera
        setErrorMsg('Demasiados intentos fallidos. Sistema bloqueado temporalmente por seguridad.');
      } else {
        setErrorMsg(`${res.error || 'Error de autenticación.'} (Intento ${nextAttempts} de 3)`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/40 to-blue-950/60 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Círculos decorativos de luz ambiental de fondo */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-teal-500/20 shadow-2xl shadow-teal-950/50 p-8 relative z-10 space-y-6">
        
        {/* Cabecera con DOS LOGOS y Paleta Armonizada */}
        <div className="text-center space-y-5">
          <div className="flex items-center justify-center gap-5">
            {/* Logo 1: CSMC Centinela de Vida (Teal / Emerald) */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-teal-900/40 border-2 border-teal-400/40 bg-gradient-to-br from-teal-900 to-slate-900 flex items-center justify-center shrink-0 transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/img/centinela.jpg" 
                alt="CSMC Centinela de Vida" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = 'w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-800 flex flex-col items-center justify-center shadow-xl shadow-teal-900/40 text-white p-2 text-center border-2 border-teal-400/40 shrink-0';
                    parent.innerHTML = '<span class="font-black text-xs leading-none">CSMC</span><span class="text-[9px] font-semibold tracking-tighter mt-1">CENTINELA</span>';
                  }
                }}
              />
            </div>

            {/* Conector visual institucional */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
              <div className="h-10 w-0.5 bg-gradient-to-b from-teal-500/50 to-blue-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            </div>

            {/* Logo 2: Unidad de Seguros • U.E. 401 (Blue / Navy) */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-blue-900/40 border-2 border-blue-400/40 bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center shrink-0 transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/img/image.png" 
                alt="Unidad de Seguros U.E. 401" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = 'w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center shadow-xl shadow-blue-900/40 text-white p-2 text-center border-2 border-blue-400/40 shrink-0';
                    parent.innerHTML = '<span class="font-black text-sm leading-none">U.E.</span><span class="text-[10px] font-bold tracking-tight mt-1">401</span>';
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-widest bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent uppercase block">
              SISTEMA INTEGRAL DE ATENCIONES & FUA
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              CSMC Centinela de Vida
            </h1>
            <p className="text-xs text-slate-400">
              Desarrollado e impulsado por la Unidad de Seguros (U.E. 401)
            </p>
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-700/80 text-rose-300 rounded-xl flex items-center gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMsg} {lockoutTimer > 0 && `(Espere ${lockoutTimer}s)`}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">
              Usuario Institucional
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400/70" />
              <input
                type="text"
                required
                disabled={lockoutTimer > 0}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin"
                className="w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400/70" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={lockoutTimer > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={lockoutTimer > 0}
            className={`w-full py-3.5 font-bold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all ${
              lockoutTimer > 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white shadow-teal-950/60 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            <span>{lockoutTimer > 0 ? `Sistema Bloqueado (${lockoutTimer}s)` : 'Ingresar al Sistema'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Tarjeta de Información y Autoría Institucional */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-inner">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <Shield size={14} className="text-blue-400" />
            <span>Unidad de Seguros • U.E. 401</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Iniciativa desarrollada por la Unidad de Seguros (U.E. 401) para la sistematización, gestión de atenciones y registro FUA del CSMC Centinela de Vida.
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-0.5 text-[10px] text-slate-400">
            <span className="font-semibold text-slate-200">Desarrollado por: Juan Carlos Castillo Magallanes</span>
            <span className="text-blue-400/90 font-mono text-[9px] mt-0.5">Informático de la Unidad de Seguros • U.E. 401 (Asistencia IA)</span>
          </div>
        </div>

      </div>
    </div>
  );
};


