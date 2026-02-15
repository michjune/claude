'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function UserSettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setNewsletterOptIn(profile.newsletter_opt_in);
    }
  }, [profile]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      setProfileSaveStatus('saving');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          newsletter_opt_in: newsletterOptIn,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setProfileSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setTimeout(() => setProfileSaveStatus('idle'), 2000);
    },
    onError: () => {
      setProfileSaveStatus('error');
      setTimeout(() => setProfileSaveStatus('idle'), 3000);
    },
  });

  // Change password
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      setPasswordStatus('saving');
      setPasswordError('');

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Verify current password by re-authenticating
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPasswordStatus('saved');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus('idle'), 2000);
    },
    onError: (error) => {
      setPasswordStatus('error');
      setPasswordError((error as Error).message);
      setTimeout(() => setPasswordStatus('idle'), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings.</p>
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewsletterOptIn(!newsletterOptIn)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                newsletterOptIn ? 'bg-primary' : 'bg-muted'
              )}
              role="switch"
              aria-checked={newsletterOptIn}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                  newsletterOptIn ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
            <div>
              <label className="text-sm font-medium">Newsletter</label>
              <p className="text-xs text-muted-foreground">
                Receive weekly stem cell research updates via email.
              </p>
            </div>
          </div>

          <Separator />

          <button
            onClick={() => saveProfileMutation.mutate()}
            disabled={profileSaveStatus === 'saving'}
            className={cn(
              'inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 transition-colors disabled:opacity-50',
              profileSaveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : profileSaveStatus === 'error'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {profileSaveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            {profileSaveStatus === 'saved' && <CheckCircle className="h-4 w-4" />}
            {profileSaveStatus === 'error' && <AlertCircle className="h-4 w-4" />}
            {profileSaveStatus === 'idle' && <Save className="h-4 w-4" />}
            {profileSaveStatus === 'saving'
              ? 'Saving...'
              : profileSaveStatus === 'saved'
                ? 'Saved!'
                : profileSaveStatus === 'error'
                  ? 'Error - Retry'
                  : 'Save Profile'}
          </button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{passwordError}</span>
            </div>
          )}

          <Separator />

          <button
            onClick={() => changePasswordMutation.mutate()}
            disabled={
              passwordStatus === 'saving' ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className={cn(
              'inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 transition-colors disabled:opacity-50',
              passwordStatus === 'saved'
                ? 'bg-green-600 text-white'
                : passwordStatus === 'error'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {passwordStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            {passwordStatus === 'saved' && <CheckCircle className="h-4 w-4" />}
            {passwordStatus === 'error' && <AlertCircle className="h-4 w-4" />}
            {passwordStatus === 'idle' && <Lock className="h-4 w-4" />}
            {passwordStatus === 'saving'
              ? 'Updating...'
              : passwordStatus === 'saved'
                ? 'Updated!'
                : passwordStatus === 'error'
                  ? 'Error - Retry'
                  : 'Change Password'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
