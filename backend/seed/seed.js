// Wipes the database and fills it with demo data: npm run seed
// Every demo account uses the password below.
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
require("colors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

const DEMO_PASSWORD = "123456";
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();

// Deterministic randomness so every seed run produces the same data set
let state = 20240601;
const rand = () => {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (min, max) => min + rand() * (max - min);
const pick = (list) => list[Math.floor(rand() * list.length)];

const oid = () => new mongoose.Types.ObjectId();

// ---------------------------------------------------------------- users
// [key, name, email, about, last seen (ms ago), joined (days ago), isAdmin]
const USERS = [
  ["guest", "Guest User", "guest@example.com", "Just looking around 👀", 2 * HOUR, 120, false],
  ["ayush", "Ayush Garg", "ayush@example.com", "Building ChatZone. Ping me if something breaks.", 12 * MIN, 400, true],
  ["priya", "Priya Sharma", "priya@example.com", "Product designer · coffee first", 4 * MIN, 310, false],
  ["rohan", "Rohan Mehta", "rohan@example.com", "Backend engineer. Probably on call.", 35 * MIN, 290, false],
  ["ananya", "Ananya Iyer", "ananya@example.com", "Trekking > everything", 3 * HOUR, 260, false],
  ["kabir", "Kabir Singh", "kabir@example.com", "At the gym 🏋️", 1 * DAY, 240, false],
  ["sara", "Sara Khan", "sara@example.com", "QA lead — I will find the bug", 50 * MIN, 230, false],
  ["arjun", "Arjun Nair", "arjun@example.com", "Frontend · React · chai", 6 * HOUR, 220, false],
  ["meera", "Meera Pillai", "meera@example.com", "Reading: The Three-Body Problem", 2 * DAY, 200, false],
  ["dev", "Dev Patel", "dev@example.com", "Available", 9 * HOUR, 190, false],
  ["emily", "Emily Carter", "emily@example.com", "PM. Calendar is a suggestion.", 20 * MIN, 180, false],
  ["lucas", "Lucas Oliveira", "lucas@example.com", "São Paulo → Bengaluru", 5 * DAY, 170, false],
  ["mia", "Mia Tanaka", "mia@example.com", "写真を撮るのが好き 📷", 14 * HOUR, 160, false],
  ["noah", "Noah Williams", "noah@example.com", "In a meeting", 90 * MIN, 150, false],
  ["zoe", "Zoë Müller", "zoe@example.com", "Urlaub bis Montag 🌴", 9 * DAY, 140, false],
  ["omar", "Omar Haddad", "omar@example.com", "مهندس برمجيات", 3 * DAY, 130, false],
  ["chen", "Chen Wei", "chen@example.com", "Data science, mostly cleaning data", 26 * HOUR, 110, false],
  ["isabella", "Isabella Rossi", "isabella@example.com", "Mamma, nonna's recipes, and deadlines", 7 * HOUR, 100, false],
  ["liam", "Liam O'Connor", "liam@example.com", "Battery about to die", 40 * DAY, 95, false],
  ["fatima", "Fatima Al-Sayed", "fatima@example.com", "Do not disturb after 10pm", 11 * HOUR, 80, false],
  ["jose", "José Hernández", "jose@example.com", "Fútbol los domingos ⚽", 4 * DAY, 60, false],
  ["max", "Maximilian Alexander von Hohenberg-Lichtenstein", "max@example.com", "Yes, that is my real name.", 2 * DAY, 45, false],
  // Edge cases: an account that never chatted, and one that vanished months ago
  ["nina", "Nina Kapoor", "nina@example.com", "Hey there! I'm using ChatZone.", 30 * MIN, 1, false],
  ["tara", "Tara Bose", "tara@example.com", "", 95 * DAY, 300, false],
];

// ---------------------------------------------------------------- scripted chats
// "---" starts a new day in the conversation.
const LONG_MESSAGE =
  "Okay, long write-up incoming because I do not want to lose this in a call. " +
  "The release plan has three parts. First, we freeze the main branch on Thursday evening and only " +
  "cherry-pick fixes that have a linked bug and a reviewer. Second, QA runs the full regression suite " +
  "on Friday morning against staging, and anything that fails gets triaged before lunch — not after, " +
  "because after lunch is when everybody suddenly has other plans. Third, we roll out to 5% of users on " +
  "Monday, watch error rates and latency for a full day, then go to 50% on Tuesday and 100% on Wednesday " +
  "if nothing looks odd. If something does look odd we roll back first and ask questions later; nobody " +
  "should be debugging in production while users are affected. I have written all of this up in the doc " +
  "as well, with owners next to each step, so please read it and add your name where it makes sense. " +
  "And yes, I know this message is far too long for a chat app. Consider it a stress test of your patience " +
  "and of our message bubbles. If you made it this far, reply with a 🐢 so I know who actually reads things.";

const DIRECT = [
  {
    users: ["guest", "priya"],
    endAgo: 3 * MIN,
    unread: { guest: 3 },
    lines: [
      ["priya", "Hey! Did you get a chance to look at the new onboarding screens?"],
      ["guest", "Just opened them. The illustration on step 2 is lovely"],
      ["priya", "Thank you! I redrew it four times 😅"],
      ["guest", "One thing — the 'Skip' button is easy to miss on the dark theme"],
      ["priya", "Good catch. I'll bump the contrast"],
      "---",
      ["priya", "Updated version is up: https://www.figma.com/file/onboarding-v3"],
      ["guest", "Much better. Ship it"],
      ["priya", "🎉"],
      "---",
      ["guest", "Are you joining the trek this weekend?"],
      ["priya", "I want to! Depends on whether this deadline lets me live"],
      ["priya", "Can you send me the packing list Ananya made?"],
      ["priya", "Also what time are we leaving on Saturday?"],
      ["priya", "Hello? 👋"],
    ],
  },
  {
    users: ["guest", "ayush"],
    endAgo: 26 * MIN,
    unseenBy: { ayush: 2 },
    lines: [
      ["ayush", "Welcome to ChatZone! This is a demo account, so feel free to poke at everything."],
      ["guest", "Thanks! The typing indicator is a nice touch"],
      ["ayush", "It's all Socket.IO. Messages are pushed the moment they're stored, nothing polls."],
      ["guest", "What happens if I'm looking at another chat when a message comes in?"],
      ["ayush", "You get an unread badge on that conversation. Every user has a personal room on the server."],
      "---",
      ["ayush", "Found a bug in group renames last night. Fixed and deployed."],
      ["guest", "Was that why the Product Team chat showed the old name?"],
      ["ayush", "Exactly that."],
      ["ayush", "Here's the gist of the fix:\nconst updated = await Chat.findById(id)\n  .populate('users', '-password');"],
      ["guest", "Clean. Does it broadcast the rename to everyone in the group?"],
      ["guest", "Asking because Sara still saw the old one this morning"],
    ],
  },
  {
    users: ["guest", "rohan"],
    endAgo: 5 * HOUR,
    lines: [
      ["rohan", "Are you free for a quick call?"],
      ["guest", "Give me 10 minutes"],
      ["rohan", "No rush. It's about the API rate limits"],
      ["guest", "Back. What's up?"],
      ["rohan", "We're seeing 429s from the search endpoint during peak hours"],
      ["guest", "Is the limit per user or per IP?"],
      ["rohan", "Per IP, which is the problem — half the office shares one"],
      ["guest", "Ah. Switch to per-token then?"],
      ["rohan", "That's my plan. Wanted a sanity check before I touch it"],
      ["guest", "Sounds right to me 👍"],
      ["rohan", "Cool, PR coming this evening"],
    ],
  },
  {
    users: ["guest", "ananya"],
    endAgo: 1 * DAY + 2 * HOUR,
    lines: [
      ["ananya", "Packing list for Saturday:\n• 2L water\n• Rain jacket\n• Headlamp\n• Snacks (bring extra, Kabir eats everything)\n• ID proof"],
      ["guest", "Got it. Do I need trekking poles?"],
      ["ananya", "Not for this trail, it's mostly gradual"],
      ["guest", "Perfect"],
      ["ananya", "We leave at 5:30 AM sharp. I mean it this time."],
      ["guest", "You said that last time too 😄"],
      ["ananya", "And last time we missed the sunrise. Lesson learnt."],
    ],
  },
  {
    users: ["guest", "sara"],
    endAgo: 2 * DAY,
    unread: { guest: 1 },
    deletedIndex: 3,
    lines: [
      ["sara", "Found something weird on the signup form"],
      ["guest", "Go on"],
      ["sara", "If you paste <script>alert('xss')</script> as your name, what happens?"],
      ["guest", "this message gets deleted in the seed data"],
      ["guest", "It should just show up as plain text. React escapes it."],
      ["sara", "Confirmed, it renders as text. Good."],
      ["sara", "Next test: a name with 5000 characters"],
      ["guest", "The server caps names at 50 now"],
      ["sara", "I'll be the judge of that 🔍"],
    ],
  },
  {
    users: ["guest", "mia"],
    endAgo: 3 * DAY,
    lines: [
      ["mia", "こんにちは！写真を送りますね"],
      ["guest", "ありがとう! Looking forward to it"],
      ["mia", "The cherry blossoms were at full bloom last week 🌸🌸🌸"],
      ["guest", "🌸"],
      ["mia", "I'll upload the album tonight"],
    ],
  },
  {
    users: ["guest", "omar"],
    endAgo: 4 * DAY,
    lines: [
      ["omar", "مرحبا! كيف حالك؟"],
      ["guest", "Doing well! How was the conference?"],
      ["omar", "Great — three talks on real-time systems. I took notes for you."],
      ["omar", "أرسلها لك غداً إن شاء الله"],
      ["guest", "Shukran, that would be great"],
    ],
  },
  {
    users: ["guest", "emily"],
    endAgo: 6 * DAY,
    lines: [
      ["emily", LONG_MESSAGE],
      ["guest", "🐢"],
      ["emily", "I knew I could count on you."],
    ],
  },
  {
    users: ["guest", "max"],
    endAgo: 9 * DAY,
    lines: [
      ["max", "Good afternoon. I am told my name breaks your layout."],
      ["guest", "It certainly tests it"],
      ["max", "Averyveryverylongwordwithoutanyspacesatalltoseewhetherthebubblewrapsorjustrunsoffthesideofthescreenlikeitusedto"],
      ["guest", "Wraps fine 👌"],
    ],
  },
  {
    users: ["guest", "kabir"],
    endAgo: 12 * DAY,
    lines: [
      ["kabir", "bro"],
      ["kabir", "bro"],
      ["kabir", "you awake?"],
      ["guest", "It's 6 AM Kabir"],
      ["kabir", "gym?"],
      ["guest", "no"],
      ["kabir", "ok"],
    ],
  },
  // Edge case: a conversation that was opened but never used
  { users: ["guest", "liam"], endAgo: 20 * DAY, lines: [] },
  {
    users: ["priya", "arjun"],
    endAgo: 2 * HOUR,
    unread: { arjun: 2 },
    lines: [
      ["arjun", "Is the spacing on the settings page 16 or 20?"],
      ["priya", "20 on desktop, 16 on mobile"],
      ["arjun", "And the card radius?"],
      ["priya", "16 everywhere. I put it in the tokens file"],
      ["priya", "Please use the tokens 🙏"],
    ],
  },
  {
    users: ["ayush", "rohan"],
    endAgo: 8 * HOUR,
    lines: [
      ["ayush", "Did the migration finish?"],
      ["rohan", "Yes, 40 minutes. No errors."],
      ["ayush", "Nice. Indexes too?"],
      ["rohan", "Built in the background, all green"],
    ],
  },
  {
    users: ["sara", "emily"],
    endAgo: 1 * DAY,
    lines: [
      ["emily", "Can we sign off on the release today?"],
      ["sara", "Two blockers left. I'll know by 4."],
      ["emily", "Okay, holding the announcement until then"],
    ],
  },
  {
    users: ["isabella", "jose"],
    endAgo: 5 * DAY,
    lines: [
      ["jose", "¿Vienes al partido el domingo?"],
      ["isabella", "Sì! A che ora?"],
      ["jose", "A las 10. Trae agua 💧"],
    ],
  },
];

// ---------------------------------------------------------------- group chats
const TEAM_LINES = [
  "Standup in 5",
  "Can someone review my PR? It's small, I promise",
  "Staging is down again",
  "Staging is back",
  "Who changed the lint config? 😤",
  "Deployed to production ✅",
  "The build is green",
  "The build is red",
  "I'll take that ticket",
  "Blocked on the API contract, can we sync after lunch?",
  "Design review moved to 3 PM",
  "Pushed a fix, please pull",
  "That bug is not reproducible on my machine",
  "It never is",
  "Docs updated",
  "Thanks for the quick turnaround!",
  "Lunch?",
  "Running 10 minutes late",
  "Dashboard link: https://grafana.example.com/d/chatzone",
  "Latency is back to normal",
  "Can we not ship on a Friday",
  "We are shipping on a Friday",
  "👍",
  "LGTM",
  "+1",
  "Merged",
  "Reverted",
  "Who is on call this week?",
  "Me, sadly",
  "Retro notes are in the doc",
];

const BATCH_LINES = [
  "Anyone has the notes from today's lecture?",
  "Assignment 3 is due on Monday, not Friday",
  "Wait, it's due Monday??",
  "Sharing the drive link in a minute",
  "Is the lab happening tomorrow?",
  "Cancelled, check the notice board",
  "Placement talk at 4 in the auditorium",
  "Who's coming to the canteen?",
  "Save me a seat",
  "The wifi in the hostel is dead again",
  "Has anyone started the project report?",
  "No",
  "Also no",
  "Good, same",
  "Results are out!!",
  "Congratulations everyone 🎉",
  "Reunion this December? Who's in?",
  "In",
  "Depends on leave approval",
  "Can't believe it's been a year",
  "Photos from the farewell: https://photos.example.com/batch-2024",
  "Happy birthday! 🎂",
  "Thanks everyone ❤️",
  "Does anyone have a spare charger?",
  "Quiz postponed",
  "Finally some good news",
  "Group study in the library at 6",
  "Bring the previous year papers",
  "Attendance shortage list is out 💀",
  "Not me this time",
];

const GROUPS = [
  {
    name: "Weekend Trek 🏔️",
    admin: "guest",
    users: ["guest", "ananya", "kabir", "priya", "arjun", "meera"],
    endAgo: 9 * MIN,
    unread: { guest: 4 },
    lines: [
      ["ananya", "Trek is ON for Saturday. Forecast says clear skies ☀️"],
      ["kabir", "LET'S GOOO"],
      ["meera", "How long is the trail?"],
      ["ananya", "11 km round trip, around 5 hours with breaks"],
      ["arjun", "I'm in. Who's driving?"],
      ["guest", "I can take four people"],
      ["kabir", "Shotgun"],
      ["priya", "I'm 80% sure I can make it"],
      ["ananya", "Priya that's what you said for the last three"],
      ["priya", "And I made it to one of them!"],
      "---",
      ["guest", "Pickup order: Meera, Arjun, Kabir, then Ananya. 5:30 AM."],
      ["meera", "5:30 😭"],
      ["arjun", "Worth it for the sunrise"],
      ["kabir", "Bringing parathas for everyone"],
      ["ananya", "This is why we keep inviting you"],
      "---",
      ["ananya", "Reminder: carry ID proof, the forest checkpost asks for it"],
      ["meera", "Is there network up there?"],
      ["ananya", "Barely. Download offline maps"],
      ["priya", "Okay I'm 95% now"],
      ["kabir", "who's bringing the speaker"],
      ["arjun", "No speakers on the trail Kabir"],
      ["kabir", "🙄 fine"],
    ],
  },
  {
    name: "Product Team",
    admin: "ayush",
    users: ["ayush", "guest", "priya", "rohan", "sara", "arjun", "emily", "noah", "chen"],
    endAgo: 18 * MIN,
    unread: { guest: 7, priya: 3 },
    generated: { count: 150, lines: TEAM_LINES, spanDays: 28 },
    lines: [
      ["emily", "Sprint goal: ship group chat improvements by Friday"],
      ["rohan", "Backend is done, waiting on review"],
      ["sara", "I have 12 test cases written, 3 failing"],
      ["arjun", "Two of those are mine, fixing now"],
      ["ayush", "Great work everyone. Demo at 4."],
    ],
  },
  {
    name: "CS Batch of 2024",
    admin: "dev",
    users: [
      "dev", "guest", "ayush", "priya", "rohan", "ananya", "kabir", "sara", "arjun",
      "meera", "lucas", "mia", "noah", "zoe", "omar", "chen", "fatima", "jose",
    ],
    endAgo: 4 * HOUR,
    unread: { guest: 12 },
    generated: { count: 260, lines: BATCH_LINES, spanDays: 45 },
    lines: [],
  },
  {
    name: "Family ❤️",
    admin: "isabella",
    users: ["isabella", "guest", "jose", "fatima"],
    endAgo: 1 * DAY + 5 * HOUR,
    lines: [
      ["isabella", "Dinner at nonna's on Sunday, 7 PM. No excuses."],
      ["jose", "I have a match until 6, will come straight after"],
      ["fatima", "I'll bring dessert 🍰"],
      ["guest", "I'll be there. Should I bring anything?"],
      ["isabella", "Just yourself. And maybe wine."],
      ["guest", "Wine it is 🍷"],
    ],
  },
  {
    name: "Flatmates",
    admin: "kabir",
    users: ["kabir", "guest", "dev"],
    endAgo: 2 * DAY + 3 * HOUR,
    lines: [
      ["kabir", "Who finished the milk"],
      ["dev", "Not me"],
      ["guest", "Not me either"],
      ["kabir", "There are three of us"],
      ["dev", "Electricity bill is ₹2,340 this month, ₹780 each"],
      ["guest", "Sent"],
      ["kabir", "sent. and I'm buying milk."],
    ],
  },
  {
    // Edge case: long group name (the limit is 60 characters)
    name: "Launch War Room — Q4 Release Coordination & Incidents",
    admin: "emily",
    users: ["emily", "guest", "ayush", "rohan", "sara", "noah"],
    endAgo: 7 * DAY,
    lines: [
      ["emily", "Rollout at 5%. Watching dashboards."],
      ["rohan", "Error rate flat. p95 latency 180ms."],
      ["sara", "No new crash reports"],
      ["noah", "Support queue is quiet"],
      ["emily", "Going to 50%"],
      ["rohan", "Still flat"],
      ["emily", "100%. We're live. 🚀"],
      ["ayush", "Well done all. Closing this room at the end of the week."],
    ],
  },
  // Edge case: a brand new group nobody has written in yet
  {
    name: "Hackathon Squad",
    admin: "guest",
    users: ["guest", "chen", "lucas", "mia"],
    endAgo: 40 * MIN,
    lines: [],
  },
  // A group the guest account is not part of
  {
    name: "Book Club 📚",
    admin: "meera",
    users: ["meera", "zoe", "isabella", "fatima", "chen"],
    endAgo: 3 * DAY,
    lines: [
      ["meera", "This month: The Three-Body Problem"],
      ["zoe", "Schon gelesen! No spoilers from me"],
      ["chen", "The original Chinese title is 三体, for the curious"],
      ["isabella", "I'm on chapter 4 and very confused"],
      ["fatima", "That is the correct state to be in"],
    ],
  },
];

// ---------------------------------------------------------------- builders
const buildUsers = (passwordHash) => {
  const byKey = {};
  const docs = USERS.map(([key, name, email, about, seenAgo, joinedDays, isAdmin]) => {
    const createdAt = new Date(NOW - joinedDays * DAY);
    const doc = {
      _id: oid(),
      name,
      email,
      password: passwordHash,
      pic: "",
      about,
      isAdmin,
      lastSeen: new Date(NOW - seenAgo),
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
    byKey[key] = doc;
    return doc;
  });
  return { docs, byKey };
};

// Turns scripted lines (plus optional generated chatter) into [senderKey, text, time]
const timeline = (spec) => {
  const scripted = spec.lines || [];
  const entries = [];

  if (spec.generated) {
    const { count, lines, spanDays } = spec.generated;
    let previous = null;
    for (let i = 0; i < count; i++) {
      let text = pick(lines);
      while (text === previous) text = pick(lines);
      previous = text;
      entries.push([pick(spec.users), text]);
      // roughly one burst of conversation per day
      if (rand() < spanDays / count) entries.push("---");
    }
  }
  entries.push(...scripted);

  // Walk backwards from the most recent message, spacing them realistically
  let cursor = NOW - spec.endAgo;
  const timed = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i] === "---") {
      cursor -= between(9 * HOUR, 30 * HOUR);
      continue;
    }
    timed.unshift([entries[i][0], entries[i][1], new Date(cursor)]);
    cursor -= between(20 * 1000, 7 * MIN);
  }
  return timed;
};

const buildChat = (spec, users, isGroup) => {
  const members = spec.users.map((key) => users[key]._id);
  const chatId = oid();
  const timed = timeline(spec);

  const messages = timed.map(([senderKey, content, createdAt], index) => {
    const deleted = spec.deletedIndex === index;
    return {
      _id: oid(),
      senderKey,
      sender: users[senderKey]._id,
      content: deleted ? "" : content,
      chat: chatId,
      deleted,
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
  });

  // Everyone has read everything, except the tails configured as unread
  const unread = { ...(spec.unread || {}), ...(spec.unseenBy || {}) };
  const unreadIds = {};
  Object.entries(unread).forEach(([key, count]) => {
    const theirs = messages.filter((m) => m.senderKey !== key);
    unreadIds[key] = new Set(theirs.slice(-count).map((m) => String(m._id)));
  });

  messages.forEach((message) => {
    message.readBy = spec.users
      .filter((key) => key !== message.senderKey)
      .filter((key) => !(unreadIds[key] && unreadIds[key].has(String(message._id))))
      .map((key) => users[key]._id);
    delete message.senderKey;
  });

  const last = messages[messages.length - 1];
  const touchedAt = last ? last.createdAt : new Date(NOW - spec.endAgo);
  const first = messages[0];
  const chat = {
    _id: chatId,
    chatName: isGroup ? spec.name : "sender",
    isGroupChat: isGroup,
    users: members,
    createdAt: first ? new Date(first.createdAt.getTime() - HOUR) : touchedAt,
    updatedAt: touchedAt,
    __v: 0,
  };
  if (last) chat.latestMessage = last._id;
  if (isGroup) chat.groupAdmin = users[spec.admin]._id;

  return { chat, messages };
};

const isLocalDatabase = (uri) => /\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\]|mongo)(:\d+)?\//.test(uri);

const seed = async () => {
  if (!isLocalDatabase(process.env.MONGO_URI || "") && !process.argv.includes("--force")) {
    throw new Error(
      "MONGO_URI is not a local database. Seeding deletes all data; pass --force to do it anyway."
    );
  }

  await connectDB();

  await Promise.all([User.deleteMany({}), Chat.deleteMany({}), Message.deleteMany({})]);
  await Promise.all([User.init(), Chat.init(), Message.init()]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { docs: userDocs, byKey } = buildUsers(passwordHash);

  const built = [
    ...DIRECT.map((spec) => buildChat(spec, byKey, false)),
    ...GROUPS.map((spec) => buildChat(spec, byKey, true)),
  ];
  const chatDocs = built.map((b) => b.chat);
  const messageDocs = built.reduce((all, b) => all.concat(b.messages), []);

  // Raw inserts keep the hand-made timestamps instead of "now"
  await User.collection.insertMany(userDocs);
  await Chat.collection.insertMany(chatDocs);
  await Message.collection.insertMany(messageDocs);

  console.log(
    (
      `Seeded ${userDocs.length} users, ${chatDocs.length} chats ` +
      `(${GROUPS.length} groups) and ${messageDocs.length} messages`
    ).green
  );
  console.log(`Log in as guest@example.com / ${DEMO_PASSWORD}`.cyan);
  console.log(`Every other demo account (see README) uses the same password.`.cyan);

  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error(`Error: ${error.message}`.red.bold);
  process.exit(1);
});
