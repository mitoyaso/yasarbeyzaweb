import React, { useMemo } from 'react';

/**
 * Arka planda süzülen tatlı romantik kalpler efekti
 */
export default function FloatingHearts() {
  const hearts = useMemo(() => {
    return Array.from({ length: 14 }).map((_, index) => ({
      id: index,
      left: `${(index * 7.5 + (index % 3) * 5) % 96}%`,
      animationDuration: `${12 + (index % 6) * 3}s`,
      animationDelay: `${(index * 1.7) % 8}s`,
      size: `${14 + (index % 5) * 6}px`,
      opacity: 0.15 + (index % 4) * 0.08,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="absolute bottom-0 animate-float-heart select-none text-rose-400"
          style={{
            left: heart.left,
            fontSize: heart.size,
            opacity: heart.opacity,
            animationDuration: heart.animationDuration,
            animationDelay: heart.animationDelay,
          }}
        >
          {heart.id % 3 === 0 ? '💖' : heart.id % 2 === 0 ? '🌸' : '✨'}
        </span>
      ))}
    </div>
  );
}
