import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToast } from "@chakra-ui/react";
import io from "socket.io-client";
import api, {
  SOCKET_URL,
  errorMessage,
  setAuthToken,
  setUnauthorizedHandler,
} from "../api";

const ChatContext = createContext();
const STORAGE_KEY = "userInfo";
// A typing indicator that never got its "stop" is dropped after this long
const TYPING_TIMEOUT = 6000;

const readStoredUser = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.token) {
      setAuthToken(stored.token);
      return stored;
    }
  } catch (error) {
    // corrupted storage is treated as logged out
  }
  return null;
};

const byRecent = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

const ChatProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [online, setOnline] = useState({});
  const [lastSeen, setLastSeen] = useState({});
  const [typing, setTyping] = useState({});
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const toast = useToast();
  // Read through a ref so callbacks don't change (and reconnect the socket) with it
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const selectedRef = useRef(null);
  const typingTimers = useRef({});
  // The message box, so dialogs can hand focus to it when they close
  const composerRef = useRef(null);
  const chatsRef = useRef([]);
  // Chats this client is leaving or deleting itself, so no notice is needed
  const expectedRemovals = useRef(new Set());
  selectedRef.current = selectedChatId;

  chatsRef.current = chats;

  const userId = user && user._id;
  const token = user && user.token;

  const login = useCallback((data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAuthToken(data.token);
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setChats([]);
    setSelectedChatId(null);
    setOnline({});
    setLastSeen({});
    setTyping({});
    setChatsError("");
    toastRef.current.closeAll();
  }, []);

  // Profile edits return a fresh user object (and token)
  const updateUser = useCallback(
    (data) => {
      login(data);
      setChats((current) =>
        current.map((chat) => ({
          ...chat,
          users: chat.users.map((u) =>
            u._id === data._id
              ? { ...u, name: data.name, pic: data.pic, about: data.about }
              : u
          ),
        }))
      );
    },
    [login]
  );

  const fetchChats = useCallback(async ({ silent } = {}) => {
    if (!silent) setChatsLoading(true);
    try {
      const { data } = await api.get("/chat");
      setChats(data);
      setChatsError("");
    } catch (error) {
      if (!silent) setChatsError(errorMessage(error, "Failed to load your chats"));
    } finally {
      if (!silent) setChatsLoading(false);
    }
  }, []);

  const upsertChat = useCallback((chat) => {
    setChats((current) => {
      const existing = current.find((c) => c._id === chat._id);
      const merged = {
        ...chat,
        unreadCount: existing ? existing.unreadCount : chat.unreadCount || 0,
      };
      return [merged, ...current.filter((c) => c._id !== chat._id)].sort(byRecent);
    });
  }, []);

  const removeChat = useCallback((chatId) => {
    setChats((current) => current.filter((c) => c._id !== chatId));
    setSelectedChatId((current) => (current === chatId ? null : current));
  }, []);

  const markRead = useCallback(async (chatId) => {
    setChats((current) =>
      current.map((c) => (c._id === chatId && c.unreadCount ? { ...c, unreadCount: 0 } : c))
    );
    try {
      await api.put(`/message/read/${chatId}`);
    } catch (error) {
      // the badge comes back on the next fetch if this did not go through
    }
  }, []);

  const clearTyping = useCallback((chatId, typist) => {
    clearTimeout(typingTimers.current[`${chatId}:${typist}`]);
    setTyping((current) => {
      if (!current[chatId] || !current[chatId][typist]) return current;
      const inChat = { ...current[chatId] };
      delete inChat[typist];
      return { ...current, [chatId]: inChat };
    });
  }, []);

  // Expired or revoked sessions end up back at the login form
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!localStorage.getItem(STORAGE_KEY)) return;
      logout();
      toast({
        title: "Session expired",
        description: "Please log in again.",
        status: "info",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    });
  }, [logout, toast]);

  useEffect(() => {
    if (!userId) return;
    fetchChats();
  }, [userId, fetchChats]);

  // One authenticated socket per logged-in user
  useEffect(() => {
    if (!token) return;

    const client = io(SOCKET_URL, { auth: { token } });
    let hasConnected = false;

    client.on("connect", () => {
      setConnected(true);
      // Catch up on anything missed while the connection was down
      if (hasConnected) fetchChats({ silent: true });
      hasConnected = true;
    });
    client.on("disconnect", () => setConnected(false));
    client.on("connect_error", (error) => {
      setConnected(false);
      if (/not authorized/i.test(error.message)) logout();
    });

    client.on("presence:list", (ids) =>
      setOnline(ids.reduce((map, id) => ({ ...map, [id]: true }), {}))
    );
    client.on("presence", (event) => {
      setOnline((current) => ({ ...current, [event.userId]: event.online }));
      if (event.lastSeen) {
        setLastSeen((current) => ({ ...current, [event.userId]: event.lastSeen }));
      }
    });

    client.on("typing", ({ chatId, userId: typist, name }) => {
      setTyping((current) => ({
        ...current,
        [chatId]: { ...current[chatId], [typist]: name },
      }));
      const key = `${chatId}:${typist}`;
      clearTimeout(typingTimers.current[key]);
      typingTimers.current[key] = setTimeout(
        () => clearTyping(chatId, typist),
        TYPING_TIMEOUT
      );
    });
    client.on("stop typing", ({ chatId, userId: typist }) => clearTyping(chatId, typist));

    client.on("message:new", (message) => {
      clearTyping(message.chat, message.sender._id);
      setChats((current) => {
        const chat = current.find((c) => c._id === message.chat);
        if (!chat) {
          fetchChats({ silent: true });
          return current;
        }

        const viewing =
          selectedRef.current === message.chat && document.visibilityState === "visible";
        const incoming = message.sender._id !== userId;
        const alreadyLatest = chat.latestMessage && chat.latestMessage._id === message._id;

        const updated = {
          ...chat,
          latestMessage: message,
          updatedAt: message.createdAt,
          unreadCount:
            (chat.unreadCount || 0) + (incoming && !viewing && !alreadyLatest ? 1 : 0),
        };
        return [updated, ...current.filter((c) => c._id !== message.chat)];
      });
    });

    client.on("message:deleted", ({ chatId, messageId }) => {
      // The deleted message may have been one of the unread ones
      const affected = chatsRef.current.find((c) => c._id === chatId);
      if (affected && affected.unreadCount > 0) fetchChats({ silent: true });

      setChats((current) =>
        current.map((c) =>
          c._id === chatId && c.latestMessage && c.latestMessage._id === messageId
            ? { ...c, latestMessage: { ...c.latestMessage, deleted: true, content: "" } }
            : c
        )
      );
    });

    // Reading in another tab or device clears the badge here too
    client.on("messages:read", ({ chatId, userId: reader }) => {
      if (reader !== userId) return;
      setChats((current) =>
        current.map((c) => (c._id === chatId ? { ...c, unreadCount: 0 } : c))
      );
    });

    client.on("chat:updated", (chat) => upsertChat(chat));
    client.on("chat:removed", ({ chatId }) => {
      const chat = chatsRef.current.find((c) => c._id === chatId);
      if (chat && !expectedRemovals.current.has(chatId)) {
        toastRef.current({
          title: `You're no longer in “${chat.chatName}”`,
          description: "You were removed, or the group was deleted.",
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      }
      expectedRemovals.current.delete(chatId);
      removeChat(chatId);
    });

    setSocket(client);

    const timers = typingTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      client.close();
      setSocket(null);
      setConnected(false);
    };
  }, [token, userId, fetchChats, logout, upsertChat, removeChat, clearTyping]);

  const selectedChat = useMemo(
    () => chats.find((c) => c._id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  const isOnline = useCallback((id) => Boolean(online[id]), [online]);

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [chats]
  );

  // Surface unread messages in the browser tab
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ChatZone` : "ChatZone";
  }, [totalUnread]);

  return (
    <ChatContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        chats,
        chatsLoading,
        chatsError,
        fetchChats,
        upsertChat,
        removeChat,
        markRead,
        selectedChat,
        selectChat: setSelectedChatId,
        isOnline,
        lastSeen,
        typing,
        socket,
        connected,
        totalUnread,
        composerRef,
        expectRemoval: (chatId) => expectedRemovals.current.add(chatId),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
