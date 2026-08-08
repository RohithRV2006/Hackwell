import { cookies } from 'next/headers';
import NavBar from '@/components/landing/NavBar';
import Hero from '@/components/landing/Hero';
import About from '@/components/landing/About';
import Themes from '@/components/landing/Themes';
import Timeline from '@/components/landing/Timeline';
import Rules from '@/components/landing/Rules';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import Contact from '@/components/landing/Contact';
import SideMenu from '@/components/landing/SideMenu';

import { getAdminDb } from '@/lib/firebase-admin';

export default async function Home() {
  let countdownEndTime = '';
  try {
    const docSnap = await getAdminDb().collection('metadata').doc('eventTimelines').get();
    if (docSnap.exists) {
      countdownEndTime = docSnap.data()?.countdownEndTime || '';
    }
  } catch (error) {
    console.error('Error fetching countdown:', error);
  }

  return (
    <main className="min-h-screen bg-white">
      <SideMenu />
      <NavBar />
      <Hero countdownEndTime={countdownEndTime} />
      <About />
      <Themes />
      <Timeline />
      <Rules />
      <Testimonials />
      <FAQ />
      <Contact />
    </main>
  );
}
