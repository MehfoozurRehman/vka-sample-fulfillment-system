'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IconBell, IconLoader2, IconUpload } from '@tabler/icons-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-user';

export function Profile() {
  const user = useAuth();
  const notifications = useQuery(api.notification.getNotifications, user ? { userId: user.id as Id<'users'> } : 'skip');
  const markAll = useMutation(api.notification.markAllAsRead);
  const updateProfile = useMutation(api.user.updateProfile);
  const getUploadUrl = useMutation(api.utils.generateUploadUrl);
  const uploadProfilePicture = useMutation(api.user.uploadProfilePicture);

  const [name, setName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(
    () =>
      (user?.name || '')
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    [user?.name],
  );

  const dirty = useMemo(() => name !== (user?.name || '') || designation !== (user?.designation || ''), [name, designation, user?.name, user?.designation]);

  const statusVariant: 'secondary' | 'default' | 'destructive' | 'outline' = useMemo(() => {
    switch (user?.status) {
      case 'active':
        return 'default';
      case 'invited':
        return 'outline';
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  }, [user?.status]);

  const onSave = useCallback(async () => {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      await updateProfile({ userId: user.id as Id<'users'>, name, designation });
      toast.success('Profile updated');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [user, dirty, updateProfile, name, designation]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await getUploadUrl();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const storageId = json.storageId as string;
      await uploadProfilePicture({ userId: user.id as Id<'users'>, storageId });
      toast.success('Image uploaded');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onMarkAll = useCallback(async () => {
    if (!user) return;
    await markAll({ userId: user.id as Id<'users'> });
    toast.success('Notifications marked as read');
  }, [user, markAll]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Profile</CardTitle>
            <CardDescription className="text-xs">Personal details &amp; presence</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-28 w-28 border">
                {user?.picture && <AvatarImage src={user?.picture} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <IconLoader2 className="size-4 animate-spin" /> : <IconUpload className="size-4" />}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="text-sm font-medium flex items-center gap-2">
                {user?.name || '—'}
                {user?.status && (
                  <Badge variant={statusVariant} className="capitalize">
                    {user.status}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground break-all">{user?.email}</div>
              <div className="text-[11px] text-muted-foreground capitalize">Role: {user?.role}</div>
            </div>
          </CardContent>
          {dirty && (
            <CardFooter className="pt-0">
              <p className="text-[10px] text-muted-foreground">Unsaved changes detected.</p>
            </CardFooter>
          )}
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit Details</CardTitle>
            <CardDescription className="text-xs">Update your name &amp; designation. Picture changes apply on save.</CardDescription>
          </CardHeader>
          <Separator className="mb-4" />
          <CardContent className="space-y-5">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Designation">
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Title / Role" />
            </Field>
            <Field label="Email" help="Email cannot be changed">
              <Input value={user?.email || ''} disabled />
            </Field>
            <Field label="Role">
              <div>
                <Badge variant="secondary" className="capitalize">
                  {user?.role}
                </Badge>
              </div>
            </Field>
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-4">
            <div className="text-[11px] text-muted-foreground">Changes are logged for audit.</div>
            <Button onClick={onSave} disabled={!dirty || saving} className="gap-2 min-w-32">
              {saving && <IconLoader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>

      {user?.role !== 'admin' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconBell className="size-5" /> Notifications
            </CardTitle>
            <CardDescription className="text-xs">Unread alerts and actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Unread ({notifications?.length || 0})</div>
              <Button variant="outline" size="sm" onClick={onMarkAll} disabled={!notifications || notifications.length === 0}>
                Mark all as read
              </Button>
            </div>
            <Separator />
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(notifications || []).map((n) => (
                <li key={n._id} className="rounded-md border p-3 text-xs sm:text-sm bg-card/30 backdrop-blur-sm">
                  <div className="font-medium flex items-center gap-2">
                    <span>{n.type}</span>
                    <Badge variant="outline" className="text-[10px]">
                      New
                    </Badge>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</div>
                </li>
              ))}
              {(notifications || []).length === 0 && <li className="text-[11px] text-muted-foreground">No unread notifications.</li>}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      {children}
      {help && <p className="text-[10px] text-muted-foreground">{help}</p>}
    </div>
  );
}
