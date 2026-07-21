import { useState } from "react";
import { SlHome } from "react-icons/sl";
import { SlSettings } from "react-icons/sl";
import SidebarItem from "./SidebarItem";
import { Link } from "react-router-dom";

function Sidebar() {
  const [active, setActive] = useState("home");

  return (
    <div className="  sidebar  min-w-[80px] min-h-screen flex flex-col justify-start items-center gap-16  py-6 px-1 bg-gradient-to-tr from-[#18001d] to-[#270042]">
      <Link to="/">
        <img src="../public/favicon.svg" alt="" className="h-10" />
      </Link>

      <div className="h-full w-full flex flex-col items-center justify-center gap-24 ">
        <SidebarItem
          href="/"
          icon={
            <SlHome
              className={
                "icon text-3xl font-[800] " +
                +(active === "home" ? "bg-purple-600 scale-105" : "")
              }
            />
          }
          isActive={active === "home"}
          label="Home"
          onClick={() => setActive("home")}
        />

        <SidebarItem
          href="/settings"
          icon={
            <SlSettings
              className={
                "icon text-3xl font-[800] " +
                +(active === "settings" ? "bg-purple-600 scale-105" : "")
              }
            />
          }
          isActive={active === "settings"}
          label="Settings"
          onClick={() => setActive("settings")}
        />

      </div>
    </div>
  );
}

export default Sidebar;
