import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './components/Navbar';
import HeroVideo from './components/HeroVideo';
import About from './components/About';
import Solutions from './components/Solutions';
import Lab from './components/Lab';
import CulturalScroll from './components/CulturalScroll';
import Jiangnan from './components/Jiangnan';
import Founder from './components/Founder';
import Contact from './components/Contact';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const frameRef = useRef<HTMLDivElement>(null);

  // Global section-entry animations
  useEffect(() => {
    // GSAP ScrollTrigger: gentle section reveals
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      // Skip hero — it has its own animation
      if (section.id === 'hero') return;

      gsap.fromTo(
        section,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    // Refresh ScrollTrigger after everything is mounted
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return (
    <div className="relative">
      {/* Corner Frame Border */}
      <div
        ref={frameRef}
        id="corner-frame"
        style={{
          position: 'fixed',
          inset: '20px',
          zIndex: 9998,
          pointerEvents: 'none',
          border: '1px solid rgba(197,192,182,0.35)',
        }}
      />

      {/* Navigation */}
      <Navbar />

      {/* Main Content — sections in order */}
      <main>
        {/* Section 1: Hero */}
        <HeroVideo />

        {/* Section 2: About */}
        <About />

        {/* Section 3: Solutions */}
        <Solutions />

        {/* Section 4: Lab — Product Studio */}
        <Lab />

        {/* Section 4.5: Cultural Scroll — 文化意境卷轴（沉浸式视觉叙事） */}
        <CulturalScroll />

        {/* Section 5: Jiangnan — Entering Jiangnan */}
        <Jiangnan />

        {/* Section 6: Founder */}
        <Founder />

        {/* Section 7: Contact + Footer */}
        <Contact />
      </main>
    </div>
  );
}
