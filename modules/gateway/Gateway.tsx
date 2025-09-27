import React, { useState } from 'react';

interface GatewayProps {
  onLoginSuccess: () => void;
}

const Gateway: React.FC<GatewayProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'J4M1E') {
      setError(null);
      onLoginSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-neutral-900 text-neutral-200">
      <div className="w-full max-w-md p-8 space-y-6 bg-neutral-950 rounded-xl shadow-2xl border border-neutral-800">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-400">Work_Flow</h1>
          <p className="mt-2 text-neutral-400">Please enter the password to access the studio.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg placeholder-neutral-500 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-3 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-purple-500 transition-all duration-200 active:scale-95"
            >
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Gateway;