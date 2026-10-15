"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";

type Props<T> = {
  initialValue?: T | null;
  onChange?: (value: T | null) => void;
  search: (query: string) => Promise<T[]>;
  getKey: (value: T) => string;
  renderResult: (value: T) => React.ReactNode;
  renderSelected: (value: T) => React.ReactNode;
  searchLabel: string;
  searchPlaceholder: string;
  resultsLabel: string;
  emptyMessage: string;
  errorMessage: string;
  clearSelectionLabel: (value: T) => string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function SearchableEntityPicker<T>({
  initialValue = null,
  onChange,
  search,
  getKey,
  renderResult,
  renderSelected,
  searchLabel,
  searchPlaceholder,
  resultsLabel,
  emptyMessage,
  errorMessage,
  clearSelectionLabel,
  id,
  name,
  disabled = false,
  required = false,
  className,
}: Props<T>) {
  const generatedInputId = useId();
  const inputId = id ?? generatedInputId;
  const listboxId = `${generatedInputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<T | null>(initialValue);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const optionId = (index: number) => `${generatedInputId}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) dismissResults();
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  function dismissResults() {
    setResults([]);
    setOpen(false);
    setError(null);
    setActiveIndex(-1);
  }

  function updateSearchText(nextValue: string) {
    setSearchText(nextValue);
    dismissResults();
  }

  async function runSearch() {
    const query = searchText.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    setOpen(false);
    setError(null);
    try {
      const nextResults = await search(query);
      setResults(nextResults);
      setActiveIndex(nextResults.length ? 0 : -1);
      setOpen(true);
    } catch {
      setResults([]);
      setError(errorMessage);
      setOpen(true);
    } finally {
      setIsSearching(false);
    }
  }

  function changeSelection(nextValue: T | null) {
    setSelected(nextValue);
    setSearchText("");
    dismissResults();
    onChange?.(nextValue);
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0 max-w-full", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          dismissResults();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismissResults();
      }}
    >
      {name ? <input type="hidden" name={selected ? name : undefined} value={selected ? getKey(selected) : ""} /> : null}
      {selected ? (
        <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) py-1 pl-3 pr-1">
          <div className="min-w-0 flex-1">{renderSelected(selected)}</div>
          <Button type="button" size="sm" variant="ghost" iconOnly disabled={disabled} aria-label={clearSelectionLabel(selected)} onClick={() => changeSelection(null)}>
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="sr-only">{searchLabel}</label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <ClearableSearchInput
              id={inputId}
              value={searchText}
              disabled={disabled || isSearching}
              required={required}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1"
              aria-label={searchLabel}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
              onValueChange={updateSearchText}
              onClear={dismissResults}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && open && results.length) {
                  event.preventDefault();
                  setActiveIndex((current) => current < 0 ? 0 : Math.min(current + 1, results.length - 1));
                  return;
                }
                if (event.key === "ArrowUp" && open && results.length) {
                  event.preventDefault();
                  setActiveIndex((current) => current < 0 ? results.length - 1 : Math.max(current - 1, 0));
                  return;
                }
                if (event.key === "Enter" && open && activeIndex >= 0) {
                  event.preventDefault();
                  changeSelection(results[activeIndex]);
                  return;
                }
                if (event.key === "Escape" && open) {
                  event.preventDefault();
                  event.stopPropagation();
                  dismissResults();
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
            />
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={disabled || !searchText.trim()} isLoading={isSearching} onClick={() => void runSearch()}>
              搜尋
            </Button>
          </div>
          {open ? (
            <div
              id={listboxId}
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 max-w-full overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-elevated) shadow-(--shadow-card)"
            >
              {error ? (
                <p role="alert" className="px-3 py-2 text-sm text-(--status-danger)">{error}</p>
              ) : results.length ? (
                <ul role="listbox" aria-label={resultsLabel} className="divide-y divide-(--border-default)">
                  {results.map((result, index) => (
                    <li key={getKey(result)} role="none">
                      <button
                        id={optionId(index)}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={activeIndex === index}
                        disabled={disabled}
                        className={cn(
                          "min-h-11 w-full min-w-0 px-3 py-2 text-left transition-colors hover:bg-(--surface-subtle)",
                          activeIndex === index && "bg-(--surface-subtle)",
                        )}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => changeSelection(result)}
                      >
                        {renderResult(result)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="px-3 py-2 text-sm text-(--text-muted)">{emptyMessage}</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
