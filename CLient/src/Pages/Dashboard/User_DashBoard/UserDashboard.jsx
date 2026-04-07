import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./UserDashboard.module.css";
import BookingModal from "../../../Components/BookingModal/BookingModal";
import BookingChat from "../../../Components/BookingChat/BookingChat";
import { getUserBookings, updateBookingStatus } from "../../../api/booking";
import { getCurrentUser, updateProfile } from "../../../api/auth";
import { getUnreadChatSummary } from "../../../api/chat";
import { connectChatSocket, disconnectChatSocket } from "../../../socket";
import { FiBell } from "react-icons/fi";

const services = [
  { icon: "Pl", title: "Plumbing", desc: "Fix leaks, pipes and fittings" },
  { icon: "El", title: "Electrical", desc: "Wiring, switches and faults" },
  { icon: "AC", title: "AC Repair", desc: "Service, gas fill and repairs" },
  { icon: "Ap", title: "Appliances", desc: "Fridge, washer and more" },
  { icon: "Ve", title: "Vehicle", desc: "Basic maintenance and repair" },
  { icon: "Cl", title: "Cleaning", desc: "Home and office cleaning" },
  { icon: "Pa", title: "Painting", desc: "Interior and exterior painting" },
  { icon: "Pe", title: "Pest Control", desc: "Safe pest treatment" }
];

const bookingFilters = ["all", "pending", "accepted", "completed", "cancelled"];

const formatBookingDateTime = (date, time) => {
  if (!date || !time) {
    return "Schedule not available";
  }

  const parsed = new Date(`${date}T${time}`);

  if (Number.isNaN(parsed.getTime())) {
    return `${date} at ${time}`;
  }

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

function UserDashboard() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const [user, setUser] = useState(storedUser);
  const [selectedService, setSelectedService] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [bookingActionId, setBookingActionId] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: storedUser?.name || "",
    phone: storedUser?.phone || "",
    secondaryPhone: storedUser?.secondaryPhone || "",
    location: {
      address: storedUser?.location?.address || "",
      coordinates: storedUser?.location?.coordinates || [0, 0]
    }
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState({
    totalUnreadMessages: 0,
    totalUnreadBookings: 0,
    bookings: []
  });
  const [chatSocket, setChatSocket] = useState(null);
  const bookingSectionRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const data = await getUserBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const syncUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setProfileForm({
        name: data.user.name || "",
        phone: data.user.phone || "",
        secondaryPhone: data.user.secondaryPhone || "",
        location: {
          address: data.user.location?.address || "",
          coordinates: data.user.location?.coordinates || [0, 0]
        }
      });
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileChange = (e) => {
    setProfileForm((current) => ({
      ...current,
      [e.target.name]: e.target.value
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

          setProfileForm((current) => ({
            ...current,
            location: {
              address,
              coordinates: [longitude, latitude]
            }
          }));
        } catch (err) {
          alert("Could not read your current address. Please try again.");
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

  const handleProfileSave = async () => {
    if (!profileForm.name.trim() || !profileForm.phone.trim()) {
      alert("Please enter your name and phone number");
      return;
    }

    if (
      !Array.isArray(profileForm.location.coordinates) ||
      profileForm.location.coordinates.length !== 2 ||
      profileForm.location.coordinates.every((value) => Number(value) === 0)
    ) {
      alert("Please detect your location before saving");
      return;
    }

    try {
      setProfileLoading(true);
      const data = await updateProfile(profileForm);
      setUser(data.user);
      setProfileForm({
        name: data.user.name || "",
        phone: data.user.phone || "",
        secondaryPhone: data.user.secondaryPhone || "",
        location: {
          address: data.user.location?.address || "",
          coordinates: data.user.location?.coordinates || [0, 0]
        }
      });
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("Profile updated successfully");
    } catch (err) {
      alert(err.message || err.error || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      setBookingActionId(bookingId);
      await updateBookingStatus(bookingId, "cancelled");
      await loadBookings();
      alert("Booking cancelled successfully");
    } catch (err) {
      alert(err.message || "Failed to cancel booking");
    } finally {
      setBookingActionId("");
    }
  };

  useEffect(() => {
    syncUser();
    loadBookings();
  }, []);

  useEffect(() => {
    const loadChatSummary = async () => {
      try {
        const data = await getUnreadChatSummary();
        setChatSummary(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadChatSummary();

    const token = localStorage.getItem("token");
    const socket = connectChatSocket(token);
    setChatSocket(socket);

    if (!socket) {
      return undefined;
    }

    const handleSummary = (summary) => {
      setChatSummary(summary);
    };

    socket.on("chat:summary", handleSummary);

    return () => {
      socket.off("chat:summary", handleSummary);
      disconnectChatSocket();
    };
  }, []);

  const unreadByBooking = useMemo(
    () =>
      (chatSummary.bookings || []).reduce((accumulator, item) => {
        accumulator[item.bookingId] = item.unreadCount;
        return accumulator;
      }, {}),
    [chatSummary.bookings]
  );

  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === activeFilter);
  }, [activeFilter, bookings]);

  const acceptedCount = bookings.filter((booking) => booking.status === "accepted").length;
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const completedCount = bookings.filter((booking) => booking.status === "completed").length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Welcome, {user?.name}!</h2>
          <p>Choose a service and book a nearby technician.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.notifyBtn}
            onClick={() => bookingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            type="button"
          >
            <FiBell />
            <span>Messages</span>
            {chatSummary.totalUnreadMessages > 0 ? (
              <span className={styles.notifyBadge}>{chatSummary.totalUnreadMessages}</span>
            ) : null}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </div>

      <div className={styles.noticeGrid}>
        <div className={styles.noticeCard}>
          <strong>{pendingCount}</strong>
          <span>Bookings waiting for technician response</span>
        </div>
        <div className={styles.noticeCard}>
          <strong>{acceptedCount}</strong>
          <span>Bookings accepted and moving forward</span>
        </div>
        <div className={styles.noticeCard}>
          <strong>{completedCount}</strong>
          <span>Services completed successfully</span>
        </div>
      </div>

      <div className={styles.serviceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Available Services</h3>
            <p>Pick the type of help you need and then choose a provider.</p>
          </div>
        </div>

        <div className={styles.grid}>
          {services.map((service) => (
            <div className={styles.card} key={service.title}>
              <div className={styles.icon}>{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
              <button
                className={styles.bookBtn}
                onClick={() => setSelectedService(service.title)}
                type="button"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.profileSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Your Profile</h3>
            <p>Update your phone and location so you can book services without errors.</p>
          </div>
        </div>

        <div className={styles.profileGrid}>
          <div className={styles.field}>
            <label htmlFor="profile-name">Name</label>
            <input id="profile-name" name="name" value={profileForm.name} onChange={handleProfileChange} placeholder="Your full name" />
          </div>
          <div className={styles.field}>
            <label htmlFor="profile-phone">Phone</label>
            <input id="profile-phone" name="phone" value={profileForm.phone} onChange={handleProfileChange} placeholder="Phone number" />
          </div>
          <div className={styles.field}>
            <label htmlFor="profile-secondary-phone">Secondary Phone</label>
            <input id="profile-secondary-phone" name="secondaryPhone" value={profileForm.secondaryPhone} onChange={handleProfileChange} placeholder="Optional alternate number" />
          </div>
        </div>

        <div className={styles.locationCard}>
          <div>
            <h4>Saved Location</h4>
            <p>{profileForm.location.address || "No location saved yet."}</p>
          </div>
          <button className={styles.secondaryBtn} onClick={handleDetectLocation} disabled={locLoading} type="button">
            {locLoading ? "Detecting..." : "Detect Location"}
          </button>
        </div>

        <div className={styles.profileActions}>
          <span className={styles.profileHint}>
            {user?.location?.address ? "Your current profile is saved and ready to use." : "Add location once and booking will use it automatically."}
          </span>
          <button className={styles.bookBtn} onClick={handleProfileSave} disabled={profileLoading} type="button">
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      <div className={styles.bookingSection} ref={bookingSectionRef}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Recent Bookings</h3>
            <p>Track service date, technician details and booking status.</p>
          </div>
          <button className={styles.refreshBtn} onClick={loadBookings} disabled={loadingBookings} type="button">
            {loadingBookings ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className={styles.filterRow}>
          {bookingFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {loadingBookings ? (
          <div className={styles.emptyState}>
            <p>Loading your bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No bookings found for this filter.</p>
          </div>
        ) : (
          <div className={styles.bookingList}>
            {filteredBookings.map((booking) => (
              <div className={styles.bookingCard} key={booking._id}>
                <div className={styles.bookingTop}>
                  <div className={styles.bookingMain}>
                    <h4>{booking.service}</h4>
                    <p>{booking.description || "No problem description added."}</p>
                    <div className={styles.metaLine}>{formatBookingDateTime(booking.date, booking.time)}</div>
                    <div className={styles.metaLine}>Address: {booking.location?.address || "Location not available"}</div>
                  </div>
                  <div className={styles.bookingMeta}>
                    <span className={`${styles.status} ${styles[`status_${booking.status}`]}`}>{booking.status}</span>
                    <span>Technician: {booking.technician?.name || "Not assigned"}</span>
                    <span>Phone: {booking.technician?.phone || "Not available"}</span>
                    <span>Alt Phone: {booking.technician?.secondaryPhone || "Not available"}</span>
                    <div className={styles.actionRow}>
                      {['pending', 'accepted'].includes(booking.status) ? (
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => handleCancelBooking(booking._id)}
                          disabled={bookingActionId === booking._id}
                        >
                          {bookingActionId === booking._id ? "Cancelling..." : "Cancel"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <BookingChat
                  bookingId={booking._id}
                  viewerRole="user"
                  title={`Chat with ${booking.technician?.name || "technician"}`}
                  socket={chatSocket}
                  unreadCount={unreadByBooking[booking._id] || 0}
                  onSummaryChange={setChatSummary}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedService ? (
        <BookingModal service={selectedService} onClose={() => setSelectedService("")} onBooked={loadBookings} />
      ) : null}
    </div>
  );
}

export default UserDashboard;
