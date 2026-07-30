'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSessionCookie } from '@/app/actions/session';
import { useRouter, useSearchParams } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginData = z.infer<typeof loginSchema>;

import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const registered = searchParams.get('registered');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setError('');
    setLoading(true);
    try {
      // 1. Sign in with Firebase Client Auth
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      // 2. Get the ID token
      const idToken = await userCredential.user.getIdToken();
      
      // 3. Create Session Cookie via Server Action
      const result = await createSessionCookie(idToken);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      // 4. Redirect to dashboard
      router.push('/team-dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
      <h1 className="text-3xl font-extrabold text-center mb-6 text-blue-600">Team Login</h1>
      
      {registered && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          Registration successful! Please login.
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email (@saranathan.ac.in)</label>
          <input type="email" {...register('email')} className="w-full p-2 border rounded-md" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" {...register('password')} className="w-full p-2 border rounded-md" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default function Login() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
