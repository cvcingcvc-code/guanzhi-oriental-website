import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Capability {
  number: string;
  title: string;
  description: string;
  tags: string[];
}

const CAPABILITIES: Capability[] = [
  {
    number: '01',
    title: '文化产品研发',
    description:
      '从学术研究出发，将东方文化母题转化为结构清晰、可感知、可交付的文化体验产品。每个产品包含完整的内容脚本、体验流程设计、人员培训方案与质量控制标准。我们拒绝浮于表面的文化符号，追求可进入、可理解、可记住的深度体验。',
    tags: ['内容脚本', '流程设计', '质量控制', '学术研究'],
  },
  {
    number: '02',
    title: '标准体验模块',
    description:
      '将研发成果打包为标准化的文化体验模块，便于合作伙伴快速集成与交付。每个模块独立完整，包含前置阅读、现场体验、互动环节与后续延伸四个阶段，支持灵活组合与定制调整，适配不同时长与场景需求。',
    tags: ['模块化', '可组合', '标准化', '灵活定制'],
  },
  {
    number: '03',
    title: '国际化文化转译',
    description:
      '面向海外用户，将东方文化的深层内涵转化为可理解、可共鸣的表达方式。我们拥有跨文化研究背景的内容团队，擅长在保持文化准确性的同时，消除认知门槛，让不同文化背景的用户都能进入并感受东方美学的魅力。',
    tags: ['跨文化', '多语言', '准确表达', '消除门槛'],
  },
  {
    number: '04',
    title: '交付与培训',
    description:
      '为合作伙伴提供完整的交付支持与人员培训。包括体验导师培训、现场执行手册、质量评估标准与持续迭代机制。我们不仅提供产品，更确保每一个体验产品的落地质量，让合作伙伴能够稳定、自信地交付每一次文化体验。',
    tags: ['导师培训', '执行手册', '质量评估', '持续迭代'],
  },
];

export default function Solutions() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.solution-item',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power2.out',
          stagger: 0.12,
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
      id="solutions"
      ref={sectionRef}
      className="section-padding"
      style={{ backgroundColor: '#F5F2EC' }}
    >
      <div className="section-content">
        {/* Masthead */}
        <div className="masthead solution-item">
          <span className="masthead-line" />
          <span className="masthead-text">产品与解决方案</span>
          <span className="masthead-en">Solutions</span>
        </div>

        {/* Section title */}
        <h2
          className="section-title solution-item"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          四项核心能力
        </h2>

        {/* Decorative line across full width */}
        <div className="divider mt-6 mb-16 solution-item" />

        {/* Capability entries */}
        <div className="flex flex-col">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.number}
              className="solution-item flex flex-col md:flex-row gap-6 md:gap-10 py-12 border-b border-[rgba(197,192,182,0.2)]"
            >
              {/* Number column */}
              <div className="flex-shrink-0 flex md:flex-col items-center md:items-start gap-4 md:gap-0">
                <span
                  className="text-sm tracking-[0.15em] w-8"
                  style={{
                    fontFamily: 'monospace',
                    color: '#B54A3F',
                  }}
                >
                  {cap.number}
                </span>
                {/* Vertical divider on desktop */}
                <div className="hidden md:block w-px flex-1 min-h-[60px] bg-[rgba(197,192,182,0.4)] mt-2" />
              </div>

              {/* Title column (30%) */}
              <div className="md:w-[30%] flex-shrink-0">
                <h3
                  className="text-2xl"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    color: '#2A2A28',
                  }}
                >
                  {cap.title}
                </h3>
              </div>

              {/* Description column (70%) */}
              <div className="md:w-[70%]">
                <p
                  className="text-base leading-relaxed"
                  style={{ color: 'rgba(42,42,40,0.9)' }}
                >
                  {cap.description}
                </p>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {cap.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
