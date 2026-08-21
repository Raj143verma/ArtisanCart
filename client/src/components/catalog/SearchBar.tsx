import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

interface SearchBarProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  initialValue = '',
  onSearch,
  placeholder = 'Search handmade products, ceramics, woodcraft...',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  // Synchronize local input state if URL search query changes externally
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (value !== initialValue) {
        onSearch(value);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [value, initialValue, onSearch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form className="search-bar-wrap" onSubmit={handleSubmit} role="search">
      <svg
        className="search-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search catalog"
      />

      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Clear search query"
        >
          &times;
        </button>
      )}
    </form>
  );
}
