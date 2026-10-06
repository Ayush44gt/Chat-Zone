import { Flex } from "@chakra-ui/react";
import ChatWindow from "../components/ChatWindow";
import Sidebar from "../components/Sidebar";
import { ChatState } from "../Context/ChatProvider";
import { useUi } from "../theme";

const Chatpage = () => {
  const ui = useUi();
  const { selectedChat } = ChatState();

  // On small screens only one of the two panes is shown at a time
  return (
    <Flex className="app-shell" w="100%" bg={ui.appBg} p={{ base: 0, md: 3 }}>
      <Sidebar
        d={{ base: selectedChat ? "none" : "flex", md: "flex" }}
        w={{ base: "100%", md: "340px", xl: "380px" }}
        flexShrink={0}
        mr={{ base: 0, md: 3 }}
      />
      <ChatWindow d={{ base: selectedChat ? "flex" : "none", md: "flex" }} flex="1" />
    </Flex>
  );
};

export default Chatpage;
