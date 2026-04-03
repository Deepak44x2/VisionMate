import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera as CameraIcon, AlertCircle } from 'lucide-react';

export interface CameraHandle {
  capture: () => string | null;
}

const Camera = forwardRef<CameraHandle>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.8);
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Request the camera. On mobile, prefer the environment (rear) camera.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError(err.message || "Could not access camera. Please check permissions.");
      } finally {
        setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <CameraIcon size={48} className="text-gray-500 animate-pulse mb-4" />
          <p className="text-gray-400">Starting camera...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 p-6 text-center">
          <AlertCircle size={48} className="text-vision-alert mb-4" />
          <p className="text-white font-medium mb-2">Camera Error</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {/* The live video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${isInitializing ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Hidden canvas used for capturing the image frame */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

Camera.displayName = 'Camera';

export default Camera;