export default function CardScrollRegion({ label, className = '', children }) {
  return (
    <div
      className={`card-scroll-region ${className}`.trim()}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
