import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Activity, 
  Camera, 
  Power, 
  Settings, 
  ChevronRight,
  WifiOff,
  Box,
  Layers,
  Wind,
  Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { SDCPService, SaturnStatus } from './services/sdcp';

const STORAGE_KEY = 'saturn_printer_ip';
const DEFAULT_IP = '192.168.1.142';

interface TempHistory {
  time: string;
  resin: number;
  chamber: number;
}

export default function App() {
  const [printerIp, setPrinterIp] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_IP;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempHistory, setTempHistory] = useState<TempHistory[]>([]);
  const [streamError, setStreamError] = useState(false);
  
  const [status, setStatus] = useState<SaturnStatus>({
    state: 'IDLE',
    progress: 0,
    currentLayer: 0,
    totalLayers: 0,
    exposureTime: 0,
    temperatures: {
      enclosure: 0,
      resin: 0
    }
  });

  const serviceRef = useRef<SDCPService | null>(null);

  useEffect(() => {
    if (isConnected) {
      localStorage.setItem(STORAGE_KEY, printerIp);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTempHistory(prev => {
        const next = [...prev, { 
          time: now, 
          resin: status.temperatures.resin, 
          chamber: status.temperatures.enclosure 
        }];
        return next.slice(-20);
      });
    }
  }, [status.temperatures, isConnected, printerIp]);

  const connectToPrinter = async (ip: string) => {
    setIsConnecting(true);
    setError(null);
    setStreamError(false);
    
    try {
      const service = new SDCPService(ip, (updates) => {
        setStatus(prev => ({ ...prev, ...updates }));
      });
      
      await service.connect();
      serviceRef.current = service;
      setIsConnected(true);
      setPrinterIp(ip);
    } catch (err) {
      setError('Check IP. Connection to port 3030 failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCommand = (cmd: number, data: any = {}) => {
    if (!serviceRef.current) return;
    serviceRef.current.sendCommand(cmd, data);
  };

  const disconnect = () => {
    serviceRef.current?.disconnect();
    serviceRef.current = null;
    setIsConnected(false);
    setStatus(prev => ({ ...prev, state: 'IDLE' }));
    setTempHistory([]);
  };

  return (
    <div className="min-h-screen bg-bg-deep text-[#E4E4E7] font-sans selection:bg-brand/30 antialiased overflow-hidden flex flex-col p-8">
      <AnimatePresence mode="wait">
        {!isConnected ? (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center relative"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="w-full max-w-md space-y-10 bg-bg-card p-12 rounded-[2rem] border border-border-subtle shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand shadow-[0_0_15px_rgba(0,255,194,0.3)]" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div 
                  animate={{ 
                    rotate: isConnecting ? 360 : 0,
                    scale: isConnecting ? [1, 1.1, 1] : 1
                  }}
                  transition={{ 
                    rotate: { repeat: Infinity, duration: 2, ease: "linear" },
                    scale: { repeat: Infinity, duration: 2 }
                  }}
                  className="p-6 bg-brand/5 rounded-3xl border border-brand/20 shadow-[0_0_30px_rgba(0,255,194,0.1)]"
                >
                  <Box className="w-12 h-12 text-brand" />
                </motion.div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-text-dim font-bold">Resin Protocol Interface</div>
                  <h1 className="text-4xl font-light tracking-tighter text-white uppercase flex items-center justify-center gap-2">
                    SATURN <span className="font-bold">NEXUS</span>
                  </h1>
                  <p className="text-text-muted text-sm font-medium italic opacity-80">SDCP Protocol Optimized</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-dim ml-1">Ethernet/WiFi Printer IP</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="192.168.1.142"
                      className="w-full bg-[#0B0B0C] border border-border-subtle rounded-2xl px-6 py-5 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-all font-mono text-xl text-white placeholder:text-text-dim/30 shadow-inner"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && connectToPrinter(printerIp)}
                    />
                    <button 
                      onClick={() => connectToPrinter(printerIp)}
                      disabled={isConnecting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-brand text-black rounded-xl hover:bg-white disabled:bg-border-subtle disabled:text-text-dim transition-all shadow-[0_0_20px_rgba(0,255,194,0.4)] active:scale-95"
                    >
                      {isConnecting ? (
                        <Activity className="w-6 h-6 animate-pulse" />
                      ) : (
                        <ChevronRight className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-400 text-[10px] font-mono mt-2 px-1 font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <WifiOff className="w-3 h-3" /> Error: {error}
                    </motion.p>
                  )}
                </div>

                <div className="bg-[#0B0B0C]/50 p-5 rounded-2xl border border-border-subtle">
                  <p className="text-[10px] text-text-dim font-mono text-center leading-relaxed tracking-wider uppercase font-bold italic opacity-60">
                    Supports Saturn 4 Ultra • Smart Device Control Protocol
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <header className="flex justify-between items-end mb-10 border-b border-border-subtle pb-8">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2 font-bold font-mono">Local Resin Node</div>
                  <h1 className="text-4xl font-light tracking-tight flex items-center gap-4 text-white">
                    ELEGOO <span className="font-bold">SATURN 4 ULTRA</span>
                    <span className={`flex h-2.5 w-2.5 rounded-full ${status.state === 'PRINTING' ? 'bg-brand shadow-[0_0_12px_#00FFC2]' : 'bg-blue-500 shadow-[0_0_12px_#3B82F6]'}`}></span>
                  </h1>
                </div>
                
                <div className="h-10 w-[1px] bg-border-subtle hidden lg:block" />
                
                <div className="hidden lg:flex flex-col">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-1 font-bold font-mono">Machine ID</div>
                  <div className="text-xs font-mono font-bold tracking-[0.1em] text-brand uppercase truncate max-w-[120px]">{status.mainboardId || 'DISCOVERING...'}</div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-1 font-bold font-mono">Link IP</div>
                  <div className="font-mono text-sm text-brand font-bold">{printerIp}</div>
                </div>
                <button 
                  onClick={disconnect}
                  className="p-4 bg-bg-card hover:bg-brand/10 hover:text-brand border border-border-subtle rounded-2xl transition-all shadow-xl group"
                >
                  <Power className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </header>

            <div className="flex-1 grid grid-cols-12 gap-10 min-h-0 overflow-hidden">
              <div className="col-span-4 flex flex-col gap-10 overflow-y-auto pr-4 custom-scrollbar">
                
                <section className="bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand/5 to-transparent pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-widest text-text-muted font-bold font-mono">Active Job</span>
                      <div className="text-sm text-white font-bold truncate max-w-[200px] border-l-2 border-brand pl-3 py-1 bg-bg-deep/50 mt-2">
                        {status.filename || 'IDLE_WAITING.CTB'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-brand font-mono text-3xl font-black">{status.progress}<span className="text-sm ml-1">%</span></span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-bg-deep rounded-full overflow-hidden mb-8 border border-white/5">
                    <motion.div 
                      className="h-full bg-brand shadow-[0_0_10px_#00FFC2]"
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] text-text-dim uppercase tracking-widest mb-1 font-bold font-mono">Current Layer</div>
                      <div className="text-2xl font-light font-mono text-white tracking-widest">{status.currentLayer} <span className="text-xs text-text-dim">/ {status.totalLayers}</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-dim uppercase tracking-widest mb-1 font-bold font-mono">Est. Remaining</div>
                      <div className="text-2xl font-light font-mono text-text-muted tracking-widest">01:54:12</div>
                    </div>
                  </div>
                </section>

                <section className="bg-bg-card rounded-3xl border border-border-subtle overflow-hidden p-2 shadow-2xl">
                   <div className="p-6 pb-2">
                      <div className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-text-dim mb-8 px-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-brand" /> Thermal Analysis
                      </div>
                      
                      <div className="h-[140px] w-full min-h-[140px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
                          <AreaChart data={tempHistory}>
                            <defs>
                              <linearGradient id="colorResin" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00FFC2" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#00FFC2" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorChamber" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0B0B0C', border: '1px solid #27272A', borderRadius: '12px', fontSize: '10px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="resin" stroke="#00FFC2" fillOpacity={1} fill="url(#colorResin)" strokeWidth={2} />
                            <Area type="monotone" dataKey="chamber" stroke="#3b82f6" fillOpacity={1} fill="url(#colorChamber)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 p-2 gap-2 mt-4">
                      <div className="bg-bg-deep p-5 rounded-2xl space-y-4 border border-white/5 group hover:border-brand/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <Droplets className="w-4 h-4 text-text-dim group-hover:text-brand transition-colors" />
                          <span className="text-[9px] font-mono text-text-dim font-bold uppercase tracking-widest">Resin Vat</span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-mono font-black text-white">{status.temperatures.resin}</span>
                          <span className="text-xs text-text-dim mb-1 font-bold">°C</span>
                        </div>
                      </div>

                      <div className="bg-bg-deep p-5 rounded-2xl space-y-4 border border-white/5 group hover:border-blue-500/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <Wind className="w-4 h-4 text-text-dim group-hover:text-blue-500 transition-colors" />
                          <span className="text-[9px] font-mono text-text-dim font-bold uppercase tracking-widest">Enclosure</span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-mono font-black text-white">{status.temperatures.enclosure}</span>
                          <span className="text-xs text-text-dim mb-1 font-bold">°C</span>
                        </div>
                      </div>
                   </div>
                </section>

                <section className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-bg-card border border-border-subtle p-5 rounded-2xl group hover:border-brand/30 transition-all">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Exposure Time</span>
                    <span className="font-mono text-brand font-bold">{status.exposureTime}s</span>
                  </div>
                  <div className="flex justify-between items-center bg-bg-card border border-border-subtle p-5 rounded-2xl group hover:border-brand/30 transition-all">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Lift Speed</span>
                    <span className="font-mono text-white">60mm/min</span>
                  </div>
                  <div className="flex justify-between items-center bg-bg-card border border-border-subtle p-5 rounded-2xl group hover:border-brand/30 transition-all">
                    <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">UV Light</span>
                    <span className="font-mono text-brand font-bold underline decoration-brand/30">LOCKED</span>
                  </div>
                </section>
              </div>

              <div className="col-span-8 flex flex-col gap-10 overflow-hidden">
                <section className="relative flex-1 bg-black rounded-[3rem] border border-border-subtle overflow-hidden group shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-[#0F0F10]">
                      <img 
                        src={streamError ? 'https://images.unsplash.com/photo-1631281441457-3a111a4fcf23?q=80&w=1200&auto=format&fit=crop' : `http://${printerIp}:3031/video`} 
                        alt="Inspection Feed"
                        className="w-full h-full object-cover opacity-80 mix-blend-screen transition-opacity group-hover:opacity-100"
                        onError={() => setStreamError(true)}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  
                  <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20" />
                  <div className="absolute inset-10 border border-white/5 rounded-[2rem] pointer-events-none" />

                  <div className="absolute top-10 left-10 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_12px_#DC2626]" />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white font-mono">FEED: ULTRA-SCAN CAM 01</span>
                  </div>

                  <div className="absolute top-10 right-10 flex gap-3">
                    <button className="bg-black/60 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                    <button className="bg-black/60 p-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                      <Settings className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="absolute bottom-12 inset-x-12 flex justify-between items-end">
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="space-y-4"
                    >
                      <div>
                        <div className="text-[40px] font-bold leading-none mb-2 text-white italic tracking-tighter uppercase">
                          Layer {status.currentLayer} <span className="text-lg font-light text-text-dim font-mono tracking-normal not-italic">/ {status.totalLayers}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono font-black uppercase text-[9px] tracking-widest">
                          <span className="text-brand">Stable UV Output</span>
                          <span className="text-text-dim">•</span>
                          <span className="text-text-muted">Focus Active</span>
                        </div>
                      </div>
                    </motion.div>

                    <div className="flex gap-4 pb-2">
                       <button 
                        onClick={() => handleCommand(129)}
                        className="px-8 py-4 bg-brand text-black font-black text-[10px] rounded-full uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(0,255,194,0.3)] active:scale-95"
                       >
                         Pause Job
                       </button>
                       <button 
                        onClick={() => handleCommand(130)}
                        className="px-8 py-4 bg-bg-card text-white border border-border-subtle font-black text-[10px] rounded-full uppercase tracking-[0.3em] hover:bg-red-500 hover:border-red-500 transition-all shadow-2xl active:scale-95"
                       >
                         Emergency Terminate
                       </button>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-4 gap-4 pb-2">
                  {[
                    { label: 'Z-AXIS', val: 'HOME', icon: Box, active: true, cmd: 132 },
                    { label: 'UV-LIGHT', val: 'AUTO', icon: Activity, active: true },
                    { label: 'AIR-FILT', val: '80%', icon: Wind, active: false },
                    { label: 'RECYCLE', val: 'READY', icon: Layers, active: false },
                  ].map((ctrl) => (
                    <button 
                      key={ctrl.label}
                      onClick={() => ctrl.cmd && handleCommand(ctrl.cmd)}
                      className={`h-24 bg-bg-card border border-border-subtle rounded-[2rem] flex flex-col items-center justify-center gap-2 group transition-all hover:bg-bg-deep ${ctrl.active ? 'text-brand' : 'text-white'}`}
                    >
                       <div className={`text-[9px] uppercase tracking-[0.2em] font-bold ${ctrl.active ? 'text-brand opacity-60' : 'text-text-dim'}`}>{ctrl.label}</div>
                       <div className="text-[11px] font-mono font-black tracking-widest uppercase">{ctrl.val}</div>
                    </button>
                  ))}
                </section>
              </div>
            </div>

            <footer className="mt-10 flex justify-between items-center text-[10px] font-mono font-bold text-text-dim tracking-widest uppercase">
              <div className="flex gap-10">
                <span className="flex items-center gap-2"><span className="w-1 h-1 bg-text-dim rounded-full" /> SDCP V3.0.0</span>
                <span className="flex items-center gap-2 relative">
                   <span className="w-1.5 h-1.5 bg-brand shadow-[0_0_6px_#00FFC2] rounded-full" />
                   SDCP_DATALINK_STABLE
                </span>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  <span>Subscribed: sdcp/status/{status.mainboardId || '...'}</span>
                </div>
                <div className="h-4 w-[1px] bg-border-subtle" />
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
