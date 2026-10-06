# ChatZone

> Low-latency real-time messaging — 1:1 and group chat with typing indicators, read receipts and presence.

ChatZone is a full-stack chat application built on the MERN stack with
**Socket.IO**. Messages are pushed to connected clients the moment they are
written; nothing polls.

```
React · Chakra UI · Socket.IO · Node.js · Express · MongoDB · JWT
```

---

## How the real-time layer works

The interesting problem in a chat app isn't storing messages — it's delivering
each one to exactly the right sockets, and no others, while thousands of
conversations are open at once.

**Every socket is authenticated.** The client connects with the same JWT it
uses for the REST API. The server verifies it during the handshake and joins the
socket to a room keyed by that user's id. A socket without a valid token never
connects.

**The server decides who hears what.** Clients never broadcast for each other.
A message is sent with `POST /api/message`; once it is stored, the server walks
the chat's `users` array and emits `message:new` into each participant's
personal room. Because delivery is by participant rather than by an open chat
window, a recipient gets the message — and an unread badge — even while looking
at a different conversation, and a sender's other tabs stay in sync.

**Typing indicators are transient and never persisted.** `typing` and
`stop typing` carry a chat id; the server checks the sender belongs to that chat
and relays the event to the other members only. Nothing about them touches
MongoDB.

**Presence is reference-counted.** A user can have several tabs open, so the
server counts sockets per user. The first one broadcasts "online"; when the last
one closes, the server stores `lastSeen` and broadcasts "offline".

```
sender ──POST /api/message──▶ Express ──▶ MongoDB (persist)
                                  │
                                  └──▶ Socket.IO
                                         ├─▶ room(user_a)  "message:new"   (sender's other tabs)
                                         ├─▶ room(user_b)  "message:new"
                                         └─▶ room(user_c)  "message:new"
```

---

## Features

- **Authentication** — register and log in; passwords hashed with bcrypt, sessions carried by JWT, expired sessions return to the login form
- **1:1 chat** — search any user and start a conversation; chats are created on first access, never duplicated
- **Group chat** — create a group, rename it, add and remove members; the admin controls membership, any member can leave, and the admin role is handed over if the admin leaves
- **Read receipts and unread counts** — per-chat unread badges, a total in the browser tab title, and sent/read ticks on your own messages
- **Presence** — online dots and "last seen" times
- **Typing indicators** — live, per conversation
- **Message history** — paginated, with "load earlier messages"
- **Delete your own messages** — removed for everyone in the chat
- **Profiles** — name, about line, password change and a profile picture stored locally by the server
- **Light and dark mode**, responsive down to phone width

---

## Architecture

```
chatzone/
├── backend/
│   ├── models/         # User, Chat, Message (Mongoose)
│   ├── controllers/    # user, chat and message logic
│   ├── routes/         # Express routers under /api
│   ├── middleware/
│   │   ├── authMiddleware.js    # `protect` — verifies the JWT
│   │   └── errorMiddleware.js   # notFound + central error handler
│   ├── config/
│   │   ├── db.js                # Mongo connection
│   │   └── generateToken.js     # JWT issuance
│   ├── utils/saveAvatar.js      # stores profile pictures in backend/uploads
│   ├── seed/seed.js             # demo data
│   ├── socket.js       # Socket.IO server: auth, presence, typing
│   └── server.js       # Express app
└── frontend/
    ├── src/Pages/      # Home (auth) and Chat
    ├── src/components/ # Sidebar, ChatWindow, MessageList, Composer, dialogs
    ├── src/Context/    # session, chat list and socket state
    ├── src/utils/      # chat and time helpers
    ├── src/api.js      # axios instance
    └── src/theme.js    # Chakra theme and colour tokens
```

### Data model

| Model | Key fields |
|---|---|
| **User** | `name`, `email` (unique), `password` (bcrypt), `pic`, `about`, `isAdmin`, `lastSeen` |
| **Chat** | `chatName`, `isGroupChat`, `users[]`, `latestMessage`, `groupAdmin` |
| **Message** | `sender`, `content`, `chat`, `readBy[]`, `deleted` |

A 1:1 conversation and a group are the same `Chat` document — `isGroupChat`
is the only thing that differs. That keeps message delivery, chat listing and
the `latestMessage` preview on a single code path instead of two.

---

## API

🔒 = requires a valid JWT (`Authorization: Bearer <token>`).

### `/api/user`
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/` | Register |
| `POST` | `/login` | Log in, returns a JWT |
| `GET` | `/?search=` 🔒 | Search users by name or email |
| `GET` | `/me` 🔒 | The logged-in user |
| `PUT` | `/profile` 🔒 | Update name, about, picture or password |

### `/api/chat`
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/` 🔒 | Access or create a 1:1 chat |
| `GET` | `/` 🔒 | List the caller's chats, each with an `unreadCount` |
| `POST` | `/group` 🔒 | Create a group chat |
| `PUT` | `/rename` 🔒 | Rename a group (any member) |
| `PUT` | `/groupadd` 🔒 | Add a member (admin) |
| `PUT` | `/groupremove` 🔒 | Remove a member (admin) or leave (yourself) |
| `DELETE` | `/group/:chatId` 🔒 | Delete a group and its messages (admin) |

### `/api/message`
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/` 🔒 | Send a message |
| `GET` | `/:chatId?before=&limit=` 🔒 | A page of messages: `{ messages, hasMore }` |
| `PUT` | `/read/:chatId` 🔒 | Mark the chat as read |
| `DELETE` | `/:messageId` 🔒 | Delete one of your own messages |

Only members of a chat can read it, write to it or change it.

### Socket events

Connect with `io(url, { auth: { token } })`.

| Event | Direction | Purpose |
|---|---|---|
| `typing` / `stop typing` | client → server | `{ chatId }` — the user started or stopped typing |
| `typing` / `stop typing` | server → client | `{ chatId, userId, name }` |
| `message:new` | server → client | A message was stored in one of your chats |
| `message:deleted` | server → client | `{ chatId, messageId }` |
| `messages:read` | server → client | `{ chatId, userId }` — that user has read the chat |
| `chat:updated` | server → client | A chat was created or changed (rename, members, admin) |
| `chat:removed` | server → client | You left, were removed, or the group was deleted |
| `presence:list` | server → client | Ids of everyone online, sent on connect |
| `presence` | server → client | `{ userId, online, lastSeen }` |

---

## Running it locally

**Prerequisites:** Node.js 18+ and a MongoDB instance (local or Atlas).

```bash
git clone https://github.com/Ayush44gt/Chat-Zone.git
cd Chat-Zone
npm install --legacy-peer-deps
npm install --legacy-peer-deps --prefix frontend
```

Create `backend/.env` from the template and set a `JWT_SECRET`:

```bash
cp backend/.env.example backend/.env
```

```env
PORT=5006
MONGO_URI=mongodb://127.0.0.1:27017/chatzone
JWT_SECRET=your_jwt_signing_secret
NODE_ENV=development
```

If you don't have MongoDB installed, start one with Docker:

```bash
docker volume create chatzone-mongo-data
docker compose up -d
```

Run the two processes in separate terminals:

```bash
npm run server        # API + Socket.IO on http://localhost:5006
```

```bash
cd frontend && npm start   # client on http://localhost:3000
```

Sockets accept connections from any `localhost` origin. For another origin,
list it in `CLIENT_URL` (comma-separated).

### Demo data

```bash
npm run seed
```

This **deletes every user, chat and message** and loads a demo data set: 24
users, 15 direct chats, 8 groups and about 550 messages spread over the last
few weeks. It refuses to run against a non-local `MONGO_URI` unless you pass
`--force`.

Every demo account uses the password `123456`:

| Account | What it is good for |
|---|---|
| `guest@example.com` | The main demo account (also the "Explore with the demo account" button): 18 chats, unread messages, admin of two groups |
| `ayush@example.com` | Site admin, admin of the "Product Team" group |
| `priya@example.com` | A second account to chat with the guest in another browser |
| `nina@example.com` | A brand new account with no conversations |
| `max@example.com` | A 48-character name |
| `tara@example.com` | Not seen for three months, empty about line |

The data also covers a 260-message group (pagination), an empty group, an
empty 1:1 chat, a deleted message, a very long message, multi-line text,
links, emoji, right-to-left and CJK text, and a group the guest is not in.

To use two accounts at once in one browser, open the second in a private
window (the session is stored per origin).

### Production build

```bash
npm run build         # installs both workspaces and builds the client
npm start             # with NODE_ENV=production, Express serves frontend/build and the API together
```

---

## Tech stack

| Layer | Choices |
|---|---|
| **Frontend** | React 16, Chakra UI, Socket.IO client, React Router 5, Axios |
| **Backend** | Node.js, Express 4, Socket.IO 4, Mongoose 5, JWT, bcryptjs, express-async-handler |
| **Database** | MongoDB |

---

## Author

**Ayush Garg** — [GitHub](https://github.com/Ayush44gt) · [LinkedIn](https://www.linkedin.com/in/ayush44/)
