# ChatZone

> Low-latency real-time messaging — 1:1 and group chat with typing indicators and live delivery.

ChatZone is a full-stack chat application built on the MERN stack with
**Socket.IO**. Messages are pushed to connected clients the moment they are
written; nothing polls.

```
React 18 · Chakra UI · Socket.IO · Node.js · Express · MongoDB · JWT
```

---

## How the real-time layer works

The interesting problem in a chat app isn't storing messages — it's delivering
each one to exactly the right sockets, and no others, while thousands of
conversations are open at once.

**Every user and every chat is a Socket.IO room.** On connect, the client emits
`setup` with its user object and the socket joins a room keyed by that user's
id. Opening a conversation joins a second room keyed by the chat id. Rooms are
the isolation boundary: a message emitted into one never reaches sockets outside
it, so concurrent conversations can't leak into each other and there is no
shared broadcast state to reason about.

**Delivery is fan-out by participant, not by chat.** When a message arrives, the
server walks the chat's `users` array and emits `message recieved` into each
participant's *personal* room — skipping the sender. This is what makes
notifications work while a recipient is looking at a different conversation:
they're still in their own room even though they never joined this chat's room.

**Typing indicators are transient and never persisted.** `typing` and
`stop typing` are emitted into the chat room with `socket.in(room)`, which
excludes the sender, so you never see your own indicator. Nothing about them
touches MongoDB.

**Connections are kept alive deliberately.** `pingTimeout: 60000` holds an idle
socket open for a minute before tearing it down, avoiding a reconnect storm from
users who are simply reading rather than typing.

```
sender ──POST /api/message──▶ Express ──▶ MongoDB (persist)
                                  │
                                  └──▶ Socket.IO
                                         ├─▶ room(user_b)  "message recieved"
                                         └─▶ room(user_c)  "message recieved"
                                             (sender skipped)
```

---

## Features

- **Authentication** — register and log in; passwords hashed with bcrypt, sessions carried by JWT
- **1:1 chat** — search any user and start a conversation; chats are created on first access, never duplicated
- **Group chat** — create a group, rename it, add and remove members, with an admin who controls membership
- **Typing indicators** — live, per-conversation, with a Lottie animation
- **Notifications** — an unread badge for messages that arrive in a chat you aren't currently viewing
- **Profile pictures** — uploaded at signup and shown throughout

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
│   └── server.js       # Express app + Socket.IO server
└── frontend/
    ├── src/Pages/      # Home (auth) and Chat
    ├── src/components/ # Chatbox, MyChats, SingleChat, ScrollableChat, modals
    ├── src/Context/    # global chat state provider
    └── src/animations/ # typing indicator
```

### Data model

| Model | Key fields |
|---|---|
| **User** | `name`, `email` (unique), `password` (bcrypt), `pic` |
| **Chat** | `chatName`, `isGroupChat`, `users[]`, `latestMessage`, `groupAdmin` |
| **Message** | `sender`, `content`, `chat`, `readBy[]` |

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

### `/api/chat`
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/` 🔒 | Access or create a 1:1 chat |
| `GET` | `/` 🔒 | List the caller's chats |
| `POST` | `/group` 🔒 | Create a group chat |
| `PUT` | `/rename` 🔒 | Rename a group |
| `PUT` | `/groupadd` 🔒 | Add a member |
| `PUT` | `/groupremove` 🔒 | Remove a member |

### `/api/message`
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/` 🔒 | Send a message |
| `GET` | `/:chatId` 🔒 | Fetch a conversation's messages |

### Socket events

| Event | Direction | Purpose |
|---|---|---|
| `setup` | client → server | Join the user's personal room |
| `connected` | server → client | Handshake acknowledged |
| `join chat` | client → server | Join a conversation's room |
| `new message` | client → server | Fan out to participants |
| `message recieved` | server → client | A message arrived |
| `typing` / `stop typing` | both | Live typing indicator |

---

## Running it locally

**Prerequisites:** Node.js 18+ and a MongoDB instance (local or Atlas).

```bash
git clone https://github.com/Ayush44gt/Chat-Zone.git
cd Chat-Zone
npm install
cd frontend && npm install && cd ..
```

Create `backend/.env`:

```env
PORT=5003
MONGO_URI=mongodb://localhost:27017/chatzone
JWT_SECRET=your_jwt_signing_secret
NODE_ENV=development
```

Run the two processes in separate terminals:

```bash
npm run server        # API + Socket.IO on http://localhost:5003
```

```bash
cd frontend && npm start   # client on http://localhost:3000
```

The Socket.IO CORS origin is set to `http://localhost:3000`.

### Production build

```bash
npm run build         # installs both workspaces and builds the client
npm start             # Express serves frontend/build and the API together
```

---

## Tech stack

| Layer | Choices |
|---|---|
| **Frontend** | React 18, Chakra UI, Socket.IO client, React Router 6, Axios, react-lottie, react-scrollable-feed, react-notification-badge |
| **Backend** | Node.js, Express 4, Socket.IO 4, Mongoose, JWT, bcryptjs, express-async-handler |
| **Database** | MongoDB |

---

## Author

**Ayush Garg** — [GitHub](https://github.com/Ayush44gt) · [LinkedIn](https://www.linkedin.com/in/ayush44/)
