import React from 'react';
import { Camera as CameraIcon } from 'lucide-react';

const Camera: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center">
      <CameraIcon size={64} className="text-gray-600 mb-4" />
      <p className="text-gray-500 font-medium text-lg">Camera initializing...</p>
    </div>
  );
};

export default Camera;