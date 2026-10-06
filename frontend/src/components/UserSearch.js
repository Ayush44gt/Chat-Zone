import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  SkeletonCircle,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import UserAvatar from "./UserAvatar";
import { AlertIcon, SearchIcon } from "./icons";

// Debounced directory search. An empty query lists everyone.
export const useUserSearch = (query, enabled = true) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/user", { params: { search: query.trim() } });
        if (cancelled) return;
        setUsers(data);
        setError("");
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Failed to load people"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled, attempt]);

  return { users, loading, error, retry: () => setAttempt((n) => n + 1) };
};

export const SearchInput = ({ value, onChange, placeholder, inputRef, ...rest }) => {
  const ui = useUi();
  return (
    <InputGroup {...rest}>
      <InputLeftElement pointerEvents="none" h="100%">
        <SearchIcon color={ui.subtle} boxSize={4} />
      </InputLeftElement>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        variant="filled"
        bg={ui.surfaceAlt}
        borderRadius="xl"
        fontSize="sm"
        _hover={{ bg: ui.surfaceAlt }}
        _focus={{ bg: ui.surface, borderColor: "brand.400" }}
        _placeholder={{ color: ui.subtle }}
      />
    </InputGroup>
  );
};

export const UserRow = ({ user, label, onClick, right, isDisabled }) => {
  const ui = useUi();
  const { isOnline } = ChatState();
  const interactive = Boolean(onClick) && !isDisabled;

  return (
    <Flex
      as={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={onClick ? isDisabled : undefined}
      w="100%"
      align="center"
      textAlign="left"
      px={3}
      py={2.5}
      borderRadius="xl"
      opacity={isDisabled ? 0.5 : 1}
      cursor={interactive ? "pointer" : "default"}
      transition="background 0.15s"
      _hover={interactive ? { bg: ui.hover } : undefined}
      _focusVisible={{ boxShadow: "outline", outline: "none" }}
    >
      <UserAvatar user={user} online={isOnline(user._id)} size="sm" boxSize="38px" />
      <Box ml={3} minW={0} flex="1">
        <Text fontWeight="600" fontSize="sm" isTruncated>
          {label || user.name}
        </Text>
        <Text fontSize="xs" color={ui.muted} isTruncated>
          {user.email}
        </Text>
      </Box>
      {right}
    </Flex>
  );
};

export const UserListSkeleton = ({ rows = 5 }) => (
  <Box>
    {Array.from({ length: rows }).map((_, i) => (
      <Flex key={i} align="center" px={3} py={2.5}>
        <SkeletonCircle size="38px" />
        <Box ml={3} flex="1">
          <Skeleton h="12px" w="45%" mb={2} borderRadius="md" />
          <Skeleton h="10px" w="65%" borderRadius="md" />
        </Box>
      </Flex>
    ))}
  </Box>
);

// Loading, error, empty and result states for a people list
export const UserResults = ({ search, emptyText, renderUser }) => {
  const ui = useUi();
  const { users, loading, error, retry } = search;

  if (loading && users.length === 0) return <UserListSkeleton />;

  if (error) {
    return (
      <Flex direction="column" align="center" py={8} px={4} textAlign="center">
        <AlertIcon boxSize={6} color="red.400" mb={2} />
        <Text fontSize="sm" color={ui.muted} mb={3}>
          {error}
        </Text>
        <Button size="sm" variant="outline" onClick={retry}>
          Try again
        </Button>
      </Flex>
    );
  }

  if (users.length === 0) {
    return (
      <Text fontSize="sm" color={ui.muted} textAlign="center" py={8}>
        {emptyText}
      </Text>
    );
  }

  return (
    <Box opacity={loading ? 0.6 : 1} transition="opacity 0.15s">
      {users.map(renderUser)}
    </Box>
  );
};
