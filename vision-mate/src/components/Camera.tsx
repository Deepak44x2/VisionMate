

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface CameraProps {
  isActive: boolean;
}
export interface CameraHandle {
  capture: () => string | null;
}

const Camera = forwardRef<CameraHandle, CameraProps>(({ isActive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!videoRef.current || !canvasRef.current) return null;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
      if (!video.videoWidth || !video.videoHeight) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      const payload = dataUrl.split(',')[1];
      if (!payload || payload.length < 32) return null;
      return dataUrl;
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
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
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 border-2 border-eyefi-primary opacity-30" />
    </div>
  );
});

export default Camera;