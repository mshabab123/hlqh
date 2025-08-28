import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/login";
import Registration from "./pages/registration";
import ParentRegistration from "./pages/ParentRegistration";
import StudentRegistration from "./pages/StudentRegistration";
import TeacherRegister from "./pages/TeacherRegister";
import SchoolManagement from "./pages/SchoolManagement";
import ClassManagement from "./pages/ClassManagement";
import TeacherManagement from "./pages/TeacherManagement";
import AdministratorManagement from "./pages/AdministratorManagement";
import AdminRoots from "./pages/AdminRoots";
import ParentManagement from "./pages/ParentManagement";
import StudentManagement from "./pages/StudentManagement";
import UserManagement from "./pages/UserManagement";
import SemesterManagement from "./pages/SemesterManagement";
import StudentGrading from "./pages/StudentGrading";
import AttendanceManagement from "./pages/AttendanceManagement";
import AttendanceSystem from "./pages/AttendanceSystem";
import ClassCourseManagement from "./pages/ClassCourseManagement";
import DatabaseManagement from "./pages/DatabaseManagement";
import DatabaseTableDetails from "./pages/DatabaseTableDetails";
import PasswordManagement from "./pages/PasswordManagement";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import MyStudentsPage from "./pages/MyStudentsPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Home from "./pages/home";
import Navbar from "./components/Navbar";
import AuthNavbar from "./components/AuthNavbar";
import Layout from "./components/Layout";

export default function App() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");
  
  // Routes that shouldn't show navbar
  const noNavbarRoutes = ["/Login", "/", "/forgot-password", "/reset-password"];
  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      <div className="min-h-screen text-primary font-arabic">
        {/* Show appropriate navbar */}
        {showNavbar && (isLoggedIn ? <AuthNavbar /> : <Navbar />)}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/parent-registration" element={<ParentRegistration />} />
          <Route path="/student-registration" element={<StudentRegistration />} />
          <Route path="/TeacherRegister" element={<TeacherRegister />} />
          <Route path="/about" element={<About />} />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
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
            path="/parents"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <Layout>
                  <ParentManagement />
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
            path="/admin-roots"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <AdminRoots />
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
            path="/attendance"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <Layout>
                  <AttendanceManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-system"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <Layout>
                  <AttendanceSystem />
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
            path="/database"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <DatabaseManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/database/table/:tableName"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <DatabaseTableDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/password-management"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <Layout>
                  <PasswordManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-students"
            element={
              <ProtectedRoute requiredRole="parent">
                <Layout>
                  <MyStudentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}
