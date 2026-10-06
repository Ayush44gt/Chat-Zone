import { createIcon } from "@chakra-ui/react";

const stroke = (displayName, children) =>
  createIcon({
    displayName,
    viewBox: "0 0 24 24",
    path: (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    ),
  });

export const SearchIcon = stroke("SearchIcon", [
  <circle key="a" cx="11" cy="11" r="7" />,
  <path key="b" d="m20 20-3.5-3.5" />,
]);

export const PlusIcon = stroke("PlusIcon", <path d="M12 5v14M5 12h14" />);

export const CloseIcon = stroke("CloseIcon", <path d="M18 6 6 18M6 6l12 12" />);

export const SendIcon = stroke("SendIcon", [
  <path key="a" d="M22 2 11 13" />,
  <path key="b" d="M22 2 15 22l-4-9-9-4 20-7z" />,
]);

export const ArrowLeftIcon = stroke("ArrowLeftIcon", <path d="M19 12H5M12 19l-7-7 7-7" />);

export const ArrowDownIcon = stroke("ArrowDownIcon", <path d="M12 5v14M19 12l-7 7-7-7" />);

export const UsersIcon = stroke("UsersIcon", [
  <path key="a" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
  <circle key="b" cx="9" cy="7" r="4" />,
  <path key="c" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
]);

export const UserIcon = stroke("UserIcon", [
  <path key="a" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />,
  <circle key="b" cx="12" cy="7" r="4" />,
]);

export const UserPlusIcon = stroke("UserPlusIcon", [
  <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />,
  <circle key="b" cx="8.5" cy="7" r="4" />,
  <path key="c" d="M20 8v6M23 11h-6" />,
]);

export const MessageIcon = stroke(
  "MessageIcon",
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
);

export const MoonIcon = stroke("MoonIcon", <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);

export const SunIcon = stroke("SunIcon", [
  <circle key="a" cx="12" cy="12" r="4.5" />,
  <path
    key="b"
    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
  />,
]);

export const LogoutIcon = stroke("LogoutIcon", [
  <path key="a" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
  <path key="b" d="m16 17 5-5-5-5M21 12H9" />,
]);

export const InfoIcon = stroke("InfoIcon", [
  <circle key="a" cx="12" cy="12" r="9.5" />,
  <path key="b" d="M12 16v-4M12 8h.01" />,
]);

export const CheckIcon = stroke("CheckIcon", <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const DoubleCheckIcon = stroke("DoubleCheckIcon", [
  <path key="a" d="m1.5 12.5 4.5 4.5 9.5-9.5" />,
  <path key="b" d="m11.5 16 1 1 9.5-9.5" />,
]);

export const ClockIcon = stroke("ClockIcon", [
  <circle key="a" cx="12" cy="12" r="9.5" />,
  <path key="b" d="M12 7v5l3 2" />,
]);

export const TrashIcon = stroke("TrashIcon", [
  <path key="a" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  <path key="b" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />,
]);

export const SmileIcon = stroke("SmileIcon", [
  <circle key="a" cx="12" cy="12" r="9.5" />,
  <path key="b" d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />,
]);

export const EditIcon = stroke("EditIcon", [
  <path key="a" d="M12 20h9" />,
  <path key="b" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
]);

export const CameraIcon = stroke("CameraIcon", [
  <path
    key="a"
    d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
  />,
  <circle key="b" cx="12" cy="13" r="4" />,
]);

export const EyeIcon = stroke("EyeIcon", [
  <path key="a" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />,
  <circle key="b" cx="12" cy="12" r="3" />,
]);

export const EyeOffIcon = stroke("EyeOffIcon", [
  <path
    key="a"
    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
  />,
  <path key="b" d="M1 1l22 22" />,
]);

export const AlertIcon = stroke("AlertIcon", [
  <path
    key="a"
    d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  />,
  <path key="b" d="M12 9v4M12 17h.01" />,
]);

export const ShieldIcon = stroke(
  "ShieldIcon",
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);

export const ZapIcon = stroke("ZapIcon", <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />);

export const LogoMark = createIcon({
  displayName: "LogoMark",
  viewBox: "0 0 64 64",
  path: [
    <rect key="r" width="64" height="64" rx="16" fill="#6457f3" />,
    <path
      key="p"
      d="M20 19h24a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H32l-9 7v-7h-3a6 6 0 0 1-6-6V25a6 6 0 0 1 6-6z"
      fill="#fff"
    />,
    <circle key="c1" cx="25" cy="31" r="2.6" fill="#6457f3" />,
    <circle key="c2" cx="32" cy="31" r="2.6" fill="#6457f3" />,
    <circle key="c3" cx="39" cy="31" r="2.6" fill="#6457f3" />,
  ],
});
