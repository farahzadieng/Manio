import { Download, X } from "lucide-react";

export function BackupReminderToast({
  onExport,
  onDismiss,
}: {
  onExport: () => Promise<void>;
  onDismiss: () => void;
}) {
  return (
    <aside className="backup-toast" role="status" aria-label="یادآوری پشتیبان">
      <div>
        <strong>وقت پشتیبان‌گیری است</strong>
        <p>برای نگهداری داده‌ها، پشتیبان این ماه را دریافت کنید.</p>
      </div>
      <button className="backup-toast-action" onClick={onExport}>
        <Download size={17} /> دریافت پشتیبان
      </button>
      <button
        className="backup-toast-close"
        onClick={onDismiss}
        aria-label="بستن یادآوری"
      >
        <X size={18} />
      </button>
    </aside>
  );
}
