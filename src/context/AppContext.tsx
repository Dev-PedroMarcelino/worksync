/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth, db, isDemoMode as initialIsDemoMode, handleFirestoreError, OperationType } from "../db/firebase";
import {
  UserProfile,
  Group,
  GroupMember,
  Subgroup,
  Task,
  WhiteboardItem,
  Notebook,
  ChecklistItem,
  ChatMessage,
  WhiteboardBoard,
  AuditLogEntry,
  Friend,
  FriendRequest,
  GroupNotification
} from "../types";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from "firebase/firestore";

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: "task" | "chat";
}

interface AppContextType {
  currentUser: UserProfile | null;
  groups: Group[];
  groupMembers: GroupMember[];
  subgroups: Subgroup[];
  tasks: Task[];
  whiteboardItems: WhiteboardItem[];
  notebooks: Notebook[];
  chatMessages: ChatMessage[];
  auditLogs: AuditLogEntry[];
  allGroupTasks: Task[];
  theme: "light" | "dark";
  activeTab: "personal" | "groups";
  selectedGroup: Group | null;
  selectedSubgroup: Subgroup | null;
  whiteboardBoards: WhiteboardBoard[];
  activeBoardId: string;
  setActiveBoardId: (boardId: string) => void;
  createWhiteboardBoard: (name: string) => Promise<void>;
  deleteWhiteboardBoard: (boardId: string) => Promise<void>;
  isFirebaseCloud: boolean;
  isLoading: boolean;
  authError: string | null;

  // Navigation
  activeModule: "tasks" | "whiteboard" | "notes" | "chat" | "audit";
  setActiveModule: (module: "tasks" | "whiteboard" | "notes" | "chat" | "audit") => void;
  setActiveTab: (tab: "personal" | "groups") => void;
  setSelectedGroup: (group: Group | null) => void;
  setSelectedSubgroup: (sub: Subgroup | null) => void;

  // Actions - Authentication
  signUp: (email: string, password: string, name: string, photoUrl: string, role?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (name: string, photoUrl: string, role?: string) => Promise<void>;
  toggleTheme: () => void;

  // Actions - Groups
  createGroup: (name: string, description: string) => Promise<Group>;
  joinGroup: (code: string) => Promise<Group>;
  leaveGroup: (groupId: string) => Promise<void>;

  // Actions - Subgroups
  createSubgroup: (name: string, description: string, color: string, isPrivate?: boolean) => Promise<Subgroup>;
  deleteSubgroup: (subgroupId: string) => Promise<void>;
  toggleSubgroupMembership: (subgroupId: string, userId: string) => Promise<void>;
  checkSubgroupPermission: (subgroupId: string) => boolean;
  grantSubgroupPermission: (subgroupId: string, targetUserId: string, canEdit: boolean) => Promise<void>;
  getSubgroupPermissions: (subgroupId: string) => Promise<{ [userId: string]: boolean }>;

  // Actions - Tasks
  createTask: (title: string, description: string, priority: "low" | "medium" | "high", dueDate: string, assignedTo?: string, checklistTexts?: string[]) => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  updateTaskFields: (taskId: string, fields: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Actions - Whiteboard
  addWhiteboardItem: (text: string, color: string, x: number, y: number) => Promise<void>;
  updateWhiteboardItemPosition: (id: string, x: number, y: number) => Promise<void>;
  deleteWhiteboardItem: (id: string) => Promise<void>;
  toggleWhiteboardConnection: (id1: string, id2: string) => Promise<void>;

  // Actions - Notebooks
  createNotebook: (title: string, content: string, color: string) => Promise<void>;
  updateNotebook: (id: string, title: string, content: string, color: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;

  // Actions - Group & Direct Chat Messages DMs
  sendChatMessage: (text: string, dmTo?: string, fileData?: { url: string; name: string; type: string }) => Promise<void>;
  editChatMessage: (messageId: string, newText: string) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;

  // Friends & Requests
  friends: Friend[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (codeOrEmail: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;

  // Group Notifications
  groupNotifications: GroupNotification[];
  dismissGroupNotification: (notificationId: string) => Promise<void>;

  // Notifications
  toasts: Toast[];
  removeToast: (id: string) => void;

  // Chat mobile view state
  chatMobileView: "list" | "chat";
  setChatMobileView: (view: "list" | "chat") => void;

  // Chat DM selection state
  selectedDmUserId: string | null;
  setSelectedDmUserId: (userId: string | null) => void;
  latestDmMessages: { [friendId: string]: ChatMessage };

  // Demo Fallback
  enterDemoMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PRESET_MEMBER_COLORS = [
  "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  "text-sky-500 bg-sky-500/10 border-sky-500/30",
  "text-violet-500 bg-violet-500/10 border-violet-500/30",
  "text-amber-500 bg-amber-500/10 border-amber-500/30",
  "text-rose-500 bg-rose-500/10 border-rose-500/30",
  "text-blue-500 bg-blue-500/10 border-blue-500/30",
  "text-teal-500 bg-teal-500/10 border-teal-500/30",
  "text-orange-500 bg-orange-500/10 border-orange-500/30",
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [whiteboardItems, setWhiteboardItems] = useState<WhiteboardItem[]>([]);
  const [whiteboardBoards, setWhiteboardBoards] = useState<WhiteboardBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("default");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groupNotifications, setGroupNotifications] = useState<GroupNotification[]>([]);
  const [allGroupTasks, setAllGroupTasks] = useState<Task[]>([]);
  const [chatMobileView, setChatMobileView] = useState<"list" | "chat">("list");
  const [selectedDmUserId, setSelectedDmUserId] = useState<string | null>(null);
  const [latestDmMessages, setLatestDmMessages] = useState<{ [friendId: string]: ChatMessage }>({});

  const addToast = (title: string, message: string, type: "task" | "chat") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      // Pleasant chime: C5 -> E5
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Play notification sound blocked or failed:", e);
    }
  };

  const showNativeNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "https://api.dicebear.com/7.x/bottts/svg?seed=tasksync",
        });
      } catch (err) {
        console.warn("Native Notification failed to display:", err);
      }
    }
  };

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeTab, setActiveTabState] = useState<"personal" | "groups">("personal");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedSubgroup, setSelectedSubgroupState] = useState<Subgroup | null>(null);
  const [activeModule, setActiveModule] = useState<"tasks" | "whiteboard" | "notes" | "chat" | "audit">("tasks");

  const prevContextRef = useRef<{
    userId: string | null;
    activeTab: "personal" | "groups";
    groupId: string | null;
    subgroupId: string | null;
  }>({ userId: null, activeTab: "personal", groupId: null, subgroupId: null });

  const prevTasksRef = useRef<Task[]>([]);
  const prevMessagesRef = useRef<ChatMessage[]>([]);
  const isFirstLoadRef = useRef(true);
  const processedGroupNotifsRef = useRef<Set<string>>(new Set());
  const isFirstGroupNotifLoadRef = useRef<boolean>(true);
  const prevFriendRequestsRef = useRef<FriendRequest[]>([]);
  const isFirstFriendRequestsLoadRef = useRef<boolean>(true);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  const currentContextId = `${currentUser?.id}_${activeTab}_${selectedGroup?.id || "none"}_${selectedSubgroup?.id || "none"}`;
  const prevContextId = `${prevContextRef.current.userId}_${prevContextRef.current.activeTab}_${prevContextRef.current.groupId || "none"}_${prevContextRef.current.subgroupId || "none"}`;

  useEffect(() => {
    if (!currentUser) {
      prevTasksRef.current = [];
      prevMessagesRef.current = [];
      isFirstLoadRef.current = true;
      return;
    }

    if (currentContextId !== prevContextId) {
      prevTasksRef.current = tasks;
      prevMessagesRef.current = chatMessages;
      isFirstLoadRef.current = true;
      prevContextRef.current = {
        userId: currentUser.id,
        activeTab,
        groupId: selectedGroup?.id || null,
        subgroupId: selectedSubgroup?.id || null,
      };
      return;
    }

    if (isFirstLoadRef.current) {
      prevTasksRef.current = tasks;
      prevMessagesRef.current = chatMessages;
      if (tasks.length > 0 || chatMessages.length > 0) {
        isFirstLoadRef.current = false;
      }
      return;
    }

    // Check task completions for user tasks
    tasks.forEach((task) => {
      const prevTask = prevTasksRef.current.find((t) => t.id === task.id);
      const wasCompleted = task.status === "completed" && (!prevTask || prevTask.status === "pending");
      const createdByMe = task.creatorId === currentUser.id;

      if (wasCompleted && createdByMe) {
        playNotificationSound();
        addToast(
          "Tarefa Concluída! 🎉",
          `A tarefa "${task.title}" que você criou foi concluída.`,
          "task"
        );
        showNativeNotification("Tarefa Concluída! 🎉", `A tarefa "${task.title}" que você criou foi concluída.`);
      }
    });

    // Check new DMs to current user
    chatMessages.forEach((msg) => {
      const prevMsg = prevMessagesRef.current.some((m) => m.id === msg.id);
      const isNewDm = !prevMsg && msg.dmTo === currentUser.id && msg.senderId !== currentUser.id;

      if (isNewDm) {
        playNotificationSound();
        addToast(
          "Nova Mensagem Direta 💬",
          `Você recebeu uma mensagem de ${msg.senderName}: "${msg.text}"`,
          "chat"
        );
        showNativeNotification("Nova Mensagem Direta 💬", `Você recebeu uma mensagem de ${msg.senderName}: "${msg.text}"`);
      }
    });

    prevTasksRef.current = tasks;
    prevMessagesRef.current = chatMessages;
  }, [tasks, chatMessages, currentUser, activeTab, selectedGroup, selectedSubgroup, currentContextId, prevContextId]);

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isDemoMode, setIsDemoMode] = useState(initialIsDemoMode);
  const isFirebaseCloud = !isDemoMode;

  const setActiveTab = (tab: "personal" | "groups") => {
    setActiveTabState(tab);
    setSelectedSubgroupState(null);
    setActiveBoardId("default");
    if (tab === "personal") {
      setSelectedGroup(null);
      setActiveModule("tasks");
    }
  };

  const setSelectedSubgroup = (sub: Subgroup | null) => {
    setSelectedSubgroupState(sub);
    setActiveBoardId("default");
  };

  // Ensure theme on mount matches state
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Request native notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Load theme from localStorage if available
  useEffect(() => {
    const localTheme = localStorage.getItem("workspace_theme") as "light" | "dark" | null;
    if (localTheme) {
      setTheme(localTheme);
    }
  }, []);

  // Validation server check (Mandatory per Firebase Integration skill guidelines)
  useEffect(() => {
    if (isFirebaseCloud && db) {
      const validateDBConn = async () => {
        try {
          await getDocFromServer(doc(db, "test", "connection"));
        } catch (error) {
          if (error instanceof Error && error.message.includes("the client is offline")) {
            console.error("Firebase connection is currently offline. Please configure Firestore rules.");
          }
        }
      };
      validateDBConn();
    }
  }, [isFirebaseCloud]);

  // Handle Demo mode state initialization and persistence
  useEffect(() => {
    if (isDemoMode) {
      setIsLoading(true);
      const storedUser = localStorage.getItem("demo_user_logged");
      if (storedUser) {
        try {
          const uParse = JSON.parse(storedUser);
          setCurrentUser(uParse);
          if (uParse.theme) setTheme(uParse.theme);
        } catch (e) {
          console.error(e);
        }
      }
      setIsLoading(false);
    }
  }, [isDemoMode]);

  // Listen to Auth State if Firebase Cloud is Active
  useEffect(() => {
    if (isFirebaseCloud && auth && db) {
      setIsLoading(true);
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const userDocRef = doc(db, "users", fbUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data() as UserProfile;
              if (!uData.friendCode) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                await updateDoc(userDocRef, { friendCode: code });
                uData.friendCode = code;
              }
              setCurrentUser({ ...uData, id: fbUser.uid });
              if (uData.theme) setTheme(uData.theme);
            } else {
              // Create user profile on first sign-in
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              const newProfile: UserProfile = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
                email: fbUser.email || "",
                photoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=" + fbUser.uid,
                role: "",
                theme: theme,
                createdAt: new Date().toISOString(),
                friendCode: code,
              };
              await setDoc(userDocRef, newProfile);
              setCurrentUser(newProfile);
            }
          } catch (error) {
            console.error("Error fetching user profile", error);
          }
        } else {
          setCurrentUser(null);
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isFirebaseCloud]);

  // Demo user storage helper
  const saveDemoUser = (user: UserProfile | null) => {
    if (user) {
      localStorage.setItem("demo_user_logged", JSON.stringify(user));
    } else {
      localStorage.removeItem("demo_user_logged");
    }
    setCurrentUser(user);
  };

  // Load friends and friendRequests
  useEffect(() => {
    if (!currentUser) {
      setFriends([]);
      setFriendRequests([]);
      return;
    }

    if (isDemoMode) {
      const loadLocalFriendsData = () => {
        const localFriends = JSON.parse(
          localStorage.getItem(`demo_friends_${currentUser.id}`) || "[]"
        ) as Friend[];
        setFriends(localFriends);

        const localRequests = JSON.parse(
          localStorage.getItem(`demo_friend_requests_${currentUser.id}`) || "[]"
        ) as FriendRequest[];
        setFriendRequests(localRequests);
      };
      loadLocalFriendsData();
      
      const interval = setInterval(loadLocalFriendsData, 1000);
      return () => clearInterval(interval);
    } else {
      const friendsPath = `users/${currentUser.id}/friends`;
      const unsubFriends = onSnapshot(
        collection(db, friendsPath),
        (snap) => {
          const arr: Friend[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Friend));
          setFriends(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, friendsPath)
      );

      const reqsPath = `users/${currentUser.id}/friendRequests`;
      const unsubReqs = onSnapshot(
        collection(db, reqsPath),
        (snap) => {
          const arr: FriendRequest[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as FriendRequest));
          setFriendRequests(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, reqsPath)
      );

      return () => {
        unsubFriends();
        unsubReqs();
      };
    }
  }, [currentUser, isDemoMode]);

  // --- Real-time queries for current page ---

  // Listen to Personal items (tasks, whiteboard, notebooks) or Groups lists
  useEffect(() => {
    if (!currentUser) return;

    if (isDemoMode) {
      // Load groups inside demo mode
      const allDemoGroups = JSON.parse(localStorage.getItem("demo_groups") || "[]") as Group[];
      const userJoinedGroups = allDemoGroups.filter(
        (g) =>
          g.creatorId === currentUser.id ||
          (JSON.parse(localStorage.getItem(`demo_group_members_${g.id}`) || "[]") as GroupMember[]).some(
            (m) => m.userId === currentUser.id
          )
      );
      setGroups(userJoinedGroups);

      if (activeTab === "personal") {
        const localSubs = JSON.parse(
          localStorage.getItem(`demo_personal_subgroups_${currentUser.id}`) || "[]"
        ) as Subgroup[];
        setSubgroups(localSubs);

        const localBoards = JSON.parse(
          localStorage.getItem(`demo_personal_boards_${currentUser.id}`) || "[]"
        ) as WhiteboardBoard[];
        if (localBoards.length === 0) {
          const defaultBoard: WhiteboardBoard = {
            id: "default",
            name: "Quadro Geral",
            createdAt: new Date().toISOString(),
            creatorId: "system",
          };
          localBoards.push(defaultBoard);
          localStorage.setItem(`demo_personal_boards_${currentUser.id}`, JSON.stringify(localBoards));
        }
        setWhiteboardBoards(localBoards);

        if (selectedSubgroup) {
          const localTasks = JSON.parse(localStorage.getItem(`demo_personal_tasks_${currentUser.id}_${selectedSubgroup.id}`) || "[]") as Task[];
          setTasks(localTasks);

          const localPostits = JSON.parse(
            localStorage.getItem(`demo_personal_whiteboard_${currentUser.id}_${selectedSubgroup.id}`) || "[]"
          ) as WhiteboardItem[];
          setWhiteboardItems(localPostits);

          const localNotes = JSON.parse(localStorage.getItem(`demo_personal_notes_${currentUser.id}_${selectedSubgroup.id}`) || "[]") as Notebook[];
          setNotebooks(localNotes);
        } else {
          const localTasks = JSON.parse(localStorage.getItem(`demo_personal_tasks_${currentUser.id}`) || "[]") as Task[];
          setTasks(localTasks);

          const localPostits = JSON.parse(
            localStorage.getItem(`demo_personal_whiteboard_${currentUser.id}`) || "[]"
          ) as WhiteboardItem[];
          setWhiteboardItems(localPostits);

          const localNotes = JSON.parse(localStorage.getItem(`demo_personal_notes_${currentUser.id}`) || "[]") as Notebook[];
          setNotebooks(localNotes);
        }
      }
    } else {
      // Firebase Cloud active - query personal notes & tasks
      if (activeTab === "personal") {
        const subsPath = `users/${currentUser.id}/personalSubgroups`;
        const unsubSubs = onSnapshot(
          collection(db, subsPath),
          (snap) => {
            const arr: Subgroup[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Subgroup));
            setSubgroups(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, subsPath)
        );

        const boardsPath = `users/${currentUser.id}/personalBoards`;
        const qBoards = query(collection(db, boardsPath));
        const unsubBoards = onSnapshot(
          qBoards,
          (snap) => {
            const arr: WhiteboardBoard[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as WhiteboardBoard));
            if (arr.length === 0) {
              arr.push({
                id: "default",
                name: "Quadro Geral",
                createdAt: new Date().toISOString(),
                creatorId: "system",
              });
            }
            setWhiteboardBoards(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, boardsPath)
        );

        let tasksPath = `users/${currentUser.id}/personalTasks`;
        let wbPath = `users/${currentUser.id}/personalWhiteboard`;
        let notePath = `users/${currentUser.id}/personalNotes`;

        if (selectedSubgroup) {
          tasksPath = `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/tasks`;
          wbPath = `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/whiteboard`;
          notePath = `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/notebooks`;
        }

        const unsubTasks = onSnapshot(
          collection(db, tasksPath),
          (snap) => {
            const arr: Task[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Task));
            setTasks(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, tasksPath)
        );

        const unsubWb = onSnapshot(
          collection(db, wbPath),
          (snap) => {
            const arr: WhiteboardItem[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as WhiteboardItem));
            setWhiteboardItems(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, wbPath)
        );

        const unsubNotes = onSnapshot(
          collection(db, notePath),
          (snap) => {
            const arr: Notebook[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Notebook));
            setNotebooks(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, notePath)
        );

        return () => {
          unsubSubs();
          unsubBoards();
          unsubTasks();
          unsubWb();
          unsubNotes();
        };
      } else {
        // Listening to active groups when signed in
        const groupsPath = `groups`;
        const unsubGroups = onSnapshot(
          collection(db, groupsPath),
          async (snapshot) => {
            const myGroups: Group[] = [];
            const checkAllPromises = snapshot.docs.map(async (gDoc) => {
              try {
                const group = { ...gDoc.data(), id: gDoc.id } as Group;
                if (group.creatorId === currentUser.id) {
                  myGroups.push(group);
                } else {
                  const memberRef = doc(db, `groups/${group.id}/members`, currentUser.id);
                  const memDoc = await getDoc(memberRef);
                  if (memDoc.exists()) {
                    myGroups.push(group);
                  }
                }
              } catch (err) {
                console.warn("Could not check membership or load group:", gDoc.id, err);
              }
            });
            await Promise.all(checkAllPromises);
            setGroups(myGroups);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, groupsPath)
        );

        return () => unsubGroups();
      }
    }
  }, [currentUser, activeTab, selectedSubgroup, isDemoMode]);

  // Load members, subgroups, tasks, notebooks inside groups
  useEffect(() => {
    if (!currentUser || activeTab !== "groups" || !selectedGroup) {
      setGroupMembers([]);
      setAuditLogs([]);
      if (activeTab !== "personal") {
        setSubgroups([]);
      }
      return;
    }

    if (isDemoMode) {
      // Group Members
      const members = JSON.parse(
        localStorage.getItem(`demo_group_members_${selectedGroup.id}`) || "[]"
      ) as GroupMember[];
      setGroupMembers(members);

      // Subgroups
      const subs = JSON.parse(
        localStorage.getItem(`demo_group_subgroups_${selectedGroup.id}`) || "[]"
      ) as Subgroup[];
      setSubgroups(subs);

      // Audit logs (Visible to all members!)
      const logs = JSON.parse(
        localStorage.getItem(`demo_audit_logs_${selectedGroup.id}`) || "[]"
      ) as AuditLogEntry[];
      setAuditLogs(logs);

      // Group notifications
      const notifs = JSON.parse(
        localStorage.getItem(`demo_group_notifications_${selectedGroup.id}`) || "[]"
      ) as GroupNotification[];
      setGroupNotifications(notifs);
    } else {
      // Firebase Cloud active - Listen to members list
      const membersPath = `groups/${selectedGroup.id}/members`;
      const unsubMembers = onSnapshot(
        collection(db, membersPath),
        (snap) => {
          const arr: GroupMember[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), userId: doc.id } as GroupMember));
          setGroupMembers(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, membersPath)
      );

      // Listen to sub-groups list
      const subsPath = `groups/${selectedGroup.id}/subgroups`;
      const unsubSubs = onSnapshot(
        collection(db, subsPath),
        (snap) => {
          const arr: Subgroup[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Subgroup));
          setSubgroups(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, subsPath)
      );

      // Listen to audit logs (Visible to all members!)
      const logsPath = `groups/${selectedGroup.id}/auditLogs`;
      const unsubAuditLogs = onSnapshot(
        collection(db, logsPath),
        (snap) => {
          const arr: AuditLogEntry[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as AuditLogEntry));
          // Sort by timestamp descending
          arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, logsPath)
      );

      // Listen to group notifications
      const notifsPath = `groups/${selectedGroup.id}/notifications`;
      const unsubNotifs = onSnapshot(
        collection(db, notifsPath),
        (snap) => {
          const arr: GroupNotification[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as GroupNotification));
          // Sort by timestamp descending
          arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setGroupNotifications(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, notifsPath)
      );

      return () => {
        unsubMembers();
        unsubSubs();
        unsubAuditLogs();
        unsubNotifs();
      };
    }
  }, [currentUser, activeTab, selectedGroup, isDemoMode]);

  // Load tasks for all subgroups in the selected group (for Group Notification bell deadlines)
  useEffect(() => {
    if (!currentUser || activeTab !== "groups" || !selectedGroup) {
      setAllGroupTasks([]);
      return;
    }

    if (isDemoMode) {
      const gId = selectedGroup.id;
      const loadAllTasks = () => {
        let merged: Task[] = [];
        const groupSubs = subgroups.filter((s) => s.groupId === gId);
        groupSubs.forEach((sub) => {
          const localTasks = JSON.parse(localStorage.getItem(`demo_sub_tasks_${gId}_${sub.id}`) || "[]") as Task[];
          merged = [...merged, ...localTasks];
        });
        setAllGroupTasks(merged);
      };

      loadAllTasks();
      const interval = setInterval(loadAllTasks, 2000);
      return () => clearInterval(interval);
    } else {
      if (subgroups.length === 0) {
        setAllGroupTasks([]);
        return;
      }

      const unsubscribes: (() => void)[] = [];
      const tasksMap: { [subgroupId: string]: Task[] } = {};

      const updateMergedTasks = () => {
        const merged = Object.values(tasksMap).flat();
        setAllGroupTasks(merged);
      };

      subgroups.forEach((sub) => {
        if (sub.groupId !== selectedGroup.id) return;
        const tasksPath = `groups/${selectedGroup.id}/subgroups/${sub.id}/tasks`;
        const unsub = onSnapshot(
          collection(db, tasksPath),
          (snap) => {
            const arr: Task[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Task));
            tasksMap[sub.id] = arr;
            updateMergedTasks();
          },
          (err) => console.warn("Error listening to tasks for sub", sub.id, err)
        );
        unsubscribes.push(unsub);
      });

      return () => {
        unsubscribes.forEach((unsub) => unsub());
      };
    }
  }, [currentUser, activeTab, selectedGroup, subgroups, isDemoMode]);

  // Trigger alerts/native notifications on new group activities
  useEffect(() => {
    if (!currentUser || activeTab !== "groups" || !selectedGroup) {
      processedGroupNotifsRef.current.clear();
      isFirstGroupNotifLoadRef.current = true;
      return;
    }

    if (groupNotifications.length === 0) {
      return;
    }

    if (isFirstGroupNotifLoadRef.current) {
      groupNotifications.forEach((n) => processedGroupNotifsRef.current.add(n.id));
      isFirstGroupNotifLoadRef.current = false;
      return;
    }

    groupNotifications.forEach((notif) => {
      if (!processedGroupNotifsRef.current.has(notif.id)) {
        processedGroupNotifsRef.current.add(notif.id);

        const isForMe = !notif.assignedTo || notif.assignedTo === currentUser.id || notif.assignedTo === "all";
        const ageMs = Date.now() - new Date(notif.timestamp).getTime();
        const isRecent = ageMs < 30000;

        if (isForMe && isRecent) {
          playNotificationSound();
          addToast("Atualização do Grupo 👥", notif.text, "task");
          showNativeNotification(`Grupo: ${selectedGroup.name}`, notif.text);
        }
      }
    });
  }, [groupNotifications, currentUser, activeTab, selectedGroup]);

  // Trigger alerts/native notifications on new friend requests
  useEffect(() => {
    if (!currentUser) {
      prevFriendRequestsRef.current = [];
      isFirstFriendRequestsLoadRef.current = true;
      return;
    }

    if (friendRequests.length === 0) {
      prevFriendRequestsRef.current = [];
      return;
    }

    if (isFirstFriendRequestsLoadRef.current) {
      prevFriendRequestsRef.current = friendRequests;
      isFirstFriendRequestsLoadRef.current = false;
      return;
    }

    friendRequests.forEach((req) => {
      const prevReq = prevFriendRequestsRef.current.find((r) => r.id === req.id);
      const isNewPending = req.status === "pending" && (!prevReq || prevReq.status !== "pending");
      const isReceived = req.receiverId === currentUser.id;

      if (isNewPending && isReceived) {
        playNotificationSound();
        addToast(
          "Pedido de Amizade 👥",
          `${req.senderName} enviou um pedido de amizade.`,
          "task"
        );
        showNativeNotification("Pedido de Amizade 👥", `${req.senderName} enviou um pedido de amizade.`);
      }
    });

    prevFriendRequestsRef.current = friendRequests;
  }, [friendRequests, currentUser]);

  // Trigger alerts/native notifications on personal tasks due today
  useEffect(() => {
    if (!currentUser) {
      notifiedTasksRef.current.clear();
      return;
    }

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    tasks.forEach((task) => {
      const isPersonalTask = activeTab === "personal" && task.creatorId === currentUser.id;
      const isDueToday = task.dueDate === localTodayStr && task.status === "pending";
      
      if (isPersonalTask && isDueToday && !notifiedTasksRef.current.has(task.id)) {
        notifiedTasksRef.current.add(task.id);
        playNotificationSound();
        addToast(
          "Prazo de Tarefa 📅",
          `A sua tarefa pessoal "${task.title}" vence hoje!`,
          "task"
        );
        showNativeNotification("Prazo de Tarefa 📅", `A sua tarefa pessoal "${task.title}" vence hoje!`);
      }
    });
  }, [tasks, activeTab, currentUser]);

  // Listen to the latest messages in all DM groups for friends list sorting & alerts
  useEffect(() => {
    if (!currentUser || friends.length === 0) {
      setLatestDmMessages({});
      return;
    }

    const unsubscribes: (() => void)[] = [];

    friends.forEach((friend) => {
      const dmGroupId = "dm_" + [currentUser.id, friend.id].sort().join("_");
      
      if (isDemoMode) {
        const checkDm = () => {
          const msgs = JSON.parse(
            localStorage.getItem(`demo_group_messages_${dmGroupId}`) || "[]"
          ) as ChatMessage[];
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            setLatestDmMessages((prev) => {
              const existing = prev[friend.id];
              if (existing && existing.id === lastMsg.id) return prev;
              
              const isNew = !existing || new Date(lastMsg.timestamp).getTime() > new Date(existing.timestamp).getTime();
              const isFromFriend = lastMsg.senderId === friend.id;
              const isChatActive = selectedDmUserId === friend.id && activeModule === "chat";
              
              if (isNew && isFromFriend && !isChatActive) {
                playNotificationSound();
                addToast(
                  "Nova Mensagem Direta 💬",
                  `Você recebeu uma mensagem de ${friend.name}: "${lastMsg.text}"`,
                  "chat"
                );
                showNativeNotification("Nova Mensagem Direta 💬", `Você recebeu uma mensagem de ${friend.name}: "${lastMsg.text}"`);
              }
              
              return { ...prev, [friend.id]: lastMsg };
            });
          }
        };
        checkDm();
        const interval = setInterval(checkDm, 2000);
        unsubscribes.push(() => clearInterval(interval));
      } else {
        const chatPath = `groups/${dmGroupId}/messages`;
        const unsub = onSnapshot(
          collection(db, chatPath),
          (snap) => {
            const arr: ChatMessage[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as ChatMessage));
            if (arr.length > 0) {
              arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              const lastMsg = arr[arr.length - 1];
              
              setLatestDmMessages((prev) => {
                const existing = prev[friend.id];
                if (existing && existing.id === lastMsg.id) return prev;
                
                const isNew = !existing || new Date(lastMsg.timestamp).getTime() > new Date(existing.timestamp).getTime();
                const isFromFriend = lastMsg.senderId === friend.id;
                const isChatActive = selectedDmUserId === friend.id && activeModule === "chat";
                
                if (isNew && isFromFriend && !isChatActive) {
                  playNotificationSound();
                  addToast(
                    "Nova Mensagem Direta 💬",
                    `Você recebeu uma mensagem de ${friend.name}: "${lastMsg.text}"`,
                    "chat"
                  );
                  showNativeNotification("Nova Mensagem Direta 💬", `Você recebeu uma mensagem de ${friend.name}: "${lastMsg.text}"`);
                }
                
                return { ...prev, [friend.id]: lastMsg };
              });
            }
          },
          (err) => console.warn(`Error listening to DM messages for ${friend.name}:`, err)
        );
        unsubscribes.push(unsub);
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [currentUser, friends, isDemoMode, selectedDmUserId, activeModule]);

  // Check and dynamically initialize private DM groups
  useEffect(() => {
    if (!currentUser || !selectedDmUserId) return;
    const dmGroupId = "dm_" + [currentUser.id, selectedDmUserId].sort().join("_");
    
    if (isDemoMode) {
      const allGroups = JSON.parse(localStorage.getItem("demo_groups") || "[]") as Group[];
      if (!allGroups.some(g => g.id === dmGroupId)) {
        const newDmGroup: Group = {
          id: dmGroupId,
          name: `DM Chat`,
          description: `Private DM`,
          code: `DM`,
          creatorId: currentUser.id,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem("demo_groups", JSON.stringify([...allGroups, newDmGroup]));
        
        const initialMembers = [
          {
            userId: currentUser.id,
            name: currentUser.name,
            photoUrl: currentUser.photoUrl,
            role: "Membro",
            color: PRESET_MEMBER_COLORS[0],
            joinedAt: new Date().toISOString()
          },
          {
            userId: selectedDmUserId,
            name: friends.find(f => f.id === selectedDmUserId)?.name || "Amigo",
            photoUrl: friends.find(f => f.id === selectedDmUserId)?.photoUrl || "",
            role: "Membro",
            color: PRESET_MEMBER_COLORS[1],
            joinedAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(`demo_group_members_${dmGroupId}`, JSON.stringify(initialMembers));
      }
    } else {
      const checkAndCreateDmGroup = async () => {
        try {
          const groupRef = doc(db, "groups", dmGroupId);
          const snap = await getDoc(groupRef);
          if (!snap.exists()) {
            const newDmGroup: Group = {
              id: dmGroupId,
              name: `DM Chat`,
              description: `Private DM`,
              code: `DM`,
              creatorId: currentUser.id,
              createdAt: new Date().toISOString()
            };
            await setDoc(groupRef, newDmGroup);
            
            await setDoc(doc(db, `groups/${dmGroupId}/members`, currentUser.id), {
              userId: currentUser.id,
              name: currentUser.name,
              photoUrl: currentUser.photoUrl,
              role: "Membro",
              color: PRESET_MEMBER_COLORS[0],
              joinedAt: new Date().toISOString()
            });
            
            const recipientFriend = friends.find(f => f.id === selectedDmUserId);
            await setDoc(doc(db, `groups/${dmGroupId}/members`, selectedDmUserId), {
              userId: selectedDmUserId,
              name: recipientFriend?.name || "Amigo",
              photoUrl: recipientFriend?.photoUrl || "",
              role: "Membro",
              color: PRESET_MEMBER_COLORS[1],
              joinedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Error creating DM group in Firestore", e);
        }
      };
      checkAndCreateDmGroup();
    }
  }, [currentUser, selectedDmUserId, isDemoMode, friends]);

  // Listen to chat messages (Group Mural OR DM Chat)
  useEffect(() => {
    if (!currentUser) {
      setChatMessages([]);
      return;
    }

    if (selectedDmUserId) {
      const dmGroupId = "dm_" + [currentUser.id, selectedDmUserId].sort().join("_");
      
      if (isDemoMode) {
        const loadDmMessages = () => {
          const msgs = JSON.parse(
            localStorage.getItem(`demo_group_messages_${dmGroupId}`) || "[]"
          ) as ChatMessage[];
          msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setChatMessages(msgs);
        };
        loadDmMessages();
        const interval = setInterval(loadDmMessages, 1000);
        return () => clearInterval(interval);
      } else {
        const chatPath = `groups/${dmGroupId}/messages`;
        const unsubChat = onSnapshot(
          collection(db, chatPath),
          (snap) => {
            const arr: ChatMessage[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as ChatMessage));
            arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setChatMessages(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, chatPath)
        );
        return () => unsubChat();
      }
    } else if (activeTab === "groups" && selectedGroup) {
      if (isDemoMode) {
        const loadGroupMessages = () => {
          const msgs = JSON.parse(
            localStorage.getItem(`demo_group_messages_${selectedGroup.id}`) || "[]"
          ) as ChatMessage[];
          msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setChatMessages(msgs);
        };
        loadGroupMessages();
        const interval = setInterval(loadGroupMessages, 1000);
        return () => clearInterval(interval);
      } else {
        const chatPath = `groups/${selectedGroup.id}/messages`;
        const unsubChat = onSnapshot(
          collection(db, chatPath),
          (snap) => {
            const arr: ChatMessage[] = [];
            snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as ChatMessage));
            arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setChatMessages(arr);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, chatPath)
        );
        return () => unsubChat();
      }
    } else {
      setChatMessages([]);
    }
  }, [currentUser, selectedDmUserId, selectedGroup, activeTab, isDemoMode]);

  // Load selected Subgroup files/items
  useEffect(() => {
    if (!currentUser || activeTab !== "groups" || !selectedGroup || !selectedSubgroup) {
      setTasks([]);
      setWhiteboardItems([]);
      setNotebooks([]);
      return;
    }

    if (isDemoMode) {
      const gId = selectedGroup.id;
      const sId = selectedSubgroup.id;

      const localTasks = JSON.parse(localStorage.getItem(`demo_sub_tasks_${gId}_${sId}`) || "[]") as Task[];
      setTasks(localTasks);

      const localPostits = JSON.parse(localStorage.getItem(`demo_sub_whiteboard_${gId}_${sId}`) || "[]") as WhiteboardItem[];
      setWhiteboardItems(localPostits);

      const localNotes = JSON.parse(localStorage.getItem(`demo_sub_notebooks_${gId}_${sId}`) || "[]") as Notebook[];
      setNotebooks(localNotes);
    } else {
      // Firebase Cloud - listen to items
      const gId = selectedGroup.id;
      const sId = selectedSubgroup.id;

      const tasksPath = `groups/${gId}/subgroups/${sId}/tasks`;
      const unsubTasks = onSnapshot(
        collection(db, tasksPath),
        (snap) => {
          const arr: Task[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Task));
          setTasks(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, tasksPath)
      );

      const wbPath = `groups/${gId}/subgroups/${sId}/whiteboard`;
      const unsubWb = onSnapshot(
        collection(db, wbPath),
        (snap) => {
          const arr: WhiteboardItem[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as WhiteboardItem));
          setWhiteboardItems(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, wbPath)
      );

      const notesPath = `groups/${gId}/subgroups/${sId}/notebooks`;
      const unsubNotes = onSnapshot(
        collection(db, notesPath),
        (snap) => {
          const arr: Notebook[] = [];
          snap.forEach((doc) => arr.push({ ...doc.data(), id: doc.id } as Notebook));
          setNotebooks(arr);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, notesPath)
      );

      return () => {
        unsubTasks();
        unsubWb();
        unsubNotes();
      };
    }
  }, [currentUser, activeTab, selectedGroup, selectedSubgroup, isDemoMode]);

  // --- ACTIONS IMPLEMENTATION ---

  const signUp = async (email: string, password: string, name: string, photoUrl: string, role?: string) => {
    setAuthError(null);

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      const errMsg = "Formato de e-mail inválido. Por favor, insira um e-mail válido.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    }

    // Password validation
    if (!password || password.length < 6) {
      const errMsg = "A senha deve ter pelo menos 6 caracteres.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    }

    const uid = Math.random().toString(36).substring(2, 9);
    const newProfile: UserProfile = {
      id: isDemoMode ? uid : "",
      name,
      email,
      photoUrl,
      role,
      theme,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode) {
      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      const exists = storedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        const errMsg = "Este e-mail já está cadastrado no sistema.";
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      // Save user profile
      saveDemoUser(newProfile);

      // Save password in Demo mode
      const passwords = JSON.parse(localStorage.getItem("demo_passwords") || "{}");
      passwords[email.toLowerCase()] = password;
      localStorage.setItem("demo_passwords", JSON.stringify(passwords));
    } else {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const userDocRef = doc(db, "users", result.user.uid);
        newProfile.id = result.user.uid;
        await setDoc(userDocRef, newProfile);
        setCurrentUser(newProfile);
      } catch (error: any) {
        let errMsg = error.message || String(error);
        if (error.code === "auth/operation-not-allowed" || errMsg.includes("configuration-not-found")) {
          // Dynamic fallback to Demo/Local isolation mode
          console.warn("Email/Password Auth is disabled in Firebase Console. Gracefully falling back to Demo Mode.");
          setIsDemoMode(true);
          
          const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
          const exists = storedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
          if (exists) {
            const foundUser = storedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
            if (foundUser) {
              saveDemoUser(foundUser);
              return;
            }
          }
          
          const demoUid = "demo_" + Math.random().toString(36).substring(2, 9);
          newProfile.id = demoUid;
          storedUsers.push(newProfile);
          localStorage.setItem("all_demo_users", JSON.stringify(storedUsers));
          saveDemoUser(newProfile);
          
          const passwords = JSON.parse(localStorage.getItem("demo_passwords") || "{}");
          passwords[email.toLowerCase()] = password;
          localStorage.setItem("demo_passwords", JSON.stringify(passwords));
          return;
        }

        if (error.code === "auth/email-already-in-use") {
          errMsg = "Este e-mail já está em uso por outra conta.";
        } else if (error.code === "auth/invalid-email") {
          errMsg = "O endereço de e-mail é inválido.";
        } else if (error.code === "auth/weak-password") {
          errMsg = "A senha escolhida é muito fraca (mínimo de 6 caracteres).";
        } else {
          errMsg = `Erro ao cadastrar: ${errMsg}`;
        }
        setAuthError(errMsg);
        throw new Error(errMsg);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      const errMsg = "Formato de e-mail inválido. Por favor, insira um e-mail válido.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    }

    if (!password) {
      const errMsg = "A senha é obrigatória para fazer login.";
      setAuthError(errMsg);
      throw new Error(errMsg);
    }

    if (isDemoMode) {
      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      const found = storedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        const errMsg = "Este e-mail não foi encontrado no sistema. Por favor, realize o cadastro primeiro.";
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      const passwords = JSON.parse(localStorage.getItem("demo_passwords") || "{}");
      const savedPass = passwords[email.toLowerCase()];
      if (savedPass && savedPass !== password) {
        const errMsg = "Senha incorreta para esta conta.";
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      saveDemoUser(found);
    } else {
      try {
        // Cloud sign in - directly authenticate the user
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Fetch the authenticated user's document
        const userDocRef = doc(db, "users", result.user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            id: result.user.uid,
            name: email.split("@")[0],
            email,
            photoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=" + result.user.uid,
            theme: "dark",
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setCurrentUser(newProfile);
        }
      } catch (error: any) {
        let errMsg = error.message || String(error);
        if (error.code === "auth/operation-not-allowed" || errMsg.includes("configuration-not-found")) {
          // Dynamic fallback to Demo/Local isolation mode
          console.warn("Email/Password Auth is disabled in Firebase Console. Gracefully falling back to Demo Mode.");
          setIsDemoMode(true);
          
          const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
          let found = storedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
          
          if (!found) {
            found = {
              id: "demo_" + Math.random().toString(36).substring(2, 9),
              name: email.split("@")[0],
              email,
              photoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=" + email,
              role: "Membro",
              theme: "dark",
              createdAt: new Date().toISOString(),
            };
            storedUsers.push(found);
            localStorage.setItem("all_demo_users", JSON.stringify(storedUsers));
            
            const passwords = JSON.parse(localStorage.getItem("demo_passwords") || "{}");
            passwords[email.toLowerCase()] = password;
            localStorage.setItem("demo_passwords", JSON.stringify(passwords));
          }
          
          saveDemoUser(found);
          return;
        }

        if (
          error.code === "auth/wrong-password" || 
          error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found"
        ) {
          errMsg = "Credenciais incorretas. Verifique se o e-mail está correto e se você já possui cadastro.";
        } else {
          errMsg = `Erro ao fazer login: ${errMsg}`;
        }
        setAuthError(errMsg);
        throw new Error(errMsg);
      }
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (isDemoMode) {
      // Simulate Google Sign In inside Local Demo mode
      const googleUserEmail = "user.google@gmail.com";
      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      let found = storedUsers.find((u) => u.email.toLowerCase() === googleUserEmail.toLowerCase());
      if (!found) {
        found = {
          id: "google_" + Math.random().toString(36).substring(2, 9),
          name: "Lucas Silva (Google)",
          email: googleUserEmail,
          photoUrl: "https://lh3.googleusercontent.com/a/default-user=s120-c",
          role: "Product Lead",
          theme: "dark",
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem("all_demo_users", JSON.stringify([...storedUsers, found]));
      }
      saveDemoUser(found);
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        
        // Ensure user profile document exists
        const userDocRef = doc(db, "users", fbUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
            email: fbUser.email || "",
            photoUrl: fbUser.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=" + fbUser.uid,
            role: "Membro",
            theme: theme,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setCurrentUser(newProfile);
        }
      } catch (error: any) {
        setAuthError(error.message || "Erro ao fazer login com o Google.");
        throw error;
      }
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      saveDemoUser(null);
      setSelectedGroup(null);
      setSelectedSubgroupState(null);
    } else {
      await fbSignOut(auth);
      setCurrentUser(null);
      setSelectedGroup(null);
      setSelectedSubgroupState(null);
    }
  };

  const updateUserProfile = async (name: string, photoUrl: string, role?: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, name, photoUrl, role };

    if (isDemoMode) {
      saveDemoUser(updated);

      // Also update inside global users list
      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      const updatedList = storedUsers.map((u) => (u.id === currentUser.id ? updated : u));
      localStorage.setItem("all_demo_users", JSON.stringify(updatedList));

      // Update members in groups
      groups.forEach((g) => {
        const mems = JSON.parse(localStorage.getItem(`demo_group_members_${g.id}`) || "[]") as GroupMember[];
        const updatedMems = mems.map((m) =>
          m.userId === currentUser.id ? { ...m, name, photoUrl, role } : m
        );
        localStorage.setItem(`demo_group_members_${g.id}`, JSON.stringify(updatedMems));
      });
    } else {
      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, { name, photoUrl, role });
      setCurrentUser(updated);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("workspace_theme", nextTheme);

    if (currentUser) {
      if (isDemoMode) {
        saveDemoUser({ ...currentUser, theme: nextTheme });
      } else {
        updateDoc(doc(db, "users", currentUser.id), { theme: nextTheme }).catch((e) => console.error(e));
      }
    }
  };

  // --- GROUPS ACTIONS ---

  const generate6DigitCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createGroup = async (name: string, description: string): Promise<Group> => {
    if (!currentUser) throw new Error("Não autenticado");
    const groupId = Math.random().toString(36).substring(2, 9);
    const code = generate6DigitCode();

    const newGroup: Group = {
      id: isDemoMode ? groupId : "",
      name,
      description,
      code,
      creatorId: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    const initialMember: GroupMember = {
      userId: currentUser.id,
      name: currentUser.name,
      photoUrl: currentUser.photoUrl,
      role: currentUser.role || "Criador",
      color: PRESET_MEMBER_COLORS[0],
      joinedAt: new Date().toISOString(),
    };

    if (isDemoMode) {
      newGroup.id = groupId;
      const allDemoGroups = JSON.parse(localStorage.getItem("demo_groups") || "[]") as Group[];
      localStorage.setItem("demo_groups", JSON.stringify([...allDemoGroups, newGroup]));
      localStorage.setItem(`demo_group_members_${groupId}`, JSON.stringify([initialMember]));
      setGroups((prev) => [...prev, newGroup]);
      setSelectedGroup(newGroup);
      return newGroup;
    } else {
      try {
        const groupRef = await addDoc(collection(db, "groups"), newGroup);
        const groupCreated = { ...newGroup, id: groupRef.id };
        await updateDoc(doc(db, "groups", groupRef.id), { id: groupRef.id });

        // Add creator as member
        const creatorMemberRef = doc(db, `groups/${groupRef.id}/members`, currentUser.id);
        await setDoc(creatorMemberRef, initialMember);

        setSelectedGroup(groupCreated);
        return groupCreated;
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "groups");
        throw e;
      }
    }
  };

  const joinGroup = async (code: string): Promise<Group> => {
    if (!currentUser) throw new Error("Não autenticado");
    const formattedCode = code.toUpperCase().trim();

    if (isDemoMode) {
      const allDemoGroups = JSON.parse(localStorage.getItem("demo_groups") || "[]") as Group[];
      const found = allDemoGroups.find((g) => g.code === formattedCode);
      if (!found) throw new Error("Grupo não encontrado com este código de 6 dígitos.");

      const members = JSON.parse(localStorage.getItem(`demo_group_members_${found.id}`) || "[]") as GroupMember[];
      const alreadyMember = members.some((m) => m.userId === currentUser.id);

      if (!alreadyMember) {
        const targetColor = PRESET_MEMBER_COLORS[members.length % PRESET_MEMBER_COLORS.length];
        const joinMember: GroupMember = {
          userId: currentUser.id,
          name: currentUser.name,
          photoUrl: currentUser.photoUrl,
          role: currentUser.role || "Membro",
          color: targetColor,
          joinedAt: new Date().toISOString(),
        };
        localStorage.setItem(`demo_group_members_${found.id}`, JSON.stringify([...members, joinMember]));
      }

      setGroups((prev) => (prev.some((g) => g.id === found.id) ? prev : [...prev, found]));
      setSelectedGroup(found);
      return found;
    } else {
      try {
        // Query by group code
        const qGroups = query(collection(db, "groups"), where("code", "==", formattedCode));
        const res = await getDocs(qGroups);
        if (res.empty) throw new Error("Grupo não encontrado com este código de 6 dígitos.");

        const gDoc = res.docs[0];
        const groupObj = { ...gDoc.data(), id: gDoc.id } as Group;

        // Check if member already present
        const memberRef = doc(db, `groups/${groupObj.id}/members`, currentUser.id);
        const memDoc = await getDoc(memberRef);

        if (!memDoc.exists()) {
          // Generate a deterministic color preset index using user details hash
          const strToHash = currentUser.id || currentUser.name || "Membro";
          let hash = 0;
          for (let i = 0; i < strToHash.length; i++) {
            hash = strToHash.charCodeAt(i) + ((hash << 5) - hash);
          }
          const colorIndex = Math.abs(hash) % PRESET_MEMBER_COLORS.length;
          const targetColor = PRESET_MEMBER_COLORS[colorIndex];

          const joinMember: GroupMember = {
            userId: currentUser.id,
            name: currentUser.name,
            photoUrl: currentUser.photoUrl,
            role: currentUser.role || "Membro",
            color: targetColor,
            joinedAt: new Date().toISOString(),
          };
          await setDoc(memberRef, joinMember);
        }

        setSelectedGroup(groupObj);
        return groupObj;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `groups`);
        throw e;
      }
    }
  };

  const leaveGroup = async (groupId: string): Promise<void> => {
    if (!currentUser) return;

    if (isDemoMode) {
      const members = JSON.parse(localStorage.getItem(`demo_group_members_${groupId}`) || "[]") as GroupMember[];
      const updated = members.filter((m) => m.userId !== currentUser.id);
      localStorage.setItem(`demo_group_members_${groupId}`, JSON.stringify(updated));

      // Remove group from UI list
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setSelectedSubgroupState(null);
      }
    } else {
      try {
        const memberRef = doc(db, `groups/${groupId}/members`, currentUser.id);
        await deleteDoc(memberRef);

        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
          setSelectedSubgroupState(null);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `groups/${groupId}/members/${currentUser.id}`);
      }
    }
  };

  // --- SUBGROUP ACTIONS ---

  const createSubgroup = async (name: string, description: string, color: string, isPrivate?: boolean): Promise<Subgroup> => {
    if (!currentUser) throw new Error("Contexto inválido");
    const subgroupId = Math.random().toString(36).substring(2, 9);
    const isPersonalSub = activeTab === "personal";

    const newSub: Subgroup = {
      id: isDemoMode ? subgroupId : "",
      groupId: isPersonalSub ? "personal" : (selectedGroup?.id || ""),
      name,
      description,
      creatorId: currentUser.id,
      color,
      createdAt: new Date().toISOString(),
      isPrivate: isPersonalSub ? false : !!isPrivate,
      members: [currentUser.id]
    };

    if (isDemoMode) {
      newSub.id = subgroupId;
      const key = isPersonalSub 
        ? `demo_personal_subgroups_${currentUser.id}`
        : `demo_group_subgroups_${selectedGroup?.id}`;
      const subs = JSON.parse(localStorage.getItem(key) || "[]") as Subgroup[];
      localStorage.setItem(key, JSON.stringify([...subs, newSub]));
      setSubgroups((prev) => [...prev, newSub]);
      setSelectedSubgroupState(newSub);
      return newSub;
    } else {
      try {
        const subCol = isPersonalSub
          ? collection(db, `users/${currentUser.id}/personalSubgroups`)
          : collection(db, `groups/${selectedGroup?.id}/subgroups`);
        const result = await addDoc(subCol, newSub);
        const subCreated = { ...newSub, id: result.id };
        const path = isPersonalSub
          ? `users/${currentUser.id}/personalSubgroups`
          : `groups/${selectedGroup?.id}/subgroups`;
        await updateDoc(doc(db, path, result.id), { id: result.id });
        setSelectedSubgroupState(subCreated);
        return subCreated;
      } catch (e) {
        const path = isPersonalSub
          ? `users/${currentUser.id}/personalSubgroups`
          : `groups/${selectedGroup?.id}/subgroups`;
        handleFirestoreError(e, OperationType.CREATE, path);
        throw e;
      }
    }
  };

  const toggleSubgroupMembership = async (subgroupId: string, userId: string): Promise<void> => {
    if (!currentUser || activeTab === "personal" || !selectedGroup) return;
    const sub = subgroups.find((s) => s.id === subgroupId);
    if (!sub) return;

    const currentMembers = sub.members || [];
    let updatedMembers: string[];
    if (currentMembers.includes(userId)) {
      updatedMembers = currentMembers.filter((id) => id !== userId);
    } else {
      updatedMembers = [...currentMembers, userId];
    }

    if (isDemoMode) {
      const key = `demo_group_subgroups_${selectedGroup.id}`;
      const subs = JSON.parse(localStorage.getItem(key) || "[]") as Subgroup[];
      const updated = subs.map((s) => (s.id === subgroupId ? { ...s, members: updatedMembers } : s));
      localStorage.setItem(key, JSON.stringify(updated));
      setSubgroups(updated);
      if (selectedSubgroup && selectedSubgroup.id === subgroupId) {
        setSelectedSubgroupState({ ...selectedSubgroup, members: updatedMembers });
      }
    } else {
      try {
        const subRef = doc(db, `groups/${selectedGroup.id}/subgroups`, subgroupId);
        await updateDoc(subRef, { members: updatedMembers });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `groups/${selectedGroup.id}/subgroups/${subgroupId}`);
      }
    }
  };

  const deleteSubgroup = async (subgroupId: string): Promise<void> => {
    if (!currentUser) return;
    const isPersonalSub = activeTab === "personal";

    if (isDemoMode) {
      const key = isPersonalSub
        ? `demo_personal_subgroups_${currentUser.id}`
        : `demo_group_subgroups_${selectedGroup?.id}`;
      const subs = JSON.parse(localStorage.getItem(key) || "[]") as Subgroup[];
      const filtered = subs.filter((s) => s.id !== subgroupId);
      localStorage.setItem(key, JSON.stringify(filtered));
      setSubgroups(filtered);
      if (selectedSubgroup?.id === subgroupId) {
        setSelectedSubgroupState(null);
      }
    } else {
      try {
        const subRef = isPersonalSub
          ? doc(db, `users/${currentUser.id}/personalSubgroups`, subgroupId)
          : doc(db, `groups/${selectedGroup?.id}/subgroups`, subgroupId);
        await deleteDoc(subRef);
        if (selectedSubgroup?.id === subgroupId) {
          setSelectedSubgroupState(null);
        }
      } catch (e) {
        const path = isPersonalSub
          ? `users/${currentUser.id}/personalSubgroups/${subgroupId}`
          : `groups/${selectedGroup?.id}/subgroups/${subgroupId}`;
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  };

  const checkSubgroupPermission = (subgroupId: string): boolean => {
    if (!currentUser) return false;
    // Group Creator and Subgroup Creator always have edit permissions
    if (selectedGroup?.creatorId === currentUser.id) return true;

    const sub = subgroups.find((s) => s.id === subgroupId);
    if (sub && sub.creatorId === currentUser.id) return true;

    // Check custom permissions in local variables
    if (isDemoMode) {
      const permsKey = `demo_permissions_${selectedGroup?.id}_${subgroupId}`;
      const perms = JSON.parse(localStorage.getItem(permsKey) || "{}");
      return perms[currentUser.id] !== false; // Active by default unless explicitly blocked, or customized
    } else {
      // In cloud mode, checked onFirestore with rules. On Client side, we fetch the permissions collection if any
      return true; // Simple optimistic local allowance; Firestore Rules will secure write transactions anyway.
    }
  };

  const getSubgroupPermissions = async (subgroupId: string) => {
    if (!selectedGroup) return {};
    if (isDemoMode) {
      const permsKey = `demo_permissions_${selectedGroup.id}_${subgroupId}`;
      return JSON.parse(localStorage.getItem(permsKey) || "{}");
    } else {
      const arr: { [uId: string]: boolean } = {};
      try {
        const permsRef = collection(db, `groups/${selectedGroup.id}/subgroups/${subgroupId}/permissions`);
        const queryRes = await getDocs(permsRef);
        queryRes.forEach((doc) => {
          arr[doc.id] = doc.data().canEdit;
        });
      } catch (e) {
        console.error(e);
      }
      return arr;
    }
  };

  const grantSubgroupPermission = async (subgroupId: string, targetUserId: string, canEdit: boolean): Promise<void> => {
    if (!selectedGroup) return;

    if (isDemoMode) {
      const permsKey = `demo_permissions_${selectedGroup.id}_${subgroupId}`;
      const perms = JSON.parse(localStorage.getItem(permsKey) || "{}");
      perms[targetUserId] = canEdit;
      localStorage.setItem(permsKey, JSON.stringify(perms));
    } else {
      try {
        const permRootRef = doc(db, `groups/${selectedGroup.id}/subgroups/${subgroupId}/permissions`, targetUserId);
        await setDoc(permRootRef, { userId: targetUserId, canEdit, setBy: currentUser?.id });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `groups/${selectedGroup.id}/subgroups/${subgroupId}/permissions/${targetUserId}`);
      }
    }
  };

  // --- CONTEXT HELPERS ---
  const getTaskContext = (id?: string) => {
    if (!currentUser) return null;
    if (activeTab === "personal") {
      if (isDemoMode) {
        return selectedSubgroup
          ? `demo_personal_tasks_${currentUser.id}_${selectedSubgroup.id}`
          : `demo_personal_tasks_${currentUser.id}`;
      } else {
        return selectedSubgroup
          ? (id ? doc(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/tasks`, id) : collection(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/tasks`))
          : (id ? doc(db, `users/${currentUser.id}/personalTasks`, id) : collection(db, `users/${currentUser.id}/personalTasks`));
      }
    } else {
      if (selectedGroup && selectedSubgroup) {
        if (isDemoMode) {
          return `demo_sub_tasks_${selectedGroup.id}_${selectedSubgroup.id}`;
        } else {
          return id
            ? doc(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/tasks`, id)
            : collection(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/tasks`);
        }
      }
    }
    return null;
  };

  const getWbContext = (id?: string) => {
    if (!currentUser) return null;
    if (activeTab === "personal") {
      if (isDemoMode) {
        return selectedSubgroup
          ? `demo_personal_whiteboard_${currentUser.id}_${selectedSubgroup.id}`
          : `demo_personal_whiteboard_${currentUser.id}`;
      } else {
        return selectedSubgroup
          ? (id ? doc(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/whiteboard`, id) : collection(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/whiteboard`))
          : (id ? doc(db, `users/${currentUser.id}/personalWhiteboard`, id) : collection(db, `users/${currentUser.id}/personalWhiteboard`));
      }
    } else {
      if (selectedGroup && selectedSubgroup) {
        if (isDemoMode) {
          return `demo_sub_whiteboard_${selectedGroup.id}_${selectedSubgroup.id}`;
        } else {
          return id
            ? doc(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/whiteboard`, id)
            : collection(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/whiteboard`);
        }
      }
    }
    return null;
  };

  const getNotesContext = (id?: string) => {
    if (!currentUser) return null;
    if (activeTab === "personal") {
      if (isDemoMode) {
        return selectedSubgroup
          ? `demo_personal_notes_${currentUser.id}_${selectedSubgroup.id}`
          : `demo_personal_notes_${currentUser.id}`;
      } else {
        return selectedSubgroup
          ? (id ? doc(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/notebooks`, id) : collection(db, `users/${currentUser.id}/personalSubgroups/${selectedSubgroup.id}/notebooks`))
          : (id ? doc(db, `users/${currentUser.id}/personalNotes`, id) : collection(db, `users/${currentUser.id}/personalNotes`));
      }
    } else {
      if (selectedGroup && selectedSubgroup) {
        if (isDemoMode) {
          return `demo_sub_notebooks_${selectedGroup.id}_${selectedSubgroup.id}`;
        } else {
          return id
            ? doc(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/notebooks`, id)
            : collection(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/notebooks`);
        }
      }
    }
    return null;
  };

  // --- WHITEBOARD BOARDS ACTIONS (Multi-Whiteboard) ---
  const createWhiteboardBoard = async (name: string): Promise<void> => {
    if (!currentUser) return;
    const boardId = "board_" + Math.random().toString(36).substring(2, 9);
    const newBoard: WhiteboardBoard = {
      id: boardId,
      name,
      createdAt: new Date().toISOString(),
      creatorId: currentUser.id,
    };

    if (isDemoMode) {
      if (activeTab === "personal") {
        const key = `demo_personal_boards_${currentUser.id}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]") as WhiteboardBoard[];
        const updated = [...current, newBoard];
        localStorage.setItem(key, JSON.stringify(updated));
        setWhiteboardBoards(updated);
      } else if (selectedGroup && selectedSubgroup) {
        const key = `demo_sub_boards_${selectedGroup.id}_${selectedSubgroup.id}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]") as WhiteboardBoard[];
        const updated = [...current, newBoard];
        localStorage.setItem(key, JSON.stringify(updated));
        setWhiteboardBoards(updated);
      }
    } else {
      try {
        let colRef;
        let colPath = "";
        if (activeTab === "personal") {
          colPath = `users/${currentUser.id}/personalBoards`;
          colRef = collection(db, colPath);
        } else if (selectedGroup && selectedSubgroup) {
          colPath = `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/boards`;
          colRef = collection(db, colPath);
        } else {
          return;
        }
        await setDoc(doc(colRef, boardId), newBoard);
      } catch (e) {
        const colPath = activeTab === "personal"
          ? `users/${currentUser.id}/personalBoards`
          : `groups/${selectedGroup?.id}/subgroups/${selectedSubgroup?.id}/boards`;
        handleFirestoreError(e, OperationType.CREATE, colPath);
      }
    }
    setActiveBoardId(boardId);
  };

  const deleteWhiteboardBoard = async (boardId: string): Promise<void> => {
    if (!currentUser || boardId === "default") return;

    if (isDemoMode) {
      if (activeTab === "personal") {
        const key = `demo_personal_boards_${currentUser.id}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]") as WhiteboardBoard[];
        const updated = current.filter((b) => b.id !== boardId);
        localStorage.setItem(key, JSON.stringify(updated));
        setWhiteboardBoards(updated);
      } else if (selectedGroup && selectedSubgroup) {
        const key = `demo_sub_boards_${selectedGroup.id}_${selectedSubgroup.id}`;
        const current = JSON.parse(localStorage.getItem(key) || "[]") as WhiteboardBoard[];
        const updated = current.filter((b) => b.id !== boardId);
        localStorage.setItem(key, JSON.stringify(updated));
        setWhiteboardBoards(updated);
      }
    } else {
      try {
        let docRef;
        let docPath = "";
        if (activeTab === "personal") {
          docPath = `users/${currentUser.id}/personalBoards/${boardId}`;
          docRef = doc(db, `users/${currentUser.id}/personalBoards`, boardId);
        } else if (selectedGroup && selectedSubgroup) {
          docPath = `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/boards/${boardId}`;
          docRef = doc(db, `groups/${selectedGroup.id}/subgroups/${selectedSubgroup.id}/boards`, boardId);
        } else {
          return;
        }
        await deleteDoc(docRef);
      } catch (e) {
        const docPath = activeTab === "personal"
          ? `users/${currentUser.id}/personalBoards/${boardId}`
          : `groups/${selectedGroup?.id}/subgroups/${selectedSubgroup?.id}/boards/${boardId}`;
        handleFirestoreError(e, OperationType.DELETE, docPath);
      }
    }
    setActiveBoardId("default");
  };

  // --- TASKS ACTIONS ---

  const addAuditLog = async (
    groupId: string,
    subgroupId: string,
    subgroupName: string,
    taskId: string,
    taskTitle: string,
    action: "create" | "complete" | "delete" | "update"
  ) => {
    if (!currentUser) return;
    const logId = Math.random().toString(36).substring(2, 9);
    const logEntry: AuditLogEntry = {
      id: isDemoMode ? logId : "",
      groupId,
      subgroupId,
      subgroupName,
      taskId,
      taskTitle,
      action,
      performedBy: currentUser.name,
      performedById: currentUser.id,
      timestamp: new Date().toISOString(),
    };

    if (isDemoMode) {
      logEntry.id = logId;
      const key = `demo_audit_logs_${groupId}`;
      const existingLogs = JSON.parse(localStorage.getItem(key) || "[]") as AuditLogEntry[];
      localStorage.setItem(key, JSON.stringify([logEntry, ...existingLogs]));
      if (selectedGroup && selectedGroup.id === groupId) {
        setAuditLogs((prev) => [logEntry, ...prev]);
      }
    } else {
      try {
        const colRef = collection(db, `groups/${groupId}/auditLogs`);
        const docRef = doc(colRef);
        logEntry.id = docRef.id;
        if (selectedGroup && selectedGroup.id === groupId) {
          setAuditLogs((prev) => [logEntry, ...prev]);
        }
        await setDoc(docRef, logEntry);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `groups/${groupId}/auditLogs`);
      }
    }
  };

  const addGroupNotification = async (
    type: "completed" | "assigned" | "due",
    text: string,
    taskId: string,
    assignedTo?: string
  ) => {
    if (!selectedGroup) return;
    const notifId = Math.random().toString(36).substring(2, 9);
    const newNotif: GroupNotification = {
      id: isDemoMode ? notifId : "",
      type,
      text,
      timestamp: new Date().toISOString(),
      taskId,
      assignedTo: assignedTo || "",
      readBy: [],
    };

    if (isDemoMode) {
      newNotif.id = notifId;
      const key = `demo_group_notifications_${selectedGroup.id}`;
      const current = JSON.parse(localStorage.getItem(key) || "[]") as GroupNotification[];
      localStorage.setItem(key, JSON.stringify([newNotif, ...current]));
      setGroupNotifications((prev) => [newNotif, ...prev]);
    } else {
      try {
        const colRef = collection(db, `groups/${selectedGroup.id}/notifications`);
        const res = await addDoc(colRef, newNotif);
        await updateDoc(doc(db, colRef.path, res.id), { id: res.id });
      } catch (e) {
        console.error("Error adding group notification", e);
      }
    }
  };

  const dismissGroupNotification = async (notificationId: string): Promise<void> => {
    if (!currentUser || !selectedGroup) return;

    if (isDemoMode) {
      const key = `demo_group_notifications_${selectedGroup.id}`;
      const current = JSON.parse(localStorage.getItem(key) || "[]") as GroupNotification[];
      const updated = current.map((n) =>
        n.id === notificationId
          ? { ...n, readBy: n.readBy.includes(currentUser.id) ? n.readBy : [...n.readBy, currentUser.id] }
          : n
      );
      localStorage.setItem(key, JSON.stringify(updated));
      setGroupNotifications(updated);
    } else {
      try {
        const notifRef = doc(db, `groups/${selectedGroup.id}/notifications`, notificationId);
        const snap = await getDoc(notifRef);
        if (snap.exists()) {
          const data = snap.data() as GroupNotification;
          const readBy = data.readBy || [];
          if (!readBy.includes(currentUser.id)) {
            await updateDoc(notifRef, {
              readBy: [...readBy, currentUser.id]
            });
          }
        }
      } catch (e) {
        console.error("Error dismissing group notification", e);
      }
    }
  };

  const createTask = async (
    title: string,
    description: string,
    priority: "low" | "medium" | "high",
    dueDate: string,
    assignedTo?: string,
    checklistTexts?: string[]
  ): Promise<void> => {
    if (!currentUser) return;
    const taskId = Math.random().toString(36).substring(2, 9);

    const checkItems: ChecklistItem[] = (checklistTexts || []).map((t, idx) => ({
      id: "chk_" + idx + "_" + Math.random().toString(36).substring(2, 5),
      text: t,
      done: false,
    }));

    let assignedToName = "";
    if (assignedTo && assignedTo !== "all") {
      const mem = groupMembers.find((m) => m.userId === assignedTo);
      assignedToName = mem ? mem.name : "";
    } else if (assignedTo === "all") {
      assignedToName = "Geral / Todos";
    }

    const newTask: Task = {
      id: isDemoMode ? taskId : "",
      title,
      description,
      status: "pending",
      priority,
      dueDate: dueDate || "",
      assignedTo: assignedTo || "",
      assignedToName: assignedToName || "",
      checklist: checkItems,
      creatorId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ctx = getTaskContext();
    if (!ctx) return;

    if (isDemoMode) {
      newTask.id = taskId;
      const key = ctx as string;
      const local = JSON.parse(localStorage.getItem(key) || "[]") as Task[];
      localStorage.setItem(key, JSON.stringify([...local, newTask]));
      setTasks((prev) => [...prev, newTask]);
      if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
        await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, title, "create");
        if (assignedTo) {
          await addGroupNotification(
            "assigned",
            `${currentUser.name} atribuiu a tarefa "${title}" para ${assignedToName || "Membro"}`,
            taskId,
            assignedTo
          );
        }
      }
    } else {
      try {
        const colRef = ctx as any;
        const res = await addDoc(colRef, newTask);
        await updateDoc(doc(db, colRef.path, res.id), { id: res.id });
        if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
          await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, res.id, title, "create");
          if (assignedTo) {
            await addGroupNotification(
              "assigned",
              `${currentUser.name} atribuiu a tarefa "${title}" para ${assignedToName || "Membro"}`,
              res.id,
              assignedTo
            );
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "tasks");
      }
    }
  };

  const toggleTaskStatus = async (taskId: string): Promise<void> => {
    if (!currentUser) return;

    const taskToToggle = tasks.find((t) => t.id === taskId);
    if (!taskToToggle) return;

    const nextStatus = taskToToggle.status === "pending" ? "completed" : "pending";

    const ctx = getTaskContext(taskId);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getTaskContext() as string;
      const list = tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus, updatedAt: new Date().toISOString() } : t));
      setTasks(list);
      localStorage.setItem(key, JSON.stringify(list));
      if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
        if (nextStatus === "completed") {
          await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskToToggle.title, "complete");
          await addGroupNotification(
            "completed",
            `A tarefa "${taskToToggle.title}" foi concluída por ${currentUser.name}`,
            taskId
          );
        }
      }
    } else {
      try {
        const docRef = ctx as any;
        await updateDoc(docRef, { status: nextStatus, updatedAt: new Date().toISOString() });
        if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
          if (nextStatus === "completed") {
            await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskToToggle.title, "complete");
            await addGroupNotification(
              "completed",
              `A tarefa "${taskToToggle.title}" foi concluída por ${currentUser.name}`,
              taskId
            );
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `tasks/${taskId}`);
      }
    }
  };

  const updateTaskFields = async (taskId: string, fields: Partial<Task>): Promise<void> => {
    if (!currentUser) return;

    const taskObj = tasks.find((t) => t.id === taskId);
    if (!taskObj) return;

    const ctx = getTaskContext(taskId);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getTaskContext() as string;
      const list = tasks.map((t) => (t.id === taskId ? { ...t, ...fields, updatedAt: new Date().toISOString() } : t));
      setTasks(list);
      localStorage.setItem(key, JSON.stringify(list));
      if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
        if (fields.status === "completed") {
          await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskObj.title, "complete");
          await addGroupNotification(
            "completed",
            `A tarefa "${taskObj.title}" foi concluída por ${currentUser.name}`,
            taskId
          );
        } else {
          await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskObj.title, "update");
        }

        if (fields.assignedTo && fields.assignedTo !== taskObj.assignedTo) {
          let assignedToName = "";
          if (fields.assignedTo !== "all") {
            const mem = groupMembers.find((m) => m.userId === fields.assignedTo);
            assignedToName = mem ? mem.name : "";
          } else {
            assignedToName = "Geral / Todos";
          }
          await addGroupNotification(
            "assigned",
            `${currentUser.name} atribuiu a tarefa "${taskObj.title}" para ${assignedToName || "Membro"}`,
            taskId,
            fields.assignedTo
          );
        }
      }
    } else {
      try {
        const docRef = ctx as any;
        await updateDoc(docRef, { ...fields, updatedAt: new Date().toISOString() });
        if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
          if (fields.status === "completed") {
            await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskObj.title, "complete");
            await addGroupNotification(
              "completed",
              `A tarefa "${taskObj.title}" foi concluída por ${currentUser.name}`,
              taskId
            );
          } else {
            await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskObj.title, "update");
          }

          if (fields.assignedTo && fields.assignedTo !== taskObj.assignedTo) {
            let assignedToName = "";
            if (fields.assignedTo !== "all") {
              const mem = groupMembers.find((m) => m.userId === fields.assignedTo);
              assignedToName = mem ? mem.name : "";
            } else {
              assignedToName = "Geral / Todos";
            }
            await addGroupNotification(
              "assigned",
              `${currentUser.name} atribuiu a tarefa "${taskObj.title}" para ${assignedToName || "Membro"}`,
              taskId,
              fields.assignedTo
            );
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `tasks/${taskId}`);
      }
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    if (!currentUser) return;

    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    const ctx = getTaskContext(taskId);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getTaskContext() as string;
      const filtered = tasks.filter((t) => t.id !== taskId);
      setTasks(filtered);
      localStorage.setItem(key, JSON.stringify(filtered));
      if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
        await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskToDelete.title, "delete");
      }
    } else {
      try {
        const docRef = ctx as any;
        await deleteDoc(docRef);
        if (activeTab === "groups" && selectedGroup && selectedSubgroup) {
          await addAuditLog(selectedGroup.id, selectedSubgroup.id, selectedSubgroup.name, taskId, taskToDelete.title, "delete");
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}`);
      }
    }
  };

  // --- WHITEBOARD ACTIONS ---

  const addWhiteboardItem = async (text: string, color: string, x: number, y: number): Promise<void> => {
    if (!currentUser) return;
    const itemId = Math.random().toString(36).substring(2, 9);

    let myColor = "text-sky-500 bg-sky-500/10 border-sky-500/30";
    if (activeTab === "groups" && selectedGroup) {
      const activeMemberObj = groupMembers.find((m) => m.userId === currentUser.id);
      if (activeMemberObj) myColor = activeMemberObj.color;
    }

    const newItem: WhiteboardItem = {
      id: isDemoMode ? itemId : "",
      text,
      color,
      x,
      y,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorColor: myColor,
      createdAt: new Date().toISOString(),
      boardId: activeBoardId || "default",
    };

    const ctx = getWbContext();
    if (!ctx) return;

    if (isDemoMode) {
      newItem.id = itemId;
      const key = ctx as string;
      const sWb = JSON.parse(localStorage.getItem(key) || "[]") as WhiteboardItem[];
      localStorage.setItem(key, JSON.stringify([...sWb, newItem]));
      setWhiteboardItems((prev) => [...prev, newItem]);
    } else {
      try {
        const colRef = ctx as any;
        const res = await addDoc(colRef, newItem);
        await updateDoc(doc(db, colRef.path, res.id), { id: res.id });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "whiteboard");
      }
    }
  };

  const updateWhiteboardItemPosition = async (id: string, x: number, y: number): Promise<void> => {
    if (!currentUser) return;

    const ctx = getWbContext(id);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getWbContext() as string;
      const updated = whiteboardItems.map((item) => (item.id === id ? { ...item, x, y } : item));
      setWhiteboardItems(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    } else {
      try {
        const docRef = ctx as any;
        await updateDoc(docRef, { x, y });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `whiteboard/${id}`);
      }
    }
  };

  const deleteWhiteboardItem = async (id: string): Promise<void> => {
    if (!currentUser) return;

    const ctx = getWbContext(id);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getWbContext() as string;
      const filtered = whiteboardItems.filter((item) => item.id !== id);
      setWhiteboardItems(filtered);
      localStorage.setItem(key, JSON.stringify(filtered));
    } else {
      try {
        const docRef = ctx as any;
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `whiteboard/${id}`);
      }
    }
  };

  const toggleWhiteboardConnection = async (id1: string, id2: string): Promise<void> => {
    if (!currentUser) return;
    const item1 = whiteboardItems.find((i) => i.id === id1);
    const item2 = whiteboardItems.find((i) => i.id === id2);
    if (!item1 || !item2) return;

    const conns1 = item1.connections || [];
    const conns2 = item2.connections || [];

    let nextConns1: string[];
    let nextConns2: string[];

    if (conns1.includes(id2)) {
      nextConns1 = conns1.filter((id) => id !== id2);
      nextConns2 = conns2.filter((id) => id !== id1);
    } else {
      nextConns1 = [...conns1, id2];
      nextConns2 = [...conns2, id1];
    }

    const ctx1 = getWbContext(id1);
    const ctx2 = getWbContext(id2);
    if (!ctx1 || !ctx2) return;

    if (isDemoMode) {
      const key = getWbContext() as string;
      const updated = whiteboardItems.map((item) => {
        if (item.id === id1) return { ...item, connections: nextConns1 };
        if (item.id === id2) return { ...item, connections: nextConns2 };
        return item;
      });
      setWhiteboardItems(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    } else {
      try {
        const docRef1 = ctx1 as any;
        const docRef2 = ctx2 as any;
        await updateDoc(docRef1, { connections: nextConns1 });
        await updateDoc(docRef2, { connections: nextConns2 });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, "whiteboard");
      }
    }
  };

  const sendChatMessage = async (
    text: string,
    dmTo?: string,
    fileData?: { url: string; name: string; type: string }
  ): Promise<void> => {
    if (!currentUser) return;
    if (!dmTo && !selectedGroup) return;

    const msgId = Math.random().toString(36).substring(2, 9);
    
    let targetGroupId = "";
    if (dmTo) {
      targetGroupId = "dm_" + [currentUser.id, dmTo].sort().join("_");
    } else {
      if (!selectedGroup) return;
      targetGroupId = selectedGroup.id;
    }

    let myColor = "text-sky-500 bg-sky-500/10 border-sky-500/30";
    if (selectedGroup) {
      const activeMemberObj = groupMembers.find((m) => m.userId === currentUser.id);
      if (activeMemberObj) myColor = activeMemberObj.color;
    }

    const newMessage: ChatMessage = {
      id: isDemoMode ? msgId : "",
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderPhoto: currentUser.photoUrl || "",
      senderColor: myColor,
      text,
      timestamp: new Date().toISOString(),
    };

    if (dmTo) {
      newMessage.dmTo = dmTo;
    }

    if (fileData) {
      newMessage.fileUrl = fileData.url;
      newMessage.fileName = fileData.name;
      newMessage.fileType = fileData.type;
    }

    if (isDemoMode) {
      newMessage.id = msgId;
      const key = `demo_group_messages_${targetGroupId}`;
      const currentMsgs = JSON.parse(localStorage.getItem(key) || "[]") as ChatMessage[];
      const nextMsgs = [...currentMsgs, newMessage];
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      setChatMessages(nextMsgs);
      if (dmTo) {
        setLatestDmMessages((prev) => ({ ...prev, [dmTo]: newMessage }));
      }
    } else {
      try {
        const colRef = collection(db, `groups/${targetGroupId}/messages`);
        const res = await addDoc(colRef, newMessage);
        await updateDoc(doc(db, colRef.path, res.id), { id: res.id });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `groups/${targetGroupId}/messages`);
      }
    }
  };

  const editChatMessage = async (messageId: string, newText: string): Promise<void> => {
    if (!currentUser) return;
    let targetGroupId = "";
    if (selectedDmUserId) {
      targetGroupId = "dm_" + [currentUser.id, selectedDmUserId].sort().join("_");
    } else {
      if (!selectedGroup) return;
      targetGroupId = selectedGroup.id;
    }

    if (isDemoMode) {
      const key = `demo_group_messages_${targetGroupId}`;
      const currentMsgs = JSON.parse(localStorage.getItem(key) || "[]") as ChatMessage[];
      const nextMsgs = currentMsgs.map((m) =>
        m.id === messageId ? { ...m, text: newText, editedAt: new Date().toISOString() } : m
      );
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      setChatMessages(nextMsgs);
    } else {
      try {
        const msgRef = doc(db, `groups/${targetGroupId}/messages`, messageId);
        await updateDoc(msgRef, {
          text: newText,
          editedAt: new Date().toISOString(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `groups/${targetGroupId}/messages/${messageId}`);
      }
    }
  };

  const deleteChatMessage = async (messageId: string): Promise<void> => {
    if (!currentUser) return;
    let targetGroupId = "";
    if (selectedDmUserId) {
      targetGroupId = "dm_" + [currentUser.id, selectedDmUserId].sort().join("_");
    } else {
      if (!selectedGroup) return;
      targetGroupId = selectedGroup.id;
    }

    if (isDemoMode) {
      const key = `demo_group_messages_${targetGroupId}`;
      const currentMsgs = JSON.parse(localStorage.getItem(key) || "[]") as ChatMessage[];
      const nextMsgs = currentMsgs.filter((m) => m.id !== messageId);
      localStorage.setItem(key, JSON.stringify(nextMsgs));
      setChatMessages(nextMsgs);
    } else {
      try {
        const msgRef = doc(db, `groups/${targetGroupId}/messages`, messageId);
        await deleteDoc(msgRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `groups/${targetGroupId}/messages/${messageId}`);
      }
    }
  };

  const sendFriendRequest = async (codeOrEmail: string): Promise<void> => {
    if (!currentUser) throw new Error("Não autenticado");
    const searchVal = codeOrEmail.trim();
    if (!searchVal) throw new Error("Por favor, insira um código ou e-mail válido.");

    if (isDemoMode) {
      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      const targetUser = storedUsers.find(
        (u) =>
          u.email.toLowerCase() === searchVal.toLowerCase() ||
          (u.friendCode && u.friendCode.toUpperCase() === searchVal.toUpperCase())
      );

      if (!targetUser) {
        throw new Error("Usuário não encontrado.");
      }

      if (targetUser.id === currentUser.id) {
        throw new Error("Você não pode adicionar a si mesmo.");
      }

      // Check if already friends
      const currentFriends = JSON.parse(
        localStorage.getItem(`demo_friends_${currentUser.id}`) || "[]"
      ) as Friend[];
      if (currentFriends.some((f) => f.id === targetUser.id)) {
        throw new Error("Este usuário já é seu amigo.");
      }

      // Check if request already pending
      const targetReqs = JSON.parse(
        localStorage.getItem(`demo_friend_requests_${targetUser.id}`) || "[]"
      ) as FriendRequest[];
      if (targetReqs.some((r) => r.senderId === currentUser.id)) {
        throw new Error("Solicitação de amizade já enviada.");
      }

      const newReq: FriendRequest = {
        id: currentUser.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderPhoto: currentUser.photoUrl,
        receiverId: targetUser.id,
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(`demo_friend_requests_${targetUser.id}`, JSON.stringify([...targetReqs, newReq]));
    } else {
      let targetUser: UserProfile | null = null;
      try {
        // Query by email
        const qEmail = query(collection(db, "users"), where("email", "==", searchVal));
        const resEmail = await getDocs(qEmail);
        if (!resEmail.empty) {
          targetUser = { ...resEmail.docs[0].data(), id: resEmail.docs[0].id } as UserProfile;
        } else {
          // Query by friendCode
          const qCode = query(collection(db, "users"), where("friendCode", "==", searchVal.toUpperCase()));
          const resCode = await getDocs(qCode);
          if (!resCode.empty) {
            targetUser = { ...resCode.docs[0].data(), id: resCode.docs[0].id } as UserProfile;
          }
        }

        if (!targetUser) {
          throw new Error("Usuário não encontrado.");
        }

        if (targetUser.id === currentUser.id) {
          throw new Error("Você não pode adicionar a si mesmo.");
        }

        // Check if already friends
        const friendCheckRef = doc(db, `users/${currentUser.id}/friends`, targetUser.id);
        const friendCheckSnap = await getDoc(friendCheckRef);
        if (friendCheckSnap.exists()) {
          throw new Error("Este usuário já é seu amigo.");
        }

        // Send request
        const reqRef = doc(db, `users/${targetUser.id}/friendRequests`, currentUser.id);
        const newReq: FriendRequest = {
          id: currentUser.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderPhoto: currentUser.photoUrl,
          receiverId: targetUser.id,
          status: "pending",
          timestamp: new Date().toISOString(),
        };
        await setDoc(reqRef, newReq);
      } catch (e: any) {
        throw new Error(e.message || "Erro ao enviar solicitação.");
      }
    }
  };

  const acceptFriendRequest = async (requestId: string): Promise<void> => {
    if (!currentUser) return;

    if (isDemoMode) {
      const localReqs = JSON.parse(
        localStorage.getItem(`demo_friend_requests_${currentUser.id}`) || "[]"
      ) as FriendRequest[];
      const req = localReqs.find((r) => r.id === requestId);
      if (!req) return;

      const storedUsers = JSON.parse(localStorage.getItem("all_demo_users") || "[]") as UserProfile[];
      const senderUser = storedUsers.find((u) => u.id === req.senderId);
      if (!senderUser) return;

      // Add to current user's friends list
      const myFriends = JSON.parse(
        localStorage.getItem(`demo_friends_${currentUser.id}`) || "[]"
      ) as Friend[];
      const newFriendForMe: Friend = {
        id: senderUser.id,
        name: senderUser.name,
        photoUrl: senderUser.photoUrl,
        email: senderUser.email,
        friendCode: senderUser.friendCode || "",
        joinedAt: new Date().toISOString(),
      };
      if (!myFriends.some((f) => f.id === senderUser.id)) {
        const nextFriends = [...myFriends, newFriendForMe];
        localStorage.setItem(`demo_friends_${currentUser.id}`, JSON.stringify(nextFriends));
        setFriends(nextFriends);
      }

      // Add to sender's friends list
      const senderFriends = JSON.parse(
        localStorage.getItem(`demo_friends_${senderUser.id}`) || "[]"
      ) as Friend[];
      const newFriendForSender: Friend = {
        id: currentUser.id,
        name: currentUser.name,
        photoUrl: currentUser.photoUrl,
        email: currentUser.email,
        friendCode: currentUser.friendCode || "",
        joinedAt: new Date().toISOString(),
      };
      if (!senderFriends.some((f) => f.id === currentUser.id)) {
        localStorage.setItem(`demo_friends_${senderUser.id}`, JSON.stringify([...senderFriends, newFriendForSender]));
      }

      // Remove request
      const nextReqs = localReqs.filter((r) => r.id !== requestId);
      localStorage.setItem(`demo_friend_requests_${currentUser.id}`, JSON.stringify(nextReqs));
      setFriendRequests(nextReqs);
    } else {
      try {
        const reqRef = doc(db, `users/${currentUser.id}/friendRequests`, requestId);
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;

        const reqData = reqSnap.data() as FriendRequest;
        
        const senderUserRef = doc(db, "users", requestId);
        const senderUserSnap = await getDoc(senderUserRef);
        const senderData = senderUserSnap.exists() ? senderUserSnap.data() as UserProfile : null;

        const myFriendRef = doc(db, `users/${currentUser.id}/friends`, requestId);
        await setDoc(myFriendRef, {
          id: requestId,
          name: reqData.senderName,
          photoUrl: reqData.senderPhoto,
          email: senderData?.email || "",
          friendCode: senderData?.friendCode || "",
          joinedAt: new Date().toISOString(),
        });

        const senderFriendRef = doc(db, `users/${requestId}/friends`, currentUser.id);
        await setDoc(senderFriendRef, {
          id: currentUser.id,
          name: currentUser.name,
          photoUrl: currentUser.photoUrl,
          email: currentUser.email,
          friendCode: currentUser.friendCode || "",
          joinedAt: new Date().toISOString(),
        });

        await deleteDoc(reqRef);
      } catch (e) {
        console.error("Error accepting friend request", e);
      }
    }
  };

  const rejectFriendRequest = async (requestId: string): Promise<void> => {
    if (!currentUser) return;

    if (isDemoMode) {
      const localReqs = JSON.parse(
        localStorage.getItem(`demo_friend_requests_${currentUser.id}`) || "[]"
      ) as FriendRequest[];
      const nextReqs = localReqs.filter((r) => r.id !== requestId);
      localStorage.setItem(`demo_friend_requests_${currentUser.id}`, JSON.stringify(nextReqs));
      setFriendRequests(nextReqs);
    } else {
      try {
        await deleteDoc(doc(db, `users/${currentUser.id}/friendRequests`, requestId));
      } catch (e) {
        console.error("Error rejecting friend request", e);
      }
    }
  };

  const removeFriend = async (friendId: string): Promise<void> => {
    if (!currentUser) return;

    if (isDemoMode) {
      const myFriends = JSON.parse(
        localStorage.getItem(`demo_friends_${currentUser.id}`) || "[]"
      ) as Friend[];
      const nextMyFriends = myFriends.filter((f) => f.id !== friendId);
      localStorage.setItem(`demo_friends_${currentUser.id}`, JSON.stringify(nextMyFriends));
      setFriends(nextMyFriends);

      const targetFriends = JSON.parse(
        localStorage.getItem(`demo_friends_${friendId}`) || "[]"
      ) as Friend[];
      const nextTargetFriends = targetFriends.filter((f) => f.id !== currentUser.id);
      localStorage.setItem(`demo_friends_${friendId}`, JSON.stringify(nextTargetFriends));
    } else {
      try {
        await deleteDoc(doc(db, `users/${currentUser.id}/friends`, friendId));
        await deleteDoc(doc(db, `users/${friendId}/friends`, currentUser.id));
      } catch (e) {
        console.error("Error removing friend", e);
      }
    }
  };

  // --- NOTEBOOKS ACTIONS ---

  const createNotebook = async (title: string, content: string, color: string): Promise<void> => {
    if (!currentUser) return;
    const noteId = Math.random().toString(36).substring(2, 9);

    const ctx = getNotesContext();
    if (!ctx) return;

    if (isDemoMode) {
      const newNote: Notebook = {
        id: noteId,
        title,
        content,
        color,
        creatorId: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const key = ctx as string;
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as Notebook[];
      localStorage.setItem(key, JSON.stringify([...existing, newNote]));
      setNotebooks((prev) => [...prev, newNote]);
    } else {
      try {
        const colRef = ctx as any;
        const docRef = doc(colRef);
        const newNote: Notebook = {
          id: docRef.id,
          title,
          content,
          color,
          creatorId: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        // Optimistic update to show the note instantly in the UI
        setNotebooks((prev) => [...prev, newNote]);
        await setDoc(docRef, newNote);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, "notebooks");
      }
    }
  };

  const updateNotebook = async (id: string, title: string, content: string, color: string): Promise<void> => {
    if (!currentUser) return;

    const ctx = getNotesContext(id);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getNotesContext() as string;
      setNotebooks((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, title, content, color, updatedAt: new Date().toISOString() } : n
        );
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    } else {
      try {
        const docRef = ctx as any;
        await updateDoc(docRef, { title, content, color, updatedAt: new Date().toISOString() });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `notebooks/${id}`);
      }
    }
  };

  const deleteNotebook = async (id: string): Promise<void> => {
    if (!currentUser) return;

    const ctx = getNotesContext(id);
    if (!ctx) return;

    if (isDemoMode) {
      const key = getNotesContext() as string;
      setNotebooks((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
        return filtered;
      });
    } else {
      // Optimistic state update: instantly remove the note from the UI list
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      try {
        const docRef = ctx as any;
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `notebooks/${id}`);
      }
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    const storedUser = localStorage.getItem("demo_user_logged");
    if (storedUser) {
      try {
        const uParse = JSON.parse(storedUser);
        setCurrentUser(uParse);
        if (uParse.theme) setTheme(uParse.theme);
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultDemoUser: UserProfile = {
        id: "demo_user_default",
        name: "Desenvolvedor Teste",
        email: "demo@tasksync.io",
        photoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=demo",
        role: "Desenvolvedor",
        theme: "dark",
        createdAt: new Date().toISOString(),
      };
      saveDemoUser(defaultDemoUser);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        groups,
        groupMembers,
        subgroups,
        tasks,
        whiteboardItems,
        notebooks,
        chatMessages,
        auditLogs,
        allGroupTasks,
        theme,
        activeTab,
        selectedGroup,
        selectedSubgroup,
        isFirebaseCloud,
        isLoading,
        authError,

        activeModule,
        setActiveModule,
        setActiveTab,
        setSelectedGroup,
        setSelectedSubgroup,
        chatMobileView,
        setChatMobileView,
        selectedDmUserId,
        setSelectedDmUserId,
        latestDmMessages,

        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateUserProfile,
        toggleTheme,

        createGroup,
        joinGroup,
        leaveGroup,

        createSubgroup,
        deleteSubgroup,
        toggleSubgroupMembership,
        checkSubgroupPermission,
        grantSubgroupPermission,
        getSubgroupPermissions,

        createTask,
        toggleTaskStatus,
        updateTaskFields,
        deleteTask,

        addWhiteboardItem,
        updateWhiteboardItemPosition,
        deleteWhiteboardItem,
        toggleWhiteboardConnection,

        whiteboardBoards,
        activeBoardId,
        setActiveBoardId,
        createWhiteboardBoard,
        deleteWhiteboardBoard,

        friends,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,

        groupNotifications,
        dismissGroupNotification,

        createNotebook,
        updateNotebook,
        deleteNotebook,
        sendChatMessage,
        editChatMessage,
        deleteChatMessage,

        toasts,
        removeToast,
        enterDemoMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
