import { useState } from "react";

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

const App = () => {
  return (
    <>
      <div class="flex justify-between items-center bg-gray-dark p-4">
        <div className="btn">Brand</div>
        <div class="hidden md:flex space-x-4">
          <a class="text-blue hover:text-gray-lighter" href="#">
            Home
          </a>
          <a class="text-red hover:text-gray-lighter" href="#">
            About
          </a>
          <a class="text-green hover:text-gray-lighter" href="#">
            Contact
          </a>
        </div>
      </div>
      <div className="card-container">
        <h1 class="text-3xl font-bold underline">Hello world!</h1>
      </div>
    </>
  );
};

export default App;
