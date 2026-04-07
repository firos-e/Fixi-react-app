import React, { useState } from "react";
import styles from "./SignUp.module.css";
import { signupUser } from "../../api/auth";

const serviceOptions = [
  "Plumbing",
  "Electrical",
  "AC Repair",
  "Appliances",
  "Vehicle",
  "Cleaning",
  "Painting",
  "Pest Control"
];

function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user",
    services: [],
    location: {
      coordinates: [0, 0],
      address: ""
    }
  });

  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleService = (service) => {
    setForm((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service]
    }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const address = data.display_name
            ? data.display_name.split(",").slice(0, 3).join(",")
            : "";

          setForm((current) => ({
            ...current,
            location: {
              coordinates: [longitude, latitude],
              address
            }
          }));
        } catch (err) {
          alert("Could not read your address. Please try again.");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        alert("Could not detect location. Please try again.");
        setLocLoading(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.phone) {
      alert("All fields are required");
      return;
    }

    if (form.role === "technician" && form.services.length === 0) {
      alert("Please choose at least one service you provide");
      return;
    }

    if (form.location.coordinates[0] === 0) {
      alert("Please detect your location");
      return;
    }

    try {
      setLoading(true);
      const data = await signupUser(form);
      alert(data.message);
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "user",
        services: [],
        location: { coordinates: [0, 0], address: "" }
      });
    } catch (err) {
      alert(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h2>Create Account</h2>

        <div className={styles.roleSelector}>
          <button
            type="button"
            className={`${styles.roleBtn} ${form.role === "user" ? styles.activeUser : styles.inactive}`}
            onClick={() => setForm((current) => ({ ...current, role: "user", services: [] }))}
          >
            I need a service
          </button>
          <button
            type="button"
            className={`${styles.roleBtn} ${form.role === "technician" ? styles.activeTech : styles.inactive}`}
            onClick={() => setForm((current) => ({ ...current, role: "technician" }))}
          >
            I'm a technician
          </button>
        </div>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
        />

        {form.role === "technician" ? (
          <div className={styles.serviceBox}>
            <p className={styles.serviceLabel}>Services you provide</p>
            <div className={styles.serviceGrid}>
              {serviceOptions.map((service) => (
                <button
                  key={service}
                  type="button"
                  className={`${styles.serviceBtn} ${form.services.includes(service) ? styles.serviceActive : ""}`}
                  onClick={() => toggleService(service)}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.locationBox}>
          <button
            type="button"
            className={styles.locationBtn}
            onClick={handleDetectLocation}
            disabled={locLoading}
          >
            {locLoading ? "Detecting..." : "Detect My Location"}
          </button>
          {form.location.address ? (
            <p className={styles.locationText}>{form.location.address}</p>
          ) : (
            <p className={styles.locationText}>No location detected yet</p>
          )}
        </div>

        <button onClick={handleSubmit} disabled={loading} type="button">
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className={styles.text}>
          Already have an account?{" "}
          <span onClick={() => window.location.href = "/login"}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default SignUp;