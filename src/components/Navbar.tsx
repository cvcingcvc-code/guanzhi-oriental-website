import { useState, useEffect, useCallback } from 'react';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '首页', href: '#hero' },
  { label: '关于', href: '#about' },
  { label: '解决方案', href: '#solutions' },
  { label: '实验室', href: '#lab' },
  { label: '入江南', href: '#jiangnan' },
  { label: '联系', href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('#hero');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll listener for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.href.replace('#', ''));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${id}`);
          }
        },
        { rootMargin: '-30% 0px -70% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  // Smooth scroll handler
  const scrollToSection = useCallback(
    (href: string) => {
      setMobileOpen(false);
      const id = href.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    []
  );

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[rgba(247,245,240,0.95)] backdrop-blur-sm border-b border-[rgba(197,192,182,0.35)]'
          : 'bg-transparent border-b border-[rgba(197,192,182,0.2)]'
      }`}
    >
      <div className="max-w-[1100px] mx-auto flex items-center justify-between h-16 md:h-20"
           style={{ padding: '0 12%' }}>
        {/* Logo */}
        <a
          href="#hero"
          onClick={(e) => { e.preventDefault(); scrollToSection('#hero'); }}
          className="flex flex-col items-start leading-none"
        >
          <span
            className="text-xl text-[#2A2A28] tracking-wide"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            观止东方
          </span>
          <span
            className="text-[11px] text-[#8B867C] tracking-[0.2em] mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Guanzhi Dongfang
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.href);
              }}
              className={`text-sm transition-colors duration-300 pb-1 ${
                activeSection === item.href
                  ? 'text-[#B54A3F] border-b-2 border-[#B54A3F]'
                  : 'text-[#2A2A28] hover:text-[#B54A3F]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileOpen}
        >
          <span
            className={`block w-5 h-px bg-[#2A2A28] hamburger-line ${
              mobileOpen ? 'rotate-45 translate-y-[6px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-px bg-[#2A2A28] hamburger-line ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-px bg-[#2A2A28] hamburger-line ${
              mobileOpen ? '-rotate-45 -translate-y-[6px]' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 top-16 z-40 bg-[#F7F5F0] transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-8 h-full pb-20">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.href);
              }}
              className={`text-2xl transition-all duration-300 ${
                activeSection === item.href
                  ? 'text-[#B54A3F]'
                  : 'text-[#2A2A28]'
              }`}
              style={{
                fontFamily: "'Noto Serif SC', serif",
                transitionDelay: `${i * 50}ms`,
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
