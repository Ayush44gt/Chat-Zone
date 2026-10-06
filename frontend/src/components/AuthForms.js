import {
  Alert,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import api, { errorMessage } from "../api";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";
import { fileToAvatar } from "../utils/chat";
import UserAvatar from "./UserAvatar";
import { AlertIcon, CameraIcon, EyeIcon, EyeOffIcon } from "./icons";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const Field = ({ label, error, children, ...rest }) => (
  <FormControl isInvalid={Boolean(error)} mb={4} {...rest}>
    <FormLabel fontSize="sm" fontWeight="600" mb={1.5}>
      {label}
    </FormLabel>
    {children}
    <FormErrorMessage fontSize="xs">{error}</FormErrorMessage>
  </FormControl>
);

const TextInput = (props) => {
  const ui = useUi();
  return <Input size="lg" fontSize="md" borderRadius="xl" bg={ui.surface} {...props} />;
};

const PasswordInput = ({ show, onToggle, ...rest }) => (
  <InputGroup size="lg">
    <TextInput type={show ? "text" : "password"} pr="3rem" {...rest} />
    <InputRightElement>
      <IconButton
        aria-label={show ? "Hide password" : "Show password"}
        icon={show ? <EyeOffIcon /> : <EyeIcon />}
        size="sm"
        variant="ghost"
        colorScheme="gray"
        borderRadius="full"
        onClick={onToggle}
      />
    </InputRightElement>
  </InputGroup>
);

export const FormError = ({ children }) =>
  children ? (
    <Alert status="error" borderRadius="xl" fontSize="sm" mb={4} py={2.5} role="alert">
      <AlertIcon boxSize={4} mr={2} flexShrink={0} />
      {children}
    </Alert>
  ) : null;

export const LoginForm = () => {
  const { login } = ChatState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    const problems = {};
    if (!email.trim()) problems.email = "Enter your email address";
    else if (!EMAIL_PATTERN.test(email.trim())) problems.email = "That doesn't look like an email address";
    if (!password) problems.password = "Enter your password";
    setErrors(problems);
    setFormError("");
    if (Object.keys(problems).length > 0) return;

    setLoading(true);
    try {
      const { data } = await api.post("/user/login", { email: email.trim(), password });
      login(data);
    } catch (error) {
      setFormError(errorMessage(error, "Couldn't log you in"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormError>{formError}</FormError>
      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <PasswordInput
          show={show}
          onToggle={() => setShow((s) => !s)}
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" w="100%" mt={2} isLoading={loading} fontSize="md">
        Log in
      </Button>
    </form>
  );
};

export const SignupForm = () => {
  const { login } = ChatState();
  const ui = useUi();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pic, setPic] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInput = useRef();

  const choosePicture = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPic(await fileToAvatar(file));
      setErrors((current) => ({ ...current, pic: undefined }));
    } catch (error) {
      setErrors((current) => ({ ...current, pic: error.message }));
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    const problems = {};
    if (!name.trim()) problems.name = "Enter your name";
    if (!email.trim()) problems.email = "Enter your email address";
    else if (!EMAIL_PATTERN.test(email.trim())) problems.email = "That doesn't look like an email address";
    if (password.length < MIN_PASSWORD) problems.password = `Use at least ${MIN_PASSWORD} characters`;
    if (confirm !== password) problems.confirm = "Passwords don't match";
    setErrors(problems);
    setFormError("");
    if (Object.keys(problems).length > 0) return;

    setLoading(true);
    try {
      const { data } = await api.post("/user", {
        name: name.trim(),
        email: email.trim(),
        password,
        pic: pic || undefined,
      });
      login(data);
    } catch (error) {
      const message = errorMessage(error, "Couldn't create your account");
      if (/email already exists/i.test(message)) setErrors({ email: message });
      else setFormError(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormError>{formError}</FormError>

      <Flex align="center" mb={5}>
        <Box position="relative">
          <UserAvatar user={{ name: name.trim() || undefined, pic }} size="lg" />
          <Flex
            as="button"
            type="button"
            aria-label="Choose a profile picture"
            onClick={() => fileInput.current.click()}
            position="absolute"
            bottom="-2px"
            right="-2px"
            boxSize="28px"
            borderRadius="full"
            bg="brand.500"
            color="white"
            align="center"
            justify="center"
            borderWidth="3px"
            borderColor={ui.appBg}
            _hover={{ bg: "brand.600" }}
          >
            <CameraIcon boxSize={3} />
          </Flex>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={choosePicture}
          />
        </Box>
        <Box ml={4}>
          <Text fontSize="sm" fontWeight="600">
            Profile picture
          </Text>
          <Text fontSize="xs" color={errors.pic ? "red.400" : ui.muted}>
            {errors.pic || "Optional — you can add one later."}
          </Text>
          {pic && (
            <Button variant="link" size="xs" colorScheme="red" onClick={() => setPic("")}>
              Remove
            </Button>
          )}
        </Box>
      </Flex>

      <Field label="Name" error={errors.name}>
        <TextInput
          autoComplete="name"
          placeholder="Your full name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <PasswordInput
          show={show}
          onToggle={() => setShow((s) => !s)}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm password" error={errors.confirm}>
        <PasswordInput
          show={show}
          onToggle={() => setShow((s) => !s)}
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" w="100%" mt={2} isLoading={loading} fontSize="md">
        Create account
      </Button>
    </form>
  );
};
