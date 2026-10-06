import Card from "../Card";
// import DummyData from "../../utils/data";
import { Link } from "react-router-dom";
import { BiChevronRight } from "react-icons/bi";
import { useEffect, useState } from "react";
import { getPopularSeries} from "../../utils/api/movieService/seriesApi";
import type { PopularSeriesResponse } from "../../utils/interfaces";

function PopularSeries() {
  const [Series, setSeries] = useState({
    page: 1,
    results: [],
    total_pages: 0,
    total_results: 0,
  } as PopularSeriesResponse);
  useEffect(() => {
    getPopularSeries(1).then((data) => {
      setSeries(data);
    });
  }, []);
  return (
    <div className="popular-movies flex flex-col py-4 gap-4 w-[calc(100vw-120px)] h-full px-2">
      <div className="flex flex-row justify-between items-center px-2">
        <h4 className="text-4xl text-white font-thin">Popular - Series</h4>
        <Link
          to="/series"
          className="text-lg text-nowrap flex flex-nowrap items-center text-gray-400 hover:text-white transition duration-300"
        >
          See All <BiChevronRight className="ml-1" />
        </Link>
      </div>
      <div className="flex flex-row items-center h-85 overflow-auto gap-2 border-b-2 border-gray-600">
        {Series.results.map((serie, index) => {
          const year = serie.first_air_date?.toString().split("-")[0];
          return <Card
            url={"/series/" + serie.id}
            key={index}
            id={serie.id}
            poster={serie.poster_path}
            title={serie.name}
            vote={serie.vote_average}
            year={year}
          />
        })}
      </div>
    </div>
  );
}

export default PopularSeries;
