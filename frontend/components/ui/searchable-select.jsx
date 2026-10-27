'use client';

import * as React from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found',
  className = '',
  disabled = false,
  error = false,
  required = false,
  id,
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const containerRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Find selected option
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options based on query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => {
      const labelMatch = (opt.label || '').toLowerCase().includes(q);
      const subLabelMatch = (opt.subLabel || '').toLowerCase().includes(q);
      const codeMatch = (opt.code || '').toLowerCase().includes(q);
      return labelMatch || subLabelMatch || codeMatch;
    });
  }, [options, searchQuery]);

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full text-left', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive/30',
          isOpen && 'ring-[3px] ring-ring/50 border-ring'
        )}
      >
        <div className="flex-1 truncate text-left">
          {selectedOption ? (
            <span className="font-medium text-foreground">
              {selectedOption.code ? (
                <span className="font-mono text-xs text-muted-foreground mr-1.5 bg-muted px-1.5 py-0.5 rounded">
                  {selectedOption.code}
                </span>
              ) : null}
              {selectedOption.label}
              {selectedOption.subLabel ? (
                <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                  ({selectedOption.subLabel})
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 hover:text-foreground rounded transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full min-w-[240px] rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="sticky top-0 z-10 flex items-center border-b bg-muted/40 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-56 p-1 divide-y divide-border/20">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2.5 text-xs text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/60 font-semibold text-accent-foreground'
                    )}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {opt.code && (
                          <span className="font-mono text-[11px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                            {opt.code}
                          </span>
                        )}
                        <span className="text-foreground">{opt.label}</span>
                      </div>
                      {opt.subLabel && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
