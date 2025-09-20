import { useState, useEffect } from "react";
import { 
  Cast, 
  Maximize2, 
  Minimize2, 
  PictureInPicture2, 
  Smartphone, 
  Tv,
  MonitorSpeaker,
  ScreenShare,
  Presentation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CastingCapabilities, type CastingActions } from "@/hooks/useCasting";

interface CastingControlsProps {
  capabilities: CastingCapabilities;
  actions: CastingActions;
  className?: string;
}

export function CastingControls({ capabilities, actions, className = "" }: CastingControlsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCast = async (type: string, action: () => Promise<boolean>) => {
    setIsLoading(type);
    setErrorMessage(null);
    setShowSuccessMessage(null);
    
    try {
      const success = await action();
      if (success) {
        setShowSuccessMessage(`Transmisión ${type} iniciada correctamente`);
        setTimeout(() => setShowSuccessMessage(null), 3000);
      } else {
        setErrorMessage(`Error al iniciar ${type}. Verifica que tu dispositivo esté conectado.`);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (error) {
      console.error(`Error with ${type}:`, error);
      setErrorMessage(`Error de conexión con ${type}. Intenta nuevamente.`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <TooltipProvider>
      <div className={`relative flex items-center gap-1 ${className}`}>
        {/* Chromecast */}
        {capabilities.chromecast && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isCasting ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast('chromecast', actions.startChromecast)}
                disabled={isLoading === 'chromecast'}
              >
                {isLoading === 'chromecast' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Cast className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isCasting ? 'Transmitiendo a TV' : 'Transmitir a Chromecast'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* AirPlay */}
        {capabilities.airplay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 h-auto text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => handleCast('airplay', actions.startAirPlay)}
                disabled={isLoading === 'airplay'}
              >
                {isLoading === 'airplay' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MonitorSpeaker className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Transmitir con AirPlay</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Remote Playback API */}
        {capabilities.remotePlayback && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isRemotePlaybackActive ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast('transmisión remota', actions.startRemotePlayback)}
                disabled={isLoading === 'transmisión remota'}
              >
                {isLoading === 'transmisión remota' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Tv className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isRemotePlaybackActive ? 'Transmitiendo remotamente' : 'Transmisión remota moderna'}</p>
            </TooltipContent>
          </Tooltip>
        )}


        {/* Screen Share */}
        {capabilities.screenShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isScreenSharing ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast('screen sharing', actions.startScreenShare)}
                disabled={isLoading === 'screen sharing'}
              >
                {isLoading === 'screen sharing' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ScreenShare className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isScreenSharing ? 'Compartiendo pantalla' : 'Compartir pantalla'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Presentation API */}
        {capabilities.presentation && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isPresentationActive ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast('presentación', actions.startPresentation)}
                disabled={isLoading === 'presentación'}
              >
                {isLoading === 'presentación' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Presentation className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isPresentationActive ? 'Presentando en pantalla externa' : 'Presentar en pantalla externa'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Picture in Picture */}
        {capabilities.pictureInPicture && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isPictureInPicture ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast(
                  'pip', 
                  actions.isPictureInPicture ? actions.exitPictureInPicture : actions.enterPictureInPicture
                )}
                disabled={isLoading === 'pip'}
              >
                {isLoading === 'pip' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PictureInPicture2 className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isPictureInPicture ? 'Salir de PiP' : 'Picture in Picture'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Fullscreen */}
        {capabilities.fullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 h-auto ${actions.isFullscreen ? 'text-primary bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                onClick={() => handleCast(
                  'fullscreen', 
                  actions.isFullscreen ? actions.exitFullscreen : actions.enterFullscreen
                )}
                disabled={isLoading === 'fullscreen'}
              >
                {isLoading === 'fullscreen' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : actions.isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{actions.isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Botón para parar toda transmisión */}
        {(actions.isCasting || actions.isRemotePlaybackActive || actions.isScreenSharing || actions.isPresentationActive) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 h-auto text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                onClick={() => handleCast('parar transmisión', actions.stopAllCasting)}
                disabled={isLoading === 'parar transmisión'}
              >
                {isLoading === 'parar transmisión' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs font-bold">×</span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Detener toda transmisión</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Separador e indicador de transmisión mejorado */}
        {(actions.isCasting || actions.isRemotePlaybackActive) && (
          <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-green-500/20 rounded text-green-400 text-xs animate-pulse">
            <Tv className="w-3 h-3" />
            <span>
              {actions.isCasting && 'Chromecast'}
              {actions.isRemotePlaybackActive && 'Remoto'}
              {(actions.isCasting || actions.isRemotePlaybackActive) && ' activo'}
            </span>
          </div>
        )}
        
        {/* Estado de conexión */}
        {actions.castingStatus === 'connecting' && (
          <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400 text-xs">
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Conectando...</span>
          </div>
        )}
        
        {/* Mensaje de éxito */}
        {showSuccessMessage && (
          <div className="absolute -bottom-12 left-0 right-0 bg-green-500 text-white px-3 py-2 rounded text-sm z-10">
            {showSuccessMessage}
          </div>
        )}
        
        {/* Mensaje de error */}
        {errorMessage && (
          <div className="absolute -bottom-16 left-0 right-0 bg-red-500 text-white px-3 py-2 rounded text-sm z-10">
            {errorMessage}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}