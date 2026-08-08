import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Founder() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.founder-reveal',
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
      id="founder"
      ref={sectionRef}
      className="section-padding"
      style={{ backgroundColor: '#F7F5F0' }}
    >
      <div className="section-content">
        {/* Masthead */}
        <div className="masthead founder-reveal">
          <span className="masthead-line" />
          <span className="masthead-text">创始人</span>
          <span className="masthead-en">Founder</span>
        </div>

        {/* Layout: Left (1) : Right (3) ratio */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16">
          {/* Left Column — Large quote mark decoration */}
          <div className="md:w-1/4 flex-shrink-0 founder-reveal flex items-start justify-center md:justify-start">
            <span
              className="leading-none select-none"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: 'clamp(120px, 15vw, 200px)',
                color: 'rgba(181,74,63,0.06)',
                lineHeight: 0.7,
              }}
            >
              「
            </span>
          </div>

          {/* Right Column */}
          <div className="md:w-3/4 founder-reveal">
            <h2
              className="text-3xl md:text-4xl leading-snug"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#2A2A28',
              }}
            >
              一位内容策划者与资源整合者
            </h2>

            <div className="mt-8 space-y-6 max-w-[600px]">
              <p className="prose-cultural">
                创始团队拥有跨文化研究、内容策划与文旅行业十余年经验。
                我们曾在出版、教育、文化传播与旅行行业交叉领域深耕，
                深知如何将抽象的文化概念转化为可感知、可参与、可记忆的体验产品。
              </p>
              <p className="prose-cultural">
                我们相信，最好的文化体验不是"讲解"，而是"进入"。
                每一座园林都是一首可以走进的诗，每一杯茶都承载着时间的哲学，
                每一段昆曲都蕴含着声音的美学。我们的工作，是为这些文化瑰宝设计"入口"。
              </p>
            </div>

            {/* "国风小注" Project Card */}
            <div
              className="mt-12 p-8 max-w-[600px]"
              style={{
                backgroundColor: '#FEFDFB',
                border: '1px solid #E5E2DA',
                borderLeft: '3px solid #B54A3F',
              }}
            >
              <h4
                className="text-lg mb-4"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: '#2A2A28',
                }}
              >
                过往项目：国风小注
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(42,42,40,0.85)' }}>
                创始人曾发起并主导传统文化项目"国风小注"，策划出版《您好，孔夫子》
                等五本先贤系列图书，以当代视角重新诠释中华先贤思想，获得业界广泛认可。
                该项目涵盖图书出版、教育产品研发、文化活动策划等多个维度，
                为观止东方的文化体验产品研发积累了深厚的学术资源与行业经验。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
