import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getTeamDataByEmail } from '@/app/actions/auth';
import { getAdminDb } from '@/lib/firebase-admin';
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

  // Calculate Leaderboard Position
  let leaderboardPosition = 'N/A';
  try {
    const db = getAdminDb();
    const teamsSnap = await db.collection('teams')
      .orderBy('totalGameXP', 'desc')
      .get();
    
    let rank = 1;
    for (const doc of teamsSnap.docs) {
      if (doc.id === team.id) {
        leaderboardPosition = rank.toString();
        break;
      }
      // Only increment rank if XP is greater than 0, else they might tie at 0
      rank++;
    }
  } catch (err) {
    console.error('Error fetching leaderboard position', err);
  }

  // Pass rank to client
  const enrichedTeam = { ...team, leaderboardPosition };

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50 text-gray-900">
      <TeamDashboardClient team={enrichedTeam} />
    </main>
  );
}
