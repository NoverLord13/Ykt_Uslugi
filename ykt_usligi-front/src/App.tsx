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

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/register" element={<Register />}></Route>
            <Route path="/login" element={<Login />}></Route>
            <Route path="/adadder" element={<AdAdder />}></Route>
            <Route path="/my-ads" element={<MyAds/>}></Route>
            <Route path="/profile" element={<Profile/>}></Route>
            <Route path="/users/:id" element={<Profile/>}></Route>
            <Route path="/services/:id" element={<ServiceDetails />}></Route>
            <Route path="/services/:id/edit" element={<AdEditor />}></Route>
          </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
