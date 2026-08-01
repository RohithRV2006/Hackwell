import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getTeamDataByEmail } from '@/app/actions/auth';
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

  const { success, team, error } = await getTeamDataByEmail(email);

  if (!success || !team) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <div className="bg-white border border-red-200 shadow-md p-8 rounded-lg max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-gray-900">Unable to Load Team Data</h2>
          <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded border border-red-100">
            {error || 'Team details could not be found.'}
          </p>
          <p className="text-xs text-gray-500">
            If you are using Firebase Free Tier (Spark Plan), database limits might have been reached temporarily. Please refresh or check back shortly.
          </p>
          <a
            href="/team-dashboard"
            className="inline-block px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-xs font-bold transition"
          >
            🔄 Retry Loading
          </a>
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
