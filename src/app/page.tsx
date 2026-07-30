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

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  return (
    <main className="min-h-screen bg-white">
      <NavBar session={session} />
      <Hero />
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
