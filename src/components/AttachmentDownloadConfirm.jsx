import { timeAgo } from '../utils/timeAgo';
import { Dialog, DialogContent, DialogClose } from './ui/Dialog';
import Button from './ui/Button';

function fmtBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtType(att) {
  const name = (att.name ?? '').toLowerCase();
  if (att.format === 'pdf' || name.endsWith('.pdf')) return 'PDF';
  if (att.format === 'docx' || name.endsWith('.docx')) return 'DOCX';
  if (att.format === 'doc' || name.endsWith('.doc')) return 'DOC';
  return 'Фајл';
}

export default function AttachmentDownloadConfirm({
  attachment,
  authorUsername,
  postedAt,
  open,
  onClose,
  onReport,
}) {
  if (!attachment) return null;

  const handleDownload = () => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Close button */}
        <DialogClose
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 z-10"
          aria-label="Затвори"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </DialogClose>

        <div className="p-5">
          {/* Heading */}
          <p className="font-display font-bold text-base text-ink mb-4">Преземи прилог</p>

          {/* File details */}
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 text-[13px]">
              <span style={{ color: 'var(--color-muted-dim)', minWidth: 56 }}>Фајл</span>
              <span className="font-mono text-ink truncate" style={{ maxWidth: 260 }}>
                {attachment.name}
              </span>
            </div>
            {attachment.bytes > 0 && (
              <div className="flex gap-2 text-[13px]">
                <span style={{ color: 'var(--color-muted-dim)', minWidth: 56 }}>Големина</span>
                <span style={{ color: 'var(--color-ink-dim)' }}>{fmtBytes(attachment.bytes)}</span>
              </div>
            )}
            <div className="flex gap-2 text-[13px]">
              <span style={{ color: 'var(--color-muted-dim)', minWidth: 56 }}>Тип</span>
              <span style={{ color: 'var(--color-ink-dim)' }}>{fmtType(attachment)}</span>
            </div>
            {authorUsername && (
              <div className="flex gap-2 text-[13px]">
                <span style={{ color: 'var(--color-muted-dim)', minWidth: 56 }}>Корисник</span>
                <span className="text-ink">{authorUsername}</span>
                {postedAt && <span style={{ color: 'var(--color-muted-dim)' }}>· {timeAgo(postedAt)}</span>}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 16 }} />

          {/* Warning */}
          <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--color-muted)' }}>
            Преземаш фајл од корисник на платформата. Отвори го само ако веруваш во изворот. Ако
            фајлот ти изгледа сомнителен, пријави го.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReport?.()}
              leftIcon={
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
              }
            >
              Пријави
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Откажи
              </Button>
              <Button variant="primary" size="sm" onClick={handleDownload}>
                Преземи
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
