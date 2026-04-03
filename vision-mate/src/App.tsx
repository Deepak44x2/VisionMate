import React from 'react';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-eyefi-bg overflow-hidden">
      {/* Header */}
      <header className="p-6">
        <h1 className="text-eyefi-primary font-bold text-3xl">Vision Mate</h1>
        <p className="text-white text-sm opacity-80 mt-1">Real-time awareness assistant</p>
      </header>

      {/* Main Content Area (Camera will go here later) */}
      <main className="flex-1 flex items-center justify-center border-y border-gray-800">
        <p className="text-gray-500">Camera Feed Placeholder</p>
      </main>

      {/* Footer Controls Placeholder */}
      <footer className="h-32 p-4 flex items-center justify-center">
        <p className="text-gray-500">Controls Placeholder</p>
      </footer>
    </div>
  );
};

export default App;