import { useRef, useEffect, useState, useCallback } from "react";
import { Eye, Code2, Type, Bold, Italic, Underline, Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Minus } from "lucide-react";

type EditorMode = "visual" | "html" | "preview";

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

const PLACEHOLDERS = [
  { tag: "{FirstName}", desc: "Recipient's first name" },
  { tag: "{FullName}", desc: "Recipient's full name" },
  { tag: "{Email}", desc: "Recipient's email address" },
  { tag: "{OrgName}", desc: "Organisation name (employers only)" },
  { tag: "{ProfileLink}", desc: "Direct link to recipient's profile page" },
];

function PlaceholderHints({ onInsert }: { onInsert?: (tag: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-muted-foreground">Placeholders:</span>
      {PLACEHOLDERS.map((p) => (
        <button
          key={p.tag}
          type="button"
          title={`${p.desc}${onInsert ? " — click to insert" : ""}`}
          onClick={() => onInsert?.(p.tag)}
          className="text-xs font-mono bg-muted/60 text-foreground/70 border border-border rounded px-1.5 py-0.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
        >
          {p.tag}
        </button>
      ))}
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`h-7 w-7 flex items-center justify-center rounded transition-colors text-sm
        ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />;
}

export function RichEmailEditor({ value, onChange, rows = 12 }: Props) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  const syncFromEditor = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
      isInternalUpdate.current = false;
    }
  }, [onChange]);

  const insertPlaceholder = useCallback((tag: string) => {
    if (mode === "html") {
      onChange(value + tag);
      return;
    }
    editorRef.current?.focus();
    document.execCommand("insertText", false, tag);
    syncFromEditor();
  }, [mode, value, onChange, syncFromEditor]);

  useEffect(() => {
    if (mode === "visual" && editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [mode, value]);

  const exec = useCallback((cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    syncFromEditor();
  }, [syncFromEditor]);

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  }, [exec]);

  const insertHr = useCallback(() => {
    exec("insertHTML", "<hr style='border:none;border-top:1px solid #eee;margin:16px 0;' />");
  }, [exec]);

  const minH = `${rows * 1.5}rem`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <PlaceholderHints onInsert={insertPlaceholder} />
        <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-md border border-border">
          {(["visual", "html", "preview"] as EditorMode[]).map((m) => {
            const Icon = m === "visual" ? Type : m === "html" ? Code2 : Eye;
            const label = m === "visual" ? "Visual" : m === "html" ? "HTML" : "Preview";
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors
                  ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "visual" && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/20">
            <ToolbarBtn onClick={() => exec("bold")} title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec("italic")} title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec("underline")} title="Underline">
              <Underline className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarDivider />
            <select
              className="h-7 text-xs rounded border border-input bg-background px-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  exec("formatBlock", e.target.value);
                  e.target.value = "";
                }
              }}
              title="Paragraph style"
            >
              <option value="" disabled>Style</option>
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="pre">Preformatted</option>
            </select>
            <select
              className="h-7 text-xs rounded border border-input bg-background px-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  exec("fontSize", e.target.value);
                  e.target.value = "";
                }
              }}
              title="Font size"
            >
              <option value="" disabled>Size</option>
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">X-Large</option>
            </select>
            <ToolbarDivider />
            <ToolbarBtn onClick={() => exec("justifyLeft")} title="Align left">
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec("justifyCenter")} title="Align center">
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec("justifyRight")} title="Align right">
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarDivider />
            <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet list">
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarDivider />
            <ToolbarBtn onClick={insertLink} title="Insert link">
              <Link className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={insertHr} title="Insert divider">
              <Minus className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarDivider />
            <input
              type="color"
              title="Text colour"
              className="h-6 w-6 rounded border border-input cursor-pointer bg-transparent p-0"
              onChange={(e) => exec("foreColor", e.target.value)}
            />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncFromEditor}
            className="px-4 py-3 bg-white text-sm outline-none overflow-auto"
            style={{ minHeight: minH, maxHeight: "60vh" }}
          />
        </div>
      )}

      {mode === "html" && (
        <textarea
          rows={rows}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          placeholder="<div>Your email HTML here…</div>"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {mode === "preview" && (
        <div
          className="border border-border rounded-md p-4 bg-white overflow-auto text-sm"
          style={{ minHeight: minH }}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )}
    </div>
  );
}
