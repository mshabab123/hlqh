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
      <header className="bg-gray-800 text-white p-4">
        <nav className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">MySite</div>
          <ul className="flex space-x-4">
            <li>
              <a href="#" className="hover:text-gray-300">
                Home
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gray-300">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gray-300">
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </header>

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
