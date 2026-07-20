import PopularMovies from "../components/Home/PopularMovies";

function Home() {
    return <div className="home flex flex-col justify-center items-center gap-4 w-full h-full">
        <div className="flex flex-col justify-center items-center gap-4 w-full h-full">
            <PopularMovies />
        </div>
    </div>
}

export default Home;