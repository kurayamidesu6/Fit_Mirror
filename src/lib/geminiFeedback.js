import { supabase } from '@/api/supabaseClient';

function sentenceJoin(items) {
  return items.filter(Boolean).join(' ');
}

export function buildLocalFormFeedback({ workout, result, summary }) {
  const weakAreas = result?.weak_areas?.slice(0, 3) || [];
  const bestCue = weakAreas[0]
    ? `Main focus: clean up ${weakAreas[0]} alignment while matching the reference tempo.`
    : 'Main focus: keep your whole body visible and match the reference tempo.';

  const scoreText = `You scored ${result?.similarity_score ?? 0}% against the ${workout?.title || 'reference'} form.`;
  const captureText = summary?.pairedFrames
    ? `${summary.pairedFrames} reference-matched frames were tracked.`
    : `${summary?.framesCaptured || 0} frames were tracked.`;

  return {
    source: 'local',
    summary: sentenceJoin([
      scoreText,
      captureText,
      result?.passed ? 'Nice work, this attempt passed.' : 'This attempt needs another pass.',
    ]),
    cues: [
      bestCue,
      'Stay centered in the camera so shoulders, hips, knees, and ankles remain visible.',
      'Move at the same speed as the reference before trying to increase intensity.',
    ],
    highlights: [
      summary?.averageLiveScore ? `Average live match: ${summary.averageLiveScore}%.` : '',
      result?.scoring_mode ? `Scoring mode: ${result.scoring_mode}.` : '',
    ].filter(Boolean),
    safetyNote: 'Stop if anything feels painful and use a coach for medical or injury-specific guidance.',
  };
}

export function formatFormFeedback(feedback) {
  const cues = feedback?.cues?.slice(0, 3).map((cue) => `- ${cue}`).join('\n');
  const highlights = feedback?.highlights?.slice(0, 2).map((item) => `- ${item}`).join('\n');

  return [
    feedback?.summary,
    cues ? `Cues:\n${cues}` : '',
    highlights ? `Highlights:\n${highlights}` : '',
    feedback?.safetyNote,
  ].filter(Boolean).join('\n\n');
}

export async function requestGeminiFormFeedback(payload) {
  const fallback = buildLocalFormFeedback(payload);

  try {
    const { data, error } = await supabase.functions.invoke('gemini-form-feedback', {
      body: {
        workout: {
          title: payload.workout?.title,
          description: payload.workout?.description,
          category: payload.workout?.category,
          difficulty: payload.workout?.difficulty,
          target_muscle: payload.workout?.target_muscle,
          pass_threshold: payload.workout?.pass_threshold,
        },
        result: {
          similarity_score: payload.result?.similarity_score,
          passed: payload.result?.passed,
          weak_areas: payload.result?.weak_areas,
          joint_scores: payload.result?.joint_scores,
          scoring_mode: payload.result?.scoring_mode,
        },
        summary: payload.summary,
      },
    });

    if (error || !data?.feedback) {
      return fallback;
    }

    return {
      ...fallback,
      ...data.feedback,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('[Gemini feedback] Falling back to local feedback.', err);
    return fallback;
  }
}
