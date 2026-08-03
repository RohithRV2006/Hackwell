import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/app/actions/session';
import LogoutButton from '@/components/LogoutButton';

export default async function StudentCoord() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    redirect('/login');
  }

  let decodedClaims;
  try {
    decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    redirect('/login');
  }

  const email = decodedClaims.email;
  if (!email) {
    redirect('/login');
  }

  const role = await getUserRole(email);
  if (role !== 'student-coord') {
    redirect('/');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">Hackwell</h1>
      <p className="mt-4 text-lg font-medium">Student Co-ord Dashboard</p>
      <p className="mt-2 text-sm text-gray-500 font-mono">Logged in as {email}</p>
      <LogoutButton />
    </main>
  );
}
