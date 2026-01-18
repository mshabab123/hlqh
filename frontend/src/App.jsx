import { Routes, Route, useLocation, Navigate } from "react-router-dom";
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
import ComprehensiveGrading from "./pages/ComprehensiveGrading";
import AttendanceManagement from "./pages/AttendanceManagement";
import StudentAttendanceGrid from "./pages/StudentAttendanceGrid";
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
import QuranReader from "./pages/QuranReader";
import Home from "./pages/home";
import DailyReports from "./pages/DailyReports";
import PointsManagement from "./pages/PointsManagement";
import PointsReports from "./pages/PointsReports";
import StudentPoints from "./pages/StudentPoints";
import Children from "./pages/Children";
import PrivilegeManagement from "./pages/PrivilegeManagement";
import Navbar from "./components/Navbar";
import AuthNavbar from "./components/AuthNavbar";
import Layout from "./components/Layout";
import ConditionalLayout from "./components/ConditionalLayout";

export default function App() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");
  // Routes that shouldn't show navbar
  const noNavbarRoutes = ["/login", "/Login", "/forgot-password", "/reset-password"];
  const showNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <>
      <div className="min-h-screen text-primary font-arabic">
        {/* Show appropriate navbar */}
        {showNavbar && (isLoggedIn ? <AuthNavbar /> : <Navbar />)}

        <Routes>
          <Route
            path="/"
            element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
          />
          <Route
            path="/login"
            element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
          />
          <Route
            path="/Login"
            element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/parent-registration" element={<ParentRegistration />} />
          <Route path="/student-registration" element={<StudentRegistration />} />
          <Route path="/TeacherRegister" element={<TeacherRegister />} />
          <Route path="/about" element={<About />} />
          <Route path="/quran" element={<QuranReader />} />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
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
                <ConditionalLayout>
                  <SchoolManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <ClassManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <ConditionalLayout>
                  <TeacherManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parents"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <ConditionalLayout>
                  <ParentManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/administrators"
            element={
              <ProtectedRoute requiredRole="admin">
                <ConditionalLayout>
                  <AdministratorManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-roots"
            element={
              <ProtectedRoute requiredRole="admin">
                <ConditionalLayout>
                  <AdminRoots />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <ConditionalLayout>
                  <UserManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <ConditionalLayout>
                  <StudentManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/semesters"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <ConditionalLayout>
                  <SemesterManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <StudentGrading />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/comprehensive-grading"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <ComprehensiveGrading />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <AttendanceManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/:studentId/attendance"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <StudentAttendanceGrid />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/class-courses"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <ConditionalLayout>
                  <ClassCourseManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/database"
            element={
              <ProtectedRoute requiredRole="admin">
                <ConditionalLayout>
                  <DatabaseManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/database/table/:tableName"
            element={
              <ProtectedRoute requiredRole="admin">
                <ConditionalLayout>
                  <DatabaseTableDetails />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/password-management"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator"]}>
                <ConditionalLayout>
                  <PasswordManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ConditionalLayout>
                  <Dashboard />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ConditionalLayout>
                  <Profile />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-students"
            element={
              <ProtectedRoute requiredRole="parent">
                <ConditionalLayout>
                  <MyStudentsPage />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-reports"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "supervisor"]}>
                <ConditionalLayout>
                  <DailyReports />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/points-management"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "supervisor", "teacher"]}>
                <ConditionalLayout>
                  <PointsManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/points-reports"
            element={
              <ProtectedRoute requiredRole={["admin", "administrator", "supervisor", "teacher"]}>
                <ConditionalLayout>
                  <PointsReports />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-points"
            element={
              <ProtectedRoute requiredRole={["student"]}>
                <ConditionalLayout>
                  <StudentPoints />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/children"
            element={
              <ProtectedRoute requiredRole={["parent", "admin", "administrator", "teacher"]}>
                <ConditionalLayout>
                  <Children />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/privilege-management"
            element={
              <ProtectedRoute requiredRole={["admin", "supervisor"]}>
                <ConditionalLayout>
                  <PrivilegeManagement />
                </ConditionalLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}
