import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/app/actions/session';
import CoordClientDashboard from './CoordClientDashboard';
import { getAllTeamsFlatFromDomainDocs } from '@/lib/firestore-helpers';

export default async function CoordDashboard() {
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
  if (role !== 'coordinator' && role !== 'student-coord' && role !== 'faculty-coord') {
    redirect('/');
  }

  let coordName = email;
  try {
    const roleDoc = await getAdminDb().collection('roles').doc(email.trim().toLowerCase()).get();
    if (roleDoc.exists) {
      const data = roleDoc.data();
      if (data?.name) {
        coordName = data.name;
      }
    }
  } catch (err) {
    console.error('Error fetching coord details', err);
  }

  let teams: any[] = [];
  try {
    teams = await getAllTeamsFlatFromDomainDocs();
  } catch (err) {
    console.error('Error fetching teams', err);
  }

  return (
    <CoordClientDashboard coordName={coordName} coordEmail={email} initialTeams={teams} />
  );
}
