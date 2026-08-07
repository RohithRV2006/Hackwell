'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkTeamEmailRegistered } from '@/app/actions/forgot-password';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordForm() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Verify email registration and student role on server
      const checkRes = await checkTeamEmailRegistered(data.email);
      if (!checkRes.success) {
        setError(checkRes.error || 'Email verification failed.');
        return;
      }

      // 2. Trigger password reset email via Firebase Client SDK
      const actionCodeSettings = {
        url: window.location.origin + '/reset-password',
      };
      await sendPasswordResetEmail(auth, data.email, actionCodeSettings);

      setSuccess('Password reset email sent! Check your inbox (and spam folder).');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      // Translate common Firebase errors into user-friendly messages
      let message = err.message || 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        message = 'This email is not registered.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-100 relative">
      <Link href="/login" className="absolute top-4 left-4 text-gray-500 hover:text-gray-900 transition p-2 rounded-full hover:bg-gray-100">
        <ArrowLeft size={24} />
      </Link>
      
      <h1 className="text-3xl font-extrabold text-center mb-6 text-blue-600 mt-4">Forgot Password</h1>
      <p className="text-sm text-gray-500 text-center mb-8">
        Enter your team lead email address below to receive a password reset link.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 text-sm">
          {error}
        </div>
      )}

      {success ? (
        <div className="space-y-6 text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 text-sm font-semibold">
            {success}
          </div>
          <Link href="/login" className="text-sm text-blue-600 font-bold hover:underline block">
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">Team Lead Email</label>
            <input 
              type="email" 
              {...register('email')} 
              placeholder="e.g. lead@student.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
