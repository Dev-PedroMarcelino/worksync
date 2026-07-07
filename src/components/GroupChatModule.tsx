import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Send, MessageSquare, Shield, Smile, User2, MessageCircle, Paperclip, Pencil, Trash2, X, FileText, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { ChatMessage, GroupMember } from "../types";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import PlanAvatar from "./PlanAvatar";
import { isSuperAdmin } from "../config/admin";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "😮"];

interface GroupChatModuleProps {
  onOpenProfile: (member: GroupMember) => void;
  selectedDmUserId: string | null;
  onSelectDmUser: (userId: string | null) => void;
}

export const GroupChatModule: React.FC<GroupChatModuleProps> = ({
  onOpenProfile,
  selectedDmUserId,
  onSelectDmUser,
}) => {
  const {
    currentUser,
    selectedGroup,
    groupMembers,
    chatMessages,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    toggleReaction,
    friends,
    chatMobileView,
    setChatMobileView,
  } = useApp();
  const confirm = useConfirm();
  const toast = useToast();

  const [inputText, setInputText] = useState("");
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDmUserId !== null) {
      setChatMobileView("chat");
    }
  }, [selectedDmUserId, setChatMobileView]);

  const handleSelectDmUser = (userId: string | null) => {
    onSelectDmUser(userId);
    setChatMobileView("chat");
  };

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, selectedDmUserId]);

  if (!currentUser) {
    return null;
  }

  if (!selectedDmUserId && !selectedGroup) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/50 dark:bg-zinc-950/20 text-gray-550">
        Nenhum grupo ativo selecionado para chat.
      </div>
    );
  }

  // Filter messages based on layout
  const isGroupRoom = selectedDmUserId === null;
  const activeRoomMessages = chatMessages;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    try {
      if (isGroupRoom) {
        await sendChatMessage(inputText.trim(), undefined, selectedFile || undefined);
      } else {
        await sendChatMessage(inputText.trim(), selectedDmUserId, selectedFile || undefined);
      }
      setInputText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Erro ao enviar mensagem", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast("O arquivo anexado deve ter no máximo 500KB.", "info");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result && typeof evt.target.result === "string") {
          setSelectedFile({
            url: evt.target.result,
            name: file.name,
            type: file.type,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await editChatMessage(msgId, editingText.trim());
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error("Erro ao editar mensagem", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (
      await confirm({
        title: "Excluir mensagem",
        message: "Deseja realmente excluir esta mensagem?",
        confirmLabel: "Excluir",
        tone: "danger",
      })
    ) {
      try {
        await deleteChatMessage(msgId);
      } catch (err) {
        console.error("Erro ao excluir mensagem", err);
      }
    }
  };

  const renderMessageText = (text: string, isMe: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              isMe
                ? "text-sky-100 hover:text-white underline font-bold"
                : "text-sky-600 dark:text-sky-400 hover:underline font-bold"
            } break-all`}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const getActiveRoomDetails = () => {
    if (isGroupRoom) {
      return {
        name: "Mural Principal de Discussão",
        sub: "Compartilhe avisos, links e atualizações com todos do grupo",
        photoUrl: "",
        showProfileBtn: false,
      };
    }
    if (selectedDmUserId === currentUser.id) {
      return {
        name: "Meu Espaço Pessoal",
        sub: "Espaço privado para anotações e arquivos pessoais",
        photoUrl: currentUser.photoUrl,
        showProfileBtn: false,
        plan: currentUser.plan,
        email: currentUser.email,
      };
    }
    
    // Check in group members
    const member = groupMembers.find((m) => m.userId === selectedDmUserId);
    if (member) {
      return {
        name: member.name,
        sub: member.role || "Membro",
        photoUrl: member.photoUrl,
        showProfileBtn: true,
        memberObj: member,
        plan: member.plan,
        email: member.email,
      };
    }
    
    // Check in friends
    const friend = friends.find((f) => f.id === selectedDmUserId);
    if (friend) {
      return {
        name: friend.name,
        sub: "Amigo",
        photoUrl: friend.photoUrl,
        showProfileBtn: false,
        plan: friend.plan,
        email: friend.email,
      };
    }

    return {
      name: "Conversa Direta",
      sub: "",
      photoUrl: "",
      showProfileBtn: false,
    };
  };

  const roomDetails = getActiveRoomDetails();

  // Resolve a moldura/foto atual de um usuário (usa dados do próprio usuário quando é você).
  const resolveAvatar = (userId: string, fallbackPhoto?: string) => {
    if (userId === currentUser.id) return { photoUrl: currentUser.photoUrl, plan: currentUser.plan, email: currentUser.email };
    const m = groupMembers.find((x) => x.userId === userId);
    return { photoUrl: m?.photoUrl || fallbackPhoto, plan: m?.plan, email: m?.email };
  };

  return (
    <div className="flex-1 w-full max-w-full flex min-h-0 bg-white dark:bg-zinc-900 md:rounded-3xl md:border border-gray-200 dark:border-zinc-800 overflow-hidden md:shadow-sm" id="group-chat-module">
      {/* RIGHT PANEL: CHAT SCENE */}
      <div className="flex-1 min-w-0 w-full flex flex-col min-h-0 bg-white dark:bg-zinc-900">
        {/* Chat Scene Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            {isGroupRoom ? (
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0 border border-sky-500/20">
                <MessageCircle className="w-5 h-5" />
              </div>
            ) : (
              <span className="shrink-0">
                <PlanAvatar photoUrl={roomDetails.photoUrl} plan={(roomDetails as any).plan} galaxy={isSuperAdmin((roomDetails as any).email)} size={40} showGem={false} />
              </span>
            )}

            <div className="truncate ml-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate leading-tight">
                {roomDetails.name}
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                <span>{roomDetails.sub}</span>
                {roomDetails.showProfileBtn && roomDetails.memberObj && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => roomDetails.memberObj && onOpenProfile(roomDetails.memberObj)}
                      className="text-sky-500 dark:text-sky-400 hover:underline cursor-pointer font-semibold"
                    >
                      Ver perfil
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Stream list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 bg-zinc-50/50 dark:bg-zinc-950/40" id="chat-messages-container">
          {activeRoomMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                id={`chat-msg-${msg.id}`}
                key={msg.id}
                className={`group/msg flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Sender Avatar */}
                {!isMe && (
                  <button
                    onClick={() => {
                      const mObj = groupMembers.find((m) => m.userId === msg.senderId);
                      if (mObj) onOpenProfile(mObj);
                    }}
                    className="shrink-0 mt-0.5 cursor-pointer hover:opacity-85"
                    title={`Ver perfil de ${msg.senderName}`}
                  >
                    {(() => {
                      const a = resolveAvatar(msg.senderId, msg.senderPhoto);
                      return <PlanAvatar photoUrl={a.photoUrl} plan={a.plan} galaxy={isSuperAdmin(a.email)} size={32} showGem={false} />;
                    })()}
                  </button>
                )}

                {/* Bubble details */}
                <div className={`space-y-1 ${isMe ? "text-right" : "text-left"}`}>
                  {!isMe && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-505 flex items-center gap-1 pl-1">
                      <span>{msg.senderName}</span>
                    </p>
                  )}
                  
                  <div className="relative group/bubble flex items-center gap-2">
                    {isMe && !editingMessageId && (
                      <div className="opacity-0 group-hover/bubble:opacity-100 transition-all flex items-center gap-1.5 shrink-0 select-none">
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-655 dark:hover:text-zinc-300 transition-all cursor-pointer"
                          title="Editar mensagem"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-rose-505 hover:text-rose-600 transition-all cursor-pointer"
                          title="Excluir mensagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed break-words max-w-full sm:max-w-md ${
                        isMe
                          ? "bg-sky-600 text-white rounded-tr-xs shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-xs shadow-xs border border-gray-200/50 dark:border-zinc-750/30"
                      }`}
                    >
                      {editingMessageId === msg.id ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-1 focus:ring-white/50 resize-none font-medium"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5 text-[10px] font-bold">
                            <button
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingText("");
                              }}
                              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2.5 py-1 rounded bg-white text-sky-700 hover:bg-white/90 transition-all cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {msg.text && <p className="whitespace-pre-wrap">{renderMessageText(msg.text, isMe)}</p>}

                          {/* File Attachment display */}
                          {msg.fileUrl && (
                            <div className="mt-2 pt-2 border-t border-white/10 dark:border-zinc-700/50">
                              {msg.fileType?.startsWith("image/") ? (
                                <div className="rounded-lg overflow-hidden border border-white/10 dark:border-zinc-700 max-w-[240px] bg-black/10">
                                  <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={msg.fileUrl}
                                      alt={msg.fileName}
                                      className="max-w-full max-h-48 object-contain hover:scale-[1.02] transition-all"
                                    />
                                  </a>
                                  <div className="p-1.5 text-[9px] truncate bg-black/30 text-white flex justify-between gap-1 items-center font-semibold">
                                    <span className="truncate">{msg.fileName}</span>
                                    <span className="shrink-0 opacity-75">Imagem</span>
                                  </div>
                                </div>
                              ) : (
                                <a
                                  href={msg.fileUrl}
                                  download={msg.fileName}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                    isMe
                                      ? "bg-white/10 hover:bg-white/15 border-white/10 text-white"
                                      : "bg-gray-55 dark:bg-zinc-900 hover:bg-gray-150 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200"
                                  }`}
                                >
                                  <FileText className="w-5 h-5 text-sky-450 shrink-0" />
                                  <div className="text-left truncate flex-1 min-w-0">
                                    <p className="font-bold text-[10px] truncate leading-tight">{msg.fileName}</p>
                                    <p className="text-[9px] opacity-75 truncate uppercase">{msg.fileType?.split("/")[1] || "Arquivo"}</p>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reações */}
                  <div className={`flex items-center gap-1 flex-wrap mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                    {(Object.entries(msg.reactions || {}) as [string, string[]][]).map(([emoji, users]) => {
                      const mine = users.includes(currentUser.id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer ${
                            mine
                              ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
                              : "bg-gray-100 dark:bg-zinc-800 border-transparent text-gray-500 dark:text-zinc-400 hover:bg-gray-150 dark:hover:bg-zinc-700"
                          }`}
                          title={`${users.length} reação(ões)`}
                        >
                          <span>{emoji}</span>
                          <span className="font-bold">{users.length}</span>
                        </button>
                      );
                    })}
                    <div className="relative">
                      <button
                        onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                        className="p-0.5 rounded-full text-gray-300 dark:text-zinc-600 hover:text-sky-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer opacity-0 group-hover/msg:opacity-100 focus:opacity-100"
                        title="Reagir"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      {reactionPickerFor === msg.id && (
                        <div className={`absolute z-20 bottom-full mb-1 flex items-center gap-0.5 p-1 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-lg ${isMe ? "right-0" : "left-0"}`}>
                          {QUICK_REACTIONS.map((em) => (
                            <button
                              key={em}
                              onClick={() => { toggleReaction(msg.id, em); setReactionPickerFor(null); }}
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-sm cursor-pointer"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 text-[9px] text-gray-400 dark:text-zinc-500 px-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.editedAt && <span className="opacity-75 italic">• editado</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {activeRoomMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400/80 pointer-events-none select-none my-12">
              <MessageSquare className="w-10 h-10 text-gray-200 dark:text-zinc-800 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-semibold">Nenhuma mensagem neste chat.</p>
              <p className="text-[10px] mt-0.5 opacity-85">Inicie a conversa enviando um recado abaixo!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File preview block if attached */}
        {selectedFile && (
          <div className="px-6 py-2.5 border-t border-gray-150 dark:border-zinc-855 bg-gray-50/20 dark:bg-zinc-900/40 flex items-center justify-between gap-3 text-xs select-none">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4 text-sky-500" />
              ) : (
                <FileText className="w-4 h-4 text-sky-500" />
              )}
              <span className="font-semibold text-gray-700 dark:text-zinc-300 truncate">
                {selectedFile.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                (Pronto para enviar)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-655 dark:hover:text-zinc-300 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input box form */}
        <form
          id="chat-send-form"
          onSubmit={handleSendMessage}
          className="p-3 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0 select-none pb-safe"
        >
          {/* File selector input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.zip"
          />

          <button
            id="chat-attach-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all shrink-0 cursor-pointer flex items-center justify-center"
            title="Anexar arquivo (máx 500KB)"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isGroupRoom
                ? "Mensagem..."
                : selectedDmUserId === currentUser.id
                ? "Lembrete..."
                : `Mensagem privada...`
            }
            className="flex-1 min-w-0 border-none text-xs bg-gray-100 dark:bg-zinc-800/80 px-4 py-2.5 rounded-full focus:ring-1 focus:ring-sky-500 focus:outline-none dark:text-zinc-100 font-medium"
          />
          <button
            id="chat-submit-btn"
            type="submit"
            disabled={!inputText.trim() && !selectedFile}
            className="p-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer flex items-center justify-center"
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
