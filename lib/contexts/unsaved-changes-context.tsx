"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
  registerHandlers: (handlers: {
    onSave?: () => Promise<void> | void;
    onDiscard?: () => void;
  }) => void;
  unregisterHandlers: () => void;
}

const UnsavedChangesContext = createContext<
  UnsavedChangesContextType | undefined
>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [onSave, setOnSave] = useState<
    (() => Promise<void> | void) | undefined
  >();
  const [onDiscard, setOnDiscard] = useState<(() => void) | undefined>();

  const registerHandlers = useCallback(
    (handlers: {
      onSave?: () => Promise<void> | void;
      onDiscard?: () => void;
    }) => {
      if (handlers.onSave) {
        setOnSave(() => handlers.onSave);
      }
      if (handlers.onDiscard) {
        setOnDiscard(() => handlers.onDiscard);
      }
    },
    []
  );

  const unregisterHandlers = useCallback(() => {
    setOnSave(undefined);
    setOnDiscard(undefined);
    setHasUnsavedChanges(false);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        onSave,
        onDiscard,
        registerHandlers,
        unregisterHandlers,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChangesContext must be used within UnsavedChangesProvider"
    );
  }
  return context;
}

// Optional hook - returns undefined if not in provider
export function useUnsavedChangesContextOptional() {
  return useContext(UnsavedChangesContext);
}
