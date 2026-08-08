import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const JIANGNAN_COLUMNS = [
  {
    title: '什么是江南',
    content:
      '江南不仅是一个地理概念，更是一种文化意象。它代表了中国文人的审美理想——含蓄、精致、与自然共生。从苏州园林到杭州西湖，从徽州古村到扬州运河，江南的每一寸土地都承载着千年文脉。理解江南，就是理解中国传统文化中最细腻、最优美的那一部分。',
  },
  {
    title: '为什么值得理解江南',
    content:
      '江南是中国文化精致化的极致呈现。这里的园林体现了"天人合一"的哲学，这里的茶道承载着"和敬清寂"的精神，这里的丝绸诉说着"一丝一缕"的匠心。对于海外用户而言，江南是进入中国文化的"温柔入口"——它不宏大、不喧嚣，却能让人在安静中获得最深的理解与共鸣。',
  },
  {
    title: '我们如何进入江南',
    content:
      '我们不设计"打卡式"的景点路线。我们以文化母题为线索，将江南的园林、茶道、昆曲、藏书楼、运河串联为可进入的体验产品。每一次体验都是一次"进入"：进入一座园林的空间诗意，进入一杯茶的时间哲学，进入一段昆曲的声音美学。这是对江南最深的理解方式。',
  },
];

export default function Jiangnan() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.jiangnan-reveal',
        { opacity: 0, y: 20 },
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
      id="jiangnan"
      ref={sectionRef}
      className="section-padding relative overflow-hidden"
      style={{ backgroundColor: '#F5F2EC' }}
    >
      {/* ===== West Lake Abstract Elements ===== */}

      {/* Lake reflection effect: mirrored blur overlay at bottom of title area */}
      <div
        className="absolute left-0 right-0 top-[180px] h-32 pointer-events-none opacity-[0.06]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(139,134,124,0.1) 0%, transparent 100%)',
        }}
      />

      {/* Stone pagoda silhouette watermark (right edge) */}
      <div
        className="absolute pointer-events-none opacity-[0.04] hidden lg:block"
        style={{ right: '2%', top: '40%' }}
      >
        <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
          <rect x="14" y="4" width="12" height="8" fill="#8B867C" rx="1" />
          <rect x="12" y="14" width="16" height="6" fill="#8B867C" rx="1" />
          <rect x="10" y="22" width="20" height="6" fill="#8B867C" rx="1" />
          <rect x="8" y="30" width="24" height="8" fill="#8B867C" rx="1" />
          <path d="M12 38 L28 38" stroke="#8B867C" strokeWidth="2" />
          <path d="M18 44 L30 44" stroke="#8B867C" strokeWidth="2" />
          <path d="M24 50 L32 50" stroke="#8B867C" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Vertical text decoration (left edge): "淡妆浓抹总相宜" */}
      <div
        className="absolute pointer-events-none opacity-[0.05] hidden lg:block"
        style={{
          left: '1%',
          top: '20%',
          writingMode: 'vertical-rl' as const,
          fontFamily: "'Noto Serif SC', serif",
          fontSize: '13px',
          color: '#8B867C',
          letterSpacing: '0.3em',
        }}
      >
        淡妆浓抹总相宜
      </div>

      <div className="section-content relative z-[1]">
        {/* Masthead */}
        <div className="masthead jiangnan-reveal">
          <span className="masthead-line" />
          <span className="masthead-text">入江南</span>
          <span className="masthead-en">Entering Jiangnan</span>
        </div>

        {/* Main title */}
        <div className="jiangnan-reveal max-w-[680px]">
          <h2
            className="text-3xl md:text-4xl leading-snug"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: '#2A2A28',
            }}
          >
            入江南，不是一条景点线路，
            <br />
            而是一套进入中国审美与生活方式的文化体验产品。
          </h2>

          {/* English subtitle */}
          <p
            className="mt-4 text-sm italic"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: '#8B867C',
            }}
          >
            Not a sightseeing route. A system of cultural experiences opening a
            door to Chinese aesthetics and ways of living.
          </p>
        </div>

        {/* Three columns with vermillion dot separators */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-0">
          {JIANGNAN_COLUMNS.map((col, i) => (
            <div
              key={col.title}
              className={`jiangnan-reveal relative px-0 md:px-8 py-8 md:py-0 ${
                i < 2
                  ? 'md:border-r border-[rgba(197,192,182,0.3)]'
                  : ''
              }`}
            >
              {/* Vermillion dot on top of column separators (desktop only) */}
              {i < 2 && (
                <div className="hidden md:block absolute -right-[2px] top-0 w-[4px] h-[4px] rounded-full bg-[#B54A3F]" />
              )}

              {/* Column title */}
              <h3
                className="text-xl"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: '#2A2A28',
                }}
              >
                {col.title}
              </h3>

              {/* Vermillion short line under title */}
              <div className="w-10 h-px bg-[#B54A3F] mt-3 mb-6" />

              {/* Content */}
              <p className="prose-cultural-sm">{col.content}</p>
            </div>
          ))}
        </div>

        {/* Water ripple transition at bottom: three fading lines */}
        <div className="mt-20 flex flex-col items-center gap-2">
          <div className="h-px bg-[#C5C0B6]" style={{ width: '120px', opacity: 0.3 }} />
          <div className="h-px bg-[#C5C0B6]" style={{ width: '80px', opacity: 0.2 }} />
          <div className="h-px bg-[#C5C0B6]" style={{ width: '40px', opacity: 0.1 }} />
        </div>
      </div>
    </section>
  );
}
