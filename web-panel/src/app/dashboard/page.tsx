'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef } from 'react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

interface Device {
  id: string;
  name: string;
  createdAt: string;
  _count: { locations: number };
}

interface Location {
  id: string;
  deviceId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  altitude?: number | null;
  timestamp: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [latestLocation, setLatestLocation] = useState<Location | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [dateFilter, setDateFilter] = useState('24h');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.replace('/login');

    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    loadDevices();

    const s = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));
    socketRef.current = s;
    setSocket(s);

    return () => { s.disconnect(); };
  }, [router]);

  const loadDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data);
      if (data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0].id);
      }
    } catch {
      localStorage.removeItem('token');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = useCallback(async (deviceId: string) => {
    try {
      const params: { limit: number; start?: string } = { limit: 500 };
      if (dateFilter === '24h') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        params.start = d.toISOString();
      } else if (dateFilter === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.start = d.toISOString();
      } else if (dateFilter === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.start = d.toISOString();
      }

      const [history, latest] = await Promise.all([
        api.getLocations(deviceId, params),
        api.getLatestLocation(deviceId),
      ]);
      setLocations(history);
      setLatestLocation(latest);

      if (socketRef.current?.connected) {
        socketRef.current.emit('join-device', deviceId);
      }
    } catch (err) {
      console.error('Erro ao carregar localizações:', err);
    }
  }, [dateFilter]);

  useEffect(() => {
    if (selectedDevice) loadLocations(selectedDevice);
  }, [selectedDevice, loadLocations]);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handleLocation = (loc: Location) => {
      if (loc.deviceId === selectedDevice) {
        setLocations((prev) => [...prev, loc]);
        setLatestLocation(loc);
      }
    };
    s.on('location', handleLocation);
    return () => { s.off('location', handleLocation); };
  }, [selectedDevice]);

  async function handleCreateDevice() {
    if (!newDeviceName.trim()) return;
    try {
      await api.createDevice(newDeviceName.trim());
      setNewDeviceName('');
      await loadDevices();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDeleteDevice(id: string) {
    if (!confirm('Remover dispositivo e todos os dados?')) return;
    try {
      await api.deleteDevice(id);
      if (selectedDevice === id) setSelectedDevice(null);
      await loadDevices();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Carregando...</div>;
  }

  const lastLoc = latestLocation;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between bg-gray-900 px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Rastreador</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
            {connected ? 'Online' : 'Offline'}
          </span>
          {user && <p className="text-sm text-gray-400 hidden sm:block">{user.name}</p>}
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">
          Sair
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-gray-900 p-4 overflow-y-auto border-r border-gray-800 space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Dispositivos</h2>
            {devices.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum dispositivo cadastrado</p>
            )}
            {devices.map((dev) => (
              <div
                key={dev.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDevice === dev.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => setSelectedDevice(dev.id)}
              >
                <p className="font-medium">{dev.name}</p>
                <p className="text-xs opacity-70">{dev._count.locations} pontos</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDevice(dev.id); }}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
                  Remover
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Novo dispositivo"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-800 rounded-lg border border-gray-700 outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDevice()}
              />
              <button
                onClick={handleCreateDevice}
                className="px-3 py-1.5 text-sm bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Filtro</h2>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-gray-800 rounded-lg border border-gray-700 outline-none"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo período</option>
            </select>
          </div>

          {lastLoc && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Última Localização</h2>
              <div className="bg-gray-800 p-3 rounded-lg text-sm space-y-1">
                <p>Lat: {lastLoc.lat.toFixed(6)}</p>
                <p>Lng: {lastLoc.lng.toFixed(6)}</p>
                {lastLoc.accuracy != null && <p>Precisão: {lastLoc.accuracy.toFixed(0)}m</p>}
                {lastLoc.speed != null && <p>Velocidade: {(lastLoc.speed * 3.6).toFixed(1)} km/h</p>}
                {lastLoc.altitude != null && <p>Altitude: {lastLoc.altitude.toFixed(0)}m</p>}
                <p className="text-xs text-gray-500">{formatDate(lastLoc.timestamp)}</p>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            {selectedDevice ? (
              <Map
                locations={locations.map((l) => ({ ...l, accuracy: l.accuracy ?? null, speed: l.speed ?? null, altitude: l.altitude ?? null }))}
                center={latestLocation ? [latestLocation.lat, latestLocation.lng] : undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Selecione ou crie um dispositivo
              </div>
            )}
          </div>

          {locations.length > 0 && (
            <div className="bg-gray-900 border-t border-gray-800 max-h-48 overflow-y-auto">
              <div className="px-4 py-2 text-sm text-gray-400 font-semibold">Histórico ({locations.length})</div>
              <div className="px-4 pb-2 grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium">
                <span>Data/Hora</span>
                <span>Latitude</span>
                <span>Longitude</span>
                <span>Info</span>
              </div>
              {[...locations].reverse().slice(0, 100).map((loc) => (
                <div key={loc.id} className="px-4 py-1 grid grid-cols-4 gap-2 text-xs text-gray-300 hover:bg-gray-800">
                  <span>{formatDate(loc.timestamp)}</span>
                  <span>{loc.lat.toFixed(6)}</span>
                  <span>{loc.lng.toFixed(6)}</span>
                  <span>
                    {loc.accuracy && `${loc.accuracy.toFixed(0)}m`}
                    {loc.speed != null && ` ${(loc.speed * 3.6).toFixed(0)}km/h`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
