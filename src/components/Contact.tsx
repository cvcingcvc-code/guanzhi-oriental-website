import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PARTNER_TYPES = [
  '入境旅行社及 DMC',
  '高端定制旅行机构',
  '酒店及度假品牌',
  '银行企业及会员机构',
  '目的地及文旅机构',
  '海外旅行社及文化教育机构',
];

const COLLAB_MODES = [
  { title: '委托研发', desc: '按需求定制文化体验产品' },
  { title: '联合出品', desc: '共同投资，共享收益' },
  { title: '内容授权', desc: '已有产品模块授权使用' },
  { title: '白标产品', desc: '以合作伙伴品牌交付' },
  { title: '按团/按人结算', desc: '灵活结算方式' },
  { title: '培训与交付支持', desc: '确保落地质量' },
];

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.contact-reveal',
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
      id="contact"
      ref={sectionRef}
      className="section-padding"
      style={{ backgroundColor: '#F5F2EC' }}
    >
      <div className="section-content">
        {/* Masthead */}
        <div className="masthead contact-reveal">
          <span className="masthead-line" />
          <span className="masthead-text">合作与联系</span>
          <span className="masthead-en">Contact</span>
        </div>

        {/* Title */}
        <h2
          className="section-title contact-reveal"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          我们为谁服务，如何合作
        </h2>
        <p
          className="mt-3 text-base italic contact-reveal"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: '#8B867C',
          }}
        >
          Partnership &amp; Collaboration
        </p>

        {/* Two-column layout */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Left: 合作对象 */}
          <div className="contact-reveal">
            <h3
              className="text-lg mb-2"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#2A2A28',
              }}
            >
              合作对象
            </h3>
            {/* Thin line under heading */}
            <div className="w-[60px] h-px bg-[rgba(197,192,182,0.5)] mb-6" />

            <ul className="flex flex-col">
              {PARTNER_TYPES.map((item) => (
                <li
                  key={item}
                  className="text-lg py-4 border-b border-[rgba(197,192,182,0.2)]"
                  style={{ color: '#2A2A28' }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: 合作模式 */}
          <div className="contact-reveal">
            <h3
              className="text-lg mb-2"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                color: '#2A2A28',
              }}
            >
              合作模式
            </h3>
            {/* Thin line under heading */}
            <div className="w-[60px] h-px bg-[rgba(197,192,182,0.5)] mb-6" />

            <ul className="flex flex-col">
              {COLLAB_MODES.map((mode) => (
                <li
                  key={mode.title}
                  className="flex items-baseline gap-3 py-4 border-b border-[rgba(197,192,182,0.2)]"
                >
                  <span
                    className="text-lg flex-shrink-0"
                    style={{ color: '#2A2A28', fontFamily: "'Noto Serif SC', serif" }}
                  >
                    {mode.title}
                  </span>
                  <span className="text-sm" style={{ color: '#9E9A90' }}>
                    {mode.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div
          className="mt-20 text-center py-16 px-6 contact-reveal"
          style={{ backgroundColor: '#F7F5F0' }}
        >
          <p
            className="text-2xl"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: '#2A2A28',
            }}
          >
            期待与您探讨文化体验产品的合作可能
          </p>

          {/* Email */}
          <a
            href="mailto:hello@guanzhidongfang.com"
            className="inline-block mt-6 text-lg underline underline-offset-4 hover:opacity-80 transition-opacity"
            style={{ color: '#B54A3F' }}
          >
            hello@guanzhidongfang.com
          </a>

          {/* WeChat QR placeholder */}
          <div className="mt-8 flex justify-center">
            <div
              className="w-[120px] h-[120px] flex items-center justify-center"
              style={{
                border: '1px solid #C5C0B6',
                backgroundColor: '#FEFDFB',
              }}
            >
              {/* 🔴 用户需替换为真实微信二维码图片 */}
              <span
                className="text-xs text-center leading-relaxed"
                style={{ color: '#9E9A90' }}
              >
                微信
                <br />
                二维码
              </span>
            </div>
          </div>

          {/* Company legal name */}
          <p className="mt-6 text-xs" style={{ color: '#9E9A90' }}>
            杭州观止东方文化传播有限公司
          </p>
        </div>

        {/* ===== Footer ===== */}
        <footer
          className="mt-16 pt-8 border-t border-[rgba(197,192,182,0.2)] text-center contact-reveal"
        >
          <p className="text-xs" style={{ color: '#9E9A90' }}>
            &copy; 2026 观止东方 Guanzhi Dongfang. All rights reserved.
          </p>
        </footer>
      </div>
    </section>
  );
}
