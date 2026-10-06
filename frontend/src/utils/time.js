const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const daysAgo = (date) => Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);

export const isSameDay = (a, b) => startOfDay(new Date(a)) === startOfDay(new Date(b));

// 2:05 PM or 14:05, depending on the locale
export const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Chat list: time today, then "Yesterday", weekday, and finally the date
export const formatListTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const days = daysAgo(date);

  if (days <= 0) return formatTime(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "2-digit" }),
  });
};

// Separator between days inside a conversation
export const formatDayLabel = (value) => {
  const date = new Date(value);
  const days = daysAgo(date);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
};

export const formatLastSeen = (value) => {
  if (!value) return "Offline";
  const date = new Date(value);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes} min ago`;

  const days = daysAgo(date);
  if (days <= 0) return `Last seen today at ${formatTime(date)}`;
  if (days === 1) return `Last seen yesterday at ${formatTime(date)}`;
  if (days < 7) {
    return `Last seen ${date.toLocaleDateString([], { weekday: "long" })}`;
  }
  return `Last seen ${date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  })}`;
};
