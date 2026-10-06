import {
  Box,
  Button,
  Flex,
  IconButton,
  Skeleton,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { getChatName, getOtherUser } from "../utils/chat";
import { formatLastSeen } from "../utils/time";
import ChatInfoDrawer from "./ChatInfoDrawer";
import Composer from "./Composer";
import ConfirmDialog from "./ConfirmDialog";
import MessageList from "./MessageList";
import UserAvatar from "./UserAvatar";
import { AlertIcon, ArrowDownIcon, ArrowLeftIcon, InfoIcon, LogoMark, MessageIcon } from "./icons";

// Within this many pixels of the bottom counts as "following the conversation"
const STICK_THRESHOLD = 120;
// Keeps lines readable on very wide screens
const COLUMN = { maxW: "920px", mx: "auto", w: "100%" };
let clientIdCounter = 0;

const MessagesSkeleton = () => (
  <Box px={{ base: 3, md: 5 }} py={4} {...COLUMN}>
    {[55, 35, 62, 28, 48, 40].map((width, i) => (
      <Flex key={i} justify={i % 3 === 1 ? "flex-end" : "flex-start"} mb={3}>
        <Skeleton h="38px" w={`${width}%`} borderRadius="18px" />
      </Flex>
    ))}
  </Box>
);

const TypingBubble = ({ names, isGroup }) => {
  const ui = useUi();
  const label =
    names.length === 1
      ? `${names[0].split(" ")[0]} is typing`
      : `${names.length} people are typing`;

  return (
    <Flex align="center" mt={3} className="message-in">
      <Flex
        bg={ui.bubbleIn}
        color={ui.muted}
        px={3.5}
        h="36px"
        borderRadius="18px"
        borderBottomLeftRadius="6px"
        align="center"
        aria-label={label}
      >
        <Box className="typing-dot" mr="4px" />
        <Box className="typing-dot" mr="4px" />
        <Box className="typing-dot" />
      </Flex>
      {isGroup && (
        <Text fontSize="xs" color={ui.muted} ml={2}>
          {label}
        </Text>
      )}
    </Flex>
  );
};

const Header = ({ chat, typists, onBack, onInfo }) => {
  const ui = useUi();
  const { user, isOnline, lastSeen } = ChatState();
  const other = getOtherUser(user, chat);
  const online = Boolean(other) && isOnline(other._id);

  // Re-render every minute so "last seen 5 min ago" stays true
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let subtitle;
  let subtitleColor = ui.muted;
  if (typists.length > 0) {
    subtitleColor = ui.accent;
    subtitle = !chat.isGroupChat
      ? "typing…"
      : typists.length === 1
      ? `${typists[0].split(" ")[0]} is typing…`
      : `${typists.length} people are typing…`;
  } else if (chat.isGroupChat) {
    const onlineCount = chat.users.filter((u) => u._id !== user._id && isOnline(u._id)).length;
    subtitle = `${chat.users.length} members${onlineCount ? ` · ${onlineCount} online` : ""}`;
  } else if (!other) {
    subtitle = "Account deleted";
  } else if (online) {
    subtitle = "Online";
    subtitleColor = "green.400";
  } else {
    subtitle = formatLastSeen(lastSeen[other._id] || other.lastSeen);
  }

  return (
    <Flex
      align="center"
      px={{ base: 2, md: 5 }}
      py={3}
      borderBottomWidth="1px"
      borderColor={ui.border}
      flexShrink={0}
    >
      <IconButton
        aria-label="Back to chats"
        icon={<ArrowLeftIcon boxSize={5} />}
        variant="ghost"
        colorScheme="gray"
        borderRadius="full"
        d={{ base: "inline-flex", md: "none" }}
        mr={1}
        onClick={onBack}
      />
      <Flex
        as="button"
        type="button"
        align="center"
        textAlign="left"
        minW={0}
        flex="1"
        borderRadius="xl"
        onClick={onInfo}
        _focusVisible={{ boxShadow: "outline", outline: "none" }}
      >
        {chat.isGroupChat ? (
          <UserAvatar group boxSize="42px" />
        ) : (
          <UserAvatar user={other} online={online} boxSize="42px" />
        )}
        <Box ml={3} minW={0}>
          <Text fontWeight="700" fontSize="md" lineHeight="1.25" isTruncated>
            {getChatName(user, chat)}
          </Text>
          <Text fontSize="13px" color={subtitleColor} isTruncated>
            {subtitle}
          </Text>
        </Box>
      </Flex>
      <Tooltip label={chat.isGroupChat ? "Group info" : "Contact info"}>
        <IconButton
          aria-label={chat.isGroupChat ? "Group info" : "Contact info"}
          icon={<InfoIcon boxSize={5} />}
          variant="ghost"
          colorScheme="gray"
          borderRadius="full"
          ml={2}
          onClick={onInfo}
        />
      </Tooltip>
    </Flex>
  );
};

const Conversation = ({ chat }) => {
  const ui = useUi();
  const toast = useToast();
  const { user, socket, typing, selectChat, markRead } = ChatState();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const info = useDisclosure();

  const scroller = useRef();
  const stick = useRef(true);
  const prepended = useRef(null);
  const chatId = chat._id;
  const unread = chat.unreadCount || 0;
  const typists = Object.values(typing[chatId] || {});

  const scrollToBottom = useCallback((smooth) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // A refresh keeps the current view on screen and anything not sent yet
  const load = useCallback(
    async ({ refresh } = {}) => {
      if (!refresh) {
        setLoading(true);
        setLoadError("");
      }
      try {
        const { data } = await api.get(`/message/${chatId}`);
        if (!refresh) stick.current = true;
        setMessages((current) => [
          ...data.messages,
          ...current.filter((m) => m.pending || m.failed),
        ]);
        setHasMore(data.hasMore);
        setLoadError("");
      } catch (error) {
        if (!refresh) setLoadError(errorMessage(error, "Failed to load the messages"));
      } finally {
        setLoading(false);
      }
    },
    [chatId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const loadEarlier = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/message/${chatId}`, {
        params: { before: messages[0].createdAt },
      });
      // Remember the height so the view stays on the message being read
      prepended.current = scroller.current.scrollHeight;
      setMessages((current) => [...data.messages, ...current]);
      setHasMore(data.hasMore);
    } catch (error) {
      toast({
        title: "Couldn't load earlier messages",
        description: errorMessage(error),
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Keep the scroll position sensible whenever the list changes
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prepended.current !== null) {
      el.scrollTop += el.scrollHeight - prepended.current;
      prepended.current = null;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, typists.length]);

  const onScroll = () => {
    const el = scroller.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < STICK_THRESHOLD;
    setAtBottom(stick.current);
  };

  // Mark the chat read while it is open and the tab is actually visible
  useEffect(() => {
    if (loading || unread === 0) return;
    const mark = () => {
      if (document.visibilityState === "visible") markRead(chatId);
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [loading, unread, chatId, markRead]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (message) => {
      if (message.chat !== chatId) return;
      setMessages((current) => {
        if (current.some((m) => m._id === message._id)) return current;
        // My own message can arrive here before the POST that sent it returns
        const draft =
          message.sender._id === user._id
            ? current.findIndex((m) => m.pending && m.content === message.content)
            : -1;
        if (draft === -1) return [...current, { ...message, animate: true }];
        return current.map((m, i) =>
          i === draft ? { ...message, clientId: m.clientId } : m
        );
      });
      // The provider only counts it as unread when the tab is hidden
      if (message.sender._id !== user._id && document.visibilityState === "visible") {
        markRead(chatId);
      }
    };

    const onDeleted = ({ chatId: id, messageId }) => {
      if (id !== chatId) return;
      setMessages((current) =>
        current.map((m) => (m._id === messageId ? { ...m, deleted: true, content: "" } : m))
      );
    };

    const onRead = ({ chatId: id, userId: reader }) => {
      if (id !== chatId || reader === user._id) return;
      setMessages((current) =>
        current.map((m) =>
          m.sender._id === user._id && !(m.readBy || []).includes(reader)
            ? { ...m, readBy: [...(m.readBy || []), reader] }
            : m
        )
      );
    };

    // Anything sent while the connection was down is fetched again
    const onReconnect = () => load({ refresh: true });

    socket.on("message:new", onNew);
    socket.on("message:deleted", onDeleted);
    socket.on("messages:read", onRead);
    socket.io.on("reconnect", onReconnect);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:deleted", onDeleted);
      socket.off("messages:read", onRead);
      socket.io.off("reconnect", onReconnect);
    };
  }, [socket, chatId, user._id, markRead, load]);

  const deliver = async (clientId, content) => {
    try {
      const { data } = await api.post("/message", { content, chatId });
      // The socket may have delivered the same message first
      setMessages((current) =>
        current.some((m) => m._id === data._id)
          ? current.filter((m) => m.clientId !== clientId || m._id === data._id)
          : current.map((m) => (m.clientId === clientId ? { ...data, clientId } : m))
      );
    } catch (error) {
      setMessages((current) =>
        current.map((m) =>
          m.clientId === clientId ? { ...m, pending: false, failed: true } : m
        )
      );
      toast({
        title: "Message not sent",
        description: errorMessage(error),
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const send = (content) => {
    const clientId = `draft-${++clientIdCounter}`;
    stick.current = true;
    setMessages((current) => [
      ...current,
      {
        clientId,
        _id: clientId,
        content,
        sender: { _id: user._id, name: user.name, pic: user.pic },
        chat: chatId,
        readBy: [],
        createdAt: new Date().toISOString(),
        pending: true,
        animate: true,
      },
    ]);
    deliver(clientId, content);
  };

  const retry = (message) => {
    setMessages((current) =>
      current.map((m) =>
        m.clientId === message.clientId ? { ...m, failed: false, pending: true } : m
      )
    );
    deliver(message.clientId, message.content);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/message/${toDelete._id}`);
      setMessages((current) =>
        current.map((m) => (m._id === toDelete._id ? { ...m, deleted: true, content: "" } : m))
      );
      setToDelete(null);
    } catch (error) {
      toast({
        title: "Couldn't delete the message",
        description: errorMessage(error),
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setDeleting(false);
    }
  };

  let body;
  if (loading) {
    body = <MessagesSkeleton />;
  } else if (loadError && messages.length === 0) {
    body = (
      <Flex direction="column" align="center" justify="center" h="100%" textAlign="center" px={6}>
        <AlertIcon boxSize={8} color="red.400" mb={3} />
        <Text fontWeight="600" mb={1}>
          Couldn't load this conversation
        </Text>
        <Text fontSize="sm" color={ui.muted} mb={4}>
          {loadError}
        </Text>
        <Button size="sm" variant="outline" onClick={() => load()}>
          Try again
        </Button>
      </Flex>
    );
  } else if (messages.length === 0) {
    body = (
      <Flex direction="column" align="center" justify="center" h="100%" textAlign="center" px={6}>
        <Flex boxSize="64px" borderRadius="3xl" bg={ui.active} align="center" justify="center" mb={4}>
          <MessageIcon boxSize={7} color={ui.accent} />
        </Flex>
        <Text fontWeight="600" mb={1}>
          No messages yet
        </Text>
        <Text fontSize="sm" color={ui.muted}>
          {chat.isGroupChat
            ? "Be the first to say something to the group."
            : `Say hello to ${getChatName(user, chat).split(" ")[0]} 👋`}
        </Text>
        {typists.length > 0 && <TypingBubble names={typists} isGroup={chat.isGroupChat} />}
      </Flex>
    );
  } else {
    body = (
      // Short conversations sit at the bottom, next to the composer
      <Flex direction="column" justify="flex-end" minH="100%" px={{ base: 3, md: 5 }} pt={2} pb={3} {...COLUMN}>
        {hasMore && (
          <Flex justify="center" py={2}>
            <Button
              size="xs"
              variant="outline"
              colorScheme="gray"
              borderRadius="full"
              onClick={loadEarlier}
              isLoading={loadingMore}
              loadingText="Loading"
            >
              Load earlier messages
            </Button>
          </Flex>
        )}
        <MessageList
          messages={messages}
          chat={chat}
          userId={user._id}
          onDelete={setToDelete}
          onRetry={retry}
        />
        {typists.length > 0 && <TypingBubble names={typists} isGroup={chat.isGroupChat} />}
      </Flex>
    );
  }

  return (
    <>
      <Header
        chat={chat}
        typists={typists}
        onBack={() => selectChat(null)}
        onInfo={info.onOpen}
      />

      <Box flex="1" position="relative" minH={0} bg={ui.chatBg}>
        <Box ref={scroller} onScroll={onScroll} h="100%" overflowY="auto">
          {body}
        </Box>
        {!atBottom && !loading && (
          <IconButton
            aria-label="Jump to latest message"
            icon={<ArrowDownIcon />}
            position="absolute"
            right={5}
            bottom={4}
            size="sm"
            borderRadius="full"
            boxShadow="card"
            bg={ui.surface}
            color={ui.text}
            borderWidth="1px"
            borderColor={ui.border}
            _hover={{ bg: ui.hover }}
            onClick={() => scrollToBottom(true)}
          />
        )}
      </Box>

      <Box bg={ui.chatBg}>
        <Box {...COLUMN}>
          <Composer chatId={chatId} onSend={send} />
        </Box>
      </Box>

      <ChatInfoDrawer isOpen={info.isOpen} onClose={info.onClose} chat={chat} />
      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        title="Delete this message?"
        confirmLabel="Delete"
      >
        It will be removed for everyone in this chat.
      </ConfirmDialog>
    </>
  );
};

const Welcome = () => {
  const ui = useUi();
  const { user } = ChatState();

  return (
    <Flex direction="column" align="center" justify="center" h="100%" textAlign="center" px={8}>
      <LogoMark boxSize="72px" mb={6} className="float-slow" />
      <Text fontSize="2xl" fontWeight="700" letterSpacing="-0.02em" mb={2}>
        Welcome, {user.name.split(" ")[0]}
      </Text>
      <Text color={ui.muted} maxW="340px">
        Pick a conversation on the left, or start a new one with the + button.
      </Text>
    </Flex>
  );
};

const ChatWindow = (props) => {
  const ui = useUi();
  const { selectedChat } = ChatState();

  return (
    <Flex
      as="main"
      direction="column"
      bg={ui.surface}
      borderRadius={{ base: 0, md: "3xl" }}
      borderWidth={{ base: 0, md: "1px" }}
      borderColor={ui.border}
      boxShadow={{ base: "none", md: "card" }}
      overflow="hidden"
      minW={0}
      {...props}
    >
      {selectedChat ? (
        // Keyed so every conversation starts from a clean slate
        <Conversation key={selectedChat._id} chat={selectedChat} />
      ) : (
        <Welcome />
      )}
    </Flex>
  );
};

export default ChatWindow;
