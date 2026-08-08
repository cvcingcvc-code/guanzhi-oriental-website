import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface MotifCard {
  number: string;
  title: string;
  subtitle: string;
  status: string;
  /** CSS gradient placeholder — 🔴 用户后续替换为真实图片 /images/lab-01.jpg ~ lab-05.jpg */
  bgGradient: string;
}

const MOTIFS: MotifCard[] = [
  {
    number: '01',
    title: '园林',
    subtitle: '如何走进一首中国式的诗',
    status: '合作开发中',
    bgGradient: 'linear-gradient(135deg, #8C9C8C 0%, #A4B5A4 30%, #7A8B7A 100%)',
  },
  {
    number: '02',
    title: '藏书楼',
    subtitle: '文人如何保存知识与精神世界',
    status: '研究中',
    bgGradient: 'linear-gradient(135deg, #9B8E7C 0%, #B5A892 30%, #8C7E6C 100%)',
  },
  {
    number: '03',
    title: '茶与丝绸',
    subtitle: '江南日常生活中的时间和手艺',
    status: '合作开发中',
    bgGradient: 'linear-gradient(135deg, #8C8B7C 0%, #A8A795 30%, #7A796C 100%)',
  },
  {
    number: '04',
    title: '运河',
    subtitle: '一条水路如何塑造江南商业文明',
    status: '研究中',
    bgGradient: 'linear-gradient(135deg, #8BA0A8 0%, #A4B8C0 30%, #7A8E96 100%)',
  },
  {
    number: '05',
    title: '昆曲',
    subtitle: '如何听懂中国古典戏剧的一段声音',
    status: '研究中',
    bgGradient: 'linear-gradient(135deg, #9B8C8C 0%, #B5A4A4 30%, #8B7C7C 100%)',
  },
];

export default function Lab() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.lab-card',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="lab"
      ref={sectionRef}
      className="section-padding"
      style={{ backgroundColor: '#F7F5F0' }}
    >
      <div className="section-content">
        {/* Masthead */}
        <div className="masthead lab-card">
          <span className="masthead-line" />
          <span className="masthead-text">产品实验室</span>
          <span className="masthead-en">Product Studio</span>
        </div>

        {/* Title */}
        <h2
          className="section-title lab-card"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          正在研发的文化母题
        </h2>

        {/* Subtitle */}
        <p
          className="mt-4 mb-12 max-w-[700px] text-base italic"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: '#8B867C',
          }}
        >
          以下方向正在学术研究与产品化过程中。欢迎旅行社、学者与文化机构参与联合研发。
        </p>

        {/* Card Grid: 3 cols desktop, 2 cols tablet, 1 col mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOTIFS.map((motif) => (
            <div
              key={motif.number}
              className="lab-card group cursor-pointer"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden border border-[rgba(197,192,182,0.3)]"
              >
                {/* 🔴 Background — replace with <img> when photos are available:
                    <img src={`/images/lab-${motif.number}.jpg`} alt={motif.title}
                         className="absolute inset-0 w-full h-full object-cover img-cultural" /> */}
                <div
                  className="absolute inset-0"
                  style={{ background: motif.bgGradient }}
                />
                {/* Noise overlay on placeholder */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                  }}
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(42,42,40,0.55) 0%, rgba(42,42,40,0.1) 50%, transparent 100%)',
                  }}
                />

                {/* Number (top-left) */}
                <span
                  className="absolute top-4 left-4 text-xs tracking-[0.15em]"
                  style={{ fontFamily: 'monospace', color: '#B54A3F' }}
                >
                  {motif.number}
                </span>

                {/* Status tag */}
                <span
                  className="absolute top-10 left-4 text-[10px] px-2 py-0.5 rounded-sm tracking-wide"
                  style={{
                    backgroundColor: 'rgba(197,192,182,0.2)',
                    color: '#F7F5F0',
                  }}
                >
                  {motif.status}
                </span>

                {/* Title (bottom-left) */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3
                    className="text-lg mb-1"
                    style={{
                      fontFamily: "'Noto Serif SC', serif",
                      color: '#F7F5F0',
                    }}
                  >
                    {motif.title}
                    <span
                      className="ml-2 text-sm italic font-normal"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        opacity: 0.7,
                      }}
                    >
                      {motif.title === '园林' ? 'Garden' :
                       motif.title === '藏书楼' ? 'Library' :
                       motif.title === '茶与丝绸' ? 'Tea & Silk' :
                       motif.title === '运河' ? 'Canal' : 'Kunqu'}
                    </span>
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(247,245,240,0.65)' }}
                  >
                    {motif.subtitle}
                  </p>
                </div>

                {/* Hover: subtle image scale (applied to inner bg when real image exists) */}
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.02] pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
