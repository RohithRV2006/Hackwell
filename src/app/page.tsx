import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-900">
      <h1 className="text-5xl font-extrabold text-blue-600 mb-6">Hackwell</h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl text-center">
        Welcome to the ultimate Hackathon experience. Build, innovate, and showcase your skills!
      </p>
      
      <div className="flex gap-4">
        {session ? (
          <Link 
            href="/team-dashboard" 
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link 
              href="/login" 
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Register Team
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
