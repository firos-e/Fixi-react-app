import React from "react";
import styles from "./Homepage.module.css";
import { BsTools } from "react-icons/bs";

function Homepage() {
  const services = [
    { name: "Plumbing", icon: "🚰" },
    { name: "Electrical", icon: "⚡" },
    { name: "AC Repair", icon: "❄️" },
    { name: "Appliances", icon: "🧺" },
    { name: "Cleaning", icon: "🧹" },
    { name: "Painting", icon: "🎨" },
  ];

  return (
    <div className={styles.home}>

      {/* HERO SECTION */}
      <div className={styles.hero}>
        <h1>Fixi <BsTools  size={30} color="white"/> </h1>
        <p>Book trusted repair services instantly</p>
        <button className={styles.cta}>Explore Services</button>
      </div>

      {/* SERVICES GRID */}
      <div className={styles.services}>
        {services.map((service, index) => (
          <div key={index} className={styles.card}>
            <span className={styles.icon}>{service.icon}</span>
            <h3>{service.name}</h3>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Homepage;