import { FaSearch } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function NavBar() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      navigate(`/movies?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="h-16 w-full flex flex-row py-2 px-4 justify-center items-center">
      <div className="bg-gray-50/10 rounded-3xl items-center justify-center flex flex-row px-4 py-2 gap-2 w-[300px] h-10 ">
        {/*search input div*/}
        <input
          type="text"
          id="search"
          placeholder="Search ..."
          className="bg-transparent outline-hidden w-full active:none focus:outline-hidden text-gray-200"
          autoComplete="off"
          autoCorrect="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
        <FaSearch 
          className="text-gray-400 text-lg cursor-pointer hover:text-white transition-colors" 
          onClick={() => search.trim() && navigate(`/movies?search=${encodeURIComponent(search.trim())}`)}
        />
      </div>
    </div>
  );
}

export default NavBar;
