'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSessionCookie } from '@/app/actions/session';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const registered = searchParams.get('registered');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  // If a user lands on the login page but Firebase Auth thinks they are logged in locally
  // (e.g. they were logged out from the server but the client SDK didn't get cleared),
  // we force clear the client auth state to prevent UI desyncs.
  useEffect(() => {
    signOut(auth).catch(() => {});
  }, []);

  const onSubmit = async (data: LoginData) => {
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await userCredential.user.getIdToken();
      const result = await createSessionCookie(idToken);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      const role = result.role || 'team';

      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'jury') {
        router.push('/jury-dashboard');
      } else if (role === 'coordinator') {
        router.push('/coord-dashboard');
      } else {
        router.push('/team-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-100 relative">
      <Link href="/" className="absolute top-4 left-4 text-gray-500 hover:text-gray-900 transition p-2 rounded-full hover:bg-gray-100">
        <ArrowLeft size={24} />
      </Link>
      <h1 className="text-3xl font-extrabold text-center mb-8 text-blue-600">Login</h1>
      
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
      
      {msg && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6">
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" {...register('email')} className="w-full p-2 border rounded-md" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <input 
              {...register('password')} 
              type={showPassword ? 'text' : 'password'} 
              className="w-full p-2 border rounded-md pr-10" 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 z-10"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between mt-2">
          <Link href="/register" className="text-sm text-blue-600 hover:underline">
            Don't have an account? Register
          </Link>
          <Link 
            href="/forgot-password"
            className="text-sm text-gray-500 hover:text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Processing...' : 'Login'}
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
