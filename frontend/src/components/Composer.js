import {
  Box,
  Flex,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  SimpleGrid,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { SendIcon, SmileIcon } from "./icons";

const MAX_LENGTH = 4000;
const MAX_HEIGHT = 140;
// How long after the last keystroke the typing indicator is withdrawn
const TYPING_IDLE = 2500;
const EMOJIS = [
  "😀", "😂", "🥲", "😊", "😍", "😎", "🤔", "😴",
  "😭", "😅", "🙄", "😤", "🥳", "🤯", "😇", "🤝",
  "👍", "👎", "👏", "🙏", "💪", "👀", "👋", "✌️",
  "❤️", "🔥", "🎉", "✨", "💯", "✅", "❌", "🚀",
  "☕", "🍕", "🎂", "🌸", "🏔️", "📷", "💡", "🐢",
];

const Composer = ({ chatId, onSend }) => {
  const ui = useUi();
  const { socket, composerRef: input } = ChatState();
  const [text, setText] = useState("");
  const typing = useRef(false);
  const idleTimer = useRef();

  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (typing.current && socket) socket.emit("stop typing", { chatId });
    typing.current = false;
  }, [socket, chatId]);

  // Never leave a stale indicator behind when the chat is closed
  useEffect(() => stopTyping, [stopTyping]);

  // Focus the box on desktop; a dialog that is still open hands focus over itself
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (input.current && !document.querySelector('[aria-modal="true"]')) input.current.focus();
  }, [chatId, input]);

  // Grow with the text, up to a few lines
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, input]);

  const change = (value) => {
    setText(value);

    if (!socket) return;
    if (!value.trim()) return stopTyping();

    if (!typing.current) {
      typing.current = true;
      socket.emit("typing", { chatId });
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE);
  };

  const send = () => {
    const content = text.trim();
    if (!content) return;
    stopTyping();
    setText("");
    onSend(content);
    if (input.current) input.current.focus();
  };

  const onKeyDown = (event) => {
    // Enter sends, Shift+Enter adds a line; ignore Enter while an IME is composing
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const remaining = MAX_LENGTH - text.length;

  return (
    <Box px={{ base: 3, md: 5 }} pb={{ base: 3, md: 4 }} pt={2}>
      <Flex
        align="flex-end"
        bg={ui.surfaceAlt}
        borderRadius="24px"
        borderWidth="1px"
        borderColor="transparent"
        px={1.5}
        py={1.5}
        transition="border-color 0.15s, background 0.15s"
        _focusWithin={{ borderColor: "brand.400", bg: ui.surface }}
      >
        <Popover placement="top-start" isLazy>
          {({ onClose }) => (
            <>
              <PopoverTrigger>
                <IconButton
                  aria-label="Insert emoji"
                  icon={<SmileIcon boxSize={5} />}
                  variant="ghost"
                  colorScheme="gray"
                  borderRadius="full"
                  color={ui.muted}
                  flexShrink={0}
                />
              </PopoverTrigger>
              <PopoverContent w="auto" borderRadius="2xl" bg={ui.surface} borderColor={ui.border} boxShadow="card">
                <PopoverBody p={2}>
                  <SimpleGrid columns={8} spacing={0.5}>
                    {EMOJIS.map((emoji) => (
                      <Flex
                        key={emoji}
                        as="button"
                        type="button"
                        aria-label={`Insert ${emoji}`}
                        boxSize="34px"
                        align="center"
                        justify="center"
                        fontSize="20px"
                        borderRadius="lg"
                        _hover={{ bg: ui.hover }}
                        onClick={() => {
                          change((text + emoji).slice(0, MAX_LENGTH));
                          onClose();
                          if (input.current) input.current.focus();
                        }}
                      >
                        {emoji}
                      </Flex>
                    ))}
                  </SimpleGrid>
                </PopoverBody>
              </PopoverContent>
            </>
          )}
        </Popover>

        <Textarea
          ref={input}
          value={text}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={stopTyping}
          placeholder="Write a message"
          aria-label="Message"
          maxLength={MAX_LENGTH}
          rows={1}
          variant="unstyled"
          resize="none"
          minH="40px"
          maxH={`${MAX_HEIGHT}px`}
          py="9px"
          px={2}
          fontSize="15px"
          lineHeight="1.45"
          _placeholder={{ color: ui.subtle }}
        />

        <IconButton
          aria-label="Send message"
          icon={<SendIcon boxSize={4} />}
          borderRadius="full"
          flexShrink={0}
          isDisabled={!text.trim()}
          onClick={send}
          transition="transform 0.15s, background 0.15s"
          _active={{ transform: "scale(0.92)" }}
        />
      </Flex>
      {remaining <= 200 && (
        <Text fontSize="xs" color={remaining === 0 ? "red.400" : ui.subtle} textAlign="right" mt={1} mr={3}>
          {remaining} characters left
        </Text>
      )}
    </Box>
  );
};

export default Composer;
