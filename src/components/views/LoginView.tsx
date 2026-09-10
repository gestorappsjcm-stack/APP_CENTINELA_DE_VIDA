import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Lock, User, ArrowRight, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginUser, usuarios } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = loginUser(username, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Error de autenticación.');
    }
  };

  const handleQuickSelect = (userItem: typeof usuarios[0]) => {
    setUsername(userItem.usuario);
    setPassword(userItem.contrasena || '123456');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-900 to-slate-950"></div>

      <div className="w-full max-w-md bg-slate-850/90 backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-8 relative z-10 space-y-6">
        {/* Cabecera Institucional MINSA */}
        <div className="text-center space-y-3">
          {/* Emblema / Escudo */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center mx-auto shadow-lg shadow-teal-900/40 text-white font-black text-2xl">
            CV
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-teal-400 uppercase block">
              MINISTERIO DE SALUD • PERÚ
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">
              CSMC Centinela de Vida
            </h1>
            <p className="text-xs text-slate-400">
              Sistema Integrado de Registros Clínicos, Citas y FUA (SIS)
            </p>
          </div>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Usuario Institucional
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: admin"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Ingresar al Sistema</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Acceso Rápido / Perfiles para prueba */}
        <div className="pt-4 border-t border-slate-700/60 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            Acceso Rápido por Rol (Demostración):
          </span>
          <div className="grid grid-cols-2 gap-2">
            {usuarios.slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className="p-2 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 rounded-xl text-left cursor-pointer transition-colors"
              >
                <div className="font-bold text-[11px] text-white truncate">
                  {u.nombres}
                </div>
                <div className="text-[10px] text-teal-400 font-mono capitalize">
                  {u.rol}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pie institucional */}
        <div className="text-center text-[10px] text-slate-500 space-y-0.5">
          <div>Red de Salud Chincha • DIRESA Ica • Nivel I-3</div>
          <div className="font-mono text-[9px] text-slate-600">RENAES: 00028492</div>
        </div>
      </div>
    </div>
  );
};
