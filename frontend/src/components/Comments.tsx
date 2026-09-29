import { useEffect, useState } from "react";
import axios from "axios";
import { BiX, BiSend } from "react-icons/bi";

const BACKEND_URL = "http://localhost:8000";
const LIMIT = 20;

interface Comment {
    id: number;
    movie_id: number;
    owner_id: number;
    content: string;
    created_at: string;
}

interface Props {
    movieId: number;
    show: boolean;
    setShow: (value: boolean) => void;
}

export default function Comments({ movieId, show, setShow }: Props) {
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
            setError("Failed to load comments");
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
        try {
            const response = await axios.post(
                `${BACKEND_URL}/comments/${movieId}`,
                null,
                {
                    params: { content: commentInput },
                    withCredentials: true,
                }
            );
            // Append at the top (since it's a new comment)
            setComments((prev) => [response.data, ...prev]);
            setCommentInput("");
        } catch (err) {
            console.log(err);
            setIsError(true);
            setError("Failed to post comment");
        }
    };

    return (
        <div
            className={
                "absolute w-full h-screen z-60 top-0 left-0 duration-500 flex justify-end " +
                (show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
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
                    <h2 className="text-white font-semibold text-lg">Comments</h2>
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
                            No comments yet. Be the first!
                        </p>
                    )}
                    
                    {comments.map((comment, idx) => (
                        <div
                            key={`${comment.id}-${idx}`}
                            className="bg-gray-800/60 rounded-xl px-4 py-3 flex flex-col gap-1"
                        >
                            <p className="text-gray-200 text-sm">{comment.content}</p>
                            <span className="text-gray-500 text-xs">
                                {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                    
                    {/* Infinite scroll loader indicator */}
                    {isFetchingMore && (
                        <div className="flex justify-center items-center py-2">
                            <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className="px-5 py-4 border-t border-gray-700/50 flex flex-row gap-3 items-end">
                    <textarea
                        className="flex-1 bg-gray-800/60 text-gray-200 text-sm rounded-xl px-4 py-3 resize-none outline-none placeholder-gray-500 focus:ring-1 focus:ring-gray-500 transition-all"
                        placeholder="Write a comment..."
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
            </div>
        </div>
    );
}