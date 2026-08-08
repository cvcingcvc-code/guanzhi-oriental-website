import { useEffect, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SceneConfig {
  /** 图片路径（相对于 public 目录） */
  image: string;
  /** 中文文化关键词 */
  title: string;
  /** 英文 / 解释文字 */
  subtitle: string;
}

// ---------------------------------------------------------------------------
// 8 个场景常量配置
// ---------------------------------------------------------------------------

const SCENES: SceneConfig[] = [
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds.png',
    title: '湖面·晨雾',
    subtitle: 'Stillness of the West Lake',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (1).png',
    title: '园林·光影',
    subtitle: 'Light Through the Garden',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (2).png',
    title: '昆曲·水袖',
    subtitle: "The Sleeve's Grace",
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (3).png',
    title: '茶道·氤氲',
    subtitle: 'Tea Mist Rising',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (4).png',
    title: '藏书·墨香',
    subtitle: 'Fragrance of Old Books',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (5).png',
    title: '丝绸·经纬',
    subtitle: 'Warp and Weft of Silk',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (6).png',
    title: '运河·晨雾',
    subtitle: 'Canal at Dawn',
  },
  {
    image: '/images/Gemini_Generated_Image_stds6ostds6ostds (7).png',
    title: '观止东方',
    subtitle: '把东方文化，转化为可以进入的旅行体验',
  },
];

// ---------------------------------------------------------------------------
// 设计常量（与项目 v7 设计 Token 严格对齐）
// ---------------------------------------------------------------------------

const OVERLAY_COLOR = '#F7F5F0'; // --bg 宣纸米白
const OVERLAY_OPACITY = 0.25;
const TEXT_COLOR = '#F7F5F0';
const TEXT_SHADOW = '0 1px 8px rgba(0, 0, 0, 0.3)';
const CINNABAR = '#B54A3F'; // --cta 朱砂色
const DOT_INACTIVE = 'rgba(247, 245, 240, 0.3)';
const IMAGE_FILTER = 'saturate(0.4) contrast(0.95) brightness(1.05)';

const MOBILE_BREAKPOINT = '(max-width: 768px)';
const DESKTOP_BREAKPOINT = '(min-width: 769px)';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * Hermite smoothstep：消除 opacity 过渡的生硬感。
 * 输入 t ∈ [0, 1]，输出经过 easing 的值 ∈ [0, 1]。
 */
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export default function CulturalScroll() {
  // ── DOM refs ──────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const arrowWrapperRef = useRef<HTMLDivElement>(null);  // opacity 由 ScrollTrigger 控制
  const arrowInnerRef = useRef<HTMLDivElement>(null);    // y 呼吸动画，独立于 scrub

  // 持久化的 ScrollTrigger / Observer 引用
  const stRef = useRef<ScrollTrigger | null>(null);
  const mobileObserverRef = useRef<IntersectionObserver | null>(null);

  // ── 图片预加载（前 2 张） ─────────────────────────────────────────────
  useEffect(() => {
    for (let i = 0; i < Math.min(2, SCENES.length); i++) {
      const preload = new Image();
      preload.src = SCENES[i].image;
    }
  }, []);

  // ── 更新右侧圆点高亮 ──────────────────────────────────────────────────
  const updateDots = useCallback((progress: number) => {
    const N = SCENES.length;
    const activeIdx = Math.min(
      N - 1,
      Math.max(0, Math.round(progress * (N - 1))),
    );

    for (let i = 0; i < N; i++) {
      const dot = dotsRef.current[i];
      if (!dot) continue;
      dot.style.background = i === activeIdx ? CINNABAR : DOT_INACTIVE;
    }
  }, []);

  // ── GSAP ScrollTrigger — 桌面 / 移动分离 ─────────────────────────────
  useEffect(() => {
    const pinTarget = pinTargetRef.current;
    const arrowWrapper = arrowWrapperRef.current;
    const arrowInner = arrowInnerRef.current;
    if (!pinTarget) return;

    const mm = gsap.matchMedia();

    // ═══════════════════════════════════════════════════════════════════
    // 桌面端：pin + scrub 滚动叙事
    // ═══════════════════════════════════════════════════════════════════
    mm.add(DESKTOP_BREAKPOINT, () => {
      // 确保移动端遗留的 inline style 被清除
      pinTarget.style.scrollSnapType = '';
      pinTarget.style.overflowY = '';
      pinTarget.style.height = '';
      pinTarget.style.maxHeight = '';

      const st = ScrollTrigger.create({
        trigger: pinTarget,
        start: 'top top',
        end: '+=300%',          // 固定 3 屏高度
        pin: true,
        scrub: 1.2,             // 平滑追赶，不跳切
        anticipatePin: 1,
        invalidateOnRefresh: true,

        onUpdate(self) {
          const p = self.progress;
          const N = SCENES.length;
          const sceneHalf = 0.5 / N;

          // ── 图片 & 文字 opacity ──
          for (let i = 0; i < N; i++) {
            const img = imageRefs.current.get(i);
            const text = textRefs.current.get(i);
            if (!img || !text) continue;

            const center = (i + 0.5) / N;
            const dist = Math.abs(p - center);

            // 图片：宽窗口，实现 1.2s 级交叉淡入淡出
            const imgHalf = sceneHalf * 1.6;
            const imgT = 1 - dist / imgHalf;
            img.style.opacity = String(imgT > 0 ? smoothstep(imgT) : 0);

            // 文字：窄窗口，入场稍慢退场稍快
            const textHalf = sceneHalf * 0.85;
            const textT = 1 - dist / textHalf;
            const textOpacity = textT > 0 ? smoothstep(textT) : 0;
            text.style.opacity = String(textOpacity);
            text.style.transform = `translate(-50%, ${(1 - textOpacity) * 15}px)`;
          }

          // ── 圆点高亮 ──
          updateDots(p);

          // ── 箭头：最后 30% 进度时渐隐（只控制 wrapper opacity）──
          if (arrowWrapper) {
            const arrowOpacity = p > 0.7
              ? Math.max(0, (1 - p) / 0.3 * 0.4)
              : 0.4;
            arrowWrapper.style.opacity = String(arrowOpacity);
          }
        },

        onLeave() {
          if (arrowWrapper) arrowWrapper.style.opacity = '0';
        },
        onEnterBack() {
          if (arrowWrapper) arrowWrapper.style.opacity = '0.4';
        },
      });

      stRef.current = st;

      // ── 箭头呼吸动画（inner 元素独立于 scrub，仅 y 轴位移）──
      if (arrowInner) {
        gsap.set(arrowWrapper, { opacity: 0.4 });
        gsap.set(arrowInner, { y: 0 });
        gsap.to(arrowInner, {
          y: 8,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }

      // ── 初始圆点状态 ──
      updateDots(0);

      return () => {
        st.kill();
        stRef.current = null;
        if (arrowInner) gsap.killTweensOf(arrowInner);
      };
    });

    // ═══════════════════════════════════════════════════════════════════
    // 移动端：scroll-snap + IntersectionObserver
    // ═══════════════════════════════════════════════════════════════════
    mm.add(MOBILE_BREAKPOINT, () => {
      // 容器设为可滚动的 snap 视口
      pinTarget.style.scrollSnapType = 'y mandatory';
      pinTarget.style.overflowY = 'scroll';
      pinTarget.style.height = '100vh';
      pinTarget.style.maxHeight = '100vh';

      // 重置所有图片与文字为初始隐藏状态
      const N = SCENES.length;
      for (let i = 0; i < N; i++) {
        const img = imageRefs.current.get(i);
        const text = textRefs.current.get(i);
        if (img) {
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        if (text) {
          text.style.opacity = '0';
          text.style.transform = 'translate(-50%, 15px)';
          text.style.transition =
            'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        }
      }

      // ── IntersectionObserver ──
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const section = entry.target as HTMLElement;
            const idx = Number(section.dataset.sceneIndex);
            if (Number.isNaN(idx)) continue;

            const img = imageRefs.current.get(idx);
            const text = textRefs.current.get(idx);
            const isActive = entry.isIntersecting && entry.intersectionRatio >= 0.5;

            if (img) {
              img.style.opacity = isActive ? '1' : '0';
            }
            if (text) {
              text.style.opacity = isActive ? '1' : '0';
              text.style.transform = isActive
                ? 'translate(-50%, 0)'
                : 'translate(-50%, 15px)';
            }

            // 更新圆点
            if (isActive) {
              for (let d = 0; d < N; d++) {
                const dot = dotsRef.current[d];
                if (!dot) continue;
                dot.style.background = d === idx ? CINNABAR : DOT_INACTIVE;
              }
            }
          }
        },
        { threshold: [0.5, 0.8] },
      );

      mobileObserverRef.current = observer;

      // 观察 snap sections
      const sections = pinTarget.querySelectorAll('[data-scene-index]');
      sections.forEach((s) => observer.observe(s));

      // 初始状态：第 0 个场景
      const firstImg = imageRefs.current.get(0);
      const firstText = textRefs.current.get(0);
      if (firstImg) firstImg.style.opacity = '1';
      if (firstText) {
        firstText.style.opacity = '1';
        firstText.style.transform = 'translate(-50%, 0)';
      }
      updateDots(0);

      return () => {
        observer.disconnect();
        mobileObserverRef.current = null;
        pinTarget.style.scrollSnapType = '';
        pinTarget.style.overflowY = '';
        pinTarget.style.height = '';
        pinTarget.style.maxHeight = '';
        // 清除 transitions
        for (let i = 0; i < N; i++) {
          const img = imageRefs.current.get(i);
          const text = textRefs.current.get(i);
          if (img) img.style.transition = '';
          if (text) text.style.transition = '';
        }
      };
    });

    return () => {
      mm.revert();
    };
  }, [updateDots]);

  // ── 圆点点击：桌面跳转 scroll 位置 / 移动端 snap scrollIntoView ──
  const handleDotClick = useCallback((index: number) => {
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;

    if (isMobile) {
      const section = pinTargetRef.current?.querySelector(
        `[data-scene-index="${index}"]`,
      ) as HTMLElement | null;
      section?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // 桌面：计算目标 scroll 位置并通过 GSAP 平滑滚动
    const st = stRef.current;
    if (!st) return;

    const targetProgress = (index + 0.5) / SCENES.length;
    const scrollStart = typeof st.start === 'number' ? st.start : 0;
    const scrollEnd = typeof st.end === 'number' ? st.end : window.innerHeight * 3;
    const targetScroll = scrollStart + (scrollEnd - scrollStart) * targetProgress;

    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  // ── Ref 回调 ──────────────────────────────────────────────────────────
  const setImageRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) imageRefs.current.set(index, el);
    else imageRefs.current.delete(index);
  }, []);

  const setTextRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) textRefs.current.set(index, el);
    else textRefs.current.delete(index);
  }, []);

  const setDotRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    dotsRef.current[index] = el;
  }, []);

  // ── 预加载列表 ────────────────────────────────────────────────────────
  const preloadImages = useMemo(() => SCENES.slice(0, 2), []);

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div ref={containerRef} className="cultural-scroll-root">
      {/* 不可见预加载 img（前 2 张） */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        {preloadImages.map((scene, i) => (
          <img key={`preload-${i}`} src={scene.image} alt="" />
        ))}
      </div>

      {/* Pin 目标容器 */}
      <div
        ref={pinTargetRef}
        className="cultural-scroll-pin-target"
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#1a1a18',
        }}
      >
        {/* ────────────────────────────────────────────────────────────────
            图片层（所有分辨率共用）
            ──────────────────────────────────────────────────────────────── */}
        {SCENES.map((scene, i) => (
          <div
            key={`img-${i}`}
            ref={(el) => setImageRef(i, el)}
            className="cultural-scroll-image-layer"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === 0 ? 1 : 0,
              willChange: 'opacity',
              zIndex: 1,
            }}
          >
            <img
              src={scene.image}
              alt={scene.title}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding={i < 2 ? 'sync' : 'async'}
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: IMAGE_FILTER,
              }}
            />

            {/* 宣纸米白半透明遮罩 — 褪色记忆质感 */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: OVERLAY_COLOR,
                opacity: OVERLAY_OPACITY,
              }}
            />
          </div>
        ))}

        {/* ────────────────────────────────────────────────────────────────
            文字层（所有分辨率共用）
            ──────────────────────────────────────────────────────────────── */}
        {SCENES.map((scene, i) => {
          const isLast = i === SCENES.length - 1;
          return (
            <div
              key={`text-${i}`}
              ref={(el) => setTextRef(i, el)}
              className="cultural-scroll-text-layer"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: isLast ? '45%' : '28%',
                transform: i === 0
                  ? 'translate(-50%, 0)'
                  : 'translate(-50%, 15px)',
                opacity: i === 0 ? 1 : 0,
                textAlign: 'center',
                zIndex: 10,
                pointerEvents: 'none',
                willChange: 'opacity, transform',
                maxWidth: '90vw',
              }}
            >
              <h2
                style={{
                  fontFamily:
                    "'Noto Serif SC', 'SimSun', 'STSong', serif",
                  fontSize: isLast ? '48px' : '42px',
                  fontWeight: 400,
                  color: TEXT_COLOR,
                  textShadow: TEXT_SHADOW,
                  margin: 0,
                  lineHeight: 1.3,
                  letterSpacing: isLast ? '0.08em' : '0.04em',
                }}
              >
                {scene.title}
              </h2>

              <p
                style={{
                  fontFamily:
                    "'Cormorant Garamond', 'Source Serif 4', 'Georgia', 'Times New Roman', serif",
                  fontSize: isLast ? '16px' : '14px',
                  fontStyle: 'italic',
                  letterSpacing: '3px',
                  color: TEXT_COLOR,
                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                  marginTop: isLast ? '20px' : '12px',
                  marginBottom: 0,
                  opacity: 0.85,
                }}
              >
                {scene.subtitle}
              </p>
            </div>
          );
        })}

        {/* ────────────────────────────────────────────────────────────────
            移动端 snap sections（桌面端不可见，仅用于触摸滑动捕获）
            这些 div 撑开 800vh 滚动空间，每段 100vh 触发一次 snap
            ──────────────────────────────────────────────────────────────── */}
        {SCENES.map((_, i) => (
          <div
            key={`snap-${i}`}
            data-scene-index={i}
            className="cultural-scroll-snap-section"
            style={{
              position: 'relative',
              height: '100vh',
              width: '100%',
              scrollSnapAlign: 'start',
              zIndex: 5,
              // 桌面端隐藏，移动端可见
              display: 'none',
            }}
          />
        ))}

        {/* ────────────────────────────────────────────────────────────────
            右侧滚动指示器圆点
            ──────────────────────────────────────────────────────────────── */}
        <nav
          aria-label="场景导航"
          className="cultural-scroll-dots"
          style={{
            position: 'absolute',
            right: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 20,
          }}
        >
          {SCENES.map((_, i) => (
            <button
              key={`dot-${i}`}
              ref={(el) => setDotRef(i, el)}
              onClick={() => handleDotClick(i)}
              aria-label={`场景 ${i + 1}: ${SCENES[i].title}`}
              data-dot-index={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === 0 ? CINNABAR : DOT_INACTIVE,
                transition: 'background 0.6s ease',
              }}
            />
          ))}
        </nav>

        {/* ────────────────────────────────────────────────────────────────
            底部向下箭头
            wrapper: opacity 由 ScrollTrigger onUpdate 控制
            inner:   y 呼吸动画独立于 scrub
            ──────────────────────────────────────────────────────────────── */}
        <div
          ref={arrowWrapperRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            opacity: 0.4,
          }}
        >
          <div ref={arrowInnerRef}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={TEXT_COLOR}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.6 }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 底部过渡：衔接后续网站内容 */}
      <div
        style={{
          position: 'relative',
          minHeight: '1px',
          background: OVERLAY_COLOR,
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 全局样式（仅注入一次）
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_ID = 'cultural-scroll-global-styles';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ================================================================
       CulturalScroll — 文化意境卷轴
       与观止东方 v7 设计 Token 完全对齐
       ================================================================ */

    .cultural-scroll-root {
      position: relative;
      width: 100%;
    }

    /* 移动端隐藏滚动条 */
    .cultural-scroll-pin-target {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .cultural-scroll-pin-target::-webkit-scrollbar {
      display: none;
    }

    /* 图片层 */
    .cultural-scroll-image-layer img {
      -webkit-user-drag: none;
      user-select: none;
    }

    /* 文字层：所有过渡由 GSAP inline style 驱动 */
    .cultural-scroll-text-layer {
      transition: none;
    }

    /* 圆点 hover */
    .cultural-scroll-dots button:hover {
      background: #B54A3F !important;
    }

    /* ── 移动端 (< 769px)：snap sections 可见 ── */
    @media (max-width: 768px) {
      .cultural-scroll-snap-section {
        display: block !important;
      }
    }

    /* ── 桌面端 (≥ 769px)：snap sections 隐藏，由 GSAP pin 接管 ── */
    @media (min-width: 769px) {
      .cultural-scroll-snap-section {
        display: none !important;
      }
    }

    /* ── prefers-reduced-motion ── */
    @media (prefers-reduced-motion: reduce) {
      .cultural-scroll-image-layer,
      .cultural-scroll-text-layer,
      .cultural-scroll-dots button {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════════
// 具名导出
// ═══════════════════════════════════════════════════════════════════════════
export { SCENES };
export type { SceneConfig };
