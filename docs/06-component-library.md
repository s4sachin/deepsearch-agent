# Component Library Documentation

## DeepSearch AI Chat Application

**Version:** 1.0.0
**Last Updated:** October 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design System](#2-design-system)
3. [Current Components](#3-current-components)
4. [Planned Components](#4-planned-components)
5. [Component Patterns](#5-component-patterns)
6. [Accessibility](#6-accessibility)

---

## 1. Overview

### 1.1 Component Architecture

The application uses React Server Components (RSC) and Client Components:

- **Server Components**: Default, used for static content and data fetching
- **Client Components**: Marked with `"use client"`, used for interactivity

### 1.2 File Organization

```
src/
├── app/                    # Next.js pages (mostly Server Components)
│   ├── layout.tsx         # Root layout (RSC)
│   ├── page.tsx           # Home page (RSC)
│   └── chat.tsx           # Chat interface (Client)
│
└── components/            # Reusable UI components (mostly Client)
    ├── auth-button.tsx
    ├── chat-message.tsx
    ├── error-message.tsx
    └── sign-in-modal.tsx
```

### 1.3 Naming Conventions

- **PascalCase** for component names: `ChatMessage`, `AuthButton`
- **kebab-case** for file names: `chat-message.tsx`, `auth-button.tsx`
- **Props interfaces**: `ComponentNameProps`
- **Event handlers**: `handleEventName` (e.g., `handleClick`, `handleSubmit`)

---

## 2. Design System

### 2.1 Color Palette

**Dark Theme** (Primary):

```typescript
const colors = {
  // Backgrounds
  bg: {
    primary: '#0a0a0a',      // gray-950 - Main background
    secondary: '#1a1a1a',    // gray-900 - Sidebar
    tertiary: '#262626',     // gray-800 - Cards, inputs
    hover: '#2d2d2d',        // gray-750 - Hover states
    active: '#333333',       // gray-700 - Active states
  },

  // Text
  text: {
    primary: '#d4d4d4',      // gray-300 - Main text
    secondary: '#a3a3a3',    // gray-400 - Secondary text
    muted: '#737373',        // gray-500 - Muted text
  },

  // Accents
  accent: {
    primary: '#3b82f6',      // blue-500 - Primary actions
    hover: '#2563eb',        // blue-600 - Hover state
    discord: '#5865F2',      // Discord brand color
  },

  // Semantic
  error: {
    bg: '#450a0a',           // red-950 - Error background
    text: '#fca5a5',         // red-300 - Error text
  },

  // Borders
  border: {
    default: '#404040',      // gray-700 - Default borders
    focus: '#3b82f6',        // blue-400 - Focus rings
  },
};
```

### 2.2 Typography

**Font Family:**
- **Geist**: Primary font (via `next/font`)
- **Geist Mono**: Code and monospace content

**Font Sizes:**

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Small labels, metadata |
| `text-sm` | 14px | Body text, buttons |
| `text-base` | 16px | Default text |
| `text-lg` | 18px | Emphasized text |
| `text-xl` | 20px | Headings |
| `text-2xl` | 24px | Page titles |

**Font Weights:**
- `font-normal` (400): Body text
- `font-semibold` (600): Labels, emphasis
- `font-bold` (700): Headings

### 2.3 Spacing

**Tailwind Scale** (using `rem` units):

| Class | Size | Usage |
|-------|------|-------|
| `p-1` | 0.25rem (4px) | Minimal padding |
| `p-2` | 0.5rem (8px) | Button padding (vertical) |
| `p-3` | 0.75rem (12px) | Small components |
| `p-4` | 1rem (16px) | Standard padding |
| `p-6` | 1.5rem (24px) | Large containers |
| `gap-2` | 0.5rem (8px) | Element spacing |

### 2.4 Border Radius

| Class | Size | Usage |
|-------|------|-------|
| `rounded` | 0.25rem (4px) | Small elements |
| `rounded-md` | 0.375rem (6px) | Inputs, buttons |
| `rounded-lg` | 0.5rem (8px) | Cards, containers |
| `rounded-full` | 9999px | Avatars, pills |

### 2.5 Shadows

**Not heavily used** - Dark theme uses subtle borders instead.

### 2.6 Animations & Transitions

```css
/* Hover transitions */
transition-colors duration-200

/* Focus rings */
focus:outline-none focus:ring-2 focus:ring-blue-400
```

---

## 3. Current Components

### 3.1 ChatMessage

**File:** [src/components/chat-message.tsx](../src/components/chat-message.tsx)

**Purpose:** Displays a single chat message with markdown rendering

**Type:** Client Component

**Props:**
```typescript
interface ChatMessageProps {
  text: string;      // Message content (markdown)
  role: string;      // "user" or "assistant"
  userName: string;  // Display name for user messages
}
```

**Usage:**
```tsx
<ChatMessage
  text="What are TypeScript generics?"
  role="user"
  userName="John Doe"
/>
```

**Features:**
- Markdown rendering via `react-markdown`
- Custom styled markdown components
- Differentiated styling for AI vs user
- Syntax highlighting for code blocks
- Clickable external links

**Styling:**
- **AI messages**: `bg-gray-800` background
- **User messages**: `bg-gray-900` background
- **Text**: `text-gray-300` for readability
- **Name label**: `text-sm font-semibold text-gray-400`

**Markdown Components:**
```typescript
{
  p: Paragraphs with margin bottom
  ul/ol: Lists with bullet points
  li: List items with spacing
  code: Inline code (no background)
  pre: Code blocks (gray-700 bg, rounded)
  a: Links (blue-400, underlined, new tab)
}
```

**Accessibility:**
- Semantic HTML structure
- External links open in new tab with `rel="noopener noreferrer"`

**Future Enhancements:**
- Copy button for code blocks
- Message actions (edit, delete, regenerate)
- Streaming support (show tokens as they arrive)
- Source citations display

---

### 3.2 AuthButton

**File:** [src/components/auth-button.tsx](../src/components/auth-button.tsx)

**Purpose:** Sign in/out button with user avatar

**Type:** Client Component

**Props:**
```typescript
interface AuthButtonProps {
  isAuthenticated: boolean;
  userImage: string | null | undefined;
}
```

**Usage:**
```tsx
<AuthButton
  isAuthenticated={!!session}
  userImage={session?.user?.image}
/>
```

**Features:**
- Discord OAuth sign in
- User avatar display (when authenticated)
- Sign out with redirect
- Keyboard accessible

**States:**

**Authenticated:**
```tsx
<div className="flex items-center gap-2">
  <Image src={userImage} width={32} height={32} />
  <button onClick={signOut}>Sign out</button>
</div>
```

**Unauthenticated:**
```tsx
<button onClick={() => signIn("discord")}>
  <DiscordIcon />
  Sign in
</button>
```

**Styling:**
- **Container**: `bg-gray-800 rounded-lg p-2`
- **Avatar**: `rounded-full` (32x32px)
- **Button**: `hover:bg-gray-600 focus:ring-2`

**Accessibility:**
- Focus ring on button
- Proper button semantics
- Alt text on avatar image

---

### 3.3 ErrorMessage

**File:** [src/components/error-message.tsx](../src/components/error-message.tsx)

**Purpose:** Display error messages consistently

**Type:** Client Component

**Props:**
```typescript
interface ErrorMessageProps {
  message: string;  // Error message text
}
```

**Usage:**
```tsx
<ErrorMessage message="Failed to load chat history" />
```

**Features:**
- Alert icon from `lucide-react`
- Consistent error styling
- Centered layout with max width

**Styling:**
- **Background**: `bg-red-950` (dark red)
- **Text**: `text-red-300` (light red)
- **Icon**: `size-5 shrink-0` (AlertCircle)
- **Padding**: `p-3`
- **Rounded**: `rounded-md`

**Layout:**
```tsx
<div className="mx-auto w-full max-w-[65ch]">
  <div className="flex items-center gap-2 ...">
    <AlertCircle />
    {message}
  </div>
</div>
```

**Accessibility:**
- Semantic div structure
- Icon provides visual indicator
- High contrast text

**Variants (Future):**
- Warning messages (yellow)
- Success messages (green)
- Info messages (blue)

---

### 3.4 SignInModal

**File:** [src/components/sign-in-modal.tsx](../src/components/sign-in-modal.tsx)

**Purpose:** Modal dialog prompting user to sign in

**Type:** Client Component

**Props:**
```typescript
interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Usage:**
```tsx
const [showSignIn, setShowSignIn] = useState(false);

<SignInModal
  isOpen={showSignIn}
  onClose={() => setShowSignIn(false)}
/>
```

**Features:**
- Conditional rendering (only when `isOpen`)
- Full-screen backdrop overlay
- Discord OAuth sign in
- Cancel/close option

**Layout:**
```
┌─────────────────────────────────────┐
│ Backdrop (black/50)                 │
│                                     │
│    ┌─────────────────────────┐     │
│    │  Modal Dialog           │     │
│    │  ─────────────────────  │     │
│    │  Sign in required       │     │
│    │  Please sign in to      │     │
│    │  continue...            │     │
│    │                         │     │
│    │  [Cancel] [Sign in]     │     │
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

**Styling:**
- **Backdrop**: `fixed inset-0 bg-black/50 z-50`
- **Modal**: `bg-gray-900 rounded-lg p-6 max-w-md`
- **Title**: `text-xl font-semibold text-gray-200`
- **Buttons**: Cancel (gray) + Sign in (Discord blue)

**Accessibility:**
- `z-50` ensures modal is on top
- Backdrop closes modal (future)
- Focus trap (future)
- ESC key closes (future)

**Future Enhancements:**
- Click backdrop to close
- ESC key handler
- Focus management
- Animation on open/close

---

### 3.5 ChatPage

**File:** [src/app/chat.tsx](../src/app/chat.tsx)

**Purpose:** Main chat interface container

**Type:** Client Component

**Props:**
```typescript
interface ChatProps {
  userName: string;
}
```

**Usage:**
```tsx
<ChatPage userName={session?.user?.name ?? "Guest"} />
```

**Features:**
- Message list display
- Input form (not yet functional)
- Scroll container
- SignInModal integration (not active)

**Layout:**
```
┌─────────────────────────────────┐
│ Chat Messages (scrollable)      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ User: Hello                 │ │
│ │ AI: Hi! How can I help?     │ │
│ └─────────────────────────────┘ │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Input Area                      │
│ ┌─────────────────┬──────────┐ │
│ │ [Text input...] │ [Send]   │ │
│ └─────────────────┴──────────┘ │
└─────────────────────────────────┘
```

**Styling:**
- **Container**: `flex flex-col flex-1`
- **Messages area**: `overflow-y-auto scrollbar-thin`
- **Max width**: `max-w-[65ch]` (65 characters wide)
- **Input border**: `border-t border-gray-700`

**Current State:**
- Hardcoded sample messages
- Input/submit handlers empty (commented)
- Modal not functional

**Future Implementation:**
- Connect to API for messages
- Real-time streaming
- Message sending
- Loading states
- Error handling

---

### 3.6 HomePage (Layout)

**File:** [src/app/page.tsx](../src/app/page.tsx)

**Purpose:** Application shell with sidebar and main content

**Type:** Server Component

**Features:**
- Two-column layout (sidebar + main)
- User authentication check
- Chat list (hardcoded)
- New chat button

**Layout:**
```
┌──────────────┬────────────────────────┐
│ Sidebar      │ Main Content           │
│              │                        │
│ Your Chats   │ ┌────────────────────┐ │
│ ──────────   │ │                    │ │
│ ┌──────────┐ │ │  Chat Messages     │ │
│ │Chat 1    │ │ │                    │ │
│ └──────────┘ │ │                    │ │
│              │ └────────────────────┘ │
│              │ ┌────────────────────┐ │
│ [Auth Btn]   │ │ Input              │ │
│              │ └────────────────────┘ │
└──────────────┴────────────────────────┘
```

**Sidebar (256px):**
- Chat list with active indicator
- New chat button (authenticated only)
- AuthButton at bottom

**Main Content:**
- ChatPage component
- Full height

**Styling:**
- **Container**: `flex h-screen bg-gray-950`
- **Sidebar**: `w-64 bg-gray-900 border-r border-gray-700`
- **Chat list**: `overflow-y-auto scrollbar-thin`

**Future:**
- Fetch real chats from database
- Active chat from URL params
- Delete/rename chat actions

---

## 4. Planned Components

### 4.1 MessageInput

**Purpose:** Text input for sending messages

```typescript
interface MessageInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

<MessageInput
  onSend={handleSend}
  isLoading={isStreaming}
  onStop={handleStop}
  placeholder="Ask me anything..."
/>
```

**Features:**
- Textarea with auto-resize
- Send button (or loading spinner)
- Stop button (during streaming)
- Character count (optional)
- Keyboard shortcuts (Enter to send)

---

### 4.2 SourceCard

**Purpose:** Display source citation from AI response

```typescript
interface SourceCardProps {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

<SourceCard
  title="TypeScript Documentation"
  url="https://www.typescriptlang.org/docs/handbook/generics.html"
  snippet="Generics provide a way to make components work..."
  favicon="https://..."
/>
```

**Features:**
- Clickable card linking to source
- Favicon display
- Snippet preview
- External link icon

---

### 4.3 LoadingSpinner

**Purpose:** Consistent loading indicator

```typescript
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

<LoadingSpinner size="md" message="Searching the web..." />
```

**Features:**
- Animated spinner
- Optional loading message
- Size variants

---

### 4.4 ChatListItem

**Purpose:** Individual chat in sidebar

```typescript
interface ChatListItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

<ChatListItem
  id="chat_123"
  title="TypeScript Questions"
  isActive={true}
  onClick={() => navigate(`/chat/${id}`)}
/>
```

**Features:**
- Active state highlighting
- Context menu (delete, rename)
- Truncated title with tooltip

---

### 4.5 SearchIndicator

**Purpose:** Show when AI is searching web

```typescript
interface SearchIndicatorProps {
  query: string;
  resultCount?: number;
  isSearching: boolean;
}

<SearchIndicator
  query="typescript generics"
  resultCount={10}
  isSearching={true}
/>
```

**Features:**
- Search query display
- Result count
- Animated indicator

---

### 4.6 ThinkingIndicator

**Purpose:** Show AI is processing

```typescript
<ThinkingIndicator />
```

**Features:**
- Animated typing dots
- "AI is thinking..." message

---

### 4.7 EmptyState

**Purpose:** Show when no content exists

```typescript
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

<EmptyState
  icon={<MessageSquare />}
  title="No chats yet"
  description="Start a new conversation to get started"
  action={{
    label: "New Chat",
    onClick: createChat
  }}
/>
```

---

### 4.8 Toast/Notification

**Purpose:** Temporary notification messages

```typescript
interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

// Via context
const { showToast } = useToast();
showToast({
  message: "Chat deleted successfully",
  type: "success",
  duration: 3000
});
```

---

## 5. Component Patterns

### 5.1 Server vs Client Components

**Use Server Components for:**
- Data fetching
- Static content
- SEO-critical content
- Layouts

**Use Client Components for:**
- Interactivity (onClick, onChange)
- State management (useState, useReducer)
- Effects (useEffect)
- Browser APIs (localStorage, navigator)

**Example:**
```tsx
// Server Component (default)
export default async function Page() {
  const data = await fetchData(); // OK
  return <ClientComponent data={data} />;
}

// Client Component
"use client";
export function ClientComponent({ data }) {
  const [state, setState] = useState(); // OK
  return <button onClick={() => ...}>Click</button>;
}
```

### 5.2 Props Composition

**Good:**
```typescript
interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}
```

**Better (with HTML props):**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

// Usage
<Button onClick={...} disabled={...} aria-label="...">
```

### 5.3 Compound Components

**Example: Modal with parts**
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>Close</Button>
  </Modal.Footer>
</Modal>
```

### 5.4 Render Props

**Example: Loading wrapper**
```tsx
<Async fetch={fetchData}>
  {({ data, loading, error }) => (
    <>
      {loading && <Spinner />}
      {error && <Error message={error.message} />}
      {data && <Content data={data} />}
    </>
  )}
</Async>
```

### 5.5 Custom Hooks

**Example: Chat state management**
```typescript
function useChatMessages(chatId: string) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages(chatId).then(setMessages);
  }, [chatId]);

  const sendMessage = async (content: string) => {
    // ...
  };

  return { messages, loading, sendMessage };
}

// Usage
const { messages, loading, sendMessage } = useChatMessages(chatId);
```

---

## 6. Accessibility

### 6.1 Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
// Good
<button onClick={...}>Click</button>

// Bad (div is not keyboard accessible)
<div onClick={...}>Click</div>

// Fix with keyboard handler
<div
  role="button"
  tabIndex={0}
  onClick={...}
  onKeyDown={(e) => e.key === "Enter" && ...}
>
```

### 6.2 Focus Management

**Focus indicators:**
```css
focus:outline-none focus:ring-2 focus:ring-blue-400
```

**Focus trap in modals:**
```tsx
import FocusTrap from 'focus-trap-react';

<FocusTrap active={isOpen}>
  <Modal>...</Modal>
</FocusTrap>
```

### 6.3 ARIA Attributes

**Roles:**
```tsx
<div role="alert">Error message</div>
<div role="log" aria-live="polite">Chat messages</div>
<button aria-label="Close modal">×</button>
```

**States:**
```tsx
<button aria-pressed={isActive}>Toggle</button>
<input aria-invalid={hasError} aria-describedby="error-msg" />
```

### 6.4 Screen Reader Support

**Semantic HTML:**
```tsx
// Good
<nav>...</nav>
<main>...</main>
<button>...</button>

// Bad
<div className="nav">...</div>
<div className="main">...</div>
<div className="button">...</div>
```

**Live regions:**
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### 6.5 Color Contrast

All text meets WCAG AA standards:
- **Normal text**: 4.5:1 contrast ratio
- **Large text**: 3:1 contrast ratio

**Check with:**
- Chrome DevTools Lighthouse
- axe DevTools
- WebAIM Contrast Checker

---

## Appendix

### A. Component Checklist

When creating a new component:

- [ ] TypeScript props interface
- [ ] PropTypes or Zod validation (if needed)
- [ ] Accessibility (keyboard, ARIA, focus)
- [ ] Responsive design
- [ ] Dark theme support
- [ ] Error states
- [ ] Loading states
- [ ] Empty states
- [ ] Documentation in this file
- [ ] Example usage in Storybook (future)

### B. Tailwind Class Organization

**Recommended order:**
1. Layout (flex, grid, display)
2. Positioning (relative, absolute)
3. Sizing (w-, h-, max-w)
4. Spacing (p-, m-, gap)
5. Typography (text-, font-)
6. Colors (bg-, text-, border-)
7. Effects (shadow, opacity)
8. Transitions (transition, duration)
9. Interactivity (hover:, focus:)

**Example:**
```tsx
<div className="
  flex flex-col
  relative
  w-full max-w-lg
  p-4 gap-2
  text-sm font-semibold
  bg-gray-800 text-gray-200
  rounded-lg
  transition-colors
  hover:bg-gray-700 focus:ring-2
">
```

### C. Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/
- **React Markdown**: https://github.com/remarkjs/react-markdown
- **Next.js Image**: https://nextjs.org/docs/app/api-reference/components/image
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Document Control:**
- **Author:** Frontend Team
- **Last Updated:** October 2025
- **Review Cycle:** On component additions/changes
