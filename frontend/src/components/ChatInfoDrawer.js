import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  Input,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { getOtherUser, isAdminOf } from "../utils/chat";
import { formatLastSeen } from "../utils/time";
import ConfirmDialog from "./ConfirmDialog";
import UserAvatar from "./UserAvatar";
import { ArrowLeftIcon, CloseIcon, EditIcon, LogoutIcon, TrashIcon, UserPlusIcon } from "./icons";
import { SearchInput, UserResults, UserRow, useUserSearch } from "./UserSearch";

const SectionLabel = ({ children }) => {
  const ui = useUi();
  return (
    <Text
      fontSize="xs"
      fontWeight="600"
      letterSpacing="0.06em"
      textTransform="uppercase"
      color={ui.subtle}
      mb={1}
    >
      {children}
    </Text>
  );
};

const Detail = ({ label, children }) => (
  <Box mb={5}>
    <SectionLabel>{label}</SectionLabel>
    <Text fontSize="sm" wordBreak="break-word">
      {children}
    </Text>
  </Box>
);

const PersonInfo = ({ person }) => {
  const ui = useUi();
  const { isOnline, lastSeen } = ChatState();

  if (!person) {
    return (
      <Text color={ui.muted} fontSize="sm" textAlign="center" mt={10}>
        This account no longer exists.
      </Text>
    );
  }

  const online = isOnline(person._id);

  return (
    <>
      <Flex direction="column" align="center" textAlign="center" mb={8} mt={2}>
        <UserAvatar user={person} online={online} size="2xl" mb={4} />
        <Text fontSize="xl" fontWeight="700" wordBreak="break-word">
          {person.name}
        </Text>
        <Text fontSize="sm" color={online ? "green.400" : ui.muted} mt={1}>
          {online ? "Online" : formatLastSeen(lastSeen[person._id] || person.lastSeen)}
        </Text>
        {person.isAdmin && (
          <Badge colorScheme="brand" borderRadius="full" px={2} mt={2}>
            ChatZone admin
          </Badge>
        )}
      </Flex>
      {person.about && <Detail label="About">{person.about}</Detail>}
      <Detail label="Email">{person.email}</Detail>
      {person.createdAt && (
        <Detail label="Joined">
          {new Date(person.createdAt).toLocaleDateString([], {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Detail>
      )}
    </>
  );
};

const AddMembers = ({ chat, onBack, run, busy }) => {
  const [query, setQuery] = useState("");
  const search = useUserSearch(query);
  const memberIds = chat.users.map((u) => u._id);
  const candidates = {
    ...search,
    users: search.users.filter((u) => !memberIds.includes(u._id)),
  };

  return (
    <>
      <Button
        variant="ghost"
        colorScheme="gray"
        size="sm"
        leftIcon={<ArrowLeftIcon />}
        onClick={onBack}
        mb={3}
        ml={-2}
      >
        Back to group
      </Button>
      <SearchInput value={query} onChange={setQuery} placeholder="Search people to add" mb={2} />
      <Box mx={-3}>
        <UserResults
          search={candidates}
          emptyText={query ? `No one else matches “${query}”` : "Everyone is already here"}
          renderUser={(person) => (
            <UserRow
              key={person._id}
              user={person}
              right={
                <Button
                  size="xs"
                  variant="outline"
                  isLoading={busy === `add:${person._id}`}
                  isDisabled={Boolean(busy)}
                  onClick={() =>
                    run(`add:${person._id}`, () =>
                      api.put("/chat/groupadd", { chatId: chat._id, userId: person._id })
                    )
                  }
                >
                  Add
                </Button>
              }
            />
          )}
        />
      </Box>
    </>
  );
};

const GroupInfo = ({ chat, onClose }) => {
  const ui = useUi();
  const { user, upsertChat, removeChat } = ChatState();
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(chat.chatName);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(null);

  const amAdmin = isAdminOf(user._id, chat);
  const adminId = chat.groupAdmin && chat.groupAdmin._id;
  // Admin first, then yourself, then everyone else by name
  const members = [...chat.users].sort((a, b) => {
    const rank = (u) => (u._id === adminId ? 0 : u._id === user._id ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  const fail = (title, error) =>
    toast({
      title,
      description: errorMessage(error),
      status: "error",
      duration: 4000,
      isClosable: true,
      position: "top",
    });

  // Runs a membership change and applies the chat the server sends back
  const run = async (key, request, failTitle = "Couldn't update the group") => {
    setBusy(key);
    try {
      const { data } = await request();
      if (data.removed) removeChat(chat._id);
      else upsertChat(data);
      return true;
    } catch (error) {
      fail(failTitle, error);
      return false;
    } finally {
      setBusy("");
    }
  };

  const rename = async (event) => {
    event.preventDefault();
    const next = name.trim();
    if (!next || next === chat.chatName) return setRenaming(false);
    if (
      await run("rename", () => api.put("/chat/rename", { chatId: chat._id, chatName: next }))
    ) {
      setRenaming(false);
    }
  };

  const confirmAction = async () => {
    const action = confirm;
    let done = false;

    if (action.type === "remove") {
      done = await run("confirm", () =>
        api.put("/chat/groupremove", { chatId: chat._id, userId: action.person._id })
      );
    } else if (action.type === "leave") {
      setBusy("confirm");
      try {
        await api.put("/chat/groupremove", { chatId: chat._id, userId: user._id });
        done = true;
      } catch (error) {
        fail("Couldn't leave the group", error);
      }
      setBusy("");
    } else if (action.type === "delete") {
      setBusy("confirm");
      try {
        await api.delete(`/chat/group/${chat._id}`);
        done = true;
      } catch (error) {
        fail("Couldn't delete the group", error);
      }
      setBusy("");
    }

    setConfirm(null);
    if (done && action.type !== "remove") {
      onClose();
      removeChat(chat._id);
      toast({
        title: action.type === "leave" ? "You left the group" : "Group deleted",
        status: "success",
        duration: 2500,
        position: "top",
      });
    }
  };

  if (adding) {
    return <AddMembers chat={chat} onBack={() => setAdding(false)} run={run} busy={busy} />;
  }

  return (
    <>
      <Flex direction="column" align="center" textAlign="center" mb={7} mt={2}>
        <UserAvatar group size="2xl" mb={4} />
        {renaming ? (
          <Flex as="form" onSubmit={rename} w="100%" align="center">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              borderRadius="xl"
              autoFocus
              aria-label="Group name"
            />
            <Button type="submit" ml={2} isLoading={busy === "rename"} isDisabled={!name.trim()}>
              Save
            </Button>
            <IconButton
              aria-label="Cancel rename"
              icon={<CloseIcon />}
              variant="ghost"
              colorScheme="gray"
              ml={1}
              onClick={() => {
                setName(chat.chatName);
                setRenaming(false);
              }}
            />
          </Flex>
        ) : (
          <Flex align="center" maxW="100%">
            <Text fontSize="xl" fontWeight="700" wordBreak="break-word">
              {chat.chatName}
            </Text>
            <Tooltip label="Rename group">
              <IconButton
                aria-label="Rename group"
                icon={<EditIcon />}
                size="sm"
                variant="ghost"
                colorScheme="gray"
                ml={1}
                flexShrink={0}
                onClick={() => {
                  setName(chat.chatName);
                  setRenaming(true);
                }}
              />
            </Tooltip>
          </Flex>
        )}
        <Text fontSize="sm" color={ui.muted} mt={1}>
          Group · {chat.users.length} {chat.users.length === 1 ? "member" : "members"}
        </Text>
      </Flex>

      <Flex align="center" justify="space-between" mb={1}>
        <SectionLabel>Members</SectionLabel>
        {amAdmin && (
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<UserPlusIcon />}
            onClick={() => setAdding(true)}
          >
            Add people
          </Button>
        )}
      </Flex>

      <Box mx={-3} mb={6}>
        {members.map((person) => (
          <UserRow
            key={person._id}
            user={person._id === user._id ? { ...person, name: `${person.name} (you)` } : person}
            right={
              <Flex align="center" flexShrink={0} ml={2}>
                {person._id === adminId && (
                  <Badge colorScheme="brand" borderRadius="full" px={2} fontSize="0.65rem">
                    Admin
                  </Badge>
                )}
                {amAdmin && person._id !== user._id && (
                  <Tooltip label={`Remove ${person.name}`}>
                    <IconButton
                      aria-label={`Remove ${person.name}`}
                      icon={<CloseIcon />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      ml={1}
                      onClick={() => setConfirm({ type: "remove", person })}
                    />
                  </Tooltip>
                )}
              </Flex>
            }
          />
        ))}
      </Box>

      <Button
        variant="ghost"
        colorScheme="red"
        leftIcon={<LogoutIcon />}
        justifyContent="flex-start"
        w="100%"
        onClick={() => setConfirm({ type: "leave" })}
      >
        Leave group
      </Button>
      {amAdmin && (
        <Button
          variant="ghost"
          colorScheme="red"
          leftIcon={<TrashIcon />}
          justifyContent="flex-start"
          w="100%"
          mt={1}
          onClick={() => setConfirm({ type: "delete" })}
        >
          Delete group for everyone
        </Button>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        isLoading={busy === "confirm"}
        title={
          !confirm
            ? ""
            : confirm.type === "remove"
            ? `Remove ${confirm.person.name}?`
            : confirm.type === "leave"
            ? "Leave this group?"
            : "Delete this group?"
        }
        confirmLabel={
          !confirm ? "" : confirm.type === "remove" ? "Remove" : confirm.type === "leave" ? "Leave" : "Delete"
        }
      >
        {confirm && confirm.type === "remove" &&
          "They will no longer see new messages in this group."}
        {confirm && confirm.type === "leave" &&
          (amAdmin && chat.users.length > 1
            ? "You are the admin, so another member will take over. You will stop receiving messages from this group."
            : "You will stop receiving messages from this group.")}
        {confirm && confirm.type === "delete" &&
          "The group and all of its messages will be deleted for every member. This cannot be undone."}
      </ConfirmDialog>
    </>
  );
};

const ChatInfoDrawer = ({ isOpen, onClose, chat }) => {
  const { user } = ChatState();
  const ui = useUi();

  // Close if the chat disappears (left, removed or deleted) while open
  useEffect(() => {
    if (isOpen && !chat) onClose();
  }, [isOpen, chat, onClose]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton top={4} right={4} borderRadius="full" />
        <DrawerHeader borderBottomWidth="1px" borderColor={ui.border} fontSize="md">
          {chat && chat.isGroupChat ? "Group info" : "Contact info"}
        </DrawerHeader>
        <DrawerBody py={6}>
          {chat &&
            (chat.isGroupChat ? (
              <GroupInfo key={chat._id} chat={chat} onClose={onClose} />
            ) : (
              <PersonInfo person={getOtherUser(user, chat)} />
            ))}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ChatInfoDrawer;
