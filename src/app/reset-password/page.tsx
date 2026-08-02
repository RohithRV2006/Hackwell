'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

const resetSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

type ResetData = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = watch('password') || '';
  const pwdLength = password.length >= 8;
  const pwdUpper = /[A-Z]/.test(password);
  const pwdLower = /[a-z]/.test(password);
  const pwdNum = /[0-9]/.test(password);
  const pwdSpec = /[^A-Za-z0-9]/.test(password);

  const onSubmit = async (data: ResetData) => {
    if (!oobCode) {
      setError('Invalid or missing password reset token.');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setSuccess('Your password has been successfully reset! You can now log in.');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!oobCode) {
    return (
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
        <p className="text-gray-600 mb-6">This password reset link is invalid or missing the security token.</p>
        <Link href="/login" className="text-blue-600 hover:underline">Return to Login</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
      <h1 className="text-3xl font-extrabold text-center mb-6 text-blue-600">Reset Password</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}
      
      {success ? (
        <div className="text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
            {success}
          </div>
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">New Password *</label>
            <input type="password" {...register('password')} className="w-full p-2 border rounded-md" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            
            {/* Password Constraints */}
            <div className="mt-2 text-xs grid grid-cols-2 gap-1">
              <span className={pwdLength ? "text-green-600" : "text-gray-500"}>✓ Min 8 chars</span>
              <span className={pwdUpper ? "text-green-600" : "text-gray-500"}>✓ 1 Uppercase</span>
              <span className={pwdLower ? "text-green-600" : "text-gray-500"}>✓ 1 Lowercase</span>
              <span className={pwdNum ? "text-green-600" : "text-gray-500"}>✓ 1 Number</span>
              <span className={pwdSpec ? "text-green-600" : "text-gray-500"}>✓ 1 Special Char</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Resetting...' : 'Set New Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPassword() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
