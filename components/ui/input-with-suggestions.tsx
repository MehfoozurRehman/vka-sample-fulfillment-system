'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type InputWithSuggestionsProps = {
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  options: string[];
  value?: string;
  onValueChange?: (value: string) => void;
  maxItems?: number;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'name' | 'id' | 'placeholder' | 'disabled' | 'list'>;
};

export function InputWithSuggestions({ id, name, className, placeholder, disabled, options, value, onValueChange, maxItems = 8, inputProps }: InputWithSuggestionsProps) {
  const isControlled = typeof value === 'string';

  const [internalValue, setInternalValue] = React.useState<string>(value ?? '');

  const [open, setOpen] = React.useState(false);

  const [highlighted, setHighlighted] = React.useState<number>(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isControlled) setInternalValue(value ?? '');
  }, [isControlled, value]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;

    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
    setOpen(true);
    setHighlighted(-1);
  };

  const query = (isControlled ? value : internalValue) ?? '';

  const normalized = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    const seen = new Set<string>();

    const out: string[] = [];

    const source = options;

    if (!normalized) {
      for (const opt of source) {
        const s = String(opt ?? '');

        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push(s);
        if (out.length >= maxItems) break;
      }

      return out;
    }

    for (const opt of source) {
      const s = String(opt ?? '');

      if (!s) continue;

      if (s.toLowerCase().includes(normalized) && !seen.has(s)) {
        seen.add(s);
        out.push(s);
        if (out.length >= maxItems) break;
      }
    }

    return out;
  }, [options, normalized, maxItems]);

  const selectValue = (val: string) => {
    if (!isControlled) setInternalValue(val);
    onValueChange?.(val);

    if (inputRef.current) {
      const nativeInput = inputRef.current;

      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

      setter?.call(nativeInput, val);
      nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInput.blur();
    }

    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);

      return;
    }

    if (!filtered.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && highlighted < filtered.length) {
        e.preventDefault();
        selectValue(filtered[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (inputRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);

    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentValue = isControlled ? (value ?? '') : internalValue;

  const show = open && filtered.length > 0;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={name}
        className={cn(className)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        value={currentValue}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        {...inputProps}
      />
      {show && (
        <div
          ref={popoverRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {filtered.map((opt, idx) => (
            <button
              type="button"
              key={opt}
              role="option"
              aria-selected={idx === highlighted}
              className={cn(
                'w-full cursor-pointer select-none rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                idx === highlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
              )}
              onMouseEnter={() => setHighlighted(idx)}
              onClick={() => selectValue(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default InputWithSuggestions;
