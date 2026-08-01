import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getTeamDataByEmail } from '@/app/actions/auth';
import { getUserRole } from '@/app/actions/session';
import TeamDashboardClient from './TeamDashboardClient';

export default async function TeamDashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    redirect('/login');
  }

  let decodedClaims;
  try {
    decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    redirect('/login');
  }

  const email = decodedClaims.email;
  if (!email) {
    redirect('/login');
  }

  const role = await getUserRole(email);
  if (role !== 'team') {
    redirect('/');
  }

  const { success, team, error } = await getTeamDataByEmail(email);

  if (!success || !team) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error Loading Team Data</h2>
          <p>{error || 'Team not found.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 sm:p-24 bg-gray-50 text-gray-900">
      <TeamDashboardClient team={team} />
    </main>
  );
}
