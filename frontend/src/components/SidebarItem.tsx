import { Link } from "react-router-dom";

function SidebarItem({ icon, label, isActive, href, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; href: string; onClick: () => void }) {
  return (
    <Link to={href}
      onClick={onClick}
      className={
        "group cursor-pointer h-16 w-full rounded-md flex flex-col items-center justify-center duration-200 hover:bg-gray-400/30 " +
        (isActive ? "text-purple-600" : "text-gray-400")
      }
    >
        {icon}
      <span className="group-hover:w-full w-0 overflow-hidden duration-150 text-center">
        {label}
      </span>
    </Link>
  );
}


export default SidebarItem;