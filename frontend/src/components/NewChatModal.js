import {
  Box,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { SearchInput, UserResults, UserRow, useUserSearch } from "./UserSearch";

const NewChatModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const searchInput = useRef();
  const search = useUserSearch(query, isOpen);
  const { upsertChat, selectChat, composerRef } = ChatState();
  const toast = useToast();
  const ui = useUi();

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  const openChat = async (userId) => {
    if (openingId) return;
    setOpeningId(userId);
    try {
      const { data } = await api.post("/chat", { userId });
      upsertChat(data);
      selectChat(data._id);
      onClose();
    } catch (error) {
      toast({
        title: "Couldn't open the chat",
        description: errorMessage(error),
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside" isCentered finalFocusRef={composerRef} initialFocusRef={searchInput}>
      <ModalOverlay />
      <ModalContent maxH="min(620px, 85vh)">
        <ModalHeader pb={1}>
          New chat
          <Text fontSize="sm" fontWeight="400" color={ui.muted} mt={1}>
            Search by name or email to start a conversation.
          </Text>
        </ModalHeader>
        <ModalCloseButton top={4} right={4} borderRadius="full" />
        <Box px={6} pt={2} pb={3}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search people" inputRef={searchInput} />
        </Box>
        <ModalBody px={3} pb={4} pt={0}>
          <UserResults
            search={search}
            emptyText={query ? `No one matches “${query}”` : "No other users yet"}
            renderUser={(person) => (
              <UserRow
                key={person._id}
                user={person}
                onClick={() => openChat(person._id)}
                isDisabled={Boolean(openingId) && openingId !== person._id}
                right={openingId === person._id ? <Spinner size="sm" color="brand.400" /> : null}
              />
            )}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default NewChatModal;
