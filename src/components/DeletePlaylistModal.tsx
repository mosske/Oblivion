import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { FullAppDesignConfig, FULL_APP_DESIGNS } from "../utils/appDesignThemes";
import { deletePlaylistFromDb } from "../utils/playlistDb";
import { removePlaylistCustomArtwork } from "../utils/customCoversStorage";
import { getInMemoryToken } from "../App";

interface DeletePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  playlistTitle?: string;
  onSuccessNavigate?: () => void;
  designConfig?: FullAppDesignConfig;
}

export const DeletePlaylistModal: React.FC<DeletePlaylistModalProps> = ({
  isOpen,
  onClose,
  playlistId,
  playlistTitle,
  onSuccessNavigate,
  designConfig = FULL_APP_DESIGNS["designer"],
}) => {
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === "delete";

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    try {
      setIsDeleting(true);
      setErrorMsg(null);

      // 1. Send DELETE request to /api/playlists/:id (with fallback to /api/youtube/playlists/:id)
      const token = getInMemoryToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok && res.status !== 204) {
        // Fallback endpoint
        res = await fetch(`/api/youtube/playlists/${encodeURIComponent(playlistId)}`, {
          method: "DELETE",
          headers,
        });
      }

      if (!res.ok && res.status !== 204 && res.status !== 404) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Failed to delete playlist (${res.status})`);
      }

      // 2. Remove from local persistent layers: IndexedDB, localStorage, and PLAYLIST_CUSTOM_ARTWORK
      await deletePlaylistFromDb(playlistId);
      removePlaylistCustomArtwork(playlistId);

      // 3. Reset state & close modal
      setConfirmInput("");
      onClose();

      // 4. Navigate back to Library view
      if (onSuccessNavigate) {
        onSuccessNavigate();
      }
    } catch (err: any) {
      console.error("Error deleting playlist:", err);
      setErrorMsg(err?.message || "Failed to delete playlist. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmInput("");
    setErrorMsg(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`relative w-full max-w-md ${designConfig.cardBg} border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden z-10`}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className={`absolute top-4 right-4 p-2 rounded-full ${designConfig.btnSecondary} ${designConfig.textMuted} hover:${designConfig.textPrimary} transition-colors disabled:opacity-50`}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-red-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h2 className="text-xl font-bold text-red-400 tracking-tight">
                Delete Playlist
              </h2>
              {playlistTitle && (
                <p className={`text-xs font-semibold ${designConfig.textPrimary} truncate mt-0.5`}>
                  "{playlistTitle}"
                </p>
              )}
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
            This action is permanent and will delete this playlist from both Oblivion and YouTube Music.
          </p>

          {/* Warning Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium mb-5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>All tracks in this playlist will be unlinked and cannot be recovered.</span>
          </div>

          {/* Prompt & Confirmation Input */}
          <div className="space-y-2 mb-6">
            <label className={`block text-xs font-bold ${designConfig.headingPrimary}`}>
              To confirm, type <span className="text-red-400 font-mono font-extrabold underline underline-offset-2">'delete'</span> in the box below:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !isDeleting) {
                  handleDelete();
                }
              }}
              placeholder="type 'delete'"
              disabled={isDeleting}
              autoFocus
              className={`w-full px-4 py-3 rounded-2xl text-sm font-medium border transition-all focus:outline-none ${
                isConfirmed
                  ? "border-red-500/80 bg-red-950/20 text-red-200 ring-2 ring-red-500/30"
                  : `${designConfig.inputBg} border-slate-700/60 ${designConfig.textPrimary} focus:border-red-400/60`
              }`}
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${designConfig.btnSecondary} ${designConfig.textSecondary} hover:${designConfig.textPrimary} transition-colors disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
                isConfirmed && !isDeleting
                  ? "bg-red-600 hover:bg-red-700 shadow-red-900/30 cursor-pointer"
                  : "bg-red-900/40 text-red-300/40 cursor-not-allowed border border-red-900/30"
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
