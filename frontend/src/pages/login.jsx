import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  //   const [form, setForm] = useState({ email: "", password: "" });
  //   const [error, setError] = useState("");
  //   const navigate = useNavigate();

  //   const handleChange = (e) => {
  //     setForm({ ...form, [e.target.name]: e.target.value });
  //   };

  //   const handleSubmit = async (e) => {
  //     e.preventDefault();
  //     setError("");

  //     try {
  //       const res = await axios.post(
  //         "http://localhost:5000/api/auth/login",
  //         form
  //       );

  //       // Save the token or user info
  //       localStorage.setItem("token", res.data.token);

  //       // Navigate to dashboard
  //       navigate("/dashboard");
  //     } catch (err) {
  //       setError(err.response?.data?.error || "Login failed");
  //     }
  //   };

  return (
    <>
      <h1>Login</h1>
    </>
  );
}
