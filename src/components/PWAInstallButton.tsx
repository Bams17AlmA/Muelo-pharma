import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Installer Muelo PHARM sur votre appareil pour un accès hors ligne direct"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Installer (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-900">Installer sur iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600 space-y-2">
                Pour utiliser Muelo PHARM hors ligne comme une application native :
              </p>
              <ol className="mt-2 text-xs text-slate-600 list-decimal list-inside space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <li>
                  Appuyez sur le bouton <strong>Partager</strong> dans Safari (icône flèche vers le haut).
                </li>
                <li>
                  Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.
                </li>
                <li>Confirmez en appuyant sur <strong>Ajouter</strong> en haut à droite.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-md bg-blue-700 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
