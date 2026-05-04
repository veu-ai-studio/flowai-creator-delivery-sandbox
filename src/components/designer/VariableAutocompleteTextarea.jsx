import { useState, useRef, useEffect } from "react";
import { useFlow } from "@/lib/flowStore";
import { cn } from "@/lib/utils";

/**
 * A textarea that shows a dropdown of {{variable}} suggestions when the user types "{{".
 * Props are the same as a standard <textarea> plus optional className.
 */
export default function VariableAutocompleteTextarea({ value, onChange, className, placeholder, rows = 4 }) {
  const { variables } = useFlow();
  const [showDropdown, setShowDropdown] = useState(false);
  const [triggerPos, setTriggerPos] = useState(null); // caret position when {{ was typed
  const [filter, setFilter] = useState("");
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = variables.filter((v) =>
    v.key.toLowerCase().includes(filter.toLowerCase())
  );

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(e);

    // Detect if we're inside a {{ ... }} pattern before the caret
    const caret = e.target.selectionStart;
    const before = text.slice(0, caret);
    const match = before.match(/\{\{(\w*)$/);
    if (match) {
      setFilter(match[1]);
      setShowDropdown(variables.length > 0);
      setTriggerPos(caret - match[0].length);
    } else {
      setShowDropdown(false);
      setFilter("");
    }
  };

  const insertVariable = (key) => {
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const before = value.slice(0, triggerPos);
    const after = value.slice(caret);
    const newValue = `${before}{{${key}}}${after}`;
    // Synthesize a change event
    onChange({ target: { value: newValue } });
    setShowDropdown(false);
    // Restore focus and caret
    setTimeout(() => {
      ta.focus();
      const newCaret = before.length + key.length + 4;
      ta.setSelectionRange(newCaret, newCaret);
    }, 0);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !textareaRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
      />

      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border">
            Variables — click to insert
          </div>
          {filtered.map((v) => (
            <button
              key={v.key}
              onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            >
              <span className="font-mono text-primary text-xs">{`{{${v.key}}}`}</span>
              {v.value && (
                <span className="text-muted-foreground text-xs truncate">= {v.value}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {variables.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {variables.map((v) => (
            <button
              key={v.key}
              onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key); }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
            >
              {`{{${v.key}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}