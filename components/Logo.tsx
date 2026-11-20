export default function Logo({ size = 26 }: { size?: number }) {
  const cells = [
    [10, 10, 0.3], [26, 10, 0.3], [42, 10, 0.6],
    [10, 26, 0.3], [26, 26, 0.6], [42, 26, 0.85],
    [10, 42, 0.6], [26, 42, 0.85], [42, 42, 1],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#2757d6" />
      {cells.map(([x, y, o]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" rx="3" fill="#ffffff" opacity={o} />
      ))}
    </svg>
  );
}
