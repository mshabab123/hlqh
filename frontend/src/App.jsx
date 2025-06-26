import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login"; // adjust import paths as needed
import Registration from "./pages/Registration";
import About from "./pages/About";

const App = () => {
  return (
    <div className="min-h-screen  text-primary font-arabic">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
};

export default App;
