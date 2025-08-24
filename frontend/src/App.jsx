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
import AdministratorManagement from "./pages/AdministratorManagement";
import StudentManagement from "./pages/StudentManagement";
import UserManagement from "./pages/UserManagement";
import SemesterManagement from "./pages/SemesterManagement";
import StudentGrading from "./pages/StudentGrading";
import ClassCourseManagement from "./pages/ClassCourseManagement";
import About from "./pages/About";
import Home from "./pages/home";
import Navbar from "./components/Navbar"; // Import your Navbar component
import AuthNavbar from "./components/AuthNavbar"; // (optional: navbar for logged-in users)
import Sidebar from "./components/SidebarSimple"; // Import the Simple Sidebar component
import Layout from "./components/Layout"; // Import the Layout component

export default function App() {
  const location = useLocation();

  // Define which routes shouldn't show the navbar or sidebar
  const noNavbarRoutes = ["/Login"];
  const noSidebarRoutes = ["/Login", "/", "/registration", "/parent-registration", "/student-registration", "/TeacherRegister", "/about"];
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <>
      <div className="min-h-screen text-primary font-arabic">
        {/* Show sidebar for logged-in users on protected pages */}
        {isLoggedIn && !noSidebarRoutes.includes(location.pathname) && <Sidebar />}
        
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
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schools"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <SchoolManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <Layout>
                  <ClassManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <Layout>
                  <TeacherManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/administrators"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <AdministratorManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/semesters"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <Layout>
                  <SemesterManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <Layout>
                  <StudentGrading />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/class-courses"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <Layout>
                  <ClassCourseManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  {/* <Dashboard /> */}
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}
