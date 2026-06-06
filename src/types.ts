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
}

export interface Group {
  id: string;
  name: string;
  description: string;
  code: string; // 6-digit uppercase code
  creatorId: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  photoUrl: string;
  role?: string;
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

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedTo?: string; // userId of a group member or "all" (empty/null implies personal/unassigned)
  assignedToName?: string;
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

