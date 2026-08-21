import { useContext } from "react"
import { BiSolidDoorOpen, BiSolidUser, BiLogOut } from "react-icons/bi"
import { UserContext } from "../global/userContext"
import SidebarItem from "./SidebarItem"



function SidebarAuth() {
    const { user, setUser } = useContext(UserContext)

    const handleLogout = () => {
        setUser(null)
        localStorage.removeItem("accessToken")
    }

    return (
        <div className="h-full w-full flex items-end">
            {user ? (
                <div className="w-full flex flex-col gap-2">
                    <div className="flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer hover:scale-105 duration-200 active:scale-110">
                        {user.picture ? (
                            <img
                                src={user.picture}
                                alt="Profile"
                                className="w-14 h-14 rounded-full object-cover border-2 border-purple-500/50"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-purple-500/30 flex items-center justify-center">
                                <BiSolidUser className="text-purple-300 text-xl" />
                            </div>
                        )}
                        <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                            {user.username}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="group cursor-pointer h-16 w-full rounded-md flex flex-col items-center justify-center duration-200 hover:bg-gray-400/30 active:scale-105 text-gray-400 hover:text-red-400"
                    >
                        <BiLogOut className="text-2xl" />
                        <span className="group-hover:w-full overflow-hidden duration-150 text-center text-xs font-semibold text-nowrap w-0">
                            Logout
                        </span>
                    </button>
                </div>
            ) : (
                <SidebarItem
                    href="/signin"
                    icon={
                        <BiSolidDoorOpen className="text-2xl" />
                    }
                    isActive={false}
                    label="Sign in"
                    onClick={() => { }}
                />
            )}
        </div>
    )
}


export default SidebarAuth