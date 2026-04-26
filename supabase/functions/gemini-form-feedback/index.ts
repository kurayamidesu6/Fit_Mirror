/**
 * gemini-form-feedback - Supabase Edge Function (Deno runtime)
 *
 * Required Supabase secret:
 *   supabase secrets set GEMINI_API_KEY='<your Gemini API key>'
 *
 * Optional:
 *   supabase secrets set GEMINI_MODEL='gemini-2.5-flash'
 *
 * Deploy:
 *   supabase functions deploy gemini-form-feedback
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

const responseJsonSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'One concise paragraph summarizing the form attempt.',
    },
    cues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Three actionable coaching cues, each under 18 words.',
    },
    highlights: {
      type: 'array',
      items: { type: 'string' },
      description: 'One or two positive or diagnostic observations.',
    },
    safetyNote: {
      type: 'string',
      description: 'Brief non-medical safety note.',
    },
  },
  required: ['summary', 'cues', 'highlights', 'safetyNote'],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildPrompt(payload: Record<string, unknown>) {
  return `
You are a concise fitness form coach for a live pose-tracking workout app.
Use only the metrics below. Do not claim to diagnose injuries or medical issues.
Give practical cues that compare the user's form to the reference video.

Workout and attempt data:
${JSON.stringify(payload, null, 2)}
`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ success: false, error: 'GEMINI_API_KEY secret is not set' }, 501);
    }

    const payload = await req.json();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(payload) }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseJsonSchema,
          },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return jsonResponse({
        success: false,
        error: data?.error?.message || 'Gemini request failed',
      }, response.status);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return jsonResponse({ success: false, error: 'Gemini returned no text' }, 502);
    }

    return jsonResponse({ success: true, feedback: JSON.parse(text) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('gemini-form-feedback error:', message);
    return jsonResponse({ success: false, error: message }, 400);
  }
});
