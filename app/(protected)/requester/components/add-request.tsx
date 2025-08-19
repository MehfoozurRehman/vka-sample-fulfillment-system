'use client';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import { countries } from '@/constants';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

export function AddRequest() {
  const [open, setOpen] = useState(false);

  const { data: nextId } = useQueryWithStatus(api.request.nextId);

  const { data: stakeholders } = useQueryWithStatus(api.stakeholder.getStakeholders);

  const { data: products } = useQueryWithStatus(api.product.list);

  const { data: suggestions } = useQueryWithStatus(api.request.suggestions);

  const addReq = useMutation(api.request.add);
  const addStakeholder = useMutation(api.stakeholder.addStakeholder);

  const [requestId, setRequestId] = useState('');

  const [items, setItems] = useState<{ productId: string; quantity: number | ''; notes: string }[]>([]);

  const [businessBrief, setBusinessBrief] = useState('');

  const [companyId, setCompanyId] = useState<string>('');

  const [isPending, startTransition] = useTransition();

  const auth = useAuth();

  useEffect(() => {
    if (open) {
      setRequestId(nextId || '');
      setItems([]);
      setBusinessBrief('');
    }
  }, [open, nextId]);

  const companyOptions = useMemo(() => (stakeholders || []).map((s) => s.companyName).sort(), [stakeholders]);

  const productOptions = useMemo(() => (products || []).map((p) => `${p.productId} - ${p.productName}`), [products]);

  const applicationTypeOptions = useMemo(() => suggestions?.applicationTypes || [], [suggestions]);

  const projectNameOptions = useMemo(() => suggestions?.projectNames || [], [suggestions]);

  const selectedCompany = (stakeholders || []).find((s) => s.companyName === companyId);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, notes: '' }]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyId.trim()) {
      toast.error('Select or enter a company');

      return;
    }

    if (!businessBrief.trim()) {
      toast.error('Please add a brief');

      return;
    }

    const invalid = items.some((i) => !i.productId || i.quantity === '' || (i.quantity as number) <= 0);

    if (invalid) {
      toast.error('Each line must have product and quantity > 0');

      return;
    }

    const contactNameVal = ((event.currentTarget.elements.namedItem('contactName') as HTMLInputElement | null)?.value || '').trim();
    const emailVal = ((event.currentTarget.elements.namedItem('email') as HTMLInputElement | null)?.value || '').trim();
    const phoneVal = ((event.currentTarget.elements.namedItem('phone') as HTMLInputElement | null)?.value || '').trim();
    const countryVal = ((event.currentTarget.elements.namedItem('country') as HTMLInputElement | null)?.value || '').trim();
    const applicationTypeVal = ((event.currentTarget.elements.namedItem('applicationType') as HTMLInputElement | null)?.value || '').trim();
    const projectNameVal = ((event.currentTarget.elements.namedItem('projectName') as HTMLInputElement | null)?.value || '').trim();

    startTransition(async () => {
      try {
        let companyIdToUse: Id<'stakeholders'> | undefined = selectedCompany?.id;

        if (!companyIdToUse) {
          try {
            const newId = await addStakeholder({
              userId: auth.id,
              companyName: companyId.trim(),
              salesRepEmail: '',
              accountManagerEmail: '',
              complianceOfficerEmail: '',
              vipFlag: false,
            });

            companyIdToUse = newId as Id<'stakeholders'>;
          } catch (err) {
            toastError(err);
            return;
          }
        }

        const productsRequested = items
          .filter((i) => i.productId && i.quantity !== '' && (i.quantity as number) > 0)
          .map((i) => {
            const pid = (products || []).find((p) => `${p.productId} - ${p.productName}` === i.productId)?.id as Id<'products'> | undefined;

            if (!pid) throw new Error('Invalid product selection');

            return { productId: pid, quantity: i.quantity as number, notes: i.notes || undefined };
          });

        await addReq({
          userId: auth.id,
          requestId: requestId?.trim() || '',
          companyId: companyIdToUse as Id<'stakeholders'>,
          contactName: contactNameVal,
          email: emailVal,
          phone: phoneVal,
          country: countryVal,
          applicationType: applicationTypeVal,
          projectName: projectNameVal,
          businessBrief: businessBrief.trim(),
          productsRequested,
          requestedBy: auth.email,
        });

        toast.success('Request submitted');

        setOpen(false);
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
          <span className="hidden lg:inline">New Request</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Submit Request</DialogTitle>
            <DialogDescription>Create a new fulfillment request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="requestId">Request ID</Label>
              <Input id="requestId" name="requestId" value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="REQ-00001 or AUTO" />
              <span className="text-xs text-muted-foreground">Auto-generated as {nextId ?? 'loading…'}. You can edit before saving.</span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <InputWithSuggestions id="company" name="company" value={companyId} onValueChange={(val) => setCompanyId(val)} options={companyOptions} placeholder="Select company" />
              <span className="mt-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" name="contactName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" name="email" type="email" defaultValue={auth.email} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <InputWithSuggestions id="country" name="country" options={countries} placeholder="Select country" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="applicationType">Application Type</Label>
              <InputWithSuggestions id="applicationType" name="applicationType" options={applicationTypeOptions} placeholder="Select or type" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectName">Project Name</Label>
              <InputWithSuggestions id="projectName" name="projectName" options={projectNameOptions} placeholder="Select or type" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="businessBrief">Business Brief</Label>
            <Textarea
              id="businessBrief"
              name="businessBrief"
              value={businessBrief}
              onChange={(e) => setBusinessBrief(e.target.value)}
              placeholder="Describe the business problem/use-case and desired outcome"
              className="min-h-24 resize-y"
            />
            <span className="text-xs text-muted-foreground">Required. Products are optional and can be suggested later.</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Suggested Flavours</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {items.map((item, idx) => {
                const selectedOthers = items
                  .filter((_, i) => i !== idx)
                  .map((i) => i.productId)
                  .filter(Boolean);

                const filteredProductOptions = productOptions.filter((o) => !selectedOthers.includes(o) || o === item.productId);

                return (
                  <div key={idx} className="flex flex-col md:flex-row gap-2 rounded-md border p-2 bg-muted/30">
                    <div className="w-full md:flex-[2]">
                      <InputWithSuggestions
                        name={`product-${idx}`}
                        value={item.productId}
                        onValueChange={(v) => {
                          const already = selectedOthers.includes(v);

                          if (already) return;

                          setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, productId: v } : p)));
                        }}
                        options={filteredProductOptions}
                        placeholder="Select product"
                      />
                    </div>
                    <div className="w-full md:w-24">
                      <Input
                        type="number"
                        min={1}
                        name={`qty-${idx}`}
                        value={item.quantity === '' ? '' : item.quantity}
                        onChange={(e) => {
                          const raw = e.target.value;

                          const qty = raw === '' ? '' : Math.max(1, parseInt(raw, 10));

                          setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: qty } : p)));
                        }}
                        placeholder="Qty"
                      />
                    </div>
                    <div className="w-full md:flex-1">
                      <Textarea
                        name={`notes-${idx}`}
                        value={item.notes}
                        placeholder="Notes"
                        className="resize-none h-10"
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, notes: e.target.value } : p)))}
                      />
                    </div>
                    <div className="flex md:self-center">
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove product line" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!items.length && <div className="text-sm text-muted-foreground">No products added yet. You can submit with only a brief.</div>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
