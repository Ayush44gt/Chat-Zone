import { Avatar, AvatarBadge } from "@chakra-ui/react";
import { useUi } from "../theme";
import { UsersIcon } from "./icons";

// Avatar for a person (with an optional online dot) or for a group
const UserAvatar = ({ user, group, online, size = "md", ...rest }) => {
  const ui = useUi();

  if (group) {
    return (
      <Avatar
        size={size}
        bg={ui.active}
        color={ui.accent}
        icon={<UsersIcon boxSize="45%" />}
        {...rest}
      />
    );
  }

  return (
    <Avatar size={size} name={user ? user.name : "?"} src={(user && user.pic) || undefined} {...rest}>
      {online && (
        <AvatarBadge boxSize="0.95em" bg="green.400" borderColor={ui.surface} borderWidth="2.5px" />
      )}
    </Avatar>
  );
};

export default UserAvatar;
