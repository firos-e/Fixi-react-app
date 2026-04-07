import React, { useEffect, useMemo, useState } from "react";
import {
  getBookingMessages,
  markBookingMessagesRead,
  sendBookingMessage
} from "../../api/chat";
import styles from "./BookingChat.module.css";

const formatTime = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
};

function BookingChat({ bookingId, viewerRole, title, socket, unreadCount = 0, onSummaryChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const upsertMessage = (incomingMessage) => {
    setMessages((current) => {
      const exists = current.some((message) => message._id === incomingMessage._id);
      return exists ? current : [...current, incomingMessage];
    });
  };

  const loadMessages = async (showLoader = false) => {
    try {
      if (showLoader) {
        setChatLoading(true);
      }

      setChatError("");
      const data = await getBookingMessages(bookingId);
      setMessages(data.messages || []);
    } catch (err) {
      setChatError(err.message || "Failed to load chat");
    } finally {
      if (showLoader) {
        setChatLoading(false);
      }
    }
  };

  const markAsRead = async () => {
    if (markingRead) {
      return;
    }

    try {
      setMarkingRead(true);
      const data = await markBookingMessagesRead(bookingId);
      if (onSummaryChange) {
        onSummaryChange(data.summary);
      }
    } catch (err) {
      setChatError(err.message || "Failed to update read status");
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    loadMessages(true);
    markAsRead();

    return undefined;
  }, [bookingId, isOpen]);

  useEffect(() => {
    if (!socket || !isOpen) {
      return undefined;
    }

    const handleIncomingMessage = (payload) => {
      if (payload.bookingId !== bookingId) {
        return;
      }

      upsertMessage(payload.chatMessage);

      if (payload.chatMessage.senderRole !== viewerRole) {
        markAsRead();
      }
    };

    socket.emit("chat:join-booking", bookingId);
    socket.on("chat:message", handleIncomingMessage);

    return () => {
      socket.emit("chat:leave-booking", bookingId);
      socket.off("chat:message", handleIncomingMessage);
    };
  }, [bookingId, isOpen, socket, viewerRole]);

  const sortedMessages = useMemo(
    () => [...messages].sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)),
    [messages]
  );

  const handleSend = async () => {
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    try {
      setSending(true);
      setChatError("");
      const data = await sendBookingMessage(bookingId, trimmed);
      upsertMessage(data.chatMessage);
      setDraft("");
    } catch (err) {
      setChatError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.chatShell}>
      <div className={styles.chatHeader}>
        <div>
          <strong>{title || "Booking Chat"}</strong>
          <span>Talk directly inside this booking.</span>
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsOpen((current) => !current)}
        >
          {!isOpen && unreadCount > 0 ? (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          ) : null}
          {isOpen ? "Hide Chat" : "Open Chat"}
        </button>
      </div>

      {isOpen ? (
        <div className={styles.chatPanel}>
          <div className={styles.toolbar}>
            <span className={styles.toolbarText}>Messages update automatically while this chat is open.</span>
            <button type="button" className={styles.refreshBtn} onClick={() => loadMessages(true)}>
              Refresh
            </button>
          </div>

          {chatLoading ? (
            <div className={styles.emptyState}>Loading messages...</div>
          ) : sortedMessages.length === 0 ? (
            <div className={styles.emptyState}>No messages yet. Start the conversation here.</div>
          ) : (
            <div className={styles.messageList}>
              {sortedMessages.map((message) => {
                const isOwn = message.senderRole === viewerRole;

                return (
                  <div
                    key={message._id}
                    className={`${styles.messageItem} ${isOwn ? styles.messageOwn : styles.messageOther}`}
                  >
                    <div className={styles.messageMeta}>
                      <span>{isOwn ? "You" : message.senderRole === "technician" ? "Technician" : "Customer"}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p>{message.text}</p>
                  </div>
                );
              })}
            </div>
          )}

          {chatError ? <div className={styles.errorText}>{chatError}</div> : null}

          <div className={styles.composeRow}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message"
              rows={3}
            />
            <button type="button" className={styles.sendBtn} onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BookingChat;
