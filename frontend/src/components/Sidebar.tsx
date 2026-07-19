import { useState } from "react";
import { SlHome } from "react-icons/sl";
import { SlSettings } from "react-icons/sl";
import SidebarItem from "./SidebarItem";

function Sidebar() {
  const [active, setActive] = useState("home");

  return (
    <div className="sidebar  min-w-[120px] min-h-screen flex flex-col justify-start items-center gap-16  py-4 px-1">
      <img src="favicon.svg" alt="" className="w-16 h-16 " />
      <SidebarItem
        href="/"
        icon={
          <SlHome
            className={
              "icon text-4xl font-[800] " +
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
              "icon text-4xl font-[800] " +
              +(active === "settings" ? "bg-purple-600 scale-105" : "")
            }
          />
        }
        isActive={active === "settings"}
        label="Settings"
        onClick={() => setActive("settings")}
      />
    </div>
  );
}

export default Sidebar;
