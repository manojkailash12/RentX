import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import CarDetails from "./pages/CarDetails";
import Cars from "./pages/Cars";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import Footer from "./components/Footer";
import Layout from "./pages/owner/Layout";
import Dashboard from "./pages/owner/Dashboard";
import AddCar from "./pages/owner/AddCar";
import EditCar from "./pages/owner/EditCar";
import ManageCars from "./pages/owner/ManageCars";
import ManageBookings from "./pages/owner/ManageBookings";
import CarApproval from "./pages/owner/CarApproval";
import Login from "./components/Login";
import {Toaster} from 'react-hot-toast';
import { useAppContext } from "./context/AppContext";
import { usePagePersistence } from "./hooks/usePagePersistence";

const App = () => {
  const {showLogin, loginMode, token}= useAppContext()
  const location = useLocation();
  const navigate = useNavigate();
  const isOwnerPath = location.pathname.startsWith("/owner");
  const { restoreLastPath } = usePagePersistence();

  // Restore last visited path on app load if user is logged in (but don't redirect from current page)
  useEffect(() => {
    if (token) {
      const currentPath = location.pathname;
      const lastPath = localStorage.getItem('lastVisitedPath');
      
      // Only restore if we're on the home page and have a different last path
      if (currentPath === '/' && lastPath && lastPath !== '/' && lastPath !== currentPath) {
        restoreLastPath();
      }
    }
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      {showLogin && <Login key={loginMode}/>}
      
      {!isOwnerPath && <Navbar/>}

      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/car-details/:id" element={<CarDetails />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/owner" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="add-car" element={<AddCar />} />
            <Route path="edit-car/:id" element={<EditCar />} />
            <Route path="manage-cars" element={<ManageCars />} />
            <Route path="manage-bookings" element={<ManageBookings />} />
            <Route path="car-approvals" element={<CarApproval />} />
          </Route>
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dull transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          } />
        </Routes>
      </div>
      
      {!isOwnerPath && <Footer />}
    </div>
  );
};

export default App;
