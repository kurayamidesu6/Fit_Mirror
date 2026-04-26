import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Upload, Video, X, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = ['strength', 'cardio', 'mobility', 'hiit', 'yoga', 'calisthenics'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const MUSCLES = ['full_body', 'upper_body', 'lower_body', 'core', 'arms', 'legs', 'back', 'chest'];

const TIPS = [
  'Film a single, clean rep from a side or front angle',
  'Ensure good lighting so your joints are clearly visible',
  'Keep the background clear and uncluttered',
  'The AI will track your key body landmarks for scoring',
  'A pass threshold of 75–85% is recommended for most movements',
];

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    target_muscle: '',
    duration_seconds: 30,
    pass_threshold: 75,
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.difficulty) {
      toast({ title: 'Missing fields', description: 'Please fill in title, category, and difficulty.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    let video_url = '';
    if (videoFile) {
      const ext = videoFile.name.split('.').pop();
      const path = `videos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('workout-videos').upload(path, videoFile);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('workout-videos').getPublicUrl(path);
        video_url = publicUrl;
      }
    }

    await entities.Workout.create({
      ...form,
      video_url,
      creator_name: user?.user_metadata?.full_name || user?.email || 'Anonymous',
      created_by: user?.id,
      likes: 0, saves: 0, attempts_count: 0,
      is_pro: false, is_verified_coach: false,
    });

    toast({ title: 'Workout created!', description: 'Your workout is now live on the feed.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-space font-bold text-2xl">Create Workout</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Upload a reference video and set the scoring rules</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl font-semibold"
          >
            {isSubmitting ? 'Publishing…' : 'Publish Workout'}
          </Button>
        </div>
      </div>

      <div className="px-8 py-6 flex gap-8">
        {/* Left — form */}
        <div className="flex-1 space-y-5">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Title</Label>
            <Input
              placeholder="e.g. Perfect Push-Up Form"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="h-11 rounded-xl text-base"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Description</Label>
            <Textarea
              placeholder="Describe the movement, cues to focus on, common mistakes to avoid…"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="rounded-xl min-h-[100px] text-base"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Category</Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => updateField('difficulty', v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Target Muscle</Label>
              <Select value={form.target_muscle} onValueChange={(v) => updateField('target_muscle', v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Duration (seconds)</Label>
              <Input
                type="number"
                value={form.duration_seconds}
                onChange={(e) => updateField('duration_seconds', parseInt(e.target.value) || 30)}
                className="h-11 rounded-xl text-base"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Pass Threshold (%)</Label>
              <Input
                type="number"
                min={50} max={100}
                value={form.pass_threshold}
                onChange={(e) => updateField('pass_threshold', parseInt(e.target.value) || 75)}
                className="h-11 rounded-xl text-base"
              />
            </div>
          </div>
        </div>

        {/* Right — upload + tips */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Reference Video</Label>
            {videoFile ? (
              <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-3">
                <Video className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{videoFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setVideoFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Click to upload video</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV · Max 50MB</p>
                </div>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {/* Tips */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-chart-3" />
              <h3 className="text-sm font-semibold">Tips for a great video</h3>
            </div>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
