import "./App.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { RequireAuth } from "./components/RequireAuth";

const Register = lazy(() => import("./pages/Register").then((module) => ({ default: module.Register })));
const Login = lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const AdAdder = lazy(() => import("./pages/AdAdder").then((module) => ({ default: module.AdAdder })));
const MyAds = lazy(() => import("./pages/MyAds").then((module) => ({ default: module.MyAds })));
const Profile = lazy(() => import("./pages/Profile").then((module) => ({ default: module.Profile })));
const ServiceDetails = lazy(() => import("./pages/ServiceDetails").then((module) => ({ default: module.ServiceDetails })));
const AdEditor = lazy(() => import("./pages/AdEditor").then((module) => ({ default: module.AdEditor })));
const Responses = lazy(() => import("./pages/Responses").then((module) => ({ default: module.Responses })));
const Admin = lazy(() => import("./pages/Admin").then((module) => ({ default: module.Admin })));
const Terms = lazy(() => import("./pages/Legal").then((module) => ({ default: module.Terms })));
const Privacy = lazy(() => import("./pages/Legal").then((module) => ({ default: module.Privacy })));

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        <Suspense fallback={<div className="page-shell"><div className="empty-state">Загружаем страницу…</div></div>}>
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
        </Suspense>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
