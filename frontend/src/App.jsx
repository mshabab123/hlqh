import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import About from "./pages/About";

const Card = ({ title }) => {
  const [hasLiked, setHasLnked] = useState(false);

  return (
    <div className="card">
      <p>{title}</p>
      <button onClick={() => setHasLnked(!hasLiked)}>
        {hasLiked ? "❤️" : "like"}
      </button>
    </div>
  );
};

// test

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/schools" element={<Schools />} />
      <Route path="/about" element={<About />} /> {/* ✅ add About route */}
    </Routes>
  );
};

export default App;
