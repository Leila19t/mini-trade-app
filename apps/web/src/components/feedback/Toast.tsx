import type { ToastAction } from "../../hooks/useToasts";

interface ToastProps {
  message: string;
  action?: ToastAction;
  onDismiss: () => void;
}

export function Toast({ message, action, onDismiss }: ToastProps) {
  return (
    <div className="flex animate-toast-in items-center gap-4 rounded-[10px] bg-inverse-surface px-4 py-3 text-sm leading-[normal] text-inverse-text drop-shadow-[0px_8px_12px_rgba(15,23,41,0.18)] motion-reduce:animate-none">
      <p className="font-medium">{message}</p>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onAction();
            onDismiss();
          }}
          className="shrink-0 cursor-pointer font-semibold underline underline-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
