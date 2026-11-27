import { Toast } from "../components/feedback/Toast";
import { dismissToast, useToast } from "../hooks/useToasts";

export function ToastRegion() {
  const toast = useToast();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4 max-sm:bottom-24"
    >
      {toast && (
        <div className="pointer-events-auto" key={toast.id}>
          <Toast
            message={toast.message}
            action={toast.action}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </div>
  );
}
