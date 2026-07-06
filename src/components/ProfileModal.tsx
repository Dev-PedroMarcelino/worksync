import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { X, Check, Camera, Eye, Info, ShieldCheck, Sun, Moon, Copy, Trash2, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useConfirm } from "../context/ConfirmContext";

interface ProfileModalProps {
  onClose: () => void;
  initialTab?: "profile" | "friends";
}

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Bella",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Vecto",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Sigma",
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, initialTab = "profile" }) => {
  const {
    currentUser,
    updateUserProfile,
    theme,
    toggleTheme,
    isFirebaseCloud,
    friends,
    sendFriendRequest,
    removeFriend
  } = useApp();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<"profile" | "friends">(initialTab);

  // Profile States
  const [name, setName] = useState(currentUser?.name || "");
  const [role, setRole] = useState(currentUser?.role || "");
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoUrl || AVATAR_PRESETS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Friends States
  const [copiedCode, setCopiedCode] = useState(false);
  const [friendInput, setFriendInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile(name, photoUrl, role);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendInput.trim()) return;
    setAddingFriend(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      await sendFriendRequest(friendInput.trim());
      setAddSuccess(true);
      setFriendInput("");
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: any) {
      setAddError(err.message || "Erro ao adicionar amigo.");
    } finally {
      setAddingFriend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 relative max-h-[90dvh] overflow-y-auto scrollbar-thin shadow-2xl"
      >
        <button
          id="close-profile-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50 mb-1">
          Configurações da Conta
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-5">
          Personalize sua identidade e gerencie seus amigos na plataforma.
        </p>

        {/* Tab row */}
        <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-6 text-xs font-bold select-none">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === "profile"
                ? "border-b-2 border-sky-500 text-sky-500"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-350"
            }`}
          >
            Meu Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className={`flex-1 pb-3 text-center transition-all ${
              activeTab === "friends"
                ? "border-b-2 border-sky-500 text-sky-500"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-350"
            }`}
          >
            Lista de Amigos
          </button>
        </div>

        {activeTab === "profile" ? (
          <form onSubmit={handleSave} className="space-y-4">
            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs text-center font-semibold">
                Perfil atualizado com sucesso!
              </div>
            )}

            {/* Avatar selection section */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-2">
                Seu Avatar
              </label>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full border border-gray-250 dark:border-zinc-700 overflow-hidden shrink-0 bg-gray-55">
                  <img
                    src={photoUrl}
                    alt="Previa"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="grid grid-cols-6 gap-1.5 flex-1">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      id={`profile-preset-${preset.split("seed=")[1]}`}
                      key={preset}
                      type="button"
                      onClick={() => setPhotoUrl(preset)}
                      className={`relative w-8 h-8 rounded-lg p-0.5 border overflow-hidden transition-all ${
                        photoUrl === preset
                          ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10 scale-95"
                          : "border-gray-200 dark:border-zinc-800 hover:border-sky-500/50"
                      }`}
                    >
                      <img
                        src={preset}
                        alt="Preset option"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-1">
                  Ou use um Link de Imagem Customizado
                </label>
                <input
                  id="profile-custom-avatar-input"
                  type="url"
                  value={photoUrl.startsWith("http") && !photoUrl.includes("dicebear") ? photoUrl : ""}
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      setPhotoUrl(e.target.value);
                    }
                  }}
                  placeholder="https://suaimagem.com/foto.jpg"
                  className="w-full text-xs px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-205 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900 dark:text-zinc-100 font-medium"
                />
              </div>

              <div className="mt-4">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-1.5">
                  Ou envie uma foto da sua Galeria
                </label>
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/40 border border-dashed border-gray-300 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-700 dark:text-zinc-350">Escolher Foto</p>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-550">JPG, PNG ou GIF (Máx 2MB)</p>
                  </div>
                  <input
                    id="profile-gallery-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert("A imagem deve ter no máximo 2MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result && typeof evt.target.result === "string") {
                            setPhotoUrl(evt.target.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {photoUrl && photoUrl.startsWith("data:image/") && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs">
                    <span className="font-semibold truncate flex-1">✓ Foto da galeria carregada!</span>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(AVATAR_PRESETS[0])}
                      className="text-xs font-bold underline text-rose-500 hover:text-rose-600 px-1 cursor-pointer"
                    >
                      Usar Padrão
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Form details */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-1.5">
                Nome de Usuário
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-zinc-100 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-1.5">
                Cargo / Profissão
              </label>
              <input
                id="profile-role-input"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Aluno, Gerente de Projetos"
                className="w-full text-xs px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-zinc-100 font-medium"
              />
            </div>

            {/* Theme custom settings */}
            <div className="pt-2 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-gray-800 dark:text-zinc-200">Aparência do Site</span>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">Alterne entre o visual Claro e Escuro</span>
              </div>
              <button
                id="profile-toggle-theme-btn"
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs text-gray-700 dark:text-zinc-200 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-all font-semibold cursor-pointer"
              >
                {theme === "light" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
            </div>

            {/* Connection diagnostics */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-850/20 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-start gap-2 text-[10px] text-gray-500">
              <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-700 dark:text-zinc-300">
                  Diagnóstico de Armazenamento
                </span>
                <p className="mt-0.5">
                  {isFirebaseCloud
                    ? "Sincronizado! Seus dados estão persistidos na Cloud do Firestore."
                    : "Modo Demonstração Ativo. Seus dados estão salvos no LocalStorage."}
                </p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex gap-2 justify-end text-xs font-semibold">
              <button
                id="cancel-profile-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-850 text-gray-600 dark:text-zinc-400 rounded-xl"
              >
                Voltar
              </button>
              <button
                id="save-profile-btn"
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Own Friend Code widget */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between select-none">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Seu Código de Amigo</span>
                <span className="text-base font-extrabold text-gray-800 dark:text-zinc-100 tracking-wider font-mono">{currentUser?.friendCode || "---"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentUser?.friendCode) {
                    navigator.clipboard.writeText(currentUser.friendCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-1">
                Adicionar Novo Amigo
              </label>
              
              {addError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 rounded-xl text-[11px] font-semibold text-center leading-normal">
                  {addError}
                </div>
              )}

              {addSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-semibold text-center">
                  Pedido de amizade enviado com sucesso!
                </div>
              )}

              <div className="flex gap-2">
                <input
                  id="add-friend-input"
                  type="text"
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder="E-mail ou Código de 6 dígitos"
                  className="flex-1 text-xs px-4 py-2.5 bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-zinc-100 font-medium"
                  required
                />
                <button
                  id="submit-add-friend"
                  type="submit"
                  disabled={addingFriend || !friendInput.trim()}
                  className="px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  title="Enviar solicitação"
                >
                  {addingFriend ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>

            {/* Friends list header */}
            <div className="pt-2 border-t border-gray-150 dark:border-zinc-800">
              <span className="block text-[10px] font-bold text-gray-400 dark:text-zinc-505 uppercase tracking-wider mb-2.5">
                Meus Amigos ({friends.length})
              </span>

              {/* Friends grid/scroll wrapper */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {friends.map((friend) => (
                  <div
                    id={`friend-row-${friend.id}`}
                    key={friend.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-850/60 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={friend.photoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full border border-black/5 dark:border-white/5 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-zinc-100 truncate">{friend.name}</p>
                        <p className="text-[10px] text-gray-450 dark:text-zinc-500 truncate">{friend.email}</p>
                      </div>
                    </div>
                    <button
                      id={`remove-friend-btn-${friend.id}`}
                      type="button"
                      onClick={async () => {
                        if (
                          await confirm({
                            title: "Remover amigo",
                            message: `Deseja realmente remover ${friend.name} da sua lista de amigos?`,
                            confirmLabel: "Remover",
                            tone: "danger",
                          })
                        ) {
                          await removeFriend(friend.id);
                        }
                      }}
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-all cursor-pointer shrink-0"
                      title="Remover Amigo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {friends.length === 0 && (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl select-none">
                    <p className="text-xs font-semibold">Nenhum amigo adicionado.</p>
                    <p className="text-[10px] mt-0.5 opacity-85">Adicione amigos usando o código de 6 dígitos ou e-mail!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back button */}
            <div className="pt-4 flex justify-end text-xs font-semibold">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-gray-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
