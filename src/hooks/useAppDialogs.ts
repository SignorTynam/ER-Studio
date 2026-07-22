import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Fase C4b: true per conferme distruttive (bottone primario in variante danger). */
  danger: boolean;
}

export interface PromptDialogState {
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  required: boolean;
  requiredMessage: string;
  /** Validazione extra (oltre a "required"): restituisce un messaggio d'errore o null se valido. */
  validate?: (value: string) => string | null;
}

interface RequestConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface RequestPromptOptions {
  title: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  requiredMessage?: string;
  validate?: (value: string) => string | null;
}

interface UseAppDialogsOptions {
  defaultConfirmLabel: string;
  defaultCancelLabel: string;
  defaultSaveLabel: string;
  defaultRequiredMessage: string;
}

export interface UseAppDialogsResult {
  confirmDialog: ConfirmDialogState | null;
  promptDialog: PromptDialogState | null;
  promptValue: string;
  promptError: string;
  promptInputRef: React.RefObject<HTMLInputElement>;
  dialogRef: React.RefObject<HTMLDivElement>;
  setPromptValue: Dispatch<SetStateAction<string>>;
  setPromptError: Dispatch<SetStateAction<string>>;
  requestConfirmDialog: (options: RequestConfirmOptions) => Promise<boolean>;
  requestPromptDialog: (options: RequestPromptOptions) => Promise<string | null>;
  closeConfirmDialog: (confirmed: boolean) => void;
  closePromptDialog: (value: string | null) => void;
  submitPromptDialog: () => void;
}

export function useAppDialogs({
  defaultConfirmLabel,
  defaultCancelLabel,
  defaultSaveLabel,
  defaultRequiredMessage,
}: UseAppDialogsOptions): UseAppDialogsResult {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState("");
  const confirmDialogResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const promptDialogResolverRef = useRef<((value: string | null) => void) | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function rememberTrigger() {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function restoreTriggerFocus() {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    window.setTimeout(() => {
      if (target?.isConnected) target.focus();
    }, 0);
  }

  function closeConfirmDialog(confirmed: boolean) {
    const resolve = confirmDialogResolverRef.current;
    confirmDialogResolverRef.current = null;
    setConfirmDialog(null);
    resolve?.(confirmed);
    restoreTriggerFocus();
  }

  function requestConfirmDialog(options: RequestConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (confirmDialogResolverRef.current) {
        confirmDialogResolverRef.current(false);
      }

      confirmDialogResolverRef.current = resolve;
      rememberTrigger();
      setConfirmDialog({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? defaultConfirmLabel,
        cancelLabel: options.cancelLabel ?? defaultCancelLabel,
        danger: options.danger ?? false,
      });
    });
  }

  function closePromptDialog(value: string | null) {
    const resolve = promptDialogResolverRef.current;
    promptDialogResolverRef.current = null;
    setPromptDialog(null);
    setPromptValue("");
    setPromptError("");
    resolve?.(value);
    restoreTriggerFocus();
  }

  function requestPromptDialog(options: RequestPromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      if (promptDialogResolverRef.current) {
        promptDialogResolverRef.current(null);
      }

      promptDialogResolverRef.current = resolve;
      rememberTrigger();
      setPromptDialog({
        title: options.title,
        label: options.label,
        placeholder: options.placeholder,
        confirmLabel: options.confirmLabel ?? defaultSaveLabel,
        cancelLabel: options.cancelLabel ?? defaultCancelLabel,
        required: options.required === true,
        requiredMessage: options.requiredMessage ?? defaultRequiredMessage,
        validate: options.validate,
      });
      setPromptValue(options.initialValue);
      setPromptError("");
    });
  }

  function submitPromptDialog() {
    if (!promptDialog) {
      return;
    }

    const normalized = promptValue.trim();
    if (promptDialog.required && !normalized) {
      setPromptError(promptDialog.requiredMessage);
      return;
    }

    const validationError = promptDialog.validate?.(normalized);
    if (validationError) {
      setPromptError(validationError);
      return;
    }

    closePromptDialog(normalized);
  }

  useEffect(() => {
    if (!promptDialog && !confirmDialog) return undefined;
    const timeout = window.setTimeout(() => {
      const root = dialogRef.current;
      const preferred = promptDialog ? promptInputRef.current : root?.querySelector<HTMLElement>("[data-dialog-safe]");
      const first = preferred ?? root?.querySelector<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
      if (promptDialog && first === promptInputRef.current) promptInputRef.current?.select();
    }, 0);

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", trapFocus);
    };
  }, [confirmDialog, promptDialog]);

  useEffect(() => {
    return () => {
      if (confirmDialogResolverRef.current) {
        confirmDialogResolverRef.current(false);
        confirmDialogResolverRef.current = null;
      }

      if (promptDialogResolverRef.current) {
        promptDialogResolverRef.current(null);
        promptDialogResolverRef.current = null;
      }
    };
  }, []);

  return {
    confirmDialog,
    promptDialog,
    promptValue,
    promptError,
    promptInputRef,
    dialogRef,
    setPromptValue,
    setPromptError,
    requestConfirmDialog,
    requestPromptDialog,
    closeConfirmDialog,
    closePromptDialog,
    submitPromptDialog,
  };
}
