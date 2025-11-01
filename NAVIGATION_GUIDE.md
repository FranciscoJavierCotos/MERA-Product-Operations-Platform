# Go Back Navigation System - User Guide

## Overview

This system provides a comprehensive "Go Back" navigation solution with state management and unsaved changes protection. It consists of several interconnected components and hooks that work together to provide a seamless user experience.

## Components

### 1. GoBackButton

The basic "Go Back" button that appears in the navigation bar.

**Location:** `components/layout/go-back-button.tsx`

**Features:**

- Browser history-aware navigation
- Automatically disabled when no previous page exists
- Visual feedback for disabled state
- Accessible with proper ARIA labels
- Customizable appearance

**Usage:**

```tsx
import { GoBackButton } from '@/components/layout/go-back-button';

// Basic usage
<GoBackButton />

// With custom styling
<GoBackButton
  variant="outline"
  size="lg"
  showText={true}
  className="custom-class"
/>

// With navigation interception
<GoBackButton
  onBeforeNavigate={async () => {
    // Return false to cancel navigation
    const shouldProceed = await checkSomething();
    return shouldProceed;
  }}
/>
```

**Props:**

- `className?: string` - Additional CSS classes
- `variant?: 'default' | 'outline' | 'ghost' | 'link'` - Button style variant
- `size?: 'default' | 'sm' | 'lg' | 'icon'` - Button size
- `showText?: boolean` - Whether to show "Back" text (default: true)
- `onBeforeNavigate?: () => Promise<boolean> | boolean` - Callback before navigation

---

### 2. GoBackWithProtection

Enhanced version with unsaved changes protection. Use this when you have forms or editable content.

**Location:** `components/layout/go-back-with-protection.tsx`

**Features:**

- All features of GoBackButton
- Automatic unsaved changes detection
- Confirmation modal when changes exist
- Save/discard/cancel options

**Usage:**

```tsx
import { GoBackWithProtection } from "@/components/layout/go-back-with-protection";

<GoBackWithProtection
  hasUnsavedChanges={isDirty}
  onSave={async () => {
    await saveForm();
  }}
  onDiscard={() => {
    resetForm();
  }}
/>;
```

**Props:**

- `hasUnsavedChanges?: boolean` - Whether form has unsaved changes
- `onSave?: () => Promise<void> | void` - Save handler function
- `onDiscard?: () => void` - Discard handler function
- All props from GoBackButton

---

### 3. UnsavedChangesModal

Confirmation modal that appears when navigating away from unsaved changes.

**Location:** `components/shared/unsaved-changes-modal.tsx`

**Features:**

- Warning icon and clear messaging
- Three action buttons: Save, Discard, Cancel
- Loading state for async save operations
- Accessible and responsive design

**Note:** Usually used internally by GoBackWithProtection, but can be used standalone.

---

## Hooks

### 1. useNavigation

Core navigation hook that manages history stack, scroll positions, and page state.

**Location:** `lib/hooks/use-navigation.ts`

**Features:**

- Tracks navigation history in session storage
- Saves and restores scroll positions
- Preserves page state (search queries, filters, etc.)
- Persists across page refreshes (within session)
- Clears on logout

**Usage:**

```tsx
import { useNavigation } from "@/lib/hooks/use-navigation";

function MyComponent() {
  const {
    goBack,
    canGoBack,
    savePageState,
    getPageState,
    clearHistory,
    getPreviousPath,
    currentPath,
  } = useNavigation();

  // Save search state
  const handleSearch = (query: string) => {
    savePageState({
      searchQuery: query,
      results: data,
    });
  };

  // Restore state on mount
  useEffect(() => {
    const savedState = getPageState();
    if (savedState?.searchQuery) {
      setSearchQuery(savedState.searchQuery);
    }
  }, []);

  // Navigate back
  const handleBackClick = () => {
    goBack();
  };

  return (
    <div>
      <button disabled={!canGoBack} onClick={handleBackClick}>
        Back to {getPreviousPath()}
      </button>
    </div>
  );
}
```

**API:**

- `goBack()` - Navigate to previous page
- `canGoBack: boolean` - Whether back navigation is available
- `savePageState(state: Record<string, any>)` - Save page-specific state
- `getPageState()` - Retrieve saved page state
- `clearHistory()` - Clear navigation history (call on logout)
- `getPreviousPath()` - Get previous page path
- `currentPath: string` - Current pathname

---

### 2. useUnsavedChanges

Manages form dirty state and confirmation dialogs.

**Location:** `lib/hooks/use-unsaved-changes.ts`

**Features:**

- Tracks unsaved changes
- Shows confirmation before navigation
- Warns on browser back/refresh
- Integrates with save/discard handlers

**Usage:**

```tsx
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

function FormComponent() {
  const [formData, setFormData] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const {
    hasUnsavedChanges,
    showModal,
    markAsDirty,
    markAsClean,
    requestNavigation,
    handleSaveAndNavigate,
    handleDiscardAndNavigate,
    handleCancel,
  } = useUnsavedChanges({
    enabled: isDirty,
    onSave: async () => {
      await saveForm(formData);
    },
    onDiscard: () => {
      setFormData({});
    },
  });

  const handleInputChange = (value: string) => {
    setFormData({ ...formData, value });
    markAsDirty();
  };

  const handleSubmit = async () => {
    await saveForm(formData);
    markAsClean();
  };

  return (
    <>
      <form>
        <input onChange={(e) => handleInputChange(e.target.value)} />
        <button type="submit" onClick={handleSubmit}>
          Save
        </button>
        <button onClick={() => requestNavigation(() => router.back())}>
          Cancel
        </button>
      </form>

      <UnsavedChangesModal
        open={showModal}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancel}
      />
    </>
  );
}
```

**API:**

- `hasUnsavedChanges: boolean` - Current dirty state
- `showModal: boolean` - Whether confirmation modal is open
- `setHasUnsavedChanges(value: boolean)` - Set dirty state
- `markAsDirty()` - Mark form as having changes
- `markAsClean()` - Mark form as saved/clean
- `requestNavigation(fn: () => void)` - Request navigation with confirmation
- `handleSaveAndNavigate()` - Execute save and navigate
- `handleDiscardAndNavigate()` - Discard changes and navigate
- `handleCancel()` - Cancel navigation request

---

### 3. useFormDirtyTracking

Helper hook for automatic form change detection.

**Location:** `lib/hooks/use-unsaved-changes.ts` (exported from same file)

**Usage:**

```tsx
import { useFormDirtyTracking } from "@/lib/hooks/use-unsaved-changes";

function FormComponent() {
  const defaultValues = { name: "", email: "" };
  const [formValues, setFormValues] = useState(defaultValues);

  const { isDirty, trackChanges, reset } = useFormDirtyTracking(defaultValues);

  const handleChange = (values: any) => {
    setFormValues(values);
    trackChanges(values); // Automatically tracks if values changed
  };

  const handleSave = async () => {
    await saveForm(formValues);
    reset(formValues); // Reset with new baseline
  };

  return <div>Form is {isDirty ? "dirty" : "clean"}</div>;
}
```

---

## Integration Examples

### Example 1: Simple Page with GoBackButton

```tsx
// pages/my-page.tsx
import { GoBackButton } from "@/components/layout/go-back-button";

export default function MyPage() {
  return (
    <div>
      <GoBackButton />
      <h1>My Page</h1>
      {/* Page content */}
    </div>
  );
}
```

### Example 2: Search Page with State Preservation

```tsx
// pages/search.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigation } from "@/lib/hooks/use-navigation";
import { SearchBar } from "@/components/shared/search-bar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const { savePageState, getPageState } = useNavigation();

  // Restore state on mount
  useEffect(() => {
    const saved = getPageState();
    if (saved?.query) {
      setQuery(saved.query);
      setResults(saved.results || []);
    }
  }, []);

  const handleSearch = async (searchQuery: string) => {
    const data = await fetchResults(searchQuery);
    setQuery(searchQuery);
    setResults(data);

    // Save for when user returns
    savePageState({
      query: searchQuery,
      results: data,
    });
  };

  return (
    <div>
      <SearchBar defaultValue={query} onSearch={handleSearch} />
      {/* Results display */}
    </div>
  );
}
```

### Example 3: Form with Unsaved Changes Protection

```tsx
// pages/edit-ticket.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GoBackWithProtection } from "@/components/layout/go-back-with-protection";

export default function EditTicketPage() {
  const router = useRouter();
  const [originalData] = useState({ title: "Original" });
  const [formData, setFormData] = useState({ title: "Original" });

  // Detect changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(originalData) !== JSON.stringify(formData);
  }, [originalData, formData]);

  const handleSave = async () => {
    await saveTicket(formData);
    router.push("/tickets");
  };

  const handleDiscard = () => {
    setFormData(originalData);
  };

  return (
    <div>
      <GoBackWithProtection
        hasUnsavedChanges={hasChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <form>
        <input
          value={formData.title}
          onChange={(e) => setFormData({ title: e.target.value })}
        />
      </form>
    </div>
  );
}
```

### Example 4: Logout with History Cleanup

```tsx
// components/navbar.tsx
"use client";

import { useNavigation } from "@/lib/hooks/use-navigation";

export function Navbar() {
  const { clearHistory } = useNavigation();

  const handleLogout = async () => {
    clearHistory(); // Clear navigation history
    await signOut();
    router.push("/login");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## Best Practices

### 1. When to Use GoBackButton vs GoBackWithProtection

- **Use GoBackButton:** Read-only pages, list views, detail pages
- **Use GoBackWithProtection:** Forms, editors, any page with modifiable content

### 2. State Preservation

Always save important state when navigating away:

```tsx
// Save before navigating
savePageState({
  filters,
  sortBy,
  currentPage,
  searchQuery,
});
```

### 3. Form Change Detection

Use `useMemo` to efficiently track changes:

```tsx
const hasChanges = useMemo(() => {
  return JSON.stringify(initial) !== JSON.stringify(current);
}, [initial, current]);
```

### 4. Async Save Operations

Always handle errors in save operations:

```tsx
onSave={async () => {
  try {
    await saveForm();
    markAsClean();
  } catch (error) {
    // Show error, keep modal open
    showError(error);
    throw error; // Prevent navigation
  }
}}
```

### 5. Clear History on Logout

Always clear navigation history when user logs out:

```tsx
const { clearHistory } = useNavigation();

const logout = async () => {
  clearHistory();
  await signOut();
};
```

---

## Accessibility

All components are built with accessibility in mind:

- **ARIA labels:** Descriptive labels for screen readers
- **Keyboard navigation:** Full keyboard support
- **Focus management:** Proper focus handling in modals
- **Disabled states:** Clear visual and programmatic disabled states

---

## Browser Compatibility

The navigation system works in all modern browsers and:

- Uses `sessionStorage` for persistence (cleared on tab close)
- Handles browser back/forward buttons
- Warns on refresh with unsaved changes
- Gracefully degrades if JavaScript is disabled

---

## Troubleshooting

### Back button is always disabled

- Check that you're navigating through the app (not direct URL entry)
- Ensure you're not on the home page
- Verify `useNavigation` hook is initialized

### State not persisting

- Check browser's sessionStorage is enabled
- Verify `savePageState` is called before navigation
- Ensure page component calls `getPageState` on mount

### Unsaved changes modal not showing

- Verify `hasUnsavedChanges` is true
- Check that `onSave` and `onDiscard` handlers are provided
- Ensure modal component is rendered in the DOM

### Scroll position not restoring

- Navigation system automatically handles scroll restoration
- Small delay (50ms) is added to ensure page is rendered
- Check that navigation is going through `goBack()` function

---

## Future Enhancements

Potential improvements for future versions:

- Breadcrumb trail integration
- Custom history size limits
- History navigation visualization
- Undo/redo functionality
- Multi-step form navigation
- Page state diffing for change detection
