import { Link } from "react-router-dom";

function SidebarItem({ icon, label, isActive, href, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; href: string; onClick: () => void }) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className={
        "group cursor-pointer h-16 w-full rounded-md flex flex-col items-center justify-center duration-200 hover:bg-gray-400/30 active:scale-105 " +
        (isActive ? "text-purple-600 bg-gray-400/30 " : "text-gray-400")
      }
    >
      {icon}
      <span className={"group-hover:w-full overflow-hidden duration-150 text-center text-nowrap " + (isActive ? "w-full" : "w-0")}>
        {label}
      </span>
    </Link>
  );
}


export default SidebarItem;