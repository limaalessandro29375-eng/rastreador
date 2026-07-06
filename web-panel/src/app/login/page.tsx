'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get('register') === '1';

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isRegister
        ? await api.register(email, name, password)
        : await api.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-gray-900 p-8 rounded-xl">
      <h1 className="text-2xl font-bold text-center">{isRegister ? 'Cadastro' : 'Login'}</h1>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
      />

      {isRegister && (
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
        />
      )}

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Aguarde...' : isRegister ? 'Cadastrar' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-gray-400">
        {isRegister ? (
          <>Já tem conta? <a href="/login" className="text-blue-400">Entrar</a></>
        ) : (
          <>Novo? <a href="/login?register=1" className="text-blue-400">Cadastre-se</a></>
        )}
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-400">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
