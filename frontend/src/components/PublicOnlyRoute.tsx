import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../global/authContext"

function PublicOnlyRoute() {
    const {isAuthenticated, loading} = useAuth()
    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-3 border-purple-700"></div>
        </div>
    }

    if (isAuthenticated) {
        return <Navigate to={"/"}  />
    }
    return (
        <Outlet/>
    )
}


export default PublicOnlyRoute