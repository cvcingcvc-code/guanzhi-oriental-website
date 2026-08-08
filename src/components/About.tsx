import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate children on scroll
      gsap.fromTo(
        '.about-reveal',
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
      id="about"
      ref={sectionRef}
      className="section-padding"
      style={{ backgroundColor: '#F7F5F0' }}
    >
      <div className="section-content">
        {/* Masthead (刊头) */}
        <div className="masthead about-reveal">
          <span className="masthead-line" />
          <span className="masthead-text">关于观止东方</span>
          <span className="masthead-en">About</span>
        </div>

        {/* Content: Left/Right Layout */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16">
          {/* Left Column — Fixed-width label area */}
          <div className="md:w-[280px] flex-shrink-0 about-reveal">
            <h2
              className="text-3xl md:text-4xl leading-snug"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#2A2A28',
              }}
            >
              东方文化旅游
              <br />
              深度体验产品
              <br />
              研发与供应商
            </h2>
            {/* Vermillion vertical line decoration */}
            <div className="mt-8 w-[2px] h-16 bg-[#B54A3F]" />
          </div>

          {/* Right Column — Content */}
          <div className="flex-1 max-w-[640px] about-reveal">
            <p className="prose-cultural">
              观止东方致力于建设中国领先的东方文化深度体验产品研发与供应体系。
              我们从学术研究出发，将园林、藏书楼、茶文化、昆曲、运河文明等东方文化母题，
              转化为结构清晰、可感知、可交付的文化体验产品。
            </p>
            <p className="prose-cultural mt-6">
              我们不是旅行社，而是文化体验产品的研发机构。我们为入境旅行社、高端定制旅行机构、
              酒店及度假品牌、银行企业及会员机构，提供经过研究与验证的文化体验产品模块。
              每一个产品都包含完整的体验流程设计、内容脚本、人员培训方案与质量控制标准。
            </p>
            <p className="prose-cultural mt-6">
              观止东方的名字，取自《古文观止》——我们希望每一位用户都能在东方文化中获得
              "观止"般的深度体验，不止于观光，而是进入一种理解与共鸣。
            </p>

            {/* Qualification note */}
            <p className="mt-8 text-sm leading-relaxed" style={{ color: '#9E9A90' }}>
              杭州观止东方文化传播有限公司，具备旅行社业务经营资质。
              公司旗下拥有内容策划、产品研发、文化转译与交付培训四大核心团队。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
