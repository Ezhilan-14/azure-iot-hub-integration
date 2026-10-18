import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000/api/latest";

export default function AzureWeb() {
  const [message, setMessage] = useState("Waiting for telemetry...");
  const [asciiValues, setAsciiValues] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [status, setStatus] = useState("CONNECTING");

  useEffect(() => {
    let active = true;

    async function fetchTelemetry() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        if (active) {
          setMessage(data.message ?? "");
          setAsciiValues(data.ascii_values ?? null);
          setTimestamp(data.timestamp ?? null);
          setStatus("CONNECTED");
        }
      } catch (error) {
        if (active) {
          setStatus("DISCONNECTED");
        }
      }
    }

    fetchTelemetry();

    const interval = setInterval(fetchTelemetry, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const statusColor =
    status === "CONNECTED"
      ? "#4ade80"
      : status === "CONNECTING"
      ? "#facc15"
      : "#fb7185";

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#080808",
      color: "#f5f5f5",
      fontFamily: "Consolas, monospace",
      padding: "40px 20px",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: "1000px",
      margin: "0 auto",
    },
    title: {
      fontSize: "clamp(30px, 5vw, 46px)",
      marginBottom: "8px",
    },
    subtitle: {
      color: "#94a3b8",
      marginBottom: "30px",
    },
    panel: {
      background: "#111111",
      border: "1px solid #303030",
      borderRadius: "14px",
      padding: "26px",
      marginBottom: "20px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    card: {
      background: "#151515",
      border: "1px solid #303030",
      borderRadius: "10px",
      padding: "20px",
      minWidth: 0,
      overflowWrap: "anywhere",
    },
    label: {
      color: "#94a3b8",
      fontSize: "12px",
      letterSpacing: "1.5px",
      marginBottom: "12px",
      textTransform: "uppercase",
    },
    value: {
      fontSize: "18px",
      fontWeight: "bold",
      overflowWrap: "anywhere",
    },
    divider: {
      borderTop: "1px solid #303030",
      margin: "22px 0",
    },
    message: {
      fontSize: "22px",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      color: "#ffffff",
      margin: 0,
    },
    footer: {
      color: "#94a3b8",
      textAlign: "center",
      fontSize: "12px",
      marginTop: "24px",
    },
  };
  async function testAsciiConversion() {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/test-ascii"
      );
  
      if (!response.ok) {
        throw new Error("ASCII test failed");
      }
  
      const data = await response.json();
  
      setAsciiValues(data.ascii_values);
      setMessage(data.message);
      setStatus("CONNECTED");
    } catch (error) {
      console.error(error);
      alert("Could not run the ASCII test. Check your backend.");
    }
  }
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header>
          <h1 style={styles.title}>Azure IoT Hub Dashboard</h1>
          <p style={styles.subtitle}>
            Live telemetry monitoring and ASCII signal conversion
          </p>
        </header>

        <section style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Student Name</div>
            <div style={styles.value}>EZHILAN P V</div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Roll Number</div>
            <div style={styles.value}>24EIR028</div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Connection Status</div>
            <div style={{ ...styles.value, color: statusColor }}>
              ● {status}
            </div>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.label}>Received ASCII Values</div>
          <button
            onClick={testAsciiConversion}
            style={{
              padding: "10px 16px",
              marginBottom: "16px",
              background: "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Test ASCII Conversion
          </button>
          <p style={styles.message}>
            {asciiValues !== null
              ? asciiValues.join(", ")
              : "No ASCII array received"}
          </p>

          <div style={styles.divider} />

          <div style={styles.label}>Converted String</div>

          <p style={styles.message}>{message}</p>

          <div style={styles.divider} />

          <div style={styles.label}>Last Event Timestamp</div>

          <p style={{ ...styles.value, color: "#93c5fd" }}>
            {timestamp
              ? new Date(timestamp).toLocaleString()
              : "No events received"}
          </p>
        </section>

        <footer style={styles.footer}>
          Azure IoT Hub → Event Hubs → Flask Backend → React Dashboard
          <br />
          Automatically refreshed every second
        </footer>
      </div>
    </main>
  );
}