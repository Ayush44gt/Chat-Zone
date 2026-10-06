import {
  Box,
  Button,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Skeleton,
  SkeletonCircle,
  Text,
  Tooltip,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { getChatName, getOtherUser, getPreview } from "../utils/chat";
import { formatListTime } from "../utils/time";
import GroupChatModal from "./GroupChatModal";
import NewChatModal from "./NewChatModal";
import ProfileModal from "./ProfileModal";
import UserAvatar from "./UserAvatar";
import {
  AlertIcon,
  LogoMark,
  LogoutIcon,
  MessageIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "./icons";
import { SearchInput } from "./UserSearch";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
];

const ChatListSkeleton = () => (
  <Box px={2}>
    {Array.from({ length: 8 }).map((_, i) => (
      <Flex key={i} align="center" px={3} py={3}>
        <SkeletonCircle size="48px" />
        <Box ml={3} flex="1">
          <Skeleton h="12px" w={`${40 + ((i * 17) % 30)}%`} mb={2.5} borderRadius="md" />
          <Skeleton h="10px" w={`${60 + ((i * 13) % 30)}%`} borderRadius="md" />
        </Box>
      </Flex>
    ))}
  </Box>
);

const ChatListItem = ({ chat, isActive, onSelect }) => {
  const ui = useUi();
  const { user, isOnline, typing } = ChatState();
  const other = getOtherUser(user, chat);
  const typists = Object.values(typing[chat._id] || {});
  const unread = chat.unreadCount || 0;

  let preview = getPreview(user, chat);
  if (typists.length > 0) {
    preview = chat.isGroupChat ? `${typists[0].split(" ")[0]} is typing…` : "typing…";
  }

  return (
    <Flex
      as="button"
      type="button"
      onClick={onSelect}
      w="100%"
      align="center"
      textAlign="left"
      px={3}
      py={2.5}
      borderRadius="2xl"
      bg={isActive ? ui.active : "transparent"}
      transition="background 0.15s"
      _hover={{ bg: isActive ? ui.active : ui.hover }}
      _focusVisible={{ boxShadow: "outline", outline: "none" }}
      aria-current={isActive ? "true" : undefined}
    >
      {chat.isGroupChat ? (
        <UserAvatar group boxSize="48px" />
      ) : (
        <UserAvatar user={other} online={other && isOnline(other._id)} boxSize="48px" />
      )}
      <Box ml={3} minW={0} flex="1">
        <Flex align="baseline" justify="space-between">
          <Text fontWeight={unread ? "700" : "600"} fontSize="15px" isTruncated>
            {getChatName(user, chat)}
          </Text>
          <Text
            fontSize="xs"
            color={unread ? ui.accent : ui.subtle}
            fontWeight={unread ? "600" : "400"}
            ml={2}
            flexShrink={0}
          >
            {formatListTime(chat.latestMessage ? chat.latestMessage.createdAt : chat.updatedAt)}
          </Text>
        </Flex>
        <Flex align="center" justify="space-between" mt={0.5}>
          <Text
            fontSize="13px"
            color={typists.length > 0 ? ui.accent : unread ? ui.text : ui.muted}
            fontWeight={unread && typists.length === 0 ? "500" : "400"}
            fontStyle={chat.latestMessage && chat.latestMessage.deleted ? "italic" : "normal"}
            isTruncated
          >
            {preview}
          </Text>
          {unread > 0 && (
            <Flex
              ml={2}
              minW="20px"
              h="20px"
              px={1.5}
              borderRadius="full"
              bg="brand.500"
              color="white"
              fontSize="11px"
              fontWeight="700"
              align="center"
              justify="center"
              flexShrink={0}
              aria-label={`${unread} unread`}
            >
              {unread > 99 ? "99+" : unread}
            </Flex>
          )}
        </Flex>
      </Box>
    </Flex>
  );
};

const EmptyList = ({ icon, title, children }) => {
  const ui = useUi();
  return (
    <Flex direction="column" align="center" textAlign="center" px={8} py={12}>
      <Flex boxSize="56px" borderRadius="2xl" bg={ui.surfaceAlt} align="center" justify="center" mb={4}>
        {icon}
      </Flex>
      <Text fontWeight="600" mb={1}>
        {title}
      </Text>
      <Box fontSize="sm" color={ui.muted}>
        {children}
      </Box>
    </Flex>
  );
};

const Sidebar = (props) => {
  const ui = useUi();
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    user,
    logout,
    chats,
    chatsLoading,
    chatsError,
    fetchChats,
    selectedChat,
    selectChat,
    connected,
  } = ChatState();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const newChat = useDisclosure();
  const newGroup = useDisclosure();
  const profile = useDisclosure();

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (filter === "unread" && !chat.unreadCount) return false;
      if (filter === "groups" && !chat.isGroupChat) return false;
      return !term || getChatName(user, chat).toLowerCase().includes(term);
    });
  }, [chats, query, filter, user]);

  const unreadChats = chats.filter((c) => c.unreadCount > 0).length;

  // Only mention the connection once it has been down for a moment
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (connected) return setOffline(false);
    const timer = setTimeout(() => setOffline(true), 2500);
    return () => clearTimeout(timer);
  }, [connected]);

  let body;
  if (chatsLoading && chats.length === 0) {
    body = <ChatListSkeleton />;
  } else if (chatsError && chats.length === 0) {
    body = (
      <EmptyList icon={<AlertIcon boxSize={6} color="red.400" />} title="Couldn't load your chats">
        <Text mb={4}>{chatsError}</Text>
        <Button size="sm" variant="outline" onClick={() => fetchChats()}>
          Try again
        </Button>
      </EmptyList>
    );
  } else if (chats.length === 0) {
    body = (
      <EmptyList icon={<MessageIcon boxSize={6} color={ui.accent} />} title="No conversations yet">
        <Text mb={4}>Find someone to talk to and your chats will show up here.</Text>
        <Button size="sm" leftIcon={<PlusIcon />} onClick={newChat.onOpen}>
          Start a chat
        </Button>
      </EmptyList>
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyList icon={<MessageIcon boxSize={6} color={ui.subtle} />} title="Nothing here">
        {query
          ? `No chats match “${query}”.`
          : filter === "unread"
          ? "You're all caught up."
          : "You are not in any groups yet."}
      </EmptyList>
    );
  } else {
    body = (
      <Box px={2} pb={2}>
        {visible.map((chat) => (
          <ChatListItem
            key={chat._id}
            chat={chat}
            isActive={Boolean(selectedChat) && selectedChat._id === chat._id}
            onSelect={() => selectChat(chat._id)}
          />
        ))}
      </Box>
    );
  }

  return (
    <Flex
      as="aside"
      direction="column"
      bg={ui.surface}
      borderRadius={{ base: 0, md: "3xl" }}
      borderWidth={{ base: 0, md: "1px" }}
      borderColor={ui.border}
      boxShadow={{ base: "none", md: "card" }}
      overflow="hidden"
      {...props}
    >
      <Flex align="center" px={4} pt={4} pb={3}>
        <LogoMark boxSize="34px" />
        <Text fontSize="xl" fontWeight="700" letterSpacing="-0.02em" ml={2.5}>
          ChatZone
        </Text>

        <Flex ml="auto" align="center">
          <Tooltip label={colorMode === "light" ? "Dark mode" : "Light mode"}>
            <IconButton
              aria-label="Toggle colour mode"
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              variant="ghost"
              colorScheme="gray"
              borderRadius="full"
              size="sm"
              onClick={toggleColorMode}
            />
          </Tooltip>

          <Menu placement="bottom-end">
            <MenuButton
              as={IconButton}
              aria-label="New conversation"
              title="New conversation"
              icon={<PlusIcon />}
              borderRadius="full"
              size="sm"
              mx={1.5}
            />
            <MenuList minW="190px">
              <MenuItem icon={<MessageIcon boxSize={4} />} onClick={newChat.onOpen}>
                New chat
              </MenuItem>
              <MenuItem icon={<UsersIcon boxSize={4} />} onClick={newGroup.onOpen}>
                New group
              </MenuItem>
            </MenuList>
          </Menu>

          <Menu placement="bottom-end">
            <MenuButton aria-label="Account menu" borderRadius="full" _focusVisible={{ boxShadow: "outline" }}>
              <UserAvatar user={user} size="sm" boxSize="34px" />
            </MenuButton>
            <MenuList minW="220px">
              <Box px={3} py={2}>
                <Text fontWeight="600" fontSize="sm" isTruncated>
                  {user.name}
                </Text>
                <Text fontSize="xs" color={ui.muted} isTruncated>
                  {user.email}
                </Text>
              </Box>
              <MenuDivider />
              <MenuItem icon={<UserIcon boxSize={4} />} onClick={profile.onOpen}>
                Profile & password
              </MenuItem>
              <MenuItem icon={<LogoutIcon boxSize={4} />} color="red.400" onClick={logout}>
                Log out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <Box px={4}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search chats" />
        <Flex mt={3} mb={2}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <Button
                key={key}
                size="xs"
                h="28px"
                px={3}
                mr={1.5}
                borderRadius="full"
                variant={active ? "solid" : "ghost"}
                colorScheme={active ? "brand" : "gray"}
                color={active ? undefined : ui.muted}
                fontWeight="600"
                onClick={() => setFilter(key)}
                aria-pressed={active}
              >
                {label}
                {key === "unread" && unreadChats > 0 && ` · ${unreadChats}`}
              </Button>
            );
          })}
        </Flex>
      </Box>

      {offline && (
        <Flex
          mx={4}
          mb={2}
          px={3}
          py={2}
          borderRadius="xl"
          bg="orange.400"
          color="white"
          fontSize="xs"
          fontWeight="600"
          align="center"
        >
          <AlertIcon boxSize={3.5} mr={2} />
          Reconnecting… new messages may be delayed
        </Flex>
      )}

      <Box flex="1" overflowY="auto" pt={1}>
        {body}
      </Box>

      <NewChatModal isOpen={newChat.isOpen} onClose={newChat.onClose} />
      <GroupChatModal isOpen={newGroup.isOpen} onClose={newGroup.onClose} />
      <ProfileModal isOpen={profile.isOpen} onClose={profile.onClose} />
    </Flex>
  );
};

export default Sidebar;
