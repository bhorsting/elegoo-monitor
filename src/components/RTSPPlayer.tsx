import React, { useEffect, useRef, useState } from 'react';

interface RTSPPlayerProps {
  rtspUrl: string;
  socketUrl: string;
  className?: string;
}

declare global {
  interface Window {
    Streamedian: any;
  }
}

export const RTSPPlayer: React.FC<RTSPPlayerProps> = ({ rtspUrl, socketUrl, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'streamedian-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/streamedian-player/dist/streamedian.min.js';
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.body.appendChild(script);
    } else if (window.Streamedian) {
      setIsLoaded(true);
    }

    return () => {
      // We don't remove the script to avoid reloading it multiple times
    };
  }, []);

  useEffect(() => {
    if (isLoaded && videoRef.current && rtspUrl && socketUrl) {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      try {
        console.log('Initializing SDCP RTSP Player:', { rtspUrl, socketUrl });
        playerRef.current = window.Streamedian.player(videoRef.current, {
          socket: socketUrl,
          redirect: rtspUrl,
          errorHandler: (err: any) => {
            console.error('Streamedian Error:', err);
          }
        });
      } catch (err) {
        console.error('Failed to initialize Streamedian player:', err);
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isLoaded, rtspUrl, socketUrl]);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls={false}
        autoPlay
        muted
        playsInline
      >
        <source src={rtspUrl} type="application/x-rtsp" />
      </video>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-deep/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
             <span className="text-[10px] font-mono font-bold text-brand uppercase tracking-widest">Loading RTSP Node...</span>
          </div>
        </div>
      )}
    </div>
  );
};
