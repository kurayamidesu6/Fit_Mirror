import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { User, Lock, Palette, RotateCcw, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_POSITIONS = [
  { label: 'Color 1', hint: 'top-left' },
  { label: 'Color 2', hint: 'bottom-right' },
  { label: 'Color 3', hint: 'top-right' },
];

function buildMeshStyle(colors) {
  return {
    background: `
      radial-gradient(ellipse at 15% 25%, ${colors[0]}55 0%, transparent 55%),
      radial-gradient(ellipse at 85% 75%, ${colors[1]}55 0%, transparent 55%),
      radial-gradient(ellipse at 70% 10%, ${colors[2]}55 0%, transparent 55%)
    `,
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { bgColors, bgEnabled, setBgEnabled, updateColor, resetColors } = useSettings();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const updates = {};
      if (displayName !== (user?.user_metadata?.full_name || '')) {
        updates.data = { full_name: displayName };
      }
      if (email !== user?.email) {
        updates.email = email;
      }
      if (Object.keys(updates).length === 0) {
        toast({ description: 'No changes to save.' });
        return;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      toast({
        description: email !== user?.email
          ? 'Confirmation email sent to your new address.'
          : 'Account updated successfully.',
      });
    } catch (err) {
      toast({ variant: 'destructive', description: err.message || 'Failed to update account.' });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', description: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', description: 'Password must be at least 6 characters.' });
      return;
    }
    setSavingPassword(true);
    try {
      // Re-authenticate with current password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (authError) throw new Error('Current password is incorrect.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ description: 'Password changed successfully.' });
    } catch (err) {
      toast({ variant: 'destructive', description: err.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-4">
        <h1 className="font-space font-bold text-2xl">Settings</h1>
      </div>

      <div className="max-w-2xl px-8 py-8 space-y-10">

        {/* ── Account Section ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-space font-semibold text-lg">Account</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Update your display name and email address.
          </p>

          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email will send a confirmation to the new address.
              </p>
            </div>
            <Button type="submit" disabled={savingAccount} className="gap-2">
              {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save changes
            </Button>
          </form>
        </section>

        <Separator />

        {/* ── Password Section ──────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-space font-semibold text-lg">Password</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Enter your current password to set a new one.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="gap-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Change password
            </Button>
          </form>
        </section>

        <Separator />

        {/* ── Appearance Section ────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-space font-semibold text-lg">Appearance</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Replace the plain background with a live mesh gradient.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary mb-6">
            <div>
              <p className="font-medium text-sm">Mesh gradient background</p>
              <p className="text-xs text-muted-foreground mt-0.5">Applies a soft multi-color gradient across the app</p>
            </div>
            <Switch checked={bgEnabled} onCheckedChange={setBgEnabled} />
          </div>

          {/* Color pickers */}
          <div
            className={cn(
              'space-y-5 transition-opacity duration-200',
              !bgEnabled && 'opacity-40 pointer-events-none'
            )}
          >
            <div className="grid grid-cols-3 gap-4">
              {COLOR_POSITIONS.map(({ label, hint }, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {label} <span className="text-muted-foreground/60">({hint})</span>
                  </Label>
                  <label className="relative block cursor-pointer">
                    <div
                      className="w-full h-14 rounded-xl border-2 border-border hover:border-primary/50 transition-colors overflow-hidden"
                      style={{ backgroundColor: bgColors[i] }}
                    />
                    <input
                      type="color"
                      value={bgColors[i]}
                      onChange={e => updateColor(i, e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  <p className="text-xs font-mono text-muted-foreground text-center">{bgColors[i]}</p>
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div
                className="w-full h-36 rounded-xl border border-border"
                style={buildMeshStyle(bgColors)}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetColors}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to defaults
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
