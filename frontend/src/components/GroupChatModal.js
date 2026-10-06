import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { CheckIcon } from "./icons";
import { SearchInput, UserResults, UserRow, useUserSearch } from "./UserSearch";

const MIN_MEMBERS = 2;

const GroupChatModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const nameInput = useRef();
  const search = useUserSearch(query, isOpen);
  const { upsertChat, selectChat, composerRef } = ChatState();
  const toast = useToast();
  const ui = useUi();

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setQuery("");
    setSelected([]);
  }, [isOpen]);

  const toggle = (person) =>
    setSelected((current) =>
      current.some((u) => u._id === person._id)
        ? current.filter((u) => u._id !== person._id)
        : [...current, person]
    );

  const canCreate = name.trim() && selected.length >= MIN_MEMBERS;

  const createGroup = async (event) => {
    event.preventDefault();
    if (!canCreate || saving) return;

    setSaving(true);
    try {
      const { data } = await api.post("/chat/group", {
        name: name.trim(),
        users: selected.map((u) => u._id),
      });
      upsertChat(data);
      selectChat(data._id);
      onClose();
      toast({
        title: "Group created",
        status: "success",
        duration: 2500,
        position: "top",
      });
    } catch (error) {
      toast({
        title: "Couldn't create the group",
        description: errorMessage(error),
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside" isCentered finalFocusRef={composerRef} initialFocusRef={nameInput}>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={createGroup} maxH="min(680px, 90vh)">
        <ModalHeader pb={1}>
          New group
          <Text fontSize="sm" fontWeight="400" color={ui.muted} mt={1}>
            Name it and add at least {MIN_MEMBERS} people.
          </Text>
        </ModalHeader>
        <ModalCloseButton top={4} right={4} borderRadius="full" />

        <Box px={6} pt={2}>
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>
              Group name
            </FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Trek"
              maxLength={60}
              borderRadius="xl"
              ref={nameInput}
            />
          </FormControl>

          {selected.length > 0 && (
            <Flex wrap="wrap" mt={3} mx={-1}>
              {selected.map((person) => (
                <Tag key={person._id} m={1} size="md" borderRadius="full" colorScheme="brand">
                  <TagLabel>{person.name}</TagLabel>
                  <TagCloseButton
                    aria-label={`Remove ${person.name}`}
                    onClick={() => toggle(person)}
                  />
                </Tag>
              ))}
            </Flex>
          )}

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search people to add"
            mt={3}
            mb={2}
          />
        </Box>

        <ModalBody px={3} py={0}>
          <UserResults
            search={search}
            emptyText={query ? `No one matches “${query}”` : "No other users yet"}
            renderUser={(person) => {
              const isSelected = selected.some((u) => u._id === person._id);
              return (
                <UserRow
                  key={person._id}
                  user={person}
                  onClick={() => toggle(person)}
                  right={
                    <Flex
                      boxSize="22px"
                      borderRadius="full"
                      align="center"
                      justify="center"
                      borderWidth="2px"
                      borderColor={isSelected ? "brand.500" : ui.border}
                      bg={isSelected ? "brand.500" : "transparent"}
                      transition="all 0.15s"
                      flexShrink={0}
                    >
                      {isSelected && <CheckIcon boxSize={3} color="white" />}
                    </Flex>
                  }
                />
              );
            }}
          />
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor={ui.border} mt={2}>
          <Text fontSize="xs" color={ui.muted} mr="auto">
            {selected.length} selected
          </Text>
          <Button variant="ghost" colorScheme="gray" onClick={onClose} mr={2}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!canCreate} isLoading={saving}>
            Create group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GroupChatModal;
