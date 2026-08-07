import { useStore } from '@/lib/store';
import { memo } from 'react';

export const ExerciseMedia = memo(function ExerciseMedia({
  exId,
  alt,
  className = '',
  priority = false,
}: {
  exId: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);

  const gifUrl = `/exercises/${exId}/animation.gif`;
  const staticUrl = `/exercises/${exId}/0.jpg`;

  if (reduceMotion) {
    return (
      <img
        src={staticUrl}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }

  return (
    <img
      src={gifUrl}
      alt={`${alt} en movimiento`}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
});
