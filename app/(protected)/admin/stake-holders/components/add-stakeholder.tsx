'use client';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPlus } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';

export function AddStakeholder() {
  const user = useAuth();

  const [open, setOpen] = useState(false);

  const addStakeholder = useMutation(api.stakeholder.addStakeholder);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const formData = new FormData(event.currentTarget);

      const companyName = (formData.get('companyName') as string)?.trim();

      const salesRepEmail = (formData.get('salesRepEmail') as string)?.trim();

      const accountManagerEmail = (formData.get('accountManagerEmail') as string)?.trim();

      const complianceOfficerEmail = (formData.get('complianceOfficerEmail') as string)?.trim();

      const vipFlag = formData.get('vipFlag') === 'on';

      if (!companyName) {
        toast.error('Company name is required');

        return;
      }

      if (!salesRepEmail) {
        toast.error('Sales rep email is required');

        return;
      }

      if (!accountManagerEmail) {
        toast.error('Account manager email is required');

        return;
      }

      if (!complianceOfficerEmail) {
        toast.error('Compliance officer email is required');

        return;
      }

      try {
        await addStakeholder({
          userId: user?.id,
          companyName,
          salesRepEmail,
          accountManagerEmail,
          complianceOfficerEmail,
          vipFlag,
        });
        setOpen(false);
        toast.success('Stakeholder added successfully');
      } catch (error) {
        toastError(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <IconPlus />
          <span className="hidden lg:inline">Add Stakeholder</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Add Stakeholder</DialogTitle>
            <DialogDescription>Create a new stakeholder company and assign contacts.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="salesRepEmail">Sales Rep Email</Label>
              <Input id="salesRepEmail" name="salesRepEmail" type="email" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="accountManagerEmail">Account Manager Email</Label>
              <Input id="accountManagerEmail" name="accountManagerEmail" type="email" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="complianceOfficerEmail">Compliance Officer Email</Label>
              <Input id="complianceOfficerEmail" name="complianceOfficerEmail" type="email" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="vipFlag" name="vipFlag" />
              <Label htmlFor="vipFlag">Mark as VIP</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
