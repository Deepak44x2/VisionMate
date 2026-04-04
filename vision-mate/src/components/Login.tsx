import React, { useState } from 'react';

interface LoginProps {
  onLogin: (name: string, isGuest: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name, false);
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-bold text-eyefi-primary mb-2">Vision AI</h1>
      <p className="text-gray-400 mb-8 text-lg">Your AI Vision Assistant</p>
      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="p-4 rounded-xl bg-gray-800 text-white border-2 border-gray-600 focus:border-eyefi-primary outline-none text-xl"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="p-4 rounded-xl bg-eyefi-primary text-black font-bold text-xl disabled:opacity-50"
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => onLogin('Guest', true)}
          className="p-4 rounded-xl bg-gray-800 text-white font-bold text-xl mt-4"
        >
          Continue as Guest
        </button>
      </form>
    </div>
  );
};

export default Login;