import { useEffect } from "react";
import { BiX } from "react-icons/bi";

function StreamingOptions({
  movie_id,
  movie_name,
  show,
  setShow,
}: {
  movie_id: number;
  movie_name: string;
  show: boolean;
  setShow: (value: boolean) => void;
}) {
  movie_id;

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShow(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return (
    <div
      className={
        "absolute w-full h-screen z-[60] top-0 left-0 duration-500 flex justify-center items-center " +
        (show ? "opacity-100 scale-100" : "opacity-0 scale-0")
      }
    >
      <div
        className="absolute top-0 left-0 w-full h-full bg-black/30 backdrop-blur-lg"
        onClick={() => setShow(false)}
      ></div>
      <div
        id="streaming-options-module"
        className="relative container h-full w-full z-[70] rounded-2xl overflow-y-auto py-2 px-4 bg-gray-900/50 flex flex-col text-xl text-gray-200 gap-2"
      >
        <span
          className="absolute top-3 right-3 z-[100] rounded-full bg-gray-400 font-bold text-3xl hover:bg-gray-500 active:scale-105 cursor-pointer"
          onClick={() => setShow(false)}
          title="Close"
          aria-label="Close"
        >
          <BiX />
        </span>
        <h1 className="h-6">streaming options : {movie_name}</h1>
        <div className="container h-[98%] flex items-center justify-center rounded-3xl bg-black/60">
          {/* should add some streaming options in some react reusable components */}
          <h2 className="text-center rotate-30">Not implimented yet</h2>
        </div>
      </div>
    </div>
  );
}

export default StreamingOptions;
