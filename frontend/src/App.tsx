import "./App.css";
import Sidebar from "./components/Sidebar";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./page/Home";
import Settings from "./page/Settings";
import MovieDetails from "./page/MovieDetails";
import { ImageConfigProvider } from "./global/imageConfigProvider";
import Movies from "./page/Movies";
import SignIn from "./page/SignIn";
import Register from "./page/Register";
import Series from "./page/Series";
import SerieDetails from "./page/SerieDetails";
import { UserProvider } from "./global/userProvider";
import { ToastContainer } from "react-toast";
import Profile from "./page/Profile";
import PublicProfile from "./page/PublicProfile.tsx";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthProvider from "./global/authProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ForgotPass from "./page/ForgotPass";
// import
import ResetPass from "./page/ResetPass";
import EmailVerification from "./page/EmailVerification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
      <div className="bg-black p-0 m-0 min-h-screen">
        <QueryClientProvider client={queryClient}>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <AuthProvider>
              <UserProvider>
                <ImageConfigProvider>
                  <div className="flex flex-row gap-0 w-full h-screen">
                    <Router>
                      <Sidebar />
                      <div
                        className="flex flex-col w-full overflow-y-auto overflow-x-hidden scroll-smooth"
                        id="scrollContainer"
                      >
                        <Routes>
                          <Route
                            path="/verify-email"
                            element={<EmailVerification />}
                          />
                          <Route element={<ProtectedRoute />}>
                            <Route index path="/" element={<Home />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/movies" element={<Movies />} />
                            <Route path="/series" element={<Series />} />
                            {/* <Route path="/discover" element={<Discover/>} */}
                            <Route
                              path="/movies/:id"
                              element={<MovieDetails />}
                            />
                            <Route
                              path="/series/:id"
                              element={<SerieDetails />}
                            />
                            <Route path="/profile" element={<Profile />} />
                            <Route
                              path="/profile/:id"
                              element={<PublicProfile />}
                            />
                          </Route>
                          <Route element={<PublicOnlyRoute />}>
                            <Route
                              path="/forgot-password"
                              element={<ForgotPass />}
                            />
                            <Route
                              path="/reset-password"
                              element={<ResetPass />}
                            />
                            <Route path="/signin" element={<SignIn />} />
                            <Route path="/register" element={<Register />} />
                          </Route>
                        </Routes>
                      </div>
                    </Router>
                  </div>
                </ImageConfigProvider>
              </UserProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
          <ToastContainer position="top-center" delay={1500} />
        </QueryClientProvider>
      </div>
  );
}

export default App;
