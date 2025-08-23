import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Registration from "./pages/registration";
import ParentRegistration from "./pages/ParentRegistration";
import StudentRegistration from "./pages/StudentRegistration";
import TeacherRegister from "./pages/TeacherRegister";
import SchoolManagement from "./pages/SchoolManagement";
import ClassManagement from "./pages/ClassManagement";
import TeacherManagement from "./pages/TeacherManagement";
import About from "./pages/About";
import Home from "./pages/home";
import Navbar from "./components/Navbar"; // Import your Navbar component
import AuthNavbar from "./components/AuthNavbar"; // (optional: navbar for logged-in users)

export default function App() {
  const location = useLocation();

  // Define which routes shouldn't show the navbar
  const noNavbarRoutes = ["/Login"];
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <>
      <div className="min-h-screen text-primary font-arabic">
        {/* Show navbar if not in excluded routes */}
        {!noNavbarRoutes.includes(location.pathname) &&
          (isLoggedIn ? <AuthNavbar /> : <Navbar />)}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/parent-registration" element={<ParentRegistration />} />
          <Route path="/student-registration" element={<StudentRegistration />} />
          <Route path="/TeacherRegister" element={<TeacherRegister />} />
          <Route path="/about" element={<About />} />

          {/* Protected routes */}
          <Route
            path="/Home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schools"
            element={
              <ProtectedRoute requiredRole="admin">
                <SchoolManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <ClassManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <TeacherManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute>{/* <Dashboard /> */}</ProtectedRoute>}
          />
        </Routes>
      </div>
    </>
  );
}
