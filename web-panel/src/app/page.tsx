'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    } else {
      setLoaded(true);
    }
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Rastreador Pessoal</h1>
        <p className="text-gray-400">Sistema de rastreamento Android</p>
        <div className="space-x-4">
          <a href="/login" className="inline-block px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
            Entrar
          </a>
          <a href="/login?register=1" className="inline-block px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            Cadastrar
          </a>
        </div>
      </div>
    </div>
  );
}
