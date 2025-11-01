# Navigation System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE LAYER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                           NAVBAR                                 │  │
│  │  ┌────────────────┐     ┌─────────────────────────────────┐     │  │
│  │  │  GoBackButton  │ │││ │  Support Ticket System Title    │     │  │
│  │  └────────────────┘     └─────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        PAGE CONTENT                              │  │
│  │                                                                  │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │  Read-Only Pages (Tickets List, Dashboard, etc.)         │  │  │
│  │  │  • GoBackButton in navbar handles navigation              │  │  │
│  │  │  • State preserved automatically                          │  │  │
│  │  │  • Scroll position restored                               │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │  Forms & Editable Pages (New Ticket, Edit Ticket)        │  │  │
│  │  │  • GoBackWithProtection for unsaved changes              │  │  │
│  │  │  • Modal confirmation before leaving                     │  │  │
│  │  │  • Save/Discard/Cancel options                           │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌───────────────────────────────────────────────────────────┐  │  │
│  │  │  Search Pages                                             │  │  │
│  │  │  • Query preserved in navigation state                   │  │  │
│  │  │  • Results cached                                         │  │  │
│  │  │  • Scroll position maintained                            │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │         UnsavedChangesModal (when needed)                        │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  ⚠️  Unsaved Changes                                     │   │  │
│  │  │  You have unsaved changes. Save before leaving?          │   │  │
│  │  │                                                           │   │  │
│  │  │  [Cancel]  [Discard Changes]  [Save and Go Back]         │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────┐         ┌──────────────────────────────┐    │
│  │   GoBackButton       │         │  GoBackWithProtection        │    │
│  │  ┌────────────────┐  │         │  ┌────────────────────────┐  │    │
│  │  │ • Click event  │  │         │  │ • GoBackButton         │  │    │
│  │  │ • Disabled?    │──┼────────>│  │ • Change detection     │  │    │
│  │  │ • Styling      │  │         │  │ • Modal trigger        │  │    │
│  │  └────────────────┘  │         │  └────────────────────────┘  │    │
│  └──────────────────────┘         └──────────────────────────────┘    │
│           │                                    │                       │
│           │                                    │                       │
│           v                                    v                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              UnsavedChangesModal                                 │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │ • Alert icon & message                                     │  │ │
│  │  │ • Action buttons                                           │  │ │
│  │  │ • Loading states                                           │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          HOOK LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────┐    ┌─────────────────────────────┐ │
│  │     useNavigation()           │    │  useUnsavedChanges()        │ │
│  │  ┌─────────────────────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │ Navigation State:       │  │    │  │ Form State:           │  │ │
│  │  │ • History stack         │  │    │  │ • isDirty             │  │ │
│  │  │ • Current index         │  │    │  │ • showModal           │  │ │
│  │  │ • Scroll positions      │  │    │  │ • pendingNavigation   │  │ │
│  │  │ • Page states           │  │    │  └───────────────────────┘  │ │
│  │  └─────────────────────────┘  │    │                             │ │
│  │                               │    │  Methods:                   │ │
│  │  Methods:                     │    │  • markAsDirty()            │ │
│  │  • goBack()                   │    │  • markAsClean()            │ │
│  │  • savePageState()            │    │  • requestNavigation()      │ │
│  │  • getPageState()             │    │  • handleSaveAndNavigate()  │ │
│  │  • clearHistory()             │    │  • handleDiscard()          │ │
│  │  • canGoBack                  │    │  • handleCancel()           │ │
│  └───────────────────────────────┘    └─────────────────────────────┘ │
│           │                                      │                     │
│           └──────────────┬───────────────────────┘                     │
│                          │                                             │
│                          v                                             │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │            useFormDirtyTracking() (Optional)                     │ │
│  │  • Automatic change detection                                   │ │
│  │  • Compare with initial values                                  │ │
│  │  • Reset functionality                                          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   sessionStorage                                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  Key: 'app_navigation_history'                             │  │  │
│  │  │  Value: {                                                  │  │  │
│  │  │    stack: [                                                │  │  │
│  │  │      {                                                     │  │  │
│  │  │        path: '/search',                                    │  │  │
│  │  │        scrollPosition: 450,                                │  │  │
│  │  │        timestamp: 1234567890,                              │  │  │
│  │  │        state: {                                            │  │  │
│  │  │          searchQuery: 'bug',                               │  │  │
│  │  │          results: [...],                                   │  │  │
│  │  │          filters: {...}                                    │  │  │
│  │  │        }                                                   │  │  │
│  │  │      },                                                    │  │  │
│  │  │      { ... more pages ... }                                │  │  │
│  │  │    ],                                                      │  │  │
│  │  │    currentIndex: 2                                         │  │  │
│  │  │  }                                                         │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  • Persists across page refreshes (same session)                │  │
│  │  • Clears when tab closes                                       │  │
│  │  • Cleared manually on logout                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA FLOW EXAMPLES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Example 1: Simple Navigation                                          │
│  ─────────────────────────────────                                     │
│  1. User on /tickets                                                   │
│  2. Clicks ticket #123 → Navigate to /tickets/123                      │
│  3. useNavigation saves:                                               │
│     - Previous path: /tickets                                          │
│     - Scroll position: 200px                                           │
│     - Timestamp                                                        │
│  4. User clicks GoBackButton                                           │
│  5. Router.back() → /tickets                                           │
│  6. useNavigation restores scroll to 200px                             │
│                                                                         │
│  Example 2: Search with State                                          │
│  ───────────────────────────────                                       │
│  1. User searches "login bug"                                          │
│  2. savePageState({ query: "login bug", results: [...] })             │
│  3. User clicks result → /tickets/456                                  │
│  4. User clicks back                                                   │
│  5. getPageState() retrieves saved state                               │
│  6. UI restored with query & results                                   │
│                                                                         │
│  Example 3: Unsaved Changes                                            │
│  ────────────────────────────────                                      │
│  1. User editing new ticket form                                       │
│  2. hasUnsavedChanges = true (title/description changed)               │
│  3. User clicks GoBackWithProtection                                   │
│  4. requestNavigation() triggered                                      │
│  5. Modal appears (UnsavedChangesModal)                                │
│  6a. Save → onSave() → createTicket() → navigate                       │
│  6b. Discard → reset form → navigate                                   │
│  6c. Cancel → close modal → stay on page                               │
│                                                                         │
│  Example 4: Browser Events                                             │
│  ────────────────────────────                                          │
│  1. User edits form (isDirty = true)                                   │
│  2. User hits browser back button                                      │
│  3. useUnsavedChanges intercepts via beforeunload                      │
│  4. Browser shows native "Leave page?" dialog                          │
│  5. User can confirm or cancel                                         │
│                                                                         │
│  Example 5: Logout                                                     │
│  ─────────────────────                                                 │
│  1. User clicks Logout in navbar                                       │
│  2. handleLogout() in Navbar                                           │
│  3. clearHistory() called                                              │
│  4. sessionStorage cleared                                             │
│  5. Auth sign out                                                      │
│  6. Redirect to /login                                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION POINTS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Current Integrations:                                                 │
│  ✅ Navbar (all pages)                                                 │
│  ✅ Search page (state preservation)                                   │
│  ✅ New ticket form (unsaved changes)                                  │
│  ✅ SearchBar component (defaultValue)                                 │
│                                                                         │
│  Ready for Integration:                                                │
│  🔲 Edit ticket form                                                   │
│  🔲 Task forms                                                         │
│  🔲 Profile edit page                                                  │
│  🔲 Settings pages                                                     │
│  🔲 Any other forms                                                    │
│                                                                         │
│  Just add:                                                             │
│  • GoBackButton (read-only pages) - Already in navbar!                │
│  • GoBackWithProtection (forms)                                        │
│  • savePageState/getPageState (stateful pages)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Integration Guide

### For Read-Only Pages

```tsx
// ✅ Already working! GoBackButton is in the navbar
// No code changes needed
```

### For Forms

```tsx
import { GoBackWithProtection } from "@/components/layout";

<GoBackWithProtection
  hasUnsavedChanges={isDirty}
  onSave={async () => await saveForm()}
  onDiscard={() => resetForm()}
/>;
```

### For Search/Filter Pages

```tsx
import { useNavigation } from "@/lib/hooks";

const { savePageState, getPageState } = useNavigation();

// Save state
savePageState({ query, filters, results });

// Restore state
useEffect(() => {
  const saved = getPageState();
  if (saved) restore(saved);
}, []);
```

## Component Dependencies

```
GoBackButton
└── useNavigation

GoBackWithProtection
├── GoBackButton
│   └── useNavigation
├── useUnsavedChanges
└── UnsavedChangesModal

Navbar
├── GoBackButton
└── useNavigation (for clearHistory)

SearchPage
├── useNavigation (for state)
└── SearchBar (with defaultValue)

NewTicketPage
├── GoBackWithProtection
├── useUnsavedChanges
└── UnsavedChangesModal
```

## File Structure

```
Support Ticket Management System/
├── components/
│   ├── layout/
│   │   ├── go-back-button.tsx          ⭐ New
│   │   ├── go-back-with-protection.tsx ⭐ New
│   │   ├── index.ts                    ⭐ New
│   │   └── navbar.tsx                  📝 Modified
│   └── shared/
│       ├── search-bar.tsx              📝 Modified
│       └── unsaved-changes-modal.tsx   ⭐ New
├── lib/
│   └── hooks/
│       ├── use-navigation.ts           ⭐ New
│       ├── use-unsaved-changes.ts      ⭐ New
│       └── index.ts                    ⭐ New
├── app/(dashboard)/
│   ├── search/
│   │   └── page.tsx                    📝 Modified
│   └── tickets/new/
│       └── page.tsx                    📝 Modified
├── NAVIGATION_GUIDE.md                 ⭐ New (Full docs)
├── NAVIGATION_QUICK_REF.md             ⭐ New (Quick ref)
├── NAVIGATION_IMPLEMENTATION.md        ⭐ New (Summary)
└── NAVIGATION_ARCHITECTURE.md          ⭐ New (This file)

Legend:
⭐ New file created
📝 Existing file modified
```

---

**System Status: ✅ Production Ready**
