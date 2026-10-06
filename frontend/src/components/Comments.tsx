import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { BiX, BiSend, BiTrash, BiDotsVerticalRounded } from "react-icons/bi";
import { useAuth } from "../global/authContext";
import { useTranslation } from "react-i18next";

const BACKEND_URL = "http://localhost:8000";
const LIMIT = 20;

interface CommentOwner {
  id: number;
  username: string;
  picture: string;
  first_name: string;
  last_name: string;
}

interface Comment {
  id: number;
  movie_id: number;
  owner_id: number;
  content: string;
  created_at: string;
  owner: CommentOwner;
}

interface Props {
  movieId: number;
  show: boolean;
  setShow: (value: boolean) => void;
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────
function ConfirmDeleteDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog card */}
      <div className="relative z-10 bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{ animation: 'fadeInScale 0.2s ease' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/15">
            <BiTrash className="text-red-400 text-xl" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{t("comments.deleteComment")}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{t("comments.cannotUndo")}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-all active:scale-95"
          >
            {t("comments.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-all active:scale-95"
          >
            {t("comments.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}



// ─── Three-dot dropdown menu (mobile) ──────────────────────────────────────
function CommentMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all active:scale-95"
        title="Options"
        aria-label="Comment options"
      >
        <BiDotsVerticalRounded className="text-xl" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-36 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden z-10" style={{ animation: 'fadeInDown 0.15s ease' }}>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <BiTrash className="text-base flex-shrink-0" />
            {t("comments.delete")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Comments({ movieId, show, setShow }: Props) {
  const { user } = useAuth(); // Get current logged-in user
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch comments when the sidebar opens or movieId changes
  useEffect(() => {
    if (show) {
      getComments();
    }
  }, [show, movieId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [setShow]);

  const getComments = async () => {
    try {
      setIsFetching(true);
      setOffset(0);
      setHasMore(true);

      const response = await axios.get(`${BACKEND_URL}/comments/${movieId}`, {
        params: { limit: LIMIT, offset: 0 },
        withCredentials: true,
      });

      setComments(response.data);

      if (response.data.length < LIMIT) {
        setHasMore(false);
      }
    } catch (err) {
      console.log(err);
      setIsError(true);
      setError(t("comments.failedLoad"));
    } finally {
      setIsFetching(false);
    }
  };

  const fetchMoreComments = async () => {
    if (isFetchingMore || !hasMore) return;

    try {
      setIsFetchingMore(true);
      const nextOffset = offset + LIMIT;
      const response = await axios.get(`${BACKEND_URL}/comments/${movieId}`, {
        params: { limit: LIMIT, offset: nextOffset },
        withCredentials: true,
      });

      if (response.data.length === 0) {
        setHasMore(false);
      } else {
        setComments((prev) => [...prev, ...response.data]);
        setOffset(nextOffset);
        if (response.data.length < LIMIT) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    // Trigger fetch when user is 50px away from the bottom
    if (distanceFromBottom < 50) {
      fetchMoreComments();
    }
  };

  const addComment = async () => {
    if (commentInput.trim() === "") return;
    setIsError(false); // Reset previous errors
    try {
      const response = await axios.post(
        `${BACKEND_URL}/comments/${movieId}`,
        null,
        {
          params: { content: commentInput },
          withCredentials: true,
        },
      );
      // Append at the top (since it's a new comment)
      setComments((prev) => [response.data, ...prev]);
      setCommentInput("");
    } catch (err: any) {
      console.log(err);
      setIsError(true);
      if (err.response?.status === 400) {
        // If it's the NSFW error from our new AI check
        setError(t("comments.nsfwBlocked"));
      } else {
        setError(t("comments.failedPost"));
      }
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await axios.delete(`${BACKEND_URL}/comments/${commentId}`, {
        withCredentials: true,
      });

      // Optimistically update the UI to show [deleted]
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, content: "[deleted]", owner_id: -1 } : c,
        ),
      );
    } catch (err) {
      console.log(err);
      alert(t("comments.failedDelete"));
    }
  };

  return (
    <div
      className={
        "absolute w-full h-screen z-60 top-0 left-0 duration-500 flex justify-end " +
        (show
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none")
      }
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute top-0 left-0 w-full h-full bg-black/30 backdrop-blur-sm"
        onClick={() => setShow(false)}
      />

      {/* Sidebar panel */}
      <div
        className={
          "relative z-70 h-full w-full max-w-sm bg-gray-900/90 backdrop-blur-lg flex flex-col shadow-2xl transition-transform duration-500 " +
          (show ? "translate-x-0" : "translate-x-full")
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <h2 className="text-white font-semibold text-lg">{t("comments.title")}</h2>
          <span
            className="rounded-full bg-gray-700/50 p-1 text-2xl text-gray-300 hover:bg-gray-600/60 active:scale-95 cursor-pointer transition-all duration-200"
            onClick={() => setShow(false)}
            title="Close"
          >
            <BiX />
          </span>
        </div>

        {/* Comment list */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4"
          onScroll={handleScroll}
        >
          {isFetching && comments.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            </div>
          )}

          {!isFetching && comments.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-10">
              {t("comments.noComments")}
            </p>
          )}

          {comments.map((comment, idx) => {
            const isDeleted = comment.owner_id == -1;
            comment.content === "[deleted]";
            const isOwner = user?.id === comment.owner_id;

            // Ensure we construct the correct picture URL if it's not an absolute URL (like Google/42 pictures)
            let pictureUrl = comment.owner.picture;
            if (pictureUrl && !pictureUrl.startsWith("http")) {
              pictureUrl = `${BACKEND_URL}/${pictureUrl}`; // Adjust based on how you serve static files
            }
            console.log("Comment owner picture URL:", pictureUrl);
            console.log("Is_deleted:", isDeleted, "Is_owner:", isOwner);
            return (
              <div
                key={`${comment.id}-${idx}`}
                className={`bg-gray-800/60 rounded-xl px-4 py-3 flex flex-col gap-2 relative group ${isDeleted ? "opacity-60" : ""
                  }`}
              >
                {/* Owner info header */}
                <div className="flex items-center gap-2">
                  {isDeleted ? (
                    <>
                      <img
                        src="/Default_pfp.svg"
                        alt={t("comments.deletedUser")}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-gray-300 text-sm font-semibold">
                        {t("comments.deletedUser")}
                      </span>
                    </>
                  ) : (
                    <Link
                      to={`/profile/${comment.owner_id}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={pictureUrl || "/Default_pfp.svg"}
                        alt={comment.owner.username}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "/Default_pfp.svg";
                        }}
                      />
                      <span className="text-gray-300 text-sm font-semibold hover:underline">
                        @{comment.owner.username}
                      </span>
                    </Link>
                  )}
                </div>

                {/* Comment content */}
                <p
                  className={`text-sm ${isDeleted ? "text-gray-400 italic" : "text-gray-200"}`}
                >
                  {comment.content}
                </p>

                {/* Footer */}
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-500 text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>

                  {/* Delete Button - Shows on hover if user is owner */}
                  {isOwner && !isDeleted && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title={t("comments.deleteComment")}
                    >
                      <BiTrash className="text-lg" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Infinite scroll loader indicator */}
          {isFetchingMore && (
            <div className="flex justify-center items-center py-2">
              <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-5 py-4 border-t border-gray-700/50 flex flex-col gap-3">
          {user ? (
            <>
              {/* Error Message Display */}
              {isError && (
                <div className="text-red-400 text-xs font-semibold px-2">
                  ⚠️ {error}
                </div>
              )}
              <div className="flex flex-row gap-3 items-end">
                <textarea
                  className={`flex-1 bg-gray-800/60 text-gray-200 text-sm rounded-xl px-4 py-3 resize-none outline-none placeholder-gray-500 transition-all ${isError ? "ring-1 ring-red-500" : "focus:ring-1 focus:ring-gray-500"}`}
                  placeholder={t("comments.placeholder")}
                  rows={2}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <button
                  onClick={addComment}
                  className="bg-gray-700/60 hover:bg-gray-600/70 active:scale-95 text-white rounded-xl p-3 text-xl transition-all duration-200"
                  title="Send"
                >
                  <BiSend />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm">
                <Link
                  to="/signin"
                  className="text-gray-300 font-semibold hover:underline"
                >
                  {t("comments.signIn")}
                </Link>{" "}
                {t("comments.signInPrompt")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
