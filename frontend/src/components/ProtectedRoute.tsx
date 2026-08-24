import { useEffect } from "react";
import { toast } from "react-toast";
import { useAuth } from "../global/authContext";
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth()

    useEffect(() => {
        if (!isAuthenticated && !loading) {
            toast.info("Please sign in to access this page");
        }
    }, [isAuthenticated, loading]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-3 border-purple-700"></div>
        </div>
    }

    if (!isAuthenticated) {
        return <Navigate to={`/signin?back_url=${window.location.pathname}`} />
    }

    return (
        <Outlet />
    )
}


export default ProtectedRoute