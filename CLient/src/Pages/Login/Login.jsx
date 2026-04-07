import React, { useState } from "react";
import styles from "./Login.module.css";
import API from "../../api/axios"; // your axios instance
import { loginUser } from "../../api/auth"; // ✅ add this

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  

  const handleSubmit = async () => {
  try {
    const res = await loginUser(form);

    // ✅ save token AND role
    localStorage.setItem("token", res.token);
    localStorage.setItem("role", res.user.role);
    localStorage.setItem("user", JSON.stringify(res.user));

    // ✅ redirect based on role
    if (res.user.role === "technician") {
      window.location.href = "/technician/dashboard";
    } else {
      window.location.href = "/dashboard";
    }

  } catch (err) {
    alert(err.message || "Login failed");
  }
};

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h2>Login</h2>

        <input
  type="email"
  name="email"
  placeholder="Email"
  value={form.email}          // ✅ controlled input
  onChange={handleChange}
/>

<input
  type="password"
  name="password"
  placeholder="Password"
  value={form.password}       // ✅ controlled input
  onChange={handleChange}
/>

        <button onClick={handleSubmit}>Login</button>
      </div>
    </div>
  );
}

export default Login;