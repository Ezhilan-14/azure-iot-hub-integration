import os
import json
import threading
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS
from azure.eventhub import EventHubConsumerClient

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
        ]
    }
})

# Use a newly rotated Azure key here.
CONNECTION_STRING = os.getenv("AZURE_EVENTHUB_CONNECTION_STRING")

if not CONNECTION_STRING:
    raise RuntimeError(
        "AZURE_EVENTHUB_CONNECTION_STRING is not configured."
    )

CONSUMER_GROUP = "$default"

latest = {
    "ascii_values": None,
    "message": "Waiting for Azure telemetry...",
    "timestamp": None,
}
data_lock = threading.Lock()


def decode_message(raw):
    text = raw.decode("utf-8", errors="replace") if isinstance(raw, bytes) else str(raw)
    text = text.strip()

    # JSON ASCII array: [72,101,108,108,111] -> Hello
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list) and all(
            isinstance(x, int) and 0 <= x <= 127 for x in parsed
        ):
            return "".join(chr(x) for x in parsed)
    except (json.JSONDecodeError, TypeError):
        pass

    # Comma-separated ASCII: 72,101,108,108,111 -> Hello
    parts = text.split(",")
    if len(parts) > 1:
        try:
            codes = [int(x.strip()) for x in parts]
            if all(0 <= x <= 127 for x in codes):
                return "".join(chr(x) for x in codes)
        except ValueError:
            pass

    return text


def receive_events():
    client = EventHubConsumerClient.from_connection_string(
        conn_str=CONNECTION_STRING,
        consumer_group=CONSUMER_GROUP,
    )

    def on_event(partition_context, event):
        if event is None:
            return

        raw = event.body_as_str(encoding="UTF-8")
        message = decode_message(raw)

        ascii_values = None

        # Handle JSON arrays of ASCII values.
        try:
            parsed = json.loads(raw)

            if isinstance(parsed, list) and all(
                isinstance(x, int) and 0 <= x <= 127
                for x in parsed
            ):
                ascii_values = parsed

        except (json.JSONDecodeError, TypeError):
            pass

        # Handle comma-separated ASCII values.
        if ascii_values is None:
            parts = raw.strip().split(",")

            if len(parts) > 1:
                try:
                    codes = [int(x.strip()) for x in parts]

                    if all(0 <= x <= 127 for x in codes):
                        ascii_values = codes

                except ValueError:
                    pass

        timestamp = (
            event.enqueued_time.isoformat()
            if event.enqueued_time
            else datetime.now(timezone.utc).isoformat()
        )

        with data_lock:
            latest["ascii_values"] = ascii_values
            latest["message"] = message
            latest["timestamp"] = timestamp

        print("Received:", message, flush=True)

    try:
        print("Connecting to Azure Event Hubs...", flush=True)

        with client:
            client.receive(
                on_event=on_event,
                starting_position="@latest",
            )

    except Exception as exc:
        print(f"Azure receiver error: {exc}", flush=True)


@app.route("/api/latest", methods=["GET"])
def get_latest():
    with data_lock:
        return jsonify(latest.copy())

@app.route("/api/test-ascii", methods=["GET"])
def test_ascii():
    raw = "72,101,108,108,111"
    return jsonify({
        "ascii_values": [72, 101, 108, 108, 111],
        "message": decode_message(raw),
        "test": True
    })
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    receiver_thread = threading.Thread(
        target=receive_events,
        daemon=True,
    )
    receiver_thread.start()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
    )
