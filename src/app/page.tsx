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

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <NavBar />
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
