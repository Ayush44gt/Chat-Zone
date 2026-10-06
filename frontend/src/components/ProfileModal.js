import {
  Box,
  Button,
  Collapse,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { fileToAvatar } from "../utils/chat";
import UserAvatar from "./UserAvatar";
import { CameraIcon } from "./icons";

const ABOUT_LIMIT = 140;

// The logged-in user's own profile and password
const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = ChatState();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [pic, setPic] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileInput = useRef();
  const toast = useToast();
  const ui = useUi();

  useEffect(() => {
    if (!isOpen || !user) return;
    setName(user.name);
    setAbout(user.about || "");
    setPic(user.pic || "");
    setChangingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!user) return null;

  const choosePicture = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPic(await fileToAvatar(file));
    } catch (error) {
      toast({
        title: error.message,
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const save = async (event) => {
    event.preventDefault();

    const problems = {};
    if (!name.trim()) problems.name = "Name cannot be empty";
    if (changingPassword) {
      if (!currentPassword) problems.currentPassword = "Enter your current password";
      if (newPassword.length < 6) problems.newPassword = "Use at least 6 characters";
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const payload = { name: name.trim(), about: about.trim() };
    if (pic !== (user.pic || "")) payload.pic = pic;
    if (changingPassword) Object.assign(payload, { currentPassword, newPassword });

    setSaving(true);
    try {
      const { data } = await api.put("/user/profile", payload);
      updateUser(data);
      toast({ title: "Profile updated", status: "success", duration: 2500, position: "top" });
      onClose();
    } catch (error) {
      const message = errorMessage(error, "Couldn't save your profile");
      if (/current password/i.test(message)) setErrors({ currentPassword: message });
      else {
        toast({
          title: "Couldn't save your profile",
          description: message,
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={save} maxH="90vh">
        <ModalHeader>Your profile</ModalHeader>
        <ModalCloseButton top={4} right={4} borderRadius="full" />

        <ModalBody>
          <Flex align="center" mb={5}>
            <Box position="relative">
              <UserAvatar user={{ ...user, name: name || user.name, pic }} size="xl" />
              <Flex
                as="button"
                type="button"
                aria-label="Change picture"
                onClick={() => fileInput.current.click()}
                position="absolute"
                bottom="0"
                right="0"
                boxSize="32px"
                borderRadius="full"
                bg="brand.500"
                color="white"
                align="center"
                justify="center"
                borderWidth="3px"
                borderColor={ui.surface}
                _hover={{ bg: "brand.600" }}
              >
                <CameraIcon boxSize={3.5} />
              </Flex>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={choosePicture}
              />
            </Box>
            <Box ml={4} minW={0}>
              <Text fontWeight="700" isTruncated>
                {user.name}
              </Text>
              <Text fontSize="sm" color={ui.muted} isTruncated>
                {user.email}
              </Text>
              {pic && (
                <Button
                  variant="link"
                  size="xs"
                  colorScheme="red"
                  mt={1}
                  onClick={() => setPic("")}
                >
                  Remove picture
                </Button>
              )}
            </Box>
          </Flex>

          <FormControl isInvalid={Boolean(errors.name)} mb={4}>
            <FormLabel fontSize="sm" mb={1}>
              Name
            </FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              borderRadius="xl"
            />
            <FormErrorMessage>{errors.name}</FormErrorMessage>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel fontSize="sm" mb={1}>
              About
            </FormLabel>
            <Textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={ABOUT_LIMIT}
              rows={2}
              resize="none"
              borderRadius="xl"
              placeholder="A short status others can see"
            />
            <FormHelperText fontSize="xs" textAlign="right" mt={1}>
              {about.length}/{ABOUT_LIMIT}
            </FormHelperText>
          </FormControl>

          <Button
            variant="link"
            size="sm"
            onClick={() => setChangingPassword((open) => !open)}
          >
            {changingPassword ? "Keep current password" : "Change password"}
          </Button>

          <Collapse in={changingPassword} animateOpacity>
            <Box pt={4}>
              <FormControl isInvalid={Boolean(errors.currentPassword)} mb={4}>
                <FormLabel fontSize="sm" mb={1}>
                  Current password
                </FormLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  borderRadius="xl"
                />
                <FormErrorMessage>{errors.currentPassword}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(errors.newPassword)}>
                <FormLabel fontSize="sm" mb={1}>
                  New password
                </FormLabel>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  borderRadius="xl"
                />
                <FormErrorMessage>{errors.newPassword}</FormErrorMessage>
              </FormControl>
            </Box>
          </Collapse>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" colorScheme="gray" onClick={onClose} mr={2}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProfileModal;
