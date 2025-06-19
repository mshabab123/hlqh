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
    <div className="card-container">
      <h2>اهلابك يا مشبب في اول تطبيق</h2>
      <Card title="الاول" x={4} y={"ابو عبدالله"} />
      <Card title="الثاني" />
      <Card title="الثالث" />
    </div>
  );
};

export default App;
