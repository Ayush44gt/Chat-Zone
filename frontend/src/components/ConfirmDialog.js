import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react";
import { useRef } from "react";
import { useUi } from "../theme";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirm",
  isLoading,
}) => {
  const cancelRef = useRef();
  const ui = useUi();

  return (
    <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={cancelRef} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="2xl" bg={ui.surface} mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="700" pb={2}>
            {title}
          </AlertDialogHeader>
          <AlertDialogBody color={ui.muted} fontSize="sm">
            {children}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} variant="ghost" colorScheme="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={2} onClick={onConfirm} isLoading={isLoading}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default ConfirmDialog;
