import { useEffect, useRef, useState } from 'react';
import avatar from '../../assets/chami/chami-avatar.webp';
import spritesheet from '../../assets/chami/chami-spritesheet.webp';
import manifest from '../../assets/chami/chami.json';
import '../../styles/chami.css';

const duration = manifest.animations.companion.reduce((total, step) => total + step.duration, 0);

export default function ChamiAvatar({
  size,
  className = '',
  animate = false,
  label = 'Chami, your Persian cat study companion',
}) {
  const element = useRef(null);
  const [motionAllowed, setMotionAllowed] = useState(
    () =>
      typeof window === 'undefined' ||
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [visible, setVisible] = useState(true);
  const [pageActive, setPageActive] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    if (!animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setMotionAllowed(!preference.matches);
    const updatePage = () => setPageActive(!document.hidden);
    updateMotion();
    updatePage();
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updatePage);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (element.current) observer?.observe(element.current);
    return () => {
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updatePage);
      observer?.disconnect();
    };
  }, [animate]);

  return (
    <div
      ref={element}
      className={`chami-avatar ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-paused={!visible || !pageActive ? 'true' : undefined}
      style={
        size === undefined
          ? undefined
          : { '--chami-size': typeof size === 'number' ? `${size}px` : size }
      }
    >
      {animate && motionAllowed ? (
        <div
          className="chami-sprite"
          style={{ backgroundImage: `url(${spritesheet})`, animationDuration: `${duration}ms` }}
        />
      ) : (
        <img
          className="chami-still"
          src={avatar}
          alt=""
          width="384"
          height="384"
          decoding="async"
        />
      )}
    </div>
  );
}
