const SIZE = { sm: 7, md: 9, lg: 12 };

export default function ForumIcon({ color, size = 'md' }) {
  const px = SIZE[size] ?? 9;
  return (
    <span
      className="shrink-0 inline-block rounded-full"
      style={{ width: px, height: px, background: color, opacity: 0.9 }}
    />
  );
}
