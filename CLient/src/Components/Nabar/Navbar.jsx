import React from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import { BsTools } from "react-icons/bs";

function Navbar() {
  return (
    <nav className={styles.nav}>
      <h2 className={styles.logo}>Fixi <BsTools size={15} color="white"/> </h2>

      <div className={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Signup</Link>
      </div>
    </nav>
  );
}

export default Navbar;