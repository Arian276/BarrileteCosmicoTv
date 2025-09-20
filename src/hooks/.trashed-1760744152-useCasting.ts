import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    chrome?: {
      cast?: {
        isAvailable: boolean;
        initialize: (
          apiConfig: any,
          onInitSuccess: () => void,
          onInitError: (error: any) => void
        ) => void;
        requestSession: (
          onSuccess: (session: any) => void,
          onError: (error: any) => void
        ) => void;
        ApiConfig: new (
          sessionRequest: any,
          sessionListener: (session: any) => void,
          receiverListener: (availability: any) => void,
          autoJoinPolicy?: any,
          defaultActionPolicy?: any
        ) => any;
        SessionRequest: new (appId: string, capability?: string) => any;
        AutoJoinPolicy: {
          ORIGIN_SCOPED: any;
          TAB_AND_ORIGIN_SCOPED: any;
        };
        DefaultActionPolicy: {
          CREATE_SESSION: any;
          CAST_THIS_TAB: any;
        };
        ReceiverAvailability: {
          AVAILABLE: any;
          UNAVAILABLE: any;
        };
        media: {
          MediaInfo: new (contentId: string, contentType: string) => any;
          LoadRequest: new (mediaInfo: any) => any;
          StreamType: {
            BUFFERED: string;
            LIVE: string;
            NONE: string;
          };
          MetadataType: {
            GENERIC: number;
            MOVIE: number;
            TV_SHOW: number;
            MUSIC_TRACK: number;
            PHOTO: number;
          };
          GenericMediaMetadata: new () => any;
          MovieMediaMetadata: new () => any;
          TvShowMediaMetadata: new () => any;
        };
        Capability: {
          VIDEO_OUT: string;
          AUDIO_OUT: string;
          VIDEO_IN: string;
          AUDIO_IN: string;
        };
      };
    };
    WebKitPlaybackTargetAvailabilityEvent?: any;
    // Remote Playback API
    RemotePlayback?: any;
    PresentationRequest?: any;
    RemotePresentationDisplay?: any;
  }
  
  interface HTMLVideoElement {
    // Propiedades adicionales para compatibilidad
    webkitShowPlaybackTargetPicker?: () => void;
    webkitCurrentPlaybackTargetIsWireless?: boolean;
    webkitWirelessVideoPlaybackDisabled?: boolean;
    remote?: {
      watchAvailability: (callback: (available: boolean) => void) => Promise<number>;
      cancelWatchAvailability: (id?: number) => Promise<void>;
      prompt: () => Promise<void>;
      state: 'connecting' | 'connected' | 'disconnected';
    };
  }
  
  interface Navigator {
    presentation?: {
      defaultRequest?: any;
      receiver?: any;
    };
  }
}

export interface CastingCapabilities {
  chromecast: boolean;
  chromecastUltra: boolean; // Para dispositivos 4K
  chromecastAudio: boolean; // Para solo audio
  airplay: boolean;
  airplay2: boolean; // Para dispositivos nuevos
  pictureInPicture: boolean;
  fullscreen: boolean;
  screenShare: boolean;
  presentation: boolean;
  remotePresentationDisplay: boolean;
  remotePlayback: boolean; // Remote Playback API
  dlna: boolean; // Para dispositivos antiguos
  miracast: boolean; // Para Windows/Android
}

export interface CastingActions {
  startChromecast: () => Promise<boolean>;
  startAirPlay: () => Promise<boolean>;
  startRemotePlayback: () => Promise<boolean>;
  startDLNA: () => Promise<boolean>;
  startScreenShare: () => Promise<boolean>;
  startPresentation: () => Promise<boolean>;
  enterPictureInPicture: () => Promise<boolean>;
  exitPictureInPicture: () => Promise<boolean>;
  enterFullscreen: () => Promise<boolean>;
  exitFullscreen: () => Promise<boolean>;
  stopAllCasting: () => Promise<boolean>;
  reconnectCasting: () => Promise<boolean>;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  isCasting: boolean;
  isRemotePlaybackActive: boolean;
  isDLNAActive: boolean;
  isScreenSharing: boolean;
  isPresentationActive: boolean;
  castingStatus: string;
}

export function useCasting(
  videoRef: React.RefObject<HTMLVideoElement>,
  streamUrl?: string
): [CastingCapabilities, CastingActions] {
  const [capabilities, setCapabilities] = useState<CastingCapabilities>({
    chromecast: false,
    chromecastUltra: false,
    chromecastAudio: false,
    airplay: false,
    airplay2: false,
    pictureInPicture: false,
    fullscreen: false,
    screenShare: false,
    presentation: false,
    remotePresentationDisplay: false,
    remotePlayback: false,
    dlna: false,
    miracast: false,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPresentationActive, setIsPresentationActive] = useState(false);
  const [isRemotePlaybackActive, setIsRemotePlaybackActive] = useState(false);
  const [isDLNAActive, setIsDLNAActive] = useState(false);
  const [castingStatus, setCastingStatus] = useState<string>('disconnected');
  const [connectionRetries, setConnectionRetries] = useState(0);
  const castSessionRef = useRef<any>(null);
  const presentationRef = useRef<any>(null);
  const remotePlaybackRef = useRef<any>(null);
  const dlnaRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar capacidades disponibles con soporte mejorado
  useEffect(() => {
    const detectCapabilities = () => {
      const video = videoRef.current;
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isChrome = /chrome/.test(userAgent);
      const isMobile = /mobile|android|iphone|ipad|phone/.test(userAgent) || 'ontouchstart' in window;
      
      const newCapabilities: CastingCapabilities = {
        // Chromecast básico - disponible en Chrome y Edge
        chromecast: false, // Se activará cuando Cast esté realmente disponible
        chromecastUltra: false, // Para 4K, se detectará después
        chromecastAudio: false, // Para solo audio, se detectará después
        
        // AirPlay - mejor detección para dispositivos Apple
        airplay: !!(isIOS || isSafari || window.WebKitPlaybackTargetAvailabilityEvent || 
                   (video && 'webkitShowPlaybackTargetPicker' in video)),
        airplay2: !!(isIOS && parseFloat(/os (\d+)_/.exec(userAgent)?.[1] || '0') >= 11),
        
        // Picture in Picture - verificar soporte real
        pictureInPicture: !!(document.pictureInPictureEnabled && 
                           video && 'requestPictureInPicture' in video),
        
        // Fullscreen - soporte cross-browser
        fullscreen: !!(document.fullscreenEnabled || 
                      (document as any).webkitFullscreenEnabled || 
                      (document as any).mozFullScreenEnabled ||
                      (document as any).msFullscreenEnabled),
        
        // Screen Share - solo en contextos seguros
        screenShare: !!(navigator.mediaDevices && 
                       typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
                       window.isSecureContext),
        
        // Presentation API - soporte mejorado
        presentation: !!((window as any).PresentationRequest && 
                        (window as any).navigator.presentation),
        
        // Remote Presentation Display
        remotePresentationDisplay: !!(window as any).RemotePresentationDisplay,
        
        // Remote Playback API - estándar moderno
        remotePlayback: !!(video && video.remote && 'watchAvailability' in video.remote),
        
        // DLNA - deshabilitado debido a limitaciones de CORS/sandbox en navegadores
        dlna: false,
        
        // Miracast - principalmente Windows y algunos Android
        miracast: !!(navigator.userAgent.includes('Windows NT') ||
                   (isAndroid && navigator.userAgent.includes('Samsung')))
      };
      
      setCapabilities(newCapabilities);
    };

    detectCapabilities();

    // Cargar Google Cast SDK si no está disponible
    if (!window.chrome?.cast && typeof window !== "undefined") {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.onload = () => {
        // Esperar a que Cast Framework esté disponible
        const checkCast = setInterval(() => {
          if (window.chrome?.cast?.isAvailable) {
            clearInterval(checkCast);
            initializeCast();
            setCapabilities(prev => ({ ...prev, chromecast: true }));
          }
        }, 100);
      };
      document.head.appendChild(script);
    } else if (window.chrome?.cast) {
      initializeCast();
    }
  }, []);

  // Inicializar Google Cast con soporte para múltiples receivers
  const initializeCast = useCallback(() => {
    if (!window.chrome?.cast) return;

    // Crear session request para el Default Media Receiver
    const sessionRequest = new window.chrome.cast.SessionRequest('CC1AD845'); // Default Media Receiver

    const apiConfig = new window.chrome.cast.ApiConfig(
      sessionRequest, // Receiver primario
      (session: any) => {
        castSessionRef.current = session;
        setIsCasting(true);
        
        setCastingStatus('connected');
        setConnectionRetries(0);
        
        // Detectar capacidades específicas del receiver conectado
        if (session.receiver) {
          const capabilities = session.receiver.capabilities || [];
          const receiverName = session.receiver.friendlyName || '';
          setCapabilities(prev => ({
            ...prev,
            chromecastUltra: receiverName.includes('Ultra') || capabilities.includes('4K'),
            chromecastAudio: receiverName.includes('Audio') || (capabilities.length === 1 && receiverName.includes('Audio'))
          }));
        }
        
        // Agregar listeners para manejar desconexiones
        session.addUpdateListener((isAlive: boolean) => {
          if (!isAlive) {
            setIsCasting(false);
            castSessionRef.current = null;
            // Resetear capacidades específicas
            setCapabilities(prev => ({
              ...prev,
              chromecastUltra: false,
              chromecastAudio: false
            }));
          }
        });
        
        session.addMessageListener('urn:x-cast:com.google.cast.media', (namespace: string, message: string) => {
          try {
            const data = JSON.parse(message);
            if (data.type === 'MEDIA_STATUS' && data.status && data.status.length === 0) {
              // Media session ended
              setIsCasting(false);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });
      },
      (availability: any) => {
        const isAvailable = availability === window.chrome?.cast?.ReceiverAvailability.AVAILABLE;
        setCapabilities(prev => ({
          ...prev,
          chromecast: isAvailable
        }));
        
        // Si hay disponibilidad, intentar detectar tipos específicos
        if (isAvailable && window.chrome?.cast?.requestSession) {
          // Detectar capacidades avanzadas de forma no intrusiva
          setTimeout(() => {
            try {
              // Solo detectar capacidades reales cuando hay una sesión activa
              const checkAdvancedCapabilities = () => {
                // No asumir capacidades sin verificarlas realmente
                console.log('Chromecast available, specific capabilities will be detected on connection');
              };
              checkAdvancedCapabilities();
            } catch (e) {
              // Si falla, mantener capacidades básicas
            }
          }, 1000);
        }
      },
      window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      window.chrome.cast.DefaultActionPolicy.CREATE_SESSION
    );

    window.chrome.cast.initialize(
      apiConfig,
      () => console.log('Cast initialized with multi-receiver support'),
      (error: any) => console.warn('Cast initialization failed:', error)
    );
  }, []);

  // Monitorear estado de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || 
                     (document as any).webkitFullscreenElement || 
                     (document as any).mozFullScreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Monitorear estado de Picture-in-Picture
  useEffect(() => {
    const handlePiPChange = () => {
      setIsPictureInPicture(!!document.pictureInPictureElement);
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('enterpictureinpicture', handlePiPChange);
    }
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      if (video) {
        video.removeEventListener('enterpictureinpicture', handlePiPChange);
      }
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, [videoRef]);

  // Funciones de casting mejoradas
  const startChromecast = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.chrome?.cast || !streamUrl) return false;

      return new Promise((resolve) => {
        window.chrome!.cast!.requestSession(
          (session: any) => {
            castSessionRef.current = session;
            
            // Detectar el tipo de contenido y ajustar el formato
            let contentType = 'application/vnd.apple.mpegurl'; // HLS por defecto
            let metadata: any;
            
            // Determinar tipo de contenido basado en la URL
            if (streamUrl.includes('.m3u8')) {
              contentType = 'application/vnd.apple.mpegurl'; // HLS
            } else if (streamUrl.includes('.mpd')) {
              contentType = 'application/dash+xml'; // DASH
            } else if (streamUrl.includes('.mp4')) {
              contentType = 'video/mp4'; // MP4 directo
            } else if (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be')) {
              contentType = 'video/mp4'; // YouTube como MP4
            }
            
            // Crear metadata apropiado
            if (window.chrome?.cast?.media?.GenericMediaMetadata) {
              metadata = new window.chrome.cast.media.GenericMediaMetadata();
              metadata.metadataType = window.chrome.cast.media.MetadataType.GENERIC;
              metadata.title = 'Transmisión Deportiva en Vivo';
              metadata.subtitle = 'ESPN Premium HD';
            }
            
            const mediaInfo = new window.chrome!.cast!.media.MediaInfo(
              streamUrl,
              contentType
            );
            
            if (metadata) {
              mediaInfo.metadata = metadata;
            }
            
            // Configurar propiedades adicionales para mejor compatibilidad
            if (window.chrome?.cast?.media?.StreamType) {
              mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE; // Usar enum oficial
            }
            mediaInfo.duration = null; // Indefinido para streams en vivo
            
            const request = new window.chrome!.cast!.media.LoadRequest(mediaInfo);
            
            // Configurar autoplay y posición inicial
            request.autoplay = true;
            request.currentTime = 0;
            
            session.loadMedia(request,
              () => {
                setIsCasting(true);
                console.log('Media loaded successfully on Chromecast');
                resolve(true);
              },
              (error: any) => {
                console.error('Error loading media on Chromecast:', error);
                resolve(false);
              }
            );
          },
          (error: any) => {
            console.error('Error requesting Chromecast session:', error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Chromecast error:', error);
      return false;
    }
  }, [streamUrl]);

  const startAirPlay = useCallback(async (): Promise<boolean> => {
    try {
      const video = videoRef.current;
      if (!video) return false;

      // Para Safari/WebKit
      if ('webkitShowPlaybackTargetPicker' in video) {
        (video as any).webkitShowPlaybackTargetPicker();
        return true;
      }

      // Para navegadores que soportan Remote Playback API
      if ('remote' in video && (video as any).remote) {
        await (video as any).remote.prompt();
        return true;
      }

      return false;
    } catch (error) {
      console.error('AirPlay error:', error);
      return false;
    }
  }, [videoRef]);

  const enterPictureInPicture = useCallback(async (): Promise<boolean> => {
    try {
      const video = videoRef.current;
      if (!video || !document.pictureInPictureEnabled) return false;

      await video.requestPictureInPicture();
      return true;
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
      return false;
    }
  }, [videoRef]);

  const exitPictureInPicture = useCallback(async (): Promise<boolean> => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Exit Picture-in-Picture error:', error);
      return false;
    }
  }, []);

  const enterFullscreen = useCallback(async (): Promise<boolean> => {
    try {
      const video = videoRef.current;
      if (!video) return false;

      if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).mozRequestFullScreen) {
        (video as any).mozRequestFullScreen();
      } else {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fullscreen error:', error);
      return false;
    }
  }, [videoRef]);

  const exitFullscreen = useCallback(async (): Promise<boolean> => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exit fullscreen error:', error);
      return false;
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return false;
      }

      const video = videoRef.current;
      if (!video) return false;

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      video.srcObject = stream;
      setIsScreenSharing(true);
      
      // Escuchar cuando el usuario detenga el screen sharing
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false);
        // Limpiar el stream de pantalla
        video.srcObject = null;
        
        // Disparar evento personalizado para que el video player restaure Hls.js
        // Siempre usar streamUrl (la URL del HLS playlist) nunca blob URLs
        const restoreEvent = new CustomEvent('restore-hls-stream', {
          detail: { streamUrl }
        });
        video.dispatchEvent(restoreEvent);
        
        // Fallback: intentar restaurar directamente si no hay listener
        setTimeout(() => {
          if (!video.src && !video.srcObject && streamUrl) {
            video.src = streamUrl;
            video.play().catch(() => {});
          }
        }, 100);
      });

      return true;
    } catch (error) {
      console.error('Screen sharing error:', error);
      return false;
    }
  }, [videoRef, streamUrl]);

  const startPresentation = useCallback(async (): Promise<boolean> => {
    try {
      const PresentationRequest = (window as any).PresentationRequest;
      
      if (!PresentationRequest || !streamUrl) {
        return false;
      }

      const presentationUrls = [streamUrl];
      const request = new PresentationRequest(presentationUrls);
      
      // Verificar disponibilidad de displays antes de intentar (opcional)
      try {
        if ('getAvailability' in request) {
          const availability = await request.getAvailability();
          if (!availability.value) {
            return false;
          }
        }
      } catch {
        // Si no se puede verificar disponibilidad, continuar e intentar directamente
        console.log('Cannot check presentation availability, attempting direct start');
      }
      
      const connection = await request.start();
      
      presentationRef.current = connection;
      setIsPresentationActive(true);

      connection.addEventListener('close', () => {
        setIsPresentationActive(false);
        presentationRef.current = null;
      });

      connection.addEventListener('terminate', () => {
        setIsPresentationActive(false);
        presentationRef.current = null;
      });

      return true;
    } catch (error) {
      // No mostrar error en console ya que es esperado en la mayoría de casos
      console.log('Presentation API not available or no displays found');
      return false;
    }
  }, [streamUrl]);

  // Remote Playback API - estándar moderno para casting
  const startRemotePlayback = useCallback(async (): Promise<boolean> => {
    try {
      const video = videoRef.current;
      if (!video || !video.remote) return false;

      // Configurar listeners de estado antes de iniciar
      const handleStateChange = () => {
        if (video.remote) {
          const state = video.remote.state;
          setIsRemotePlaybackActive(state === 'connected' || state === 'connecting');
          setCastingStatus(state === 'connected' ? 'connected' : 
                          state === 'connecting' ? 'connecting' : 'disconnected');
        }
      };

      // Agregar listener de cambios de estado
      video.addEventListener('remoteplaybackstatechange', handleStateChange);

      // Verificar disponibilidad antes de intentar
      let watchId: number | undefined;
      try {
        watchId = await video.remote.watchAvailability((available: boolean) => {
          if (!available) {
            setIsRemotePlaybackActive(false);
            setCastingStatus('disconnected');
          }
        });
      } catch (error) {
        console.warn('Cannot watch remote playback availability:', error);
      }

      try {
        await video.remote.prompt();
        // Estado se actualizará automáticamente via listeners
        setConnectionRetries(0);
        return true;
      } catch (error) {
        // Limpiar listeners en caso de error
        video.removeEventListener('remoteplaybackstatechange', handleStateChange);
        if (watchId !== undefined && video.remote.cancelWatchAvailability) {
          video.remote.cancelWatchAvailability(watchId);
        }
        throw error;
      }
    } catch (error) {
      console.error('Remote Playback error:', error);
      setIsRemotePlaybackActive(false);
      setCastingStatus('disconnected');
      return false;
    }
  }, [videoRef]);

  // DLNA/UPnP - DESHABILITADO: No puede funcionar desde navegadores debido a CORS/sandbox
  const startDLNA = useCallback(async (): Promise<boolean> => {
    console.warn('DLNA functionality is disabled: Browser security restrictions (CORS/sandbox) prevent DLNA/UPnP communication');
    return false;
  }, []);

  // Parar todo el casting activo
  const stopAllCasting = useCallback(async (): Promise<boolean> => {
    try {
      let success = true;
      
      // Parar Chromecast
      if (isCasting && castSessionRef.current) {
        try {
          castSessionRef.current.stop(
            () => console.log('Chromecast session stopped'),
            (error: any) => console.error('Error stopping Chromecast:', error)
          );
          castSessionRef.current = null;
          setIsCasting(false);
        } catch (error) {
          success = false;
        }
      }
      
      // Parar Remote Playback
      if (isRemotePlaybackActive) {
        try {
          const video = videoRef.current;
          if (video && video.remote) {
            // No hay método específico para parar, el usuario debe hacerlo desde su dispositivo
            setIsRemotePlaybackActive(false);
          }
        } catch (error) {
          success = false;
        }
      }
      
      // Parar DLNA
      if (isDLNAActive) {
        setIsDLNAActive(false);
      }
      
      // Parar Screen Share
      if (isScreenSharing) {
        try {
          const video = videoRef.current;
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            setIsScreenSharing(false);
          }
        } catch (error) {
          success = false;
        }
      }
      
      // Parar Presentation
      if (isPresentationActive && presentationRef.current) {
        try {
          presentationRef.current.terminate();
          presentationRef.current = null;
          setIsPresentationActive(false);
        } catch (error) {
          success = false;
        }
      }
      
      setCastingStatus('disconnected');
      return success;
    } catch (error) {
      console.error('Error stopping all casting:', error);
      return false;
    }
  }, [isCasting, isRemotePlaybackActive, isDLNAActive, isScreenSharing, isPresentationActive, videoRef]);

  // Reconectar casting después de una desconexión
  const reconnectCasting = useCallback(async (): Promise<boolean> => {
    try {
      if (connectionRetries >= 3) {
        console.log('Max reconnection attempts reached');
        return false;
      }
      
      setConnectionRetries(prev => prev + 1);
      setCastingStatus('connecting');
      
      // Intentar reconectar Chromecast si estaba activo
      if (capabilities.chromecast) {
        const success = await startChromecast();
        if (success) {
          setCastingStatus('connected');
          setConnectionRetries(0);
          return true;
        }
      }
      
      // Intentar Remote Playback si está disponible
      if (capabilities.remotePlayback) {
        const success = await startRemotePlayback();
        if (success) {
          setCastingStatus('connected');
          setConnectionRetries(0);
          return true;
        }
      }
      
      setCastingStatus('disconnected');
      return false;
    } catch (error) {
      console.error('Reconnection error:', error);
      setCastingStatus('disconnected');
      return false;
    }
  }, [connectionRetries, capabilities, startChromecast, startRemotePlayback]);

  const actions: CastingActions = {
    startChromecast,
    startAirPlay,
    startRemotePlayback,
    startDLNA,
    startScreenShare,
    startPresentation,
    enterPictureInPicture,
    exitPictureInPicture,
    enterFullscreen,
    exitFullscreen,
    stopAllCasting,
    reconnectCasting,
    isFullscreen,
    isPictureInPicture,
    isCasting,
    isRemotePlaybackActive,
    isDLNAActive,
    isScreenSharing,
    isPresentationActive,
    castingStatus,
  };

  return [capabilities, actions];
}