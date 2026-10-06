import { BiSolidDoorOpen, BiSolidUser, BiLogOut } from "react-icons/bi"
import SidebarItem from "./SidebarItem"
import { Link } from "react-router-dom"
import { useAuth } from "../global/authContext"
import { useTranslation } from "react-i18next"



function SidebarAuth() {
    const { user, logout } = useAuth()
    const { t } = useTranslation()
    return (
        <div className="h-full w-full flex items-end">
            {user ? (
                <div className="w-full flex flex-col gap-2">
                    <div className="flex flex-col items-center justify-center p-2 hover:brightness-110 cursor-pointer hover:scale-105 duration-200 active:scale-110">
                        <Link to={"/profile"}>
                            {user.picture ? (
                                <img
                                    src={user.picture.startsWith("http") ? user.picture : `${import.meta.env.VITE_BACKEND_URL}${user.picture}`}
                                    alt="Profile"
                                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-600"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
                                    <BiSolidUser className="text-gray-300 text-xl" />
                                </div>
                            )}
                        </Link>
                        <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                            {user.username}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="group cursor-pointer h-16 w-full rounded-md flex flex-col items-center justify-center duration-200 hover:bg-gray-800 active:scale-105 text-gray-400"
                    >
                        <BiLogOut className="text-2xl" />
                        <span className="group-hover:w-full overflow-hidden duration-150 text-center text-xs font-semibold text-nowrap w-0">
                            {t("sidebar.logout")}
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
                    label={t("sidebar.signIn")}
                    onClick={() => { }}
                />
            )}
        </div>
    )
}


export default SidebarAuth