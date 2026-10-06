import { Box, Flex, IconButton, Link, Text, Tooltip } from "@chakra-ui/react";
import { memo } from "react";
import { useUi } from "../theme";
import { isReadByAll, splitLinks } from "../utils/chat";
import { formatDayLabel, formatTime, isSameDay } from "../utils/time";
import UserAvatar from "./UserAvatar";
import { CheckIcon, ClockIcon, DoubleCheckIcon, TrashIcon } from "./icons";

// Messages from the same person within this window share one visual run
const RUN_GAP = 5 * 60 * 1000;
const NAME_COLORS = ["#e5484d", "#d6409f", "#8e4ec6", "#3e63dd", "#0090ff", "#12a594", "#30a46c", "#f76b15"];

const nameColor = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return NAME_COLORS[hash % NAME_COLORS.length];
};

const sameRun = (a, b) =>
  a &&
  b &&
  a.sender._id === b.sender._id &&
  isSameDay(a.createdAt, b.createdAt) &&
  Math.abs(new Date(a.createdAt) - new Date(b.createdAt)) < RUN_GAP;

const DaySeparator = ({ date }) => {
  const ui = useUi();
  return (
    <Flex justify="center" my={4}>
      <Text
        fontSize="xs"
        fontWeight="600"
        color={ui.muted}
        bg={ui.surface}
        borderWidth="1px"
        borderColor={ui.border}
        px={3}
        py={1}
        borderRadius="full"
      >
        {formatDayLabel(date)}
      </Text>
    </Flex>
  );
};

const Content = ({ text, mine }) =>
  splitLinks(text).map((part, i) =>
    part.isLink ? (
      <Link
        key={i}
        href={part.text}
        isExternal
        textDecoration="underline"
        color={mine ? "white" : "brand.400"}
        wordBreak="break-all"
      >
        {part.text}
      </Link>
    ) : (
      part.text
    )
  );

const Status = ({ message, chat }) => {
  if (message.pending) return <ClockIcon boxSize="12px" ml={1} aria-label="Sending" />;
  if (isReadByAll(message, chat)) {
    return <DoubleCheckIcon boxSize="15px" ml={1} color="cyan.200" aria-label="Read" />;
  }
  return <CheckIcon boxSize="13px" ml={1} aria-label="Sent" />;
};

const Message = memo(({ message, previous, next, chat, mine, onDelete, onRetry }) => {
  const ui = useUi();
  const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
  const startsRun = newDay || !sameRun(previous, message);
  const endsRun = !sameRun(message, next);
  const showSender = chat.isGroupChat && !mine;
  const tail = endsRun ? "6px" : "18px";

  return (
    <>
      {newDay && <DaySeparator date={message.createdAt} />}
      <Flex
        justify={mine ? "flex-end" : "flex-start"}
        align="flex-end"
        mt={startsRun && !newDay ? 3 : "3px"}
        role="group"
        className={message.animate ? "message-in" : undefined}
      >
        {showSender &&
          (endsRun ? (
            <Tooltip label={message.sender.name} placement="left">
              <Box mr={2} flexShrink={0}>
                <UserAvatar user={message.sender} size="xs" boxSize="28px" />
              </Box>
            </Tooltip>
          ) : (
            <Box w="28px" mr={2} flexShrink={0} />
          ))}

        {mine && !message.deleted && !message.pending && !message.failed && (
          <Tooltip label="Delete message">
            <IconButton
              aria-label="Delete message"
              icon={<TrashIcon />}
              size="xs"
              variant="ghost"
              colorScheme="gray"
              borderRadius="full"
              mr={1}
              mb={1}
              opacity={0}
              _groupHover={{ opacity: 1 }}
              _focusVisible={{ opacity: 1, boxShadow: "outline" }}
              sx={{ "@media (hover: none)": { opacity: 0.55 } }}
              onClick={() => onDelete(message)}
            />
          </Tooltip>
        )}

        <Box maxW={{ base: "82%", md: "70%", xl: "60%" }} minW={0}>
          {showSender && startsRun && (
            <Text
              fontSize="xs"
              fontWeight="600"
              color={nameColor(message.sender._id)}
              ml={3}
              mb={0.5}
              isTruncated
            >
              {message.sender.name}
            </Text>
          )}
          <Box
            bg={mine ? "brand.500" : ui.bubbleIn}
            color={mine ? "white" : ui.text}
            px={3.5}
            py={2}
            fontSize="15px"
            lineHeight="1.4"
            borderRadius="18px"
            borderBottomRightRadius={mine ? tail : "18px"}
            borderBottomLeftRadius={mine ? "18px" : tail}
            opacity={message.pending ? 0.75 : 1}
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            overflow="hidden"
            sx={{ overflowWrap: "anywhere" }}
          >
            {message.deleted ? (
              <Text as="span" fontStyle="italic" opacity={0.7}>
                This message was deleted
              </Text>
            ) : (
              <Content text={message.content} mine={mine} />
            )}
            <Flex
              as="span"
              display="inline-flex"
              float="right"
              align="center"
              ml={3}
              mt="7px"
              mb="-2px"
              fontSize="11px"
              lineHeight="1"
              whiteSpace="nowrap"
              opacity={mine ? 0.85 : 1}
              color={mine ? "white" : ui.subtle}
            >
              {formatTime(message.createdAt)}
              {mine && !message.deleted && !message.failed && (
                <Status message={message} chat={chat} />
              )}
            </Flex>
          </Box>
          {message.failed && (
            <Text fontSize="xs" color="red.400" textAlign="right" mt={1}>
              Not sent ·{" "}
              <Link as="button" type="button" fontWeight="600" onClick={() => onRetry(message)}>
                Retry
              </Link>
            </Text>
          )}
        </Box>
      </Flex>
    </>
  );
});

const MessageList = ({ messages, chat, userId, onDelete, onRetry }) =>
  messages.map((message, i) => (
    <Message
      key={message.clientId || message._id}
      message={message}
      previous={messages[i - 1]}
      next={messages[i + 1]}
      chat={chat}
      mine={message.sender._id === userId}
      onDelete={onDelete}
      onRetry={onRetry}
    />
  ));

export default MessageList;
