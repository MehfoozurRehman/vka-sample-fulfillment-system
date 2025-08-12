'use client';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import { IconPlus } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';

export function AddProduct() {
  const [open, setOpen] = useState(false);

  const add = useMutation(api.product.add);

  const nextId = useQuery(api.product.nextId);

  const products = useQuery(api.product.list);

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();

    (products || []).forEach((p) => {
      if (p.category) cats.add(p.category);
    });

    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const [productId, setProductId] = useState('');

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setProductId(nextId || '');
    } else {
      setProductId('');
    }
  }, [open, nextId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const formData = new FormData(event.currentTarget);

      const productName = (formData.get('productName') as string)?.trim();

      const category = (formData.get('category') as string)?.trim();

      const location = (formData.get('location') as string)?.trim();

      if (!productName) {
        toast.error('Product name is required');

        return;
      }

      if (!category) {
        toast.error('Category is required');

        return;
      }

      if (!location) {
        toast.error('Location is required');

        return;
      }

      try {
        await add({ productId: productId?.trim() || '', productName, category, location });
        setOpen(false);
        toast.success('Product added successfully');
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
          <span className="hidden lg:inline">Add Product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product entry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="productId">Product ID</Label>
              <Input id="productId" name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="FLV-00001 or leave blank" />
              <span className="text-xs text-muted-foreground">Auto-generated as {nextId ?? 'loading…'}. You can edit before saving.</span>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="productName">Product Name</Label>
              <Input id="productName" name="productName" autoFocus />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="category">Category</Label>
              <InputWithSuggestions id="category" name="category" placeholder="Select or type a category" options={categoryOptions} inputProps={{ spellCheck: false }} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
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
