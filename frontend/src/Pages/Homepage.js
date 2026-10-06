import { Box, Button, Flex, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { useState } from "react";
import api, { errorMessage } from "../api";
import { FormError, LoginForm, SignupForm } from "../components/AuthForms";
import {
  LogoMark,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  UsersIcon,
  ZapIcon,
} from "../components/icons";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";

const GUEST = { email: "guest@example.com", password: "123456" };

const FEATURES = [
  { icon: ZapIcon, title: "Instant delivery", text: "Messages are pushed the moment they are sent." },
  { icon: UsersIcon, title: "Groups that work", text: "Admins manage members; everyone sees changes live." },
  { icon: ShieldIcon, title: "Members only", text: "Only people in a conversation can read it." },
];

const PreviewBubble = ({ mine, children, delay }) => (
  <Flex justify={mine ? "flex-end" : "flex-start"} mb={2}>
    <Box
      className="message-in"
      style={{ animationDelay: delay, animationFillMode: "backwards" }}
      bg={mine ? "white" : "whiteAlpha.300"}
      color={mine ? "brand.700" : "white"}
      px={3.5}
      py={2}
      fontSize="sm"
      fontWeight="500"
      borderRadius="18px"
      borderBottomRightRadius={mine ? "6px" : "18px"}
      borderBottomLeftRadius={mine ? "18px" : "6px"}
      maxW="80%"
    >
      {children}
    </Box>
  </Flex>
);

const BrandPanel = () => (
  <Flex
    d={{ base: "none", lg: "flex" }}
    flex="1"
    direction="column"
    justify="space-between"
    position="relative"
    overflow="hidden"
    color="white"
    p={12}
    bgGradient="linear(135deg, #4832cb 0%, #6457f3 45%, #9a6bff 100%)"
  >
    <Box
      position="absolute"
      top="-120px"
      right="-120px"
      boxSize="380px"
      borderRadius="full"
      bg="whiteAlpha.200"
      filter="blur(10px)"
    />
    <Box
      position="absolute"
      bottom="-160px"
      left="-100px"
      boxSize="420px"
      borderRadius="full"
      bg="blackAlpha.200"
      filter="blur(10px)"
    />

    <Flex align="center" position="relative">
      <Flex boxSize="40px" borderRadius="xl" bg="white" align="center" justify="center">
        <LogoMark boxSize="40px" />
      </Flex>
      <Text fontSize="xl" fontWeight="700" ml={3} letterSpacing="-0.02em">
        ChatZone
      </Text>
    </Flex>

    <Box position="relative" maxW="460px">
      <Text fontSize="4xl" fontWeight="700" lineHeight="1.1" letterSpacing="-0.03em" mb={4}>
        Conversations that keep up with you.
      </Text>
      <Text fontSize="lg" opacity={0.85} mb={8}>
        Real-time 1:1 and group messaging with typing indicators, read receipts and presence.
      </Text>

      <Box
        className="float-slow"
        bg="whiteAlpha.200"
        borderWidth="1px"
        borderColor="whiteAlpha.300"
        borderRadius="3xl"
        p={5}
        backdropFilter="blur(12px)"
        maxW="380px"
      >
        <PreviewBubble delay="0.2s">Trek is ON for Saturday ☀️</PreviewBubble>
        <PreviewBubble mine delay="0.7s">
          I can take four people
        </PreviewBubble>
        <PreviewBubble delay="1.2s">Bringing parathas for everyone</PreviewBubble>
      </Box>
    </Box>

    <Flex position="relative" wrap="wrap" mx={-3}>
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <Box key={title} flex="1" minW="150px" px={3}>
          <Icon boxSize={5} mb={2} />
          <Text fontWeight="600" fontSize="sm">
            {title}
          </Text>
          <Text fontSize="xs" opacity={0.8}>
            {text}
          </Text>
        </Box>
      ))}
    </Flex>
  </Flex>
);

function Homepage() {
  const ui = useUi();
  const { colorMode, toggleColorMode } = useColorMode();
  const { login } = ChatState();
  const [mode, setMode] = useState("login");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  const loginAsGuest = async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      const { data } = await api.post("/user/login", GUEST);
      login(data);
    } catch (error) {
      setGuestError(
        error.response && error.response.status === 401
          ? "The demo account doesn't exist yet. Run “npm run seed” to create it."
          : errorMessage(error)
      );
      setGuestLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <Flex minH="100vh" bg={ui.appBg}>
      <BrandPanel />

      <Flex flex="1" direction="column" position="relative" minW={0}>
        <IconButton
          aria-label="Toggle colour mode"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          variant="ghost"
          colorScheme="gray"
          borderRadius="full"
          position="absolute"
          top={4}
          right={4}
          onClick={toggleColorMode}
        />

        <Flex flex="1" align="center" justify="center" px={5} py={12}>
          <Box w="100%" maxW="400px">
            <Flex align="center" mb={8} d={{ base: "flex", lg: "none" }}>
              <LogoMark boxSize="36px" />
              <Text fontSize="xl" fontWeight="700" ml={2.5} letterSpacing="-0.02em">
                ChatZone
              </Text>
            </Flex>

            <Text as="h1" fontSize="3xl" fontWeight="700" letterSpacing="-0.03em" mb={1}>
              {isLogin ? "Welcome back" : "Create your account"}
            </Text>
            <Text color={ui.muted} mb={6}>
              {isLogin ? "Log in to pick up where you left off." : "It takes less than a minute."}
            </Text>

            <Flex bg={ui.surfaceAlt} borderRadius="xl" p={1} mb={6} role="tablist">
              {[
                ["login", "Log in"],
                ["signup", "Sign up"],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  role="tab"
                  aria-selected={mode === key}
                  flex="1"
                  size="sm"
                  h="36px"
                  borderRadius="lg"
                  variant="unstyled"
                  bg={mode === key ? ui.surface : "transparent"}
                  color={mode === key ? ui.text : ui.muted}
                  boxShadow={mode === key ? "sm" : "none"}
                  transition="all 0.15s"
                  onClick={() => setMode(key)}
                >
                  {label}
                </Button>
              ))}
            </Flex>

            {isLogin ? <LoginForm /> : <SignupForm />}

            <Flex align="center" my={5}>
              <Box flex="1" h="1px" bg={ui.border} />
              <Text fontSize="xs" color={ui.subtle} px={3}>
                or
              </Text>
              <Box flex="1" h="1px" bg={ui.border} />
            </Flex>

            <FormError>{guestError}</FormError>
            <Button
              size="lg"
              w="100%"
              fontSize="md"
              variant="outline"
              colorScheme="gray"
              borderColor={ui.border}
              onClick={loginAsGuest}
              isLoading={guestLoading}
            >
              Explore with the demo account
            </Button>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}

export default Homepage;
