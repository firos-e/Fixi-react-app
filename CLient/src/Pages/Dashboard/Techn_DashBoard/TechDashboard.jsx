import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./TechDashboard.module.css";
import { getTechBookings, updateBookingStatus } from "../../../api/booking";
import { getCurrentUser, updateProfile } from "../../../api/auth";
import BookingChat from "../../../Components/BookingChat/BookingChat";
import { getUnreadChatSummary } from "../../../api/chat";
import { connectChatSocket, disconnectChatSocket } from "../../../socket";
import { FiBell } from "react-icons/fi";

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

const jobFilters = ["all", "pending", "accepted", "completed", "cancelled"];

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

function TechDashboard() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const [user, setUser] = useState(storedUser);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [statusAction, setStatusAction] = useState({ bookingId: "", status: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState({
    totalUnreadMessages: 0,
    totalUnreadBookings: 0,
    bookings: []
  });
  const [chatSocket, setChatSocket] = useState(null);
  const jobSectionRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    name: storedUser?.name || "",
    phone: storedUser?.phone || "",
    secondaryPhone: storedUser?.secondaryPhone || "",
    services: storedUser?.services || [],
    location: {
      address: storedUser?.location?.address || "",
      coordinates: storedUser?.location?.coordinates || [0, 0]
    }
  });

  const syncUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setProfileForm({
        name: data.user.name || "",
        phone: data.user.phone || "",
        secondaryPhone: data.user.secondaryPhone || "",
        services: data.user.services || [],
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

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getTechBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleProfileChange = (e) => {
    setProfileForm((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }));
  };

  const toggleService = (service) => {
    setProfileForm((current) => ({
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

    if (profileForm.services.length === 0) {
      alert("Please choose at least one service");
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
        services: data.user.services || [],
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

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      setStatusAction({ bookingId, status });
      await updateBookingStatus(bookingId, status);
      await loadBookings();
      alert(`Booking ${status} successfully`);
    } catch (err) {
      alert(err.message || "Failed to update booking status");
    } finally {
      setStatusAction({ bookingId: "", status: "" });
    }
  };

  const totalJobs = bookings.length;
  const completedJobs = bookings.filter((booking) => booking.status === "completed").length;
  const acceptedJobs = bookings.filter((booking) => booking.status === "accepted").length;
  const pendingJobs = bookings.filter((booking) => booking.status === "pending").length;

  const stats = [
    { icon: "Jobs", label: "Total Jobs", value: String(totalJobs) },
    { icon: "Done", label: "Completed", value: String(completedJobs) },
    { icon: "Live", label: "Accepted", value: String(acceptedJobs) },
    { icon: "Wait", label: "Pending", value: String(pendingJobs) }
  ];

  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === activeFilter);
  }, [activeFilter, bookings]);

  const unreadByBooking = useMemo(
    () =>
      (chatSummary.bookings || []).reduce((accumulator, item) => {
        accumulator[item.bookingId] = item.unreadCount;
        return accumulator;
      }, {}),
    [chatSummary.bookings]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Welcome, {user?.name}!</h2>
          <p>Here is your live booking overview.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.notifyBtn}
            onClick={() => jobSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
          <strong>{pendingJobs}</strong>
          <span>New booking requests are waiting for your response</span>
        </div>
        <div className={styles.noticeCard}>
          <strong>{acceptedJobs}</strong>
          <span>Accepted jobs are in progress right now</span>
        </div>
        <div className={styles.noticeCard}>
          <strong>{completedJobs}</strong>
          <span>Completed jobs are ready for your record</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div className={styles.statCard} key={stat.label}>
            <div className={styles.statIcon}>{stat.icon}</div>
            <div>
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.profileSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Technician Profile</h3>
            <p>Set your services and location so only the right customers can find you.</p>
          </div>
        </div>

        <div className={styles.profileGrid}>
          <div className={styles.field}>
            <label htmlFor="tech-name">Name</label>
            <input id="tech-name" name="name" value={profileForm.name} onChange={handleProfileChange} />
          </div>
          <div className={styles.field}>
            <label htmlFor="tech-phone">Phone</label>
            <input id="tech-phone" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
          </div>
          <div className={styles.field}>
            <label htmlFor="tech-secondary-phone">Secondary Phone</label>
            <input id="tech-secondary-phone" name="secondaryPhone" value={profileForm.secondaryPhone} onChange={handleProfileChange} />
          </div>
        </div>

        <div className={styles.serviceBox}>
          <p className={styles.serviceLabel}>Services you provide</p>
          <div className={styles.serviceGrid}>
            {serviceOptions.map((service) => (
              <button
                key={service}
                type="button"
                className={`${styles.serviceBtn} ${profileForm.services.includes(service) ? styles.serviceActive : ""}`}
                onClick={() => toggleService(service)}
              >
                {service}
              </button>
            ))}
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
            {profileForm.services.length > 0
              ? `Visible for: ${profileForm.services.join(", ")}`
              : "Choose services to appear in matching booking searches."}
          </span>
          <button className={styles.saveBtn} onClick={handleProfileSave} disabled={profileLoading} type="button">
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      <div className={styles.jobSection} ref={jobSectionRef}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Recent Jobs</h3>
            <p>Respond to incoming bookings and keep each job updated.</p>
          </div>
          <button className={styles.secondaryBtn} onClick={loadBookings} type="button">
            Refresh Jobs
          </button>
        </div>

        <div className={styles.filterRow}>
          {jobFilters.map((filter) => (
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

        {loading ? (
          <div className={styles.emptyState}>
            <p>Loading your jobs...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No jobs found for this filter.</p>
          </div>
        ) : (
          <div className={styles.jobList}>
            {filteredBookings.map((booking) => (
              <div className={styles.jobCard} key={booking._id}>
                <div className={styles.jobTop}>
                  <div className={styles.jobMain}>
                    <h4>{booking.service}</h4>
                    <p>{booking.description || "No problem description provided."}</p>
                    <div className={styles.metaLine}>{formatBookingDateTime(booking.date, booking.time)}</div>
                    <div className={styles.metaLine}>{booking.location?.address || "Location not available"}</div>
                  </div>
                  <div className={styles.jobMeta}>
                    <span className={`${styles.status} ${styles[`status_${booking.status}`]}`}>{booking.status}</span>
                    <span>Customer: {booking.user?.name || "Unknown customer"}</span>
                    <span>Phone: {booking.user?.phone || "Not available"}</span>
                    <span>Alt Phone: {booking.user?.secondaryPhone || "Not available"}</span>
                    <div className={styles.actionRow}>
                      {booking.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className={styles.acceptBtn}
                            onClick={() => handleStatusUpdate(booking._id, "accepted")}
                            disabled={statusAction.bookingId === booking._id}
                          >
                            {statusAction.bookingId === booking._id && statusAction.status === "accepted" ? "Accepting..." : "Accept"}
                          </button>
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => handleStatusUpdate(booking._id, "cancelled")}
                            disabled={statusAction.bookingId === booking._id}
                          >
                            {statusAction.bookingId === booking._id && statusAction.status === "cancelled" ? "Rejecting..." : "Reject"}
                          </button>
                        </>
                      ) : null}

                      {booking.status === "accepted" ? (
                        <>
                          <button
                            type="button"
                            className={styles.completeBtn}
                            onClick={() => handleStatusUpdate(booking._id, "completed")}
                            disabled={statusAction.bookingId === booking._id}
                          >
                            {statusAction.bookingId === booking._id && statusAction.status === "completed" ? "Completing..." : "Mark Completed"}
                          </button>
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => handleStatusUpdate(booking._id, "cancelled")}
                            disabled={statusAction.bookingId === booking._id}
                          >
                            {statusAction.bookingId === booking._id && statusAction.status === "cancelled" ? "Cancelling..." : "Cancel"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <BookingChat
                  bookingId={booking._id}
                  viewerRole="technician"
                  title={`Chat with ${booking.user?.name || "customer"}`}
                  socket={chatSocket}
                  unreadCount={unreadByBooking[booking._id] || 0}
                  onSummaryChange={setChatSummary}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TechDashboard;
