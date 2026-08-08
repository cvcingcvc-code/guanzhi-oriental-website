import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HeroVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: pause video when not in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay blocked — will rely on muted + user interaction
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // GSAP ScrollTrigger — hero fade-out on scroll
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Video fade-out + slight scale
      gsap.to(videoRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        opacity: 0.25,
        scale: 1.03,
        duration: 0.8,
        ease: 'power2.out',
      });

      // Overlay deepens
      gsap.to(overlayRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        opacity: 0.95,
        duration: 0.8,
        ease: 'power2.out',
      });

      // Text fades up and out
      gsap.to(textRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        opacity: 0,
        y: -40,
        duration: 0.6,
        ease: 'power2.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden"
    >
      {/* ===== Video Background ===== */}
      {/* 🔴 用户需将 "E:\8月8日.mp4" 导出为降饱和、慢速、压缩后的版本，重命名为 hero-loop.mp4，
          放入 public/videos/ 目录 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/hero-poster.svg"
      >
        <source src="/videos/hero-loop.mp4" type="video/mp4" />
      </video>

      {/* Mobile fallback: static poster (hidden on desktop via CSS-in-JS approach) */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: 'url(/images/hero-poster.svg)' }}
      />

      {/* ===== Three-Layer Overlay ===== */}
      <div ref={overlayRef} className="absolute inset-0 z-[2]">
        {/* Layer a: 宣纸米白遮罩 */}
        <div className="absolute inset-0 bg-[#F7F5F0]/70" />
        {/* Layer b: 径向渐变 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(247,245,240,0.3) 100%)',
          }}
        />
        {/* Layer c: 底部过渡渐变 */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#F7F5F0] via-transparent to-transparent" />
      </div>

      {/* ===== Text Layer ===== */}
      <div
        ref={textRef}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center"
        style={{
          textShadow: '0 1px 12px rgba(247,245,240,0.9)',
        }}
      >
        {/* Vermillion decorative short line */}
        <div className="w-10 h-[2px] bg-[#B54A3F] mx-auto mb-6" />

        {/* Main title */}
        <h1
          className="text-5xl md:text-6xl text-center leading-tight max-w-[720px] mx-auto px-4"
          style={{
            fontFamily: "'Noto Serif SC', serif",
            color: '#2A2A28',
          }}
        >
          把东方文化，转化为可以进入的旅行体验
        </h1>

        {/* English subtitle */}
        <p
          className="mt-8 text-base md:text-lg text-center tracking-wide max-w-[600px] mx-auto px-4"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            color: '#8B867C',
            letterSpacing: '0.5px',
          }}
        >
          Turning Chinese culture into travel experiences people can enter,
          understand,<br className="hidden md:block" /> and remember.
        </p>

        {/* Institution tagline */}
        <p
          className="mt-6 text-xs text-center tracking-[0.3em]"
          style={{ color: '#9E9A90' }}
        >
          文化深度体验产品研发与供应机构
        </p>
      </div>

      {/* ===== Scroll Indicator ===== */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span
          className="text-[11px] tracking-[0.3em]"
          style={{ color: 'rgba(139,134,124,0.4)' }}
        >
          SCROLL
        </span>
        <svg
          width="12"
          height="18"
          viewBox="0 0 12 18"
          fill="none"
          className="opacity-40"
          style={{ animation: 'bounce 2.5s infinite' }}
        >
          <path
            d="M6 1v12M1 11l5 5 5-5"
            stroke="#8B867C"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
