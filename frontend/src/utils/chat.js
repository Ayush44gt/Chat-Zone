const idOf = (value) => (value && value._id ? value._id : value);

// The other person in a 1:1 chat (null if their account no longer exists)
export const getOtherUser = (me, chat) => {
  if (!chat || chat.isGroupChat) return null;
  return chat.users.find((u) => u._id !== (me && me._id)) || null;
};

export const getChatName = (me, chat) => {
  if (chat.isGroupChat) return chat.chatName;
  const other = getOtherUser(me, chat);
  return other ? other.name : "Deleted account";
};

export const isAdminOf = (userId, chat) =>
  chat.isGroupChat && idOf(chat.groupAdmin) === userId;

// One-line preview for the chat list
export const getPreview = (me, chat) => {
  const message = chat.latestMessage;
  if (!message) {
    return chat.isGroupChat ? "Group created — say hello" : "No messages yet";
  }

  const mine = idOf(message.sender) === me._id;
  const text = message.deleted
    ? "Message deleted"
    : message.content.replace(/\s+/g, " ");

  if (mine) return `You: ${text}`;
  if (chat.isGroupChat && message.sender && message.sender.name) {
    return `${message.sender.name.split(" ")[0]}: ${text}`;
  }
  return text;
};

// A message counts as read once everyone else in the chat has seen it
export const isReadByAll = (message, chat) =>
  (message.readBy || []).length >= Math.max(chat.users.length - 1, 1);

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])/g;

// Splits text into plain and link parts so URLs can be rendered as anchors
export const splitLinks = (text) =>
  text.split(URL_PATTERN).map((part, index) => ({
    text: part,
    isLink: index % 2 === 1,
  }));

// Reads an image file and returns a centre-cropped square JPEG data URL
export const fileToAvatar = (file, size = 256) =>
  new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp|gif|bmp)$/.test(file.type)) {
      return reject(new Error("Please choose a PNG, JPEG or WebP image"));
    }
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error("Image is too large (max 8 MB)"));
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext("2d")
        .drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size
        );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image"));
    };
    image.src = url;
  });
