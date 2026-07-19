function MovieCard({
  poster,
  title,
  vote,
}: {
  poster: string;
  title: string;
  vote: number;
}) {
  return (
    <div className="movie-card cursor-pointer duration-300 relative group flex flex-col justify-center items-center max-w-[175px] min-w-[175px] mx-5 h-[250px] rounded-2xl">
      <img
        src={"https://image.tmdb.org/t/p/w500" + poster}
        alt={title}
        className="group-hover:outline-2 group-hover:outline-white rounded-lg w-[175px] h-[220px] duration-200 object-fill"
      />
      <p className="text-2xl absolute left-0 top-0 text-yellow-400 font-bold [-webkit-text-stroke:1px_black] py-1 px-1 rounded-br-lg bg-gray-50/30">
        {vote}
      </p>
      <p className="text-lg text-gray-400 h-[30px] w-full overflow-hidden text-ellipsis text-nowrap " title={title}>
        {title}
      </p>
    </div>
  );
}

export default MovieCard;
