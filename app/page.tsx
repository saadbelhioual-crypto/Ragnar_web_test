'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [guestId, setGuestId] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioRef.current = new Audio('/ambient.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.log);
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'RAGNAR-FF10-FREE') {
      setIsAuthenticated(true);
      setError('');
      
      try {
        const res = await fetch('http://localhost:5000/api/bot');
        if (res.ok) {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Connected to API`]);
        }
      } catch (err) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠ API not running on port 5000`]);
      }
    } else {
      setError('Invalid access code');
    }
  };

  const startBot = async () => {
    if (!guestId || !guestPassword) {
      setError('Please enter GUEST ID and PASSWORD');
      return;
    }

    setIsBotRunning(true);
    setError('');

    try {
      const saveRes = await fetch('http://localhost:5000/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          guest_id: guestId,
          guest_password: guestPassword,
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || 'Failed to save credentials');
      }

      const startRes = await fetch('http://localhost:5000/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_bot' }),
      });

      if (!startRes.ok) {
        throw new Error('Failed to start bot');
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource('http://localhost:5000/api/bot?action=stream_logs');
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.raw) {
          setLogs((prev) => [...prev, data.raw]);
        } else if (data.message) {
          setLogs((prev) => [...prev, `[${data.timestamp || new Date().toLocaleTimeString()}] ${data.message}`]);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE connection issue');
      };
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start bot');
      setIsBotRunning(false);
    }
  };

  const stopBot = async () => {
    try {
      await fetch('http://localhost:5000/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_bot' }),
      });
      setIsBotRunning(false);
    } catch (err) {
      console.error('Failed to stop bot:', err);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <div className="card w-full max-w-md p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-main" />
                <h1 className="text-3xl font-semibold gradient-text">
                  RAGNAR SYSTEM
                </h1>
                <p className="text-secondary mt-2 text-sm">
                  Enter access code to continue
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full text-center mb-4"
                  placeholder="••••••••••••••"
                  autoFocus
                />

                {error && (
                  <div className="text-error text-center mb-4 text-sm">
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  VERIFY ACCESS
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-6"
          >
            <div className="container mx-auto">
              {/* Header */}
              <div className="flex-between mb-8">
                <div>
                  <h1 className="text-3xl font-semibold gradient-text">
                    Bot Manager
                  </h1>
                  <p className="text-secondary text-sm">
                    Free Fire Automation System
                  </p>
                </div>
                
                <button
                  onClick={toggleMusic}
                  className={`btn ${isMusicPlaying ? 'btn-primary' : 'btn-secondary'} px-6`}
                >
                  {isMusicPlaying ? '🔊 MUSIC ON' : '🔇 MUSIC OFF'}
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Panel */}
                <div className="card p-6">
                  <div className="divider-horizontal" />
                  <h2 className="text-xl font-medium text-red-light mb-6">
                    GUEST CREDENTIALS
                  </h2>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-secondary text-sm mb-2">
                        GUEST ID
                      </label>
                      <input
                        type="text"
                        value={guestId}
                        onChange={(e) => setGuestId(e.target.value)}
                        className="input w-full"
                        placeholder="Enter Guest ID"
                        disabled={isBotRunning}
                      />
                    </div>

                    <div>
                      <label className="block text-secondary text-sm mb-2">
                        GUEST PASSWORD
                      </label>
                      <input
                        type="password"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        className="input w-full"
                        placeholder="Enter Guest Password"
                        disabled={isBotRunning}
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={startBot}
                        disabled={isBotRunning}
                        className="btn btn-primary flex-1"
                      >
                        {isBotRunning ? 'RUNNING...' : '🚀 START BOT'}
                      </button>

                      <button
                        onClick={stopBot}
                        disabled={!isBotRunning}
                        className="btn btn-secondary flex-1"
                      >
                        ⏹️ STOP BOT
                      </button>
                    </div>

                    <button
                      onClick={clearLogs}
                      className="btn-outline w-full py-2 rounded-lg border border-red-light text-red-light hover:bg-red-light hover:text-white transition-all"
                    >
                      🗑️ CLEAR TERMINAL
                    </button>

                    {error && (
                      <div className="bg-error/10 border border-error rounded-lg p-3 text-error text-center text-sm">
                        ⚠ {error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel - Terminal */}
                <div className="card card-blue p-6">
                  <div className="divider-horizontal" />
                  <h2 className="text-xl font-medium text-blue-light mb-6">
                    LIVE TERMINAL
                  </h2>

                  <div
                    ref={terminalRef}
                    className="terminal"
                  >
                    {logs.length === 0 ? (
                      <div className="text-muted text-center mt-32">
                        <p>┌─[ Waiting for bot to start ]</p>
                        <p>└─► System ready. Enter credentials and click START</p>
                      </div>
                    ) : (
                      logs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`mb-1 text-sm whitespace-pre-wrap ${
                            log.includes('SUCCESS') ? 'terminal-success' :
                            log.includes('ERROR') ? 'terminal-error' :
                            log.includes('BOT') ? 'terminal-bot' :
                            'terminal-system'
                          }`}
                        >
                          {log}
                        </div>
                      ))
                    )}
                    {isBotRunning && (
                      <div className="terminal-success mt-2">
                        ⚡ Bot is processing...
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <span className={`status-dot ${isBotRunning ? 'status-active' : 'status-inactive'}`} />
                    <span className="text-muted text-xs">
                      {isBotRunning ? '● LIVE CONNECTION ACTIVE' : '● STANDBY MODE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}