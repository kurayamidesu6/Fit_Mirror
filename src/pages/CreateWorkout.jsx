import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Upload, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = ['strength', 'cardio', 'mobility', 'hiit', 'yoga', 'calisthenics'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const MUSCLES = ['full_body', 'upper_body', 'lower_body', 'core', 'arms', 'legs', 'back', 'chest'];

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.difficulty) {
      toast({ title: 'Missing fields', description: 'Please fill in title, category, and difficulty.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    let video_url = '';
    if (videoFile) {
      const result = await base44.integrations.Core.UploadFile({ file: videoFile });
      video_url = result.file_url;
    }

    const user = await base44.auth.me();
    
    await base44.entities.Workout.create({
      ...form,
      video_url,
      creator_name: user?.full_name || 'Anonymous',
      likes: 0,
      saves: 0,
      attempts_count: 0,
      is_pro: false,
      is_verified_coach: false,
    });

    toast({ title: 'Workout created!', description: 'Your workout is now live on the feed.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="font-space font-bold text-xl mb-6">Create Workout</h1>

        {/* Video Upload */}
        <div className="mb-6">
          <Label className="text-sm mb-2 block">Workout Video</Label>
          {videoFile ? (
            <div className="relative bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <Video className="w-8 h-8 text-primary" />
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
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Upload a short video of one clear rep</p>
                <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV • Max 50MB</p>
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-2 block">Title</Label>
            <Input
              placeholder="e.g. Perfect Push-Up Form"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="bg-card border-border h-12 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block">Description</Label>
            <Textarea
              placeholder="Describe the workout movement..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="bg-card border-border rounded-xl min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-2 block">Category</Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="bg-card border-border h-12 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => updateField('difficulty', v)}>
                <SelectTrigger className="bg-card border-border h-12 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Target Muscle Group</Label>
            <Select value={form.target_muscle} onValueChange={(v) => updateField('target_muscle', v)}>
              <SelectTrigger className="bg-card border-border h-12 rounded-xl">
                <SelectValue placeholder="Select muscle group" />
              </SelectTrigger>
              <SelectContent>
                {MUSCLES.map(m => (
                  <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-2 block">Duration (seconds)</Label>
              <Input
                type="number"
                value={form.duration_seconds}
                onChange={(e) => updateField('duration_seconds', parseInt(e.target.value) || 30)}
                className="bg-card border-border h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Pass Threshold (%)</Label>
              <Input
                type="number"
                min={50}
                max={100}
                value={form.pass_threshold}
                onChange={(e) => updateField('pass_threshold', parseInt(e.target.value) || 75)}
                className="bg-card border-border h-12 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg mt-8 glow-primary hover:opacity-90"
        >
          {isSubmitting ? 'Creating...' : 'Publish Workout'}
        </Button>
      </div>
    </div>
  );
}