import { Film, Home, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import SidebarAuth from "./SidebarAuth";

function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-20 min-h-screen bg-black border-r border-gray-800 flex flex-col items-center py-6 gap-8">
      <Link to="/" className="text-white hover:text-gray-300 transition-colors">
        <Film size={22} />
      </Link>

      <nav className="flex-1 flex flex-col gap-6 w-full items-center">
        <Link
          to="/"
          className={`p-3 rounded-xl transition-all ${
            location.pathname === "/"
              ? "bg-white text-black"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
        >
          <Home size={24} />
        </Link>
      </nav>

      <div className="w-full flex justify-center">
        <SidebarAuth />
      </div>
    </div>
  );
}

export default Sidebar;
