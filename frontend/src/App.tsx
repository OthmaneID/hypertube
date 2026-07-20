import "./App.css";
import Sidebar from "./components/Sidebar";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./page/Home";
import Settings from "./page/Settings";
import MovieDetails from "./page/MovieDetails";
import { ImageConfigProvider } from "./global/imageConfigProvider";

function App() {
  return (
    <div className="bg-gradient-to-tr bg-no-repeat from-[#00071a] to-[#2f004b] p-0 m-0 min-h-screen">
      <ImageConfigProvider>
        <div className="flex flex-row gap-0 w-full h-screen">
          <Router>
            <Sidebar />
            <div className="flex flex-col w-full overflow-auto">
              <Routes>
                <Route index path="/" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/movies/:id" element={<MovieDetails />} />
              </Routes>
            </div>
          </Router>
        </div>
      </ImageConfigProvider>
    </div>
  );
}

export default App;
