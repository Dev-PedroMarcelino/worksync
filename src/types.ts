/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  role?: string;
  theme: "light" | "dark";
  createdAt: string;
  friendCode?: string;
  plan?: "free" | "pro" | "team"; // subscription tier; undefined == "free"
}

export interface Group {
  id: string;
  name: string;
  description: string;
  code: string; // 6-digit uppercase code
  creatorId: string;
  createdAt: string;
  backgroundImage?: string; // base64 string
}


export interface GroupMember {
  userId: string;
  name: string;
  photoUrl: string;
  role?: string;
  groupRole?: "admin" | "member"; // papel de gestão no grupo (criador é sempre admin)
  color: string; // Tone of color designated to this member
  joinedAt: string;
}

export interface Subgroup {
  id: string;
  groupId: string;
  name: string;
  description: string;
  creatorId: string;
  color: string; // Theme color for subgroups
  createdAt: string;
  isPrivate?: boolean;
  members?: string[];
}

export interface SubgroupPermission {
  userId: string;
  canEdit: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type TaskStatus = "pending" | "in_progress" | "review" | "completed";

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  mentions?: string[]; // userIds mencionados via @
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedTo?: string; // userId of a group member or "all" (empty/null implies personal/unassigned)
  assignedToName?: string;
  tags?: string[];
  order?: number; // manual ordering within a Kanban column
  recurrence?: "none" | "daily" | "weekly" | "monthly"; // auto-recreate on completion
  comments?: TaskComment[];
  checklist: ChecklistItem[];
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  deletionRequest?: {
    requestedBy: string;
    requestedByName: string;
    requestedAt: string;
    status: "pending" | "approved" | "rejected";
  };
}

export interface WhiteboardItem {
  id: string;
  text: string;
  color: string; // CSS color or Tailwind bg color class
  x: number;
  y: number;
  connections?: string[]; // IDs of notes connected to this one
  creatorId: string;
  creatorName: string;
  creatorColor: string; // Tone of color of the creator
  createdAt: string;
  boardId?: string;
}

export interface WhiteboardBoard {
  id: string;
  name: string;
  createdAt: string;
  creatorId: string;
}

export interface Notebook {
  id: string;
  title: string;
  content: string; // Plaintext or Markdown
  color: string; // hex or Tailwind color name
  pinned?: boolean;
  tags?: string[];
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderColor: string;
  text: string;
  timestamp: string;
  dmTo?: string; // If set, this is a DM to that userId
  editedAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  pending?: boolean;
  reactions?: { [emoji: string]: string[] }; // emoji -> userIds que reagiram
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD (start day)
  endDate?: string; // YYYY-MM-DD (optional, for multi-day; defaults to date)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay?: boolean;
  location?: string;
  color: string; // hex color used for the dot / block
  assignedTo?: string; // userId of a group member, "all", or empty
  assignedToName?: string;
  taskId?: string; // when the event mirrors/links an existing task
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  groupId: string;
  subgroupId: string;
  subgroupName: string;
  taskId: string;
  taskTitle: string;
  action: "create" | "complete" | "delete" | "update";
  performedBy: string;
  performedById: string;
  timestamp: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  receiverId: string;
  status: "pending" | "accepted";
  timestamp: string;
}

export interface Friend {
  id: string;
  name: string;
  photoUrl: string;
  email: string;
  friendCode: string;
  joinedAt: string;
}

export interface GroupNotification {
  id: string;
  type: "completed" | "assigned" | "due";
  text: string;
  timestamp: string;
  taskId: string;
  assignedTo?: string;
  readBy: string[]; // userIds who dismissed/read this alert
}

