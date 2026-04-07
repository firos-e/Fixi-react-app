import React, { useEffect, useRef, useState } from "react";
import styles from "./BookingModal.module.css";
import { getNearbyTechnicians, createBooking } from "../../api/booking";
import { getCurrentUser } from "../../api/auth";

function BookingModal({ service, onClose, onBooked }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    date: "",
    time: "",
    description: ""
  });
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFindTechnicians = async () => {
    if (!form.date || !form.time) {
      alert("Please select date and time");
      return;
    }

    try {
      setLoading(true);
      const { user } = await getCurrentUser();
      const coordinates = user.location?.coordinates || [];

      if (coordinates.length !== 2 || coordinates.every((value) => value === 0)) {
        throw new Error("Please update your location before booking a service");
      }

      const data = await getNearbyTechnicians(service, coordinates);
      const foundTechnicians = data.technicians || [];
      setTechnicians(foundTechnicians);
      setSelectedTechnicianId(foundTechnicians[0]?._id || "");
      setDropdownOpen(false);
      setStep(2);
    } catch (err) {
      alert(err.message || "Failed to find technicians");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedTechnicianId) {
      alert("Please select a technician");
      return;
    }

    try {
      setBookingLoading(true);
      await createBooking({
        service,
        description: form.description,
        date: form.date,
        time: form.time,
        technicianId: selectedTechnicianId
      });
      onBooked?.();
      alert("Booking confirmed!");
      onClose();
    } catch (err) {
      alert(err.message || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedTechnician = technicians.find((tech) => tech._id === selectedTechnicianId) || null;
  const getOptionLabel = (tech, index) => {
    const shortAddress = tech.location?.address
      ? tech.location.address
          .replace(/,/g, " ")
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .join(" ")
      : "Area unavailable";
    const distanceLabel = tech.distanceKm !== null ? `${tech.distanceKm} km away` : "Distance unavailable";
    const nearestLabel = index === 0 ? "Nearest" : "";

    return [tech.name, shortAddress, distanceLabel, nearestLabel]
      .filter(Boolean)
      .join(" - ");
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{service} Booking</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            x
          </button>
        </div>

        {step === 1 ? (
          <div className={styles.form}>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              min={new Date().toISOString().split("T")[0]}
            />

            <label htmlFor="time">Time</label>
            <input
              id="time"
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
            />

            <label htmlFor="description">Describe your problem</label>
            <textarea
              id="description"
              name="description"
              placeholder="e.g. My AC is not cooling properly..."
              value={form.description}
              onChange={handleChange}
              rows={3}
            />

            <button
              className={styles.findBtn}
              onClick={handleFindTechnicians}
              disabled={loading}
              type="button"
            >
              {loading ? "Finding..." : `Show All ${service} Providers`}
            </button>
          </div>
        ) : (
          <div className={styles.techList}>
            <button className={styles.backBtn} onClick={() => setStep(1)} type="button">
              Back
            </button>

            {technicians.length === 0 ? (
              <div className={styles.empty}>
                <p>No {service.toLowerCase()} providers found.</p>
                <p>Try again later or check another service category.</p>
              </div>
            ) : (
              <>
                <div className={styles.selectorShell}>
                  <label className={styles.selectLabel}>
                    Choose a provider
                  </label>
                  <div className={styles.selectWrap} ref={dropdownRef}>
                    <button
                      className={styles.selectTrigger}
                      type="button"
                      onClick={() => setDropdownOpen((current) => !current)}
                      aria-expanded={dropdownOpen}
                    >
                      <span className={styles.triggerText}>
                        {selectedTechnician
                          ? getOptionLabel(
                              selectedTechnician,
                              technicians.findIndex((tech) => tech._id === selectedTechnician._id)
                            )
                          : "Choose a provider"}
                      </span>
                      <span className={`${styles.selectArrow} ${dropdownOpen ? styles.selectArrowOpen : ""}`}>
                        v
                      </span>
                    </button>

                    {dropdownOpen ? (
                      <div className={styles.dropdownMenu}>
                        {technicians.map((tech, index) => (
                          <button
                            key={tech._id}
                            type="button"
                            className={`${styles.dropdownOption} ${tech._id === selectedTechnicianId ? styles.dropdownOptionActive : ""}`}
                            onClick={() => {
                              setSelectedTechnicianId(tech._id);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className={styles.optionTopRow}>
                              <span className={styles.optionName}>{tech.name}</span>
                              {index === 0 ? <span className={styles.optionBadge}>Nearest</span> : null}
                            </span>
                            <span className={styles.optionMeta}>
                              {tech.location?.address
                                ? tech.location.address
                                    .replace(/,/g, " ")
                                    .trim()
                                    .split(/\s+/)
                                    .slice(0, 2)
                                    .join(" ")
                                : "Area unavailable"}
                              {" · "}
                              {tech.distanceKm !== null ? `${tech.distanceKm} km away` : "Distance unavailable"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedTechnician ? (
                  <div className={styles.techCard}>
                    <div className={styles.techInfo}>
                      <div className={styles.avatar}>
                        {selectedTechnician.name?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div>
                        <h4>{selectedTechnician.name}</h4>
                        <p>{selectedTechnician.location?.address || "Address not available"}</p>
                        <p>{selectedTechnician.phone || "Phone not available"}</p>
                        <p>
                          {selectedTechnician.distanceKm !== null
                            ? `${selectedTechnician.distanceKm} km away`
                            : "Distance not available"}
                        </p>
                      </div>
                      {technicians[0]?._id === selectedTechnician._id ? (
                        <span className={styles.nearestBadge}>Nearest</span>
                      ) : null}
                    </div>
                    <button
                      className={styles.bookBtn}
                      onClick={handleBook}
                      disabled={bookingLoading}
                      type="button"
                    >
                      {bookingLoading ? "Booking..." : "Book This Provider"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
