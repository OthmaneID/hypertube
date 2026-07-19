import PopularMovies from "../components/Home/PopularMovies";

function Home() {
    return <div className="home flex flex-col justify-center items-center gap-4 w-full h-full">
        <h1 className="text-4xl text-white font-bold">Welcome to Hypertube</h1>
        <p className="text-lg text-gray-400">Your ultimate movie streaming experience</p>
        <div className="flex flex-col justify-center items-center gap-4 w-full h-full">
            <PopularMovies />
        </div>
    </div>
}

export default Home;