import { FaSearch } from "react-icons/fa";

function NavBar() {
  return (
    <div className="h-16 w-full flex flex-row py-2 px-4 justify-center items-center">
      <div className="bg-gray-50/10 rounded-3xl items-center justify-center flex flex-row px-4 py-2 gap-2 w-[300px] h-10 ">
        {/*search input div*/}
        <input
          type="text"
          id="search"
          placeholder="Search ..."
          className="bg-transparent outline-none w-full active:none focus:outline-none text-gray-200"
          autoComplete="off"
          autoCorrect="False"
        />
        <FaSearch className="text-gray-400 text-lg" />
      </div>
    </div>
  );
}

export default NavBar;
