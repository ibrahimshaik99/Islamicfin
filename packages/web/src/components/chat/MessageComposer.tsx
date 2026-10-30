import { useRef, useState, KeyboardEvent } from 'react';

/**
 * Chat composer: text + optional image attachment (sent as a data URL — the
 * backend accepts URL strings only; there is no upload endpoint yet).
 */
export function MessageComposer({
  onSend,
  onSendImage,
  onFileSelected,
  disabled = false,
  imagePreview,
  onClearImage,
  placeholder = 'Type a message…',
}: {
  onSend: (body: string) => void;
  /** Send an already-prepared image (parent manages the preview lifecycle). */
  onSendImage?: (dataUrl: string) => void;
  /** Called when the user picks a file — parent decides whether to preview or send. */
  onFileSelected?: (dataUrl: string) => void;
  disabled?: boolean;
  imagePreview?: string | null;
  onClearImage?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !disabled && (text.trim().length > 0 || (!!imagePreview && !!onSendImage));

  const handleSend = () => {
    if (!canSend) return;
    if (imagePreview && onSendImage) {
      onSendImage(imagePreview);
      return;
    }
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) onFileSelected?.(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white border-t border-line px-3 py-2.5 safe-bottom">
      {imagePreview && (
        <div className="mb-2 inline-block relative">
          <img src={imagePreview} alt="Attachment preview" className="h-16 w-16 object-cover rounded-xl border border-line" />
          {onClearImage && (
            <button
              type="button"
              onClick={onClearImage}
              aria-label="Remove attachment"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-ink text-white flex items-center justify-center hover:bg-ink/80"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {onSendImage && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFile}
              accept="image/*"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach a photo"
              className="touch-target flex items-center justify-center text-muted hover:text-primary-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
              </svg>
            </button>
          </>
        )}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Message"
          className="flex-1 px-4 py-2.5 text-sm bg-surface border border-line rounded-2xl text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 transition-colors disabled:opacity-60"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="touch-target flex items-center justify-center rounded-2xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors h-11 w-11 flex-shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
