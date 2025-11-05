'use client';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  accountTypeOptions,
  applicationTypes,
  certificationsRequiredOptions,
  commercialPotentialOptions,
  countries,
  customerTypeOptions,
  documentsNeededOptions,
  foodMatrix,
  formatRequiredOptions,
  healthApplications,
  intendedMarketOptions,
  internalPriorityLevels,
  isCommercialProjectOptions,
  legalStatusOptions,
  nonFoodApplications,
  processingConditionsList,
  requestUrgencies,
  sampleVolumeOptions,
  samplingSizeOptions,
  shelfLifeExpectations,
} from '@/constants';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
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
  const [urgency, setUrgency] = useState('');
  const [applicationDetail, setApplicationDetail] = useState('');
  const [applicationSubDetail, setApplicationSubDetail] = useState('');
  const [processingConditions, setProcessingConditions] = useState<string[]>([]);
  const [shelfLifeExpectation, setShelfLifeExpectation] = useState('');
  const [formatRequired, setFormatRequired] = useState('');
  const [legalStatus, setLegalStatus] = useState('');
  const [certificationsRequired, setCertificationsRequired] = useState('');
  const [sampleVolume, setSampleVolume] = useState('');
  const [sampleVolumeOther, setSampleVolumeOther] = useState('');
  const [documentsNeeded, setDocumentsNeeded] = useState<string[]>([]);
  const [documentsOther, setDocumentsOther] = useState('');
  const [accountType, setAccountType] = useState('');
  const [commercialPotential, setCommercialPotential] = useState('');
  const [internalPriorityLevel, setInternalPriorityLevel] = useState('');
  const [internalReferenceCode, setInternalReferenceCode] = useState('');

  const [companyId, setCompanyId] = useState<string>('');
  const [companyFullName, setCompanyFullName] = useState('');
  const [companyShortName, setCompanyShortName] = useState('');
  const [requestorName, setRequestorName] = useState('');
  const [requestorCountry, setRequestorCountry] = useState('');
  const [isCommercialProject, setIsCommercialProject] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [intendedMarket, setIntendedMarket] = useState('');
  const [numberOfFlavorProfiles, setNumberOfFlavorProfiles] = useState<number | ''>('');
  const [samplingSize, setSamplingSize] = useState('');
  const [sampleQuantityRequired, setSampleQuantityRequired] = useState('');
  const [customerDeadline, setCustomerDeadline] = useState('');
  const [otherComments, setOtherComments] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('');

  const [isPending, startTransition] = useTransition();

  const auth = useAuth();

  useEffect(() => {
    if (open) {
      setRequestId(nextId || '');
      setItems([]);
      setBusinessBrief('');
      setRequestorName(auth.name || '');
      setRequestorCountry('');
      setIsCommercialProject('');
      setCustomerType('');
      setIntendedMarket('');
      setNumberOfFlavorProfiles('');
      setSamplingSize('');
      setSampleQuantityRequired('');
      setCustomerDeadline('');
      setOtherComments('');
      setPhoneCountryCode('');
      setCompanyFullName('');
      setCompanyShortName('');
    }
  }, [open, nextId, auth.name]);

  const companyOptions = useMemo(() => (stakeholders || []).map((s) => s.companyName).sort(), [stakeholders]);

  const productOptions = useMemo(() => (products || []).map((p) => `${p.productId} - ${p.productName}`), [products]);

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

    if (businessBrief.length > 2000) {
      toast.error('Business brief must be 2000 characters or less');

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
        
        // Parse customer deadline if provided
        let customerDeadlineTimestamp: number | undefined;
        if (customerDeadline) {
          const deadlineDate = new Date(customerDeadline);
          if (!isNaN(deadlineDate.getTime())) {
            customerDeadlineTimestamp = deadlineDate.getTime();
          }
        }
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
          applicationDetail: applicationDetail || undefined,
          applicationSubDetail: applicationSubDetail || undefined,
          projectName: projectNameVal,
          internalReferenceCode: internalReferenceCode || undefined,
          businessBrief: businessBrief.trim(),
          urgency: urgency || undefined,
          processingConditions: processingConditions.length ? processingConditions : undefined,
          shelfLifeExpectation: shelfLifeExpectation || undefined,
          formatRequired: formatRequired || undefined,
          legalStatus: legalStatus || undefined,
          certificationsRequired: certificationsRequired || undefined,
          sampleVolume: sampleVolume || undefined,
          sampleVolumeOther: sampleVolume === 'other' && sampleVolumeOther ? sampleVolumeOther : undefined,
          documentsNeeded: documentsNeeded.length ? documentsNeeded : undefined,
          documentsOther: documentsNeeded.includes('Other') && documentsOther ? documentsOther : undefined,
          accountType: accountType || undefined,
          commercialPotential: commercialPotential || undefined,
          internalPriorityLevel: internalPriorityLevel || undefined,
          productsRequested,
          requestedBy: auth.email,
          requestorName: requestorName.trim() || undefined,
          requestorCountry: requestorCountry.trim() || undefined,
          isCommercialProject: isCommercialProject || undefined,
          customerType: customerType || undefined,
          intendedMarket: intendedMarket || undefined,
          numberOfFlavorProfiles: numberOfFlavorProfiles !== '' ? (numberOfFlavorProfiles as number) : undefined,
          samplingSize: samplingSize || undefined,
          sampleQuantityRequired: sampleQuantityRequired.trim() || undefined,
          customerDeadline: customerDeadlineTimestamp,
          otherComments: otherComments.trim() || undefined,
          phoneCountryCode: phoneCountryCode.trim() || undefined,
          companyFullName: companyFullName.trim() || undefined,
          companyShortName: companyShortName.trim() || undefined,
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
          {/* Enquiry Information Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Enquiry Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="requestorName">Requestor Name *</Label>
                <Input id="requestorName" name="requestorName" value={requestorName} onChange={(e) => setRequestorName(e.target.value)} placeholder="Requestor Name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requestorCountry">Requestor Country *</Label>
                <InputWithSuggestions id="requestorCountry" name="requestorCountry" value={requestorCountry} onValueChange={(val) => setRequestorCountry(val)} options={countries} placeholder="Select country" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfRequest">Date of Request</Label>
                <Input id="dateOfRequest" name="dateOfRequest" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="isCommercialProject">Is this a confirmed commercial project? *</Label>
                <InputWithSuggestions id="isCommercialProject" name="isCommercialProject" value={isCommercialProject} onValueChange={(val) => setIsCommercialProject(val)} options={isCommercialProjectOptions as unknown as string[]} placeholder="Select" />
              </div>
            </div>
          </div>
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
              <Label htmlFor="companyFullName">Company Full Name *</Label>
              <Input id="companyFullName" name="companyFullName" value={companyFullName} onChange={(e) => setCompanyFullName(e.target.value)} placeholder="E.g. Advanced Flavors & Fragrances Pte Ltd." maxLength={255} required />
              <span className="text-xs text-muted-foreground">Maximum 255 characters</span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyShortName">Company Name (Short Form) *</Label>
              <Input id="companyShortName" name="companyShortName" value={companyShortName} onChange={(e) => setCompanyShortName(e.target.value)} placeholder="E.g. AFF" required />
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
              <div className="flex gap-2">
                <Input id="phoneCountryCode" name="phoneCountryCode" value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} placeholder="+92" className="w-24" />
                <Input id="phone" name="phone" placeholder="Enter full phone number" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <InputWithSuggestions id="country" name="country" options={countries} placeholder="Select country" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="applicationType">Application Type</Label>
              <InputWithSuggestions
                id="applicationType"
                name="applicationType"
                options={applicationTypes as unknown as string[]}
                placeholder="Select or type"
                onValueChange={() => {
                  setApplicationDetail('');
                  setApplicationSubDetail('');
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectName">Project Name</Label>
              <InputWithSuggestions id="projectName" name="projectName" options={projectNameOptions} placeholder="Select or type" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="internalReferenceCode">Internal Ref Code</Label>
              <Input id="internalReferenceCode" value={internalReferenceCode} onChange={(e) => setInternalReferenceCode(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerType">Customer Type *</Label>
              <InputWithSuggestions id="customerType" name="customerType" value={customerType} onValueChange={(v) => setCustomerType(v)} options={customerTypeOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="intendedMarket">Intended Market *</Label>
              <InputWithSuggestions id="intendedMarket" name="intendedMarket" value={intendedMarket} onValueChange={(v) => setIntendedMarket(v)} options={intendedMarketOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numberOfFlavorProfiles">Number of interested flavor profile(s) *</Label>
              <Input id="numberOfFlavorProfiles" name="numberOfFlavorProfiles" type="number" min={1} value={numberOfFlavorProfiles === '' ? '' : numberOfFlavorProfiles} onChange={(e) => setNumberOfFlavorProfiles(e.target.value === '' ? '' : parseInt(e.target.value, 10))} placeholder="Enter number" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="samplingSize">Sampling Size *</Label>
              <InputWithSuggestions id="samplingSize" name="samplingSize" value={samplingSize} onValueChange={(v) => setSamplingSize(v)} options={samplingSizeOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sampleQuantityRequired">Sample Quantity Required *</Label>
              <Input id="sampleQuantityRequired" name="sampleQuantityRequired" value={sampleQuantityRequired} onChange={(e) => setSampleQuantityRequired(e.target.value)} placeholder="Enter quantity" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerDeadline">Customer Deadline</Label>
              <Input id="customerDeadline" name="customerDeadline" type="date" value={customerDeadline} onChange={(e) => setCustomerDeadline(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Urgency</Label>
              <InputWithSuggestions options={requestUrgencies as unknown as string[]} value={urgency} onValueChange={(v) => setUrgency(v)} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Internal Priority Level</Label>
              <InputWithSuggestions value={internalPriorityLevel} onValueChange={(v) => setInternalPriorityLevel(v)} options={internalPriorityLevels as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Application Detail</Label>
              <InputWithSuggestions
                value={applicationDetail}
                onValueChange={(v) => {
                  setApplicationDetail(v);
                  setApplicationSubDetail('');
                }}
                options={(() => {
                  const val = applicationDetail;
                  if (val === 'Food') return Object.keys(foodMatrix);
                  if (val === 'Health') return healthApplications as unknown as string[];
                  if (val === 'Non-Food') return nonFoodApplications as unknown as string[];
                  return [];
                })()}
                placeholder="Depends on type"
              />
            </div>
            {applicationDetail && applicationDetail === 'Food' && foodMatrix[applicationDetail] && (
              <div className="grid gap-2">
                <Label>Food Sub-Detail</Label>
                <InputWithSuggestions value={applicationSubDetail} onValueChange={(v) => setApplicationSubDetail(v)} options={foodMatrix[applicationDetail]} placeholder="Select sub-category" />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="businessBrief">Enquiry Brief *</Label>
            <Textarea
              id="businessBrief"
              name="businessBrief"
              value={businessBrief}
              onChange={(e) => setBusinessBrief(e.target.value)}
              placeholder="Please include as much information as possible about the company's requirements and concerns."
              className="min-h-24 resize-y"
              maxLength={2000}
              required
            />
            <span className="text-xs text-muted-foreground">{businessBrief.length}/2000 characters. Required. Products are optional and can be suggested later.</span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="otherComments">Other Comments</Label>
            <Textarea
              id="otherComments"
              name="otherComments"
              value={otherComments}
              onChange={(e) => setOtherComments(e.target.value)}
              placeholder="Any additional comments or notes"
              className="min-h-20 resize-y"
            />
          </div>
          {/* Technical & Commercial Sections */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Processing Conditions</Label>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {processingConditionsList.map((pc) => {
                  const active = processingConditions.includes(pc);
                  return (
                    <button
                      key={pc}
                      type="button"
                      onClick={() => setProcessingConditions((p) => (active ? p.filter((x) => x !== pc) : [...p, pc]))}
                      className={`px-2 py-1 rounded border ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                    >
                      {pc}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Shelf Life Expectation</Label>
              <InputWithSuggestions value={shelfLifeExpectation} onValueChange={(v) => setShelfLifeExpectation(v)} options={shelfLifeExpectations as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Format Required</Label>
              <InputWithSuggestions value={formatRequired} onValueChange={(v) => setFormatRequired(v)} options={formatRequiredOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Legal Status</Label>
              <InputWithSuggestions value={legalStatus} onValueChange={(v) => setLegalStatus(v)} options={legalStatusOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Required Certifications</Label>
              <InputWithSuggestions
                value={certificationsRequired}
                onValueChange={(v) => setCertificationsRequired(v)}
                options={certificationsRequiredOptions as unknown as string[]}
                placeholder="Select"
              />
            </div>
            <div className="grid gap-2">
              <Label>Sample Volume</Label>
              <InputWithSuggestions
                value={sampleVolume}
                onValueChange={(v) => {
                  setSampleVolume(v);
                  if (v !== 'other') setSampleVolumeOther('');
                }}
                options={sampleVolumeOptions as unknown as string[]}
                placeholder="Select"
              />
              {sampleVolume === 'other' && <Input placeholder="Specify" value={sampleVolumeOther} onChange={(e) => setSampleVolumeOther(e.target.value)} />}
            </div>
            <div className="grid gap-2">
              <Label>Documents Needed</Label>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {documentsNeededOptions.map((d) => {
                  const active = documentsNeeded.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDocumentsNeeded((p) => (active ? p.filter((x) => x !== d) : [...p, d]))}
                      className={`px-2 py-1 rounded border ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {documentsNeeded.includes('Other') && <Input placeholder="Other docs" value={documentsOther} onChange={(e) => setDocumentsOther(e.target.value)} />}
            </div>
            <div className="grid gap-2">
              <Label>Account Type</Label>
              <InputWithSuggestions value={accountType} onValueChange={(v) => setAccountType(v)} options={accountTypeOptions as unknown as string[]} placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>Commercial Potential</Label>
              <InputWithSuggestions value={commercialPotential} onValueChange={(v) => setCommercialPotential(v)} options={commercialPotentialOptions as unknown as string[]} placeholder="Select" />
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Sections 2–5 enrich technical evaluation & internal prioritization.</p>
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
