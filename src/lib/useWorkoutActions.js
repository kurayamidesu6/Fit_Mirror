/**
 * useWorkoutActions
 *
 * Provides toggleLike / toggleSave with:
 *  - Immediate optimistic UI update
 *  - DB write (workout_likes table + workouts.likes count for likes;
 *    saved_workouts table + workouts.saves count for saves)
 *  - Rollback on failure
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * @param {{
 *   initialLikedIds: Set<string>,
 *   initialSavedIds: Set<string>,
 *   userId: string | null,
 * }} opts
 */
export function useWorkoutActions({ initialLikedIds, initialSavedIds, userId }) {
  const [likedIds, setLikedIds]   = useState(() => new Set(initialLikedIds));
  const [savedIds, setSavedIds]   = useState(() => new Set(initialSavedIds));
  // Local count deltas so cards update immediately without refetch
  const [likeDeltas, setLikeDeltas] = useState({});  // { [workoutId]: +1|-1|0 }
  const [saveDeltas, setSaveDeltas] = useState({});

  const toggleLike = useCallback(async (workout) => {
    if (!userId) return;
    const id = workout.id;
    const wasLiked = likedIds.has(id);

    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(id) : next.add(id);
      return next;
    });
    setLikeDeltas(prev => ({ ...prev, [id]: (prev[id] || 0) + (wasLiked ? -1 : 1) }));

    try {
      if (wasLiked) {
        await supabase
          .from('workout_likes')
          .delete()
          .eq('user_id', userId)
          .eq('workout_id', id);

        await supabase
          .from('workouts')
          .update({ likes: Math.max(0, (workout.likes || 0) + (likeDeltas[id] || 0) - 1) })
          .eq('id', id);
      } else {
        await supabase
          .from('workout_likes')
          .insert({ user_id: userId, workout_id: id });

        await supabase
          .from('workouts')
          .update({ likes: (workout.likes || 0) + (likeDeltas[id] || 0) + 1 })
          .eq('id', id);
      }
    } catch {
      // Rollback on error
      setLikedIds(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(id) : next.delete(id);
        return next;
      });
      setLikeDeltas(prev => ({ ...prev, [id]: (prev[id] || 0) + (wasLiked ? 1 : -1) }));
    }
  }, [userId, likedIds, likeDeltas]);

  const toggleSave = useCallback(async (workout) => {
    if (!userId) return;
    const id = workout.id;
    const wasSaved = savedIds.has(id);

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      wasSaved ? next.delete(id) : next.add(id);
      return next;
    });
    setSaveDeltas(prev => ({ ...prev, [id]: (prev[id] || 0) + (wasSaved ? -1 : 1) }));

    try {
      if (wasSaved) {
        await supabase
          .from('saved_workouts')
          .delete()
          .eq('user_id', userId)
          .eq('workout_id', id);

        await supabase
          .from('workouts')
          .update({ saves: Math.max(0, (workout.saves || 0) + (saveDeltas[id] || 0) - 1) })
          .eq('id', id);
      } else {
        await supabase
          .from('saved_workouts')
          .insert({
            user_id: userId,
            workout_id: id,
            workout_title: workout.title,
            workout_category: workout.category,
            thumbnail_url: workout.thumbnail_url || null,
          });

        await supabase
          .from('workouts')
          .update({ saves: (workout.saves || 0) + (saveDeltas[id] || 0) + 1 })
          .eq('id', id);
      }
    } catch {
      // Rollback on error
      setSavedIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(id) : next.delete(id);
        return next;
      });
      setSaveDeltas(prev => ({ ...prev, [id]: (prev[id] || 0) + (wasSaved ? 1 : -1) }));
    }
  }, [userId, savedIds, saveDeltas]);

  return { likedIds, savedIds, likeDeltas, saveDeltas, toggleLike, toggleSave };
}
