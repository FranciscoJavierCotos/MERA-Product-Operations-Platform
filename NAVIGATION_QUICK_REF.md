# Go Back Navigation - Quick Reference

## Quick Start

### 1. Basic Back Button (Read-only Pages)

```tsx
import { GoBackButton } from "@/components/layout/go-back-button";

<GoBackButton />;
```

### 2. Back Button with Form Protection

```tsx
import { GoBackWithProtection } from "@/components/layout/go-back-with-protection";

<GoBackWithProtection
  hasUnsavedChanges={isDirty}
  onSave={async () => await saveForm()}
  onDiscard={() => resetForm()}
/>;
```

### 3. Save/Restore Page State

```tsx
import { useNavigation } from "@/lib/hooks/use-navigation";

const { savePageState, getPageState } = useNavigation();

// Save
savePageState({ query, filters, results });

// Restore
const saved = getPageState();
```

### 4. Track Form Changes

```tsx
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

const { markAsDirty, markAsClean, requestNavigation } = useUnsavedChanges({
  enabled: true,
  onSave: async () => await save(),
  onDiscard: () => reset(),
});
```

---

## Component Cheat Sheet

| Component              | Use Case                   | Key Props                                  |
| ---------------------- | -------------------------- | ------------------------------------------ |
| `GoBackButton`         | Simple navigation          | `variant`, `size`, `showText`              |
| `GoBackWithProtection` | Forms with unsaved changes | `hasUnsavedChanges`, `onSave`, `onDiscard` |
| `UnsavedChangesModal`  | Manual modal control       | `open`, `onSave`, `onDiscard`, `onCancel`  |

---

## Hook Cheat Sheet

### useNavigation

| Method                | Purpose                            |
| --------------------- | ---------------------------------- |
| `goBack()`            | Navigate to previous page          |
| `canGoBack`           | Check if back navigation available |
| `savePageState(data)` | Save page state                    |
| `getPageState()`      | Retrieve saved state               |
| `clearHistory()`      | Clear history (on logout)          |
| `getPreviousPath()`   | Get previous page path             |

### useUnsavedChanges

| Method                  | Purpose                    |
| ----------------------- | -------------------------- |
| `markAsDirty()`         | Mark form as changed       |
| `markAsClean()`         | Mark form as saved         |
| `requestNavigation(fn)` | Navigate with confirmation |
| `hasUnsavedChanges`     | Check dirty state          |
| `showModal`             | Is modal open              |

---

## Common Patterns

### Pattern 1: Search with State

```tsx
const { savePageState, getPageState } = useNavigation();

useEffect(() => {
  const saved = getPageState();
  if (saved?.query) setQuery(saved.query);
}, []);

const search = (q: string) => {
  const results = await searchAPI(q);
  savePageState({ query: q, results });
};
```

### Pattern 2: Form Protection

```tsx
const [data, setData] = useState(initial);
const hasChanges = JSON.stringify(data) !== JSON.stringify(initial);

<GoBackWithProtection
  hasUnsavedChanges={hasChanges}
  onSave={async () => await save(data)}
  onDiscard={() => setData(initial)}
/>;
```

### Pattern 3: Manual Navigation Control

```tsx
const { requestNavigation } = useUnsavedChanges({
  enabled: isDirty,
  onSave: saveHandler,
  onDiscard: discardHandler,
});

<Button onClick={() => requestNavigation(() => router.push("/home"))}>
  Go Home
</Button>;
```

---

## Integration Checklist

- [ ] Import necessary components/hooks
- [ ] Add GoBackButton or GoBackWithProtection to page
- [ ] Set up state tracking (if needed)
- [ ] Implement save/discard handlers (for forms)
- [ ] Save page state before navigation (for search/filters)
- [ ] Restore state on component mount
- [ ] Clear history on logout
- [ ] Test back navigation
- [ ] Test unsaved changes modal
- [ ] Test scroll position restoration

---

## File Locations

```
lib/hooks/
  ├── use-navigation.ts           # Navigation state management
  └── use-unsaved-changes.ts      # Form protection logic

components/layout/
  ├── go-back-button.tsx          # Basic back button
  ├── go-back-with-protection.tsx # Protected back button
  └── navbar.tsx                  # Integrated in navbar

components/shared/
  ├── unsaved-changes-modal.tsx   # Confirmation dialog
  └── search-bar.tsx              # Updated with defaultValue prop
```

---

## Testing Checklist

### Navigation

- [ ] Back button appears on all pages
- [ ] Back button disabled on first page
- [ ] Back button navigates correctly
- [ ] Scroll position restored
- [ ] Browser back/forward work

### State Preservation

- [ ] Search query preserved
- [ ] Filters preserved
- [ ] Results preserved
- [ ] Scroll position preserved
- [ ] State cleared on logout

### Unsaved Changes

- [ ] Modal appears when navigating with changes
- [ ] "Save and Go Back" works
- [ ] "Discard Changes" works
- [ ] "Cancel" closes modal
- [ ] Browser refresh warns
- [ ] Browser back button warns

---

## Troubleshooting

| Issue                       | Solution                                      |
| --------------------------- | --------------------------------------------- |
| Back button always disabled | Not navigating through app, using direct URLs |
| State not persisting        | Call `savePageState()` before navigation      |
| Modal not showing           | Check `hasUnsavedChanges` is true             |
| Scroll not restoring        | Using custom navigation instead of `goBack()` |
| History not clearing        | Call `clearHistory()` on logout               |

---

## Performance Tips

1. **Use `useMemo` for change detection:**

   ```tsx
   const hasChanges = useMemo(
     () => JSON.stringify(a) !== JSON.stringify(b),
     [a, b]
   );
   ```

2. **Debounce state saves:**

   ```tsx
   const debouncedSave = useMemo(() => debounce(savePageState, 500), []);
   ```

3. **Only save necessary state:**

   ```tsx
   // Good
   savePageState({ query, page });

   // Avoid
   savePageState({ ...everythingInState });
   ```

---

## Need More Help?

See full documentation: `NAVIGATION_GUIDE.md`
