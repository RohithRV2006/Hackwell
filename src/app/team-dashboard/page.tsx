import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getTeamDataByEmail } from '@/app/actions/auth';
import { decryptJSON } from '@/lib/encryption';
import { clearSessionCookie } from '@/app/actions/session';

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
    // Session is invalid or expired
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Error Loading Team Data</h2>
          <p>{error || 'Team not found.'}</p>
        </div>
      </main>
    );
  }

  // Decrypt data securely on the server
  let leadData = null;
  let membersData = [];
  try {
    leadData = decryptJSON(team.encryptedLeadData);
    membersData = decryptJSON(team.encryptedMembersData);
  } catch (decryptionError) {
    console.error('Decryption failed', decryptionError);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Decryption Error</h2>
          <p>Failed to decrypt team data. Check server logs.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 sm:p-24 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">{team.teamName}</h1>
            <p className="text-gray-500 mt-1">Problem Statement: <span className="font-semibold text-gray-700">{team.problemStatement}</span></p>
          </div>
          <form action={async () => {
            'use server';
            await clearSessionCookie();
            redirect('/login');
          }}>
            <button type="submit" className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded transition-colors">
              Logout
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team Lead Info */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border-t-4 border-blue-500">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-sm py-1 px-3 rounded-full">Lead</span>
              {leadData.name}
            </h2>
            <div className="space-y-3 text-gray-600">
              <p><strong className="text-gray-900">Email:</strong> {team.leadEmail}</p>
              <p><strong className="text-gray-900">Contact:</strong> {leadData.contactNumber}</p>
              <p><strong className="text-gray-900">Batch:</strong> {leadData.batchNumber}</p>
              <p><strong className="text-gray-900">Department:</strong> {leadData.department}</p>
              <p><strong className="text-gray-900">Year / Section:</strong> {leadData.year} / {leadData.section}</p>
            </div>
          </section>

          {/* Members Info */}
          <section className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Team Members</h2>
            <div className="space-y-6">
              {membersData.map((member: any, index: number) => (
                <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <h3 className="text-lg font-semibold text-gray-800">{member.name}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                    <p><strong className="text-gray-900">Batch:</strong> {member.batchNumber}</p>
                    <p><strong className="text-gray-900">Dept:</strong> {member.department}</p>
                    <p><strong className="text-gray-900">Year:</strong> {member.year}</p>
                    <p><strong className="text-gray-900">Section:</strong> {member.section}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
