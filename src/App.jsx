import { useEffect } from "react";
import Navbar from "./components/Navbar";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import CarDetails from "./pages/CarDetails";
import Cars from "./pages/Cars";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import Features from "./pages/Features";
import Footer from "./components/Footer";
import Layout from "./pages/owner/Layout";
import Dashboard from "./pages/owner/Dashboard";
import AddCarRouter from "./pages/owner/AddCarRouter";
import EmployeeAddAdminCar from "./pages/employee/EmployeeAddAdminCar";
import EmployeeAddOwnCar from "./pages/employee/EmployeeAddCar";
import AccountDeletionRequest from "./pages/employee/AccountDeletionRequest";
import EditCar from "./pages/owner/EditCar";
import ManageCars from "./pages/owner/ManageCars";
import ManageBookings from "./pages/owner/ManageBookings";
import CarApproval from "./pages/owner/CarApproval";
import AdminCarApproval from "./pages/admin/AdminCarApproval";
import AdminReviews from "./pages/admin/Reviews";
import AdminChatSupport from "./components/Admin/AdminChatSupport";
import SupportTickets from "./components/Admin/SupportTickets";
import EmployeeManagementPage from "./pages/admin/EmployeeManagement";
import EmployeeDeletionRequests from "./pages/admin/EmployeeDeletionRequests";
import LeaveApproval from "./pages/admin/LeaveApproval";
import Attendance from "./pages/employee/Attendance";
import Payroll from "./pages/employee/Payroll";
import LeaveRequest from "./pages/employee/LeaveRequest";
import LeaveManagement from "./pages/employee/LeaveManagement";
import UsersPage from "./pages/employee/UsersPage";
import DeletedAccountsPage from "./pages/employee/DeletedAccountsPage";
import BiometricDevices from "./pages/admin/BiometricDevices";
import ShiftScheduling from "./pages/admin/ShiftScheduling";
import DynamicPricing from "./pages/admin/DynamicPricing";
import PerformanceReviews from "./pages/admin/PerformanceReviews";
import TrainingManagement from "./pages/admin/TrainingManagement";
import BiometricEnrollment from "./pages/employee/BiometricEnrollment";
import PredictiveMaintenance from "./pages/user/PredictiveMaintenance";
import ChargingStations from "./pages/user/ChargingStations";
import SmartContracts from "./pages/user/SmartContracts";
import Login from "./components/Login";
import {Toaster} from 'react-hot-toast';
import { useAppContext } from "./context/AppContext";
import { usePagePersistence } from "./hooks/usePagePersistence";
import { ChatProvider } from "./context/ChatContext";
import AccountSettings from "./pages/AccountSettings";
import './i18n/config';
import './styles/mobile.css';
import CustomerSupportChat from "./components/Chat/CustomerSupportChat";
import UserChatInterface from "./components/Chat/UserChatInterface";
import BookingConfirmation from "./pages/BookingConfirmation";

const App = () => {
  const {showLogin, loginMode, token, isAdmin, isEmployee}= useAppContext()
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

  // Protected Route Component for My Bookings
  const ProtectedMyBookings = () => {
    if (isAdmin || isEmployee) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">This page is not available for {isAdmin ? 'admin' : 'employee'} accounts</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dull transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return <MyBookings />;
  }; 

  return (
    <ChatProvider>
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
            <Route path="/my-bookings" element={<ProtectedMyBookings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/features" element={<Features />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/chat" element={<UserChatInterface />} />
            <Route path="/settings/account" element={<AccountSettings />} />
            <Route path="/employee/attendance" element={<Attendance />} />
            <Route path="/employee/payroll" element={<Payroll />} />
            <Route path="/employee/leave-request" element={<LeaveRequest />} />
            <Route path="/employee/leave-management" element={<LeaveManagement />} />
            <Route path="/employee/biometric-enrollment" element={<BiometricEnrollment />} />
            <Route path="/employee/account-deletion" element={<AccountDeletionRequest />} />
            <Route path="/owner" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="add-car" element={<AddCarRouter />} />
              <Route path="add-admin-car" element={<EmployeeAddAdminCar />} />
              <Route path="add-own-car" element={<EmployeeAddOwnCar />} />
              <Route path="edit-car/:id" element={<EditCar />} />
              <Route path="manage-cars" element={<ManageCars />} />
              <Route path="manage-bookings" element={<ManageBookings />} />
              <Route path="car-approvals" element={<CarApproval />} />
              <Route path="admin-car-approvals" element={<AdminCarApproval />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="admin-chat" element={<AdminChatSupport />} />
              <Route path="support-tickets" element={<SupportTickets />} />
              <Route path="employees" element={<EmployeeManagementPage />} />
              <Route path="employee-deletion-requests" element={<EmployeeDeletionRequests />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="deleted-accounts" element={<DeletedAccountsPage />} />
              <Route path="leave-approval" element={<LeaveApproval />} />
              <Route path="biometric-devices" element={<BiometricDevices />} />
              <Route path="shift-scheduling" element={<ShiftScheduling />} />
              <Route path="dynamic-pricing" element={<DynamicPricing />} />
              <Route path="performance-reviews" element={<PerformanceReviews />} />
              <Route path="training-management" element={<TrainingManagement />} />
              <Route path="predictive-maintenance" element={<PredictiveMaintenance />} />
              <Route path="charging-stations" element={<ChargingStations />} />
              <Route path="smart-contracts" element={<SmartContracts />} />
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
        
        {/* Customer Support Chat - Available on all pages */}
        {token && <CustomerSupportChat />}
      </div>
    </ChatProvider>
  );
};

export default App;
