import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";

const STARS_COUNT = 90;

const FEATURE_CARDS = [
  { icon: "\u{1F5FA}️", title: "Live SVG floor plans", desc: "See real table positions — not a generic grid." },
  { icon: "⚡", title: "Instant confirmation", desc: "6-character code in seconds. No callbacks." },
  { icon: "\u{1F465}", title: "Group-friendly", desc: "Combine tables for bigger parties easily." },
  { icon: "\u{1F4F1}", title: "No account needed", desc: "Just name & phone. Done in under a minute." },
];

const SESAME_SEEDS = [
  { left: 55, top: 18, rot: -25 },
  { left: 130, top: 12, rot: 15 },
  { left: 90, top: 30, rot: -10 },
  { left: 160, top: 25, rot: 30 },
];

export default function LandingPage() {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef(0);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartProgress = useRef(0);

  const applyProgress = useCallback((p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyProgress(progressRef.current + e.deltaY * 0.0022);
    };
    const onMouseDown = (e: MouseEvent) => {
      dragging.current = true;
      dragStartY.current = e.clientY;
      dragStartProgress.current = progressRef.current;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      applyProgress(dragStartProgress.current + (e.clientY - dragStartY.current) * 0.003);
    };
    const onMouseUp = () => { dragging.current = false; };
    const onTouchStart = (e: TouchEvent) => {
      dragging.current = true;
      dragStartY.current = e.touches[0].clientY;
      dragStartProgress.current = progressRef.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      applyProgress(dragStartProgress.current + (e.touches[0].clientY - dragStartY.current) * 0.003);
    };
    const onTouchEnd = () => { dragging.current = false; };

    scene.addEventListener("wheel", onWheel, { passive: false });
    scene.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    scene.addEventListener("touchstart", onTouchStart, { passive: true });
    scene.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      scene.removeEventListener("wheel", onWheel);
      scene.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      scene.removeEventListener("touchstart", onTouchStart);
      scene.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyProgress]);

  // Star field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: STARS_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.3 + Math.random() * 1.2,
      o: 0.2 + Math.random() * 0.6,
      s: 0.3 + Math.random() * 1.5,
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        const opacity = star.o * (0.5 + 0.5 * Math.sin(t * 0.001 * star.s + star.x));
        ctx.fillStyle = `rgba(253,246,236,${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId.current = requestAnimationFrame(draw);
    };
    rafId.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const sp = Math.min(1, progress * 2.8);
  const heroOpacity = Math.max(0, (progress - 0.42) * 2.5);
  const heroPointer = progress > 0.55 ? "all" as const : "none" as const;
  const scrollHintOpacity = Math.max(0, 1 - progress * 10);

  const spawnParticles = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ["#E8621A", "#F5C440", "#2E6E14", "#FDF6EC"];
    for (let i = 0; i < 10; i++) {
      const dot = document.createElement("div");
      dot.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:6px;height:6px;border-radius:50%;background:${colors[i % colors.length]};pointer-events:none;z-index:9999`;
      document.body.appendChild(dot);
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 80;
      dot.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px) scale(0)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 400, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" }
      ).onfinish = () => dot.remove();
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500&display=swap"
      />
      <style>{`
        @keyframes chevronBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @keyframes shimmerSweep {
          0% { left: -60%; }
          100% { left: 120%; }
        }
      `}</style>
      <div
        ref={sceneRef}
        style={{
          position: "relative",
          overflow: "hidden",
          height: "100vh",
          width: "100vw",
          background: "#0F0A04",
          fontFamily: "'DM Sans', sans-serif",
          userSelect: "none",
          cursor: dragging.current ? "grabbing" : "default",
        }}
      >
        {/* Star canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />

        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(232,98,26,0.14) 0%, transparent 70%)",
            opacity: progress,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Drag zone — disabled once hero content is interactive */}
        <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: progress > 0.55 ? "none" : "auto" }} />

        {/* Burger */}
        <div
          id="burger-wrap"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -52%) scale(${1 + progress * 0.55})`,
            width: 280,
            height: 210,
            opacity: Math.max(0, 1 - progress * 2.8),
            zIndex: 10,
          }}
        >
          {/* Bun top */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 230,
              height: 86,
              borderRadius: "115px 115px 22px 22px",
              background: "linear-gradient(180deg, #E8870A 0%, #C46208 60%, #A34E04 100%)",
              top: 0 - sp * 130,
              overflow: "hidden",
            }}
          >
            {/* Shimmer */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                borderRadius: "inherit",
                pointerEvents: "none",
              }}
            />
            {/* Sesame seeds */}
            {SESAME_SEEDS.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 11,
                  height: 7,
                  borderRadius: "50%",
                  background: "#F0B050",
                  left: s.left,
                  top: s.top,
                  transform: `rotate(${s.rot}deg)`,
                }}
              />
            ))}
          </div>

          {/* Lettuce */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 240,
              height: 20,
              background: "#2E6E14",
              top: 78 - sp * 72,
              clipPath: "polygon(0% 60%, 5% 20%, 12% 70%, 20% 10%, 28% 65%, 36% 15%, 44% 60%, 52% 5%, 60% 55%, 68% 10%, 76% 60%, 84% 20%, 92% 65%, 100% 30%, 100% 100%, 0% 100%)",
            }}
          />

          {/* Cheese */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 215,
              height: 13,
              background: "#F5C440",
              top: 92 + sp * 60,
              borderRadius: 2,
            }}
          />

          {/* Patty */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 205,
              height: 30,
              background: "linear-gradient(180deg, #6B340E 0%, #4A2008 100%)",
              top: 100 + sp * 10,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "10%",
                width: "80%",
                height: 3,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
              }}
            />
          </div>

          {/* Tomato */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 205,
              height: 15,
              background: "#B82E14",
              top: 126 + sp * 55,
              borderRadius: 4,
            }}
          />

          {/* Bun bottom */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: 230,
              height: 38,
              borderRadius: "8px 8px 22px 22px",
              background: "linear-gradient(180deg, #E8870A 0%, #C46208 60%, #A34E04 100%)",
              top: 136 + sp * 110,
            }}
          />
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: scrollHintOpacity,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(253,246,236,0.5)",
            }}
          >
            scroll to reveal
          </span>
          <div
            style={{
              width: 12,
              height: 12,
              borderRight: "2px solid rgba(253,246,236,0.4)",
              borderBottom: "2px solid rgba(253,246,236,0.4)",
              transform: "rotate(45deg)",
              animation: "chevronBounce 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Hero content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: heroOpacity,
            pointerEvents: heroPointer,
            padding: "0 24px",
          }}
        >
          <div style={{ maxWidth: 820, width: "100%", textAlign: "center" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                borderRadius: 100,
                background: "rgba(232,98,26,0.18)",
                border: "1px solid rgba(232,98,26,0.35)",
                backdropFilter: "blur(8px)",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#E8621A",
                  display: "inline-block",
                  animation: "chevronBounce 2s ease-in-out infinite",
                  boxShadow: "0 0 6px rgba(232,98,26,0.7)",
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: "#FDF6EC",
                }}
              >
                Tables available now
              </span>
            </div>

            {/* H1 */}
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                color: "#FDF6EC",
                lineHeight: 1.15,
                margin: "0 0 16px 0",
              }}
            >
              Skip the queue,
              <br />
              <em style={{ color: "#E8621A", fontStyle: "italic" }}>book your seat.</em>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300,
                fontSize: "0.9rem",
                color: "rgba(253,246,236,0.5)",
                maxWidth: 480,
                margin: "0 auto 32px auto",
                lineHeight: 1.6,
              }}
            >
              Browse restaurants, see the live floor plan, and pick your exact table &mdash; before you leave the house.
            </p>

            {/* CTA */}
            <Link
              to="/browse"
              onClick={spawnParticles}
              style={{
                display: "inline-block",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: "0.95rem",
                color: "#FDF6EC",
                background: "#E8621A",
                border: "none",
                borderRadius: 100,
                padding: "14px 36px",
                textDecoration: "none",
                transition: "transform 0.2s, background 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "#F5864A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "#E8621A";
              }}
            >
              Find a table &rarr;
            </Link>

            {/* Feature cards */}
            <div
              className="grid grid-cols-4 gap-2.5"
              style={{ marginTop: 48 }}
            >
              {FEATURE_CARDS.map((card, i) => {
                const cardP = Math.max(0, (progress - (0.55 + i * 0.06)) * 5);
                const cardOpacity = Math.min(1, cardP);
                const cardY = Math.max(0, (1 - cardP) * 18);
                return (
                  <FeatureCard
                    key={i}
                    icon={card.icon}
                    title={card.title}
                    desc={card.desc}
                    opacity={cardOpacity}
                    translateY={cardY}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            width: `${progress * 100}%`,
            background: "#E8621A",
            boxShadow: "0 0 8px rgba(232,98,26,0.6)",
            zIndex: 30,
          }}
        />
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  opacity,
  translateY,
}: {
  icon: string;
  title: string;
  desc: string;
  opacity: number;
  translateY: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${hovered ? "rgba(232,98,26,0.4)" : "rgba(255,255,255,0.1)"}`,
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        padding: "20px 16px",
        textAlign: "left",
        opacity,
        transform: `translateY(${translateY}px) ${hovered ? "translateY(-5px) scale(1.03)" : ""}`,
        transition: "transform 0.25s, border-color 0.25s",
        cursor: "default",
      }}
    >
      {/* Hover glow */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 50%, rgba(232,98,26,0.12) 0%, transparent 70%)",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Shimmer sweep */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "-60%",
            width: "40%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            animation: "shimmerSweep 0.8s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "rgba(232,98,26,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          marginBottom: 10,
          transition: "transform 0.25s",
          transform: hovered ? "scale(1.1) rotate(-4deg)" : "none",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: "0.82rem",
          color: "#FDF6EC",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: "0.72rem",
          color: "rgba(253,246,236,0.5)",
          lineHeight: 1.45,
        }}
      >
        {desc}
      </div>
    </div>
  );
}
