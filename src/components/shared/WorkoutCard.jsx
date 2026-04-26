import { Link } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { Heart, Bookmark, Play, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=800&fit=crop',
];

/**
 * Renders a paused video frame as a thumbnail when a video_url is available.
 * Seeks to 1 second so we skip past any black/fade-in at the very start.
 * Falls back to an <img> when no video_url exists.
 */
function WorkoutThumbnail({ workout, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => { v.currentTime = 1; };
    v.addEventListener('loadedmetadata', onMeta);
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [workout.video_url]);

  if (workout.video_url) {
    return (
      <video
        ref={videoRef}
        src={workout.video_url}
        muted
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }

  const fallback = workout.thumbnail_url
    || FALLBACK_IMAGES[(workout.id?.charCodeAt?.(0) || 0) % FALLBACK_IMAGES.length];
  return <img src={fallback} alt={workout.title} className={className} />;
}

const difficultyColors = {
  beginner: 'bg-primary/20 text-primary',
  intermediate: 'bg-accent/20 text-accent',
  advanced: 'bg-destructive/20 text-destructive',
};

export default function WorkoutCard({
  workout,
  variant = 'feed',
  isLiked = false,
  isSaved = false,
  likeDelta = 0,
  saveDelta = 0,
  onLike,
  onSave,
}) {
  const { bgEnabled } = useSettings();

  if (variant === 'compact') {
    return (
      <Link to={`/workout/${workout.id}`} className="block">
        <div className="relative aspect-square rounded-xl overflow-hidden group">
          <WorkoutThumbnail workout={workout} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
          {/* Play on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-xs font-semibold truncate">{workout.title}</p>
            <p className="text-[10px] text-white/60 capitalize mt-0.5">{workout.category}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/workout/${workout.id}`} className="block group">
      <div className="rounded-2xl overflow-hidden border border-white/20 hover:border-primary/50 transition-all duration-200 shadow-md hover:shadow-lg bg-white dark:bg-zinc-900">
        {/* Thumbnail */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <WorkoutThumbnail
            workout={workout}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Strong gradient so title text is always legible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <Badge className={cn("text-[10px] font-semibold border-0 px-2 py-0.5 shadow-sm", difficultyColors[workout.difficulty])}>
              {workout.difficulty}
            </Badge>
            {workout.is_pro && (
              <Badge className="bg-chart-3/20 text-chart-3 border-0 text-[10px] px-2 py-0.5">
                <Shield className="w-2.5 h-2.5 mr-0.5" /> PRO
              </Badge>
            )}
          </div>

          {/* Title + creator — overlaid on image */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
            <h3 className="font-space font-bold text-sm text-white leading-tight mb-1.5 line-clamp-2 drop-shadow">
              {workout.title}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-[9px] font-bold text-white">
                {workout.creator_name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-white/90 truncate drop-shadow">{workout.creator_name}</span>
            </div>
          </div>
        </div>

        {/* Footer — solid white / dark card, high contrast */}
        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            {/* Like button */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike?.(); }}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isLiked
                  ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              )}
            >
              <Heart
                className="w-3.5 h-3.5 transition-transform duration-150 active:scale-125"
                fill={isLiked ? 'currentColor' : 'none'}
              />
              {Math.max(0, (workout.likes || 0) + likeDelta)}
            </button>

            {/* Save button */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave?.(); }}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isSaved
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              )}
            >
              <Bookmark
                className="w-3.5 h-3.5 transition-transform duration-150 active:scale-125"
                fill={isSaved ? 'currentColor' : 'none'}
              />
              {Math.max(0, (workout.saves || 0) + saveDelta)}
            </button>
          </div>

          <Badge variant="outline" className="text-[10px] text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 px-2 py-0.5 capitalize">
            {workout.category}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
