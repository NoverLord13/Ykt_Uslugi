import "./App.css";
import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AdAdder } from "./pages/AdAdder";
import { MyAds } from "./pages/MyAds";
import {Profile} from "./pages/Profile"
import { ServiceDetails } from "./pages/ServiceDetails";
import { AdEditor } from "./pages/AdEditor";
import { Responses } from "./pages/Responses";
import { Admin } from "./pages/Admin";
import { Privacy, Terms } from "./pages/Legal";
import { RequireAuth } from "./components/RequireAuth";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/register" element={<Register />}></Route>
            <Route path="/login" element={<Login />}></Route>
            <Route path="/adadder" element={<RequireAuth><AdAdder /></RequireAuth>}></Route>
            <Route path="/my-ads" element={<RequireAuth><MyAds/></RequireAuth>}></Route>
            <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>}></Route>
            <Route path="/users/:id" element={<Profile/>}></Route>
            <Route path="/services/:id" element={<ServiceDetails />}></Route>
            <Route path="/services/:id/edit" element={<RequireAuth><AdEditor /></RequireAuth>}></Route>
            <Route path="/responses" element={<RequireAuth><Responses /></RequireAuth>}></Route>
            <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>}></Route>
            <Route path="/terms" element={<Terms />}></Route>
            <Route path="/privacy" element={<Privacy />}></Route>
            <Route path="*" element={<div className="p-12 text-center text-xl">Страница не найдена</div>}></Route>
          </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
