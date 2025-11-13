# Angular Chat App - Detailed Architecture & Flow Guide

A modern Angular 20+ chat application using standalone components, reactive signals, and RxJS observables. This document provides a comprehensive overview of the app architecture, data flow, and key components.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Service Architecture](#service-architecture)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Authentication Flow](#authentication-flow)
6. [Message Broadcasting (Multi-Session Sync)](#message-broadcasting-multi-session-sync)
7. [Setup & Development](#setup--development)
8. [Testing](#testing)

---

## Architecture Overview

The app is built using **modern Angular patterns** (Angular 17+):

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Chat App                      │
│                  (Standalone Components)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            App Component (Router)                  │  │
│  │  - Routes: /login, /chat                          │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│        ┌─────────────────┴─────────────────┐             │
│        ▼                                   ▼             │
│  ┌──────────────────┐          ┌──────────────────────┐  │
│  │  LoginComponent  │          │ ChatWindowComponent  │  │
│  │  (Routes: /app)  │          │  (Routes: /chat)     │  │
│  └──────────────────┘          └──────────────────────┘  │
│                                          │                │
│              Uses:                       │ Imports:       │
│         AuthService                      ├─ ChatRoomListComponent
│                                          ├─ MessageComponent
│                                          └─ FormsModule  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                    Services (RxJS/Reactive)              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  AuthService          ChatService        MessageService  │
│  ─────────────        ──────────────      ───────────────│
│  • login()            • getRooms()        • sendMessage()│
│  • logout()           • setCurrentRoom()  • messagesForRoom$()
│  • getCurrentUser()   • currentRoom$      • broadcastMessageToOtherSessions()
│                                           • handleRemoteMessages()
│                                                           │
├─────────────────────────────────────────────────────────┤
│                    Data Storage                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  • localStorage: User session (currentUser)             │
│  • localStorage: Messages (chat_app_messages)           │
│  • In-Memory: MessageService.messages[]                 │
│  • Signals: ChatWindowComponent state                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Component Structure

### 1. **LoginComponent** (`src/app/components/login/`)
Handles user authentication.

**Key Properties (Signals):**
- `username: WritableSignal<string>` — form input
- `errorMessage: WritableSignal<string>` — validation error display

**Methods:**
- `login()` — calls `AuthService.login(username)`, navigates to `/chat`
- `handleLogin(username: string)` — form submission handler

**Template:**
```html
<input [(ngModel)]="username()" placeholder="Enter username" />
<button (click)="handleLogin(username())">Login</button>
```

---

### 2. **ChatWindowComponent** (`src/app/components/chat-window/`)
Main chat interface displaying messages and handling input.

**Key Properties (Signals):**
- `currentRoom: WritableSignal<ChatRoom | null>` — currently selected room
- `messages: WritableSignal<Message[]>` — list of messages in the current room
- `currentUser: WritableSignal<User | null>` — logged-in user
- `newMessage: WritableSignal<string>` — input field value

**Lifecycle Methods:**
- `ngOnInit()` — subscribes to room changes and derives messages observable

**Key Methods:**
- `sendMessage()` — reads current signals, validates, calls `MessageService.sendMessage()`
- `logout()` — calls `AuthService.logout()`, navigates to `/login`
- `scrollToBottom()` — scrolls message container to latest message (called via effect)
- `trackById(index, message)` — trackBy function for `@for` loop optimization

**Service Dependencies:**
- `AuthService` — get current user
- `ChatService` — get current room and room changes
- `MessageService` — fetch and send messages
- `Router` — navigation

**ngOnInit Flow:**
```typescript
ngOnInit(): void {
  const user = this.authService.getCurrentUser();
  this.currentUser.set(user);
  
  if (!user) {
    this.router.navigate(['/login']);
    return;
  }

  // Subscribe to room changes
  this.chatService.currentRoom$.pipe(
    filter((r): r is ChatRoom => !!r),
    switchMap(room => {
      this.currentRoom.set(room);  // Update currentRoom signal
      return this.messageService.messagesForRoom$(room.id);
    })
  ).subscribe(msgs => {
    this.messages.set(msgs);  // Update messages signal
    setTimeout(() => this.scrollToBottom(), 0);
  });
}
```

**Template (Modern Signals + @if/@for):**
```html
<!-- Header with room name -->
@if (currentRoom(); as room) {
  <span># {{ room.name }}</span>
}

<!-- Message list -->
@if (messages().length === 0) {
  <div>No messages yet. Start the conversation!</div>
}
@for (message of messages(); track trackById($index, message)) {
  <app-message [message]="message"></app-message>
}

<!-- Input form -->
<input [ngModel]="newMessage()" (ngModelChange)="newMessage.set($event)" />
<button [disabled]="!newMessage().trim()" (click)="sendMessage()">Send</button>
```

---

### 3. **ChatRoomListComponent** (`src/app/components/chat-room-list/`)
Displays available chat rooms and allows room selection.

**Key Properties:**
- `rooms: ChatRoom[]` — fetched from `ChatService.getRooms()`
- `currentRoom: ChatRoom | null` — currently selected room (subscription)

**Methods:**
- `ngOnInit()` — fetches rooms, subscribes to room changes, sets default room
- `selectRoom(room: ChatRoom)` — calls `ChatService.setCurrentRoom(room)`

**ngOnInit Flow:**
```typescript
ngOnInit(): void {
  this.rooms = this.chatService.getRooms();
  this.chatService.currentRoom$.subscribe(room => {
    this.currentRoom = room;
  });
  
  // Set default room if none selected
  if (this.rooms.length > 0 && !this.currentRoom) {
    this.selectRoom(this.rooms[0]);
  }
}
```

**Template:**
```html
@for (room of rooms; track room.id) {
  <button 
    (click)="selectRoom(room)"
    [class.active]="currentRoom?.id === room.id"
  >
    {{ room.name }}
  </button>
}
```

---

### 4. **MessageComponent** (`src/app/components/message/`)
Renders a single message with styling based on sender.

**Input:**
- `@Input() message: Message` — the message to render

**Key Methods:**
- `get isOwnMessage(): boolean` — compares message userId with current user ID
- `get formattedTime(): string` — formats message timestamp to HH:MM

**Template:**
```html
<div [class.justify-end]="isOwnMessage()" class="flex">
  <div [class.bg-blue-600]="isOwnMessage()" [class.bg-gray-200]="!isOwnMessage()">
    <span class="font-semibold">{{ message.username }}</span>
    <span class="text-xs">{{ formattedTime() }}</span>
    <p>{{ message.text }}</p>
  </div>
</div>
```

---

## Service Architecture

### **AuthService** (`src/app/services/auth.ts`)

Manages user authentication and session state.

**Private State:**
- `private currentUserSubject: BehaviorSubject<User | null>` — user state
- `public currentUser$: Observable<User | null>` — exposed observable

**Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `login()` | `login(username: string): void` | Creates user object with unique ID (using `crypto.randomUUID()` or fallback `Math.random().toString(36).slice(2, 11)`), stores in localStorage, emits to currentUserSubject |
| `logout()` | `logout(): void` | Clears localStorage, emits null to currentUserSubject |
| `getCurrentUser()` | `getCurrentUser(): User \| null` | Returns synchronous snapshot of current user |

**localStorage Key:** `'currentUser'` — stores stringified User object

```typescript
login(username: string): void {
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2, 11);

  const user: User = { id, username };
  localStorage.setItem('currentUser', JSON.stringify(user));
  this.currentUserSubject.next(user);
}
```

---

### **ChatService** (`src/app/services/chat.ts`)

Manages chat rooms and room selection state.

**Private State:**
- `private rooms: ChatRoom[]` — hardcoded list of 3 rooms (General, Random, Tech)
- `private currentRoomSubject: BehaviorSubject<ChatRoom | null>` — selected room state
- `public currentRoom$: Observable<ChatRoom | null>` — exposed observable

**Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getRooms()` | `getRooms(): ChatRoom[]` | Returns list of available rooms |
| `setCurrentRoom()` | `setCurrentRoom(room: ChatRoom): void` | Updates currentRoomSubject with new room |
| `getCurrentRoom()` | `getCurrentRoom(): ChatRoom \| null` | Returns synchronous snapshot of current room |

```typescript
private rooms: ChatRoom[] = [
  { id: '1', name: 'General', description: 'General discussion' },
  { id: '2', name: 'Random', description: 'Random topics' },
  { id: '3', name: 'Tech', description: 'Technology discussion' }
];
```

---

### **MessageService** (`src/app/services/message.ts`)

Manages message storage and real-time multi-session synchronization.

**Private State:**
- `private messages: Message[]` — in-memory message storage
- `private roomSubjects: Map<string, BehaviorSubject<Message[]>>` — room-scoped message streams
- `private readonly MESSAGES_STORAGE_KEY = 'chat_app_messages'` — localStorage broadcast key

**Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `messagesForRoom$()` | `messagesForRoom$(roomId: string): Observable<Message[]>` | Returns observable for a room's messages. Creates BehaviorSubject lazily if not exists. Seeds with existing messages for that room. |
| `sendMessage()` | `sendMessage(text: string, userId: string, username: string, roomId: string): void` | Creates Message object with unique UUID, adds to local array, emits to room subject, broadcasts via localStorage |
| `broadcastMessageToOtherSessions()` | `private broadcastMessageToOtherSessions(message: Message): void` | Serializes all messages and writes to localStorage (triggers storage event in other sessions) |
| `handleRemoteMessages()` | `private handleRemoteMessages(remoteMessages: Message[]): void` | Deduplicates new messages, merges into local array, updates room subjects |

**Constructor:**
Attaches global storage event listener (outside Angular zone for perf):
```typescript
constructor(private ngZone: NgZone) {
  this.ngZone.runOutsideAngular(() => {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === this.MESSAGES_STORAGE_KEY && event.newValue) {
        this.ngZone.run(() => {
          this.handleRemoteMessages(JSON.parse(event.newValue || ""));
        });
      }
    });
  });
}
```

**Key Implementation Details:**
- Uses `crypto.randomUUID()` when available (modern browsers), falls back to `Math.random().toString(36).slice(2, 11)`
- Messages are **room-scoped** via `Map<string, BehaviorSubject<Message[]>>` for efficient filtering
- **localStorage broadcast** allows cross-session (tab/window) synchronization on the same machine

---

## Data Flow Diagrams

### User Login Flow

```
┌─────────────┐
│ User Input  │
│ username    │
└──────┬──────┘
       │
       ▼
┌────────────────────────┐
│ LoginComponent         │
│ handleLogin(username)  │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────────────┐
│ AuthService.login()            │
│ • Generate UUID               │
│ • Create User object          │
│ • localStorage.setItem()      │
│ • currentUserSubject.next()   │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Router.navigate(['/chat'])       │
│ ChatWindowComponent initialized  │
└──────────────────────────────────┘
```

### Message Sending Flow (Single Session)

```
┌──────────────────────────┐
│ User types in input      │
│ newMessage signal updates│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ User clicks "Send" button        │
│ ChatWindowComponent.sendMessage()│
└──────────┬───────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ MessageService.sendMessage()            │
│ • Generate UUID for message             │
│ • Create Message object                 │
│ • messages.push(message)                │
│ • roomSubjects.get(roomId).next([...])  │
│ • Call broadcastMessageToOtherSessions()│
└──────────┬────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ broadcastMessageToOtherSessions()      │
│ localStorage.setItem(                  │
│   'chat_app_messages',                 │
│   JSON.stringify([...messages])        │
│ )                                      │
└──────────┬───────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ ChatWindowComponent               │
│ messagesSignal updated via         │
│ subscriber to room observable     │
│                                   │
│ messages.set(msgs)               │
│ scrollToBottom() triggered        │
│                                   │
│ Template re-renders with @for loop│
└────────────────────────────────────┘
```

### Message Receiving Flow (Multi-Session via localStorage)

```
Session A (Sender)                          Session B (Receiver)
─────────────────────────────────           ──────────────────────

User sends message in Room 1
       │
       ▼
MessageService.sendMessage()
       │
       ▼
broadcastMessageToOtherSessions()
       │
       ▼
localStorage.setItem('chat_app_messages', JSON.stringify([...]))
       │
       └─────────────────────────────────────────┐
                                                  │
                                                  ▼ (storage event fires)
                                                  
                                    MessageService constructor
                                    window.addEventListener('storage', ...)
                                                  │
                                                  ▼
                                    handleRemoteMessages()
                                    • Filter new messages
                                    • messages.push(...newMessages)
                                    • roomSubjects.get(roomId).next([...])
                                                  │
                                                  ▼
                                    ChatWindowComponent
                                    Subscriber detects emission
                                                  │
                                                  ▼
                                    messages.set(msgs)
                                                  │
                                                  ▼
                                    Template re-renders
                                    (messages now visible in Room 1)
```

---

## Authentication Flow

### Step-by-Step

1. **App Loads** (`app.ts` routes guard in `AppComponent`)
   - Router checks current route
   - Default route: `/login`

2. **User at Login Page** (`LoginComponent`)
   - User enters username
   - Clicks "Login" button
   - Calls `handleLogin(username)`

3. **LoginComponent → AuthService**
   ```typescript
   handleLogin(username: string) {
     this.authService.login(username);
     this.router.navigate(['/chat']);
   }
   ```

4. **AuthService.login()**
   ```typescript
   login(username: string): void {
     const id = crypto.randomUUID();  // or fallback
     const user: User = { id, username };
     localStorage.setItem('currentUser', JSON.stringify(user));
     this.currentUserSubject.next(user);  // Emit to observers
   }
   ```

5. **Router Navigates to /chat**
   - `ChatWindowComponent` initializes

6. **ChatWindowComponent.ngOnInit()**
   ```typescript
   const user = this.authService.getCurrentUser();  // Sync read
   this.currentUser.set(user);  // Update signal
   
   if (!user) {
     this.router.navigate(['/login']);  // Bounce if no session
   }
   ```

7. **User Session Persisted**
   - On page refresh: `AuthService` constructor checks `localStorage.getItem('currentUser')`
   - User remains logged in

8. **Logout** (`ChatWindowComponent.logout()`)
   ```typescript
   logout(): void {
     this.authService.logout();
     this.router.navigate(['/login']);
   }
   ```
   - Clears localStorage
   - Emits null
   - Router redirects to login

---

## Message Broadcasting (Multi-Session Sync)

### How It Works

1. **Session A sends message:**
   - `ChatWindowComponent.sendMessage()` → `MessageService.sendMessage()`
   - Message added to `messages[]`
   - Room subject emits: `roomSubjects.get(roomId).next([...])`
   - `broadcastMessageToOtherSessions()` called

2. **broadcastMessageToOtherSessions():**
   ```typescript
   private broadcastMessageToOtherSessions(message: Message): void {
     localStorage.setItem(
       'chat_app_messages',
       JSON.stringify([...this.messages])  // Serialize entire array
     );
   }
   ```

3. **Storage event fires in other sessions:**
   - Browser automatically fires `storage` event on all other windows/tabs
   - Not fired in the same window that made the change

4. **Session B's MessageService listener:**
   ```typescript
   window.addEventListener('storage', (event: StorageEvent) => {
     if (event.key === 'chat_app_messages' && event.newValue) {
       this.ngZone.run(() => {
         this.handleRemoteMessages(JSON.parse(event.newValue));
       });
     }
   });
   ```

5. **handleRemoteMessages():**
   ```typescript
   private handleRemoteMessages(remoteMessages: Message[]): void {
     const newMessages = remoteMessages.filter(
       rm => !this.messages.find(m => m.id === rm.id)  // Dedup by ID
     );
     
     this.messages.push(...newMessages);  // Add to local store
     
     newMessages.forEach(msg => {
       if (this.roomSubjects.has(msg.roomId)) {
         const subj = this.roomSubjects.get(msg.roomId)!;
         subj.next([...subj.value, msg]);  // Emit to subscribers
       }
     });
   }
   ```

6. **ChatWindowComponent subscriber notified:**
   - Signals update: `messages.set(msgs)`
   - Template re-renders via `@for` loop
   - User sees new message immediately

### Deduplication Strategy

- Each message has a unique `id` (UUID)
- `handleRemoteMessages()` filters incoming messages:
  ```typescript
  const newMessages = remoteMessages.filter(
    rm => !this.messages.find(m => m.id === rm.id)
  );
  ```
- Prevents duplicate messages if both sessions have the same message

### Limitations & Production Notes

**Current (localStorage broadcast):**
- ✅ Works across tabs/windows on same machine
- ✅ No backend required for development
- ❌ Doesn't work across different machines/browsers
- ❌ Not suitable for real-world multi-user apps
- ❌ No persistence after browser close

**For Production, Replace With:**
- **WebSocket** — bidirectional real-time communication
- **Server-Sent Events (SSE)** — one-way server → client push
- **Firebase Realtime DB** or similar cloud solution

---

## Models

### User Model (`src/app/models/user.model.ts`)
```typescript
interface User {
  id: string;        // UUID
  username: string;  // Display name
}
```

### Message Model (`src/app/models/message.model.ts`)
```typescript
interface Message {
  id: string;              // UUID
  text: string;            // Message content
  userId: string;          // Sender's user ID
  username: string;        // Sender's display name
  timestamp: Date;         // Message timestamp
  roomId: string;          // Target room ID
}
```

### ChatRoom Model (`src/app/models/chat-room.model.ts`)
```typescript
interface ChatRoom {
  id: string;              // Room ID
  name: string;            // Display name
  description: string;     // Room description
}
```

---

## Setup & Development

### Prerequisites
- Node.js 18+ (with npm)
- Angular CLI 20.3+

### Installation

```bash
# Clone/extract the project
cd angular-chat-app

# Install dependencies
npm install
```

### Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/` in your browser. The app will automatically reload when you modify source files.

### Multi-Session Testing

Open the app in **two browser tabs** (or different browsers):

1. **Tab 1:** Go to `http://localhost:4200`
   - Login as "Alice"
   - Go to "General" room

2. **Tab 2:** Go to `http://localhost:4200`
   - Login as "Bob"
   - Go to "General" room

3. **Send messages:**
   - Tab 1: Type "Hello from Alice" → Send
   - Tab 2: You should see the message immediately
   - Tab 2: Type "Hi Alice!" → Send
   - Tab 1: You should see the message immediately

---

## Testing

### Unit Tests

```bash
ng test
```

Runs Karma test runner with Jasmine. Tests cover:
- **AuthService:** login/logout behavior, user state
- **ChatService:** room selection, observable emissions
- **MessageService:** message creation, room filtering, multi-session sync
- **Components:** render logic, signal updates, template bindings

### Key Test Cases

**AuthService:**
```typescript
it('should login and logout correctly', () => {
  service.login('testuser');
  expect(service.getCurrentUser()?.username).toBe('testuser');
  
  service.logout();
  expect(service.getCurrentUser()).toBeNull();
});
```

**MessageService:**
```typescript
it('should return messages for a room and update when sendMessage is called', () => {
  const roomId = 'room-1';
  let last: Message[] | undefined;
  
  const sub = service.messagesForRoom$(roomId).subscribe(m => last = m);
  expect(last!.length).toBe(0);
  
  service.sendMessage('hello', 'u1', 'Alice', roomId);
  expect(last!.length).toBe(1);
  expect(last![0].text).toBe('hello');
  
  sub.unsubscribe();
});
```

### Building

```bash
ng build
```

Optimized production build output to `dist/` directory.

---

## Modern Angular Patterns Used

✅ **Standalone Components** — No NgModule needed  
✅ **Reactive Signals** — Type-safe, performant state management  
✅ **@if / @for Control Flow** — Modern template syntax (requires `enableTemplateControlFlow: true`)  
✅ **RxJS Observables** — Reactive, composable async handling  
✅ **Dependency Injection** — Services with `providedIn: 'root'`  
✅ **Type Safety** — Strict TypeScript configuration  

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── login/
│   │   │   ├── login.ts
│   │   │   ├── login.html
│   │   │   ├── login.css
│   │   │   └── login.spec.ts
│   │   ├── chat-window/
│   │   │   ├── chat-window.ts
│   │   │   ├── chat-window.html
│   │   │   ├── chat-window.css
│   │   │   └── chat-window.spec.ts
│   │   ├── chat-room-list/
│   │   │   └── ...
│   │   └── message/
│   │       └── ...
│   ├── services/
│   │   ├── auth.ts
│   │   ├── auth.spec.ts
│   │   ├── chat.ts
│   │   ├── chat.spec.ts
│   │   ├── message.ts
│   │   └── message.spec.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── message.model.ts
│   │   └── chat-room.model.ts
│   ├── app.ts (main component)
│   ├── app.routes.ts (router config)
│   └── app.config.ts (provider config)
├── main.ts (bootstrap)
└── styles.css (global styles)
```

---

## Summary

This Angular Chat App demonstrates **modern frontend architecture** with:
- **Reactive state management** via signals and observables
- **Component composition** with dependency injection
- **Real-time multi-session sync** via localStorage broadcast (simulates backend)
- **Type-safe templates** with modern `@if`/`@for` blocks
- **Clean separation of concerns** (components ↔ services ↔ models)

Perfect for learning Angular 17+ best practices or as a foundation for a real-time chat app with WebSocket integration.
