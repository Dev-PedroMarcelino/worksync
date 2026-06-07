/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthScreen } from "./components/AuthScreen";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ProfileModal } from "./components/ProfileModal";
import { motion, AnimatePresence } from "motion/react";
import { CheckSquare, MessageSquare, X } from "lucide-react";

function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className="pointer-events-auto w-full p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl flex items-start gap-3 relative overflow-hidden"
          >
            {/* Color block edge */}
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${toast.type === "task" ? "bg-emerald-500" : "bg-sky-500"}`} />
            
            <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === "task" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"}`}>
              {toast.type === "task" ? <CheckSquare className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-50 truncate leading-tight">
                {toast.title}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-normal">
                {toast.message}
              </p>
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-150 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MainLayout() {
  const { currentUser, isLoading, isSidebarCollapsed } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<"profile" | "friends">("profile");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openProfileModal = (tab: "profile" | "friends" = "profile") => {
    setProfileTab(tab);
    setShowProfile(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans transition-colors">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
            Carregando Sincronização...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-50 font-sans transition-colors duration-200 relative">
      {/* Desktop Sidebar Layout */}
      <div className={`hidden md:flex h-full shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? "w-0 border-r-0" : "w-80"}`}>
        <div className="w-80 h-full flex flex-col">
          <Sidebar onOpenProfile={openProfileModal} />
        </div>
      </div>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            {/* Slide-out Sidebar Drawer core container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] h-full z-50 md:hidden shadow-2xl flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-202 dark:border-zinc-800 overflow-hidden outline-none"
            >
              <Sidebar
                onOpenProfile={openProfileModal}
                isMobile={true}
                onCloseMobile={() => setMobileSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Workspace onOpenMobileSidebar={() => setMobileSidebarOpen(true)} onOpenProfile={openProfileModal} />

      {showProfile && <ProfileModal initialTab={profileTab} onClose={() => setShowProfile(false)} />}

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
