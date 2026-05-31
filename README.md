# Saturn Nexus • Elegoo Saturn 4 Ultra Intelligent Dashboard

Saturn Nexus is a high-precision, low-latency, responsive web dashboard customized explicitly for real-time telemetry extraction and command execution on the **Elegoo Saturn 4 Ultra** resin 3D printer. This project is optimized to leverage the native **SDCP (Smart Device Control Protocol) V3.0.0** and high-definition **RTSP camera streams** to provide a seamless console-grade interface in your web browser.

---

## 🛠 Features

- **SDCP Integration**: Automated subscription to state indicators, file names, complete layer counts, exposure times, and system statuses over WebSocket `ws://<ip>:3030/websocket`.
- **High-Definition RTSP Feed Player**: Utilizes the custom integration of client-side `Streamedian` to render native low-latency `rtsp://<ip>/video` feeds inside standard HTML5 elements without heavy transcoding servers.
- **Dynamic Thermal Analysis**: Active tracking engine displaying real-time readings from enclosure sensors and resin vats/UV LED arrays represented via a smooth Recharts visualization area.
- **Command Broadcast Center**: Allows starting, pausing, and emergency-terminating print jobs instantly.
- **Secure Persistent Memory**: Saves your printer's connection parameters and stream proxies in client-side `localStorage` automatically, ensuring instant-on loads.
- **Sleek Cybernetic UI**: Built with a high-contrast dark visual theme, smooth typography, and elegant, purposeful physics-backed animations.

---

## 🔬 How It Works

### WebSocket Communication (SDCP V3.0.0)
The Saturn 4 Ultra operates a custom WebSocket protocol named **Smart Device Control Protocol (SDCP)**. 
1. **Handshake & Discovery**: On connection to port `3030`, the dashboard requests initial metrics by sending a `Cmd: 0` (Status Refresh) frame payload:
   ```json
   {
     "Id": "<uuid>",
     "Data": { "Cmd": 0 }
   }
   ```
2. **Telemetry Streaming**: The printer broadcast replies on the topic `sdcp/status/<MainboardID>` with comprehensive payloads enclosing layer counters, exposure times, temperatures, state conditions (Idle, Printing, Paused), and the file currently being processed.
3. **Control Messaging**: Client commands like Pause (`Cmd: 129`), Stop/Terminate (`Cmd: 130`), or Z-Axis Home (`Cmd: 132`) are pushed directly to the incoming subscription endpoint in real time.

### Low-Latency Inspection Feed
The Elegoo Saturn 4 Ultra exposes a native RTSP stream at `rtsp://<printer-ip>:554/video`. Browsers cannot decode RTSP natively without external helper setups. 

Saturn Nexus resolves this with direct custom support for **Streamedian HTML5 RTSP Player**:
- The dashboard dynamically injects the `streamedian.min.js` decoder directly into the document.
- It maps the source `rtsp://<printer-ip>/video` directly into an HTML5 `<video>` tag.
- It leverages a WebSocket translation gateway/proxy to packet-forward the video frame chunks over standard TCP websockets (e.g., `ws://<printer-ip>:8080/ws` or your local gateway proxy URL).

---

## 🚀 Setting Up Your Saturn 4 Ultra Dashboard

### Prerequisite Checklist
1. Your Elegoo Saturn 4 Ultra must be powered on and connected to the **same Local Area Network (LAN/Wi-Fi)** as your computer/browser running this dashboard.
2. Find your printer's IP address by tapping the WiFi icon on the printer's front panel screen.

---

### Step-by-Step Installation

#### 1. Setup the Streamedian Gateway (For RTSP Camera Feed)
Because browsers restrict direct raw TCP network connections for RTSP, a tiny proxy translator is recommended to convert RTSP data to browser-friendly WebSockets:
- You can run the **Streamedian proxy service** on any local machine (or Raspberry Pi) in your network.
- **Default Port**: Typically serves translation handles on port `8080` (e.g. `ws://192.168.1.100:8080/ws`).
- Enter this address into the **Streamedian Proxy (Optional)** input field on the dashboard's initialization page.

#### 2. Connect Your Dashboard
1. Open the **Saturn Nexus** browser applet.
2. Enter your printer's localized IPv4 address (e.g., `192.168.1.142`) in the main IP address input field.
3. (Optional) Provide your active camera proxy WebSocket URL. If not provided, it defaults to translating via your printer's local endpoint on bridge port `8080`.
4. Click the arrow button (or press `Enter`) to connect!

*Once connected, SDCP and RTSP sockets will synchronize status, showing print details, temperatures, layer progression, and live video.*

---

## 🛰 Core Commands & SDCP Reference

| Action | SDCP Cmd ID | Description |
| :--- | :--- | :--- |
| **Status Refresh** | `0` | Requests status block updates & MainboardID |
| **Start Print** | `128` | Initiates printing procedure from specified payload |
| **Pause Job** | `129` | Suspends UV exposure & retracts resin peel platform |
| **Stop Job (Kill)** | `130` | Direct emergency terminate command |
| **Resume Job** | `131` | Resumes active exposure cycle of unfinished layers |
| **Home Z-Axis** | `132` | Triggers Z-motor platform limits alignment |

---

## 💻 Tech Stack

- **Framework**: React 18 with Vite
- **Programming Language**: TypeScript (Type-safe schemas configuration)
- **Styling**: Tailwind CSS
- **Animations**: Motion (micro-interactive physics effects)
- **Data Visualization**: Recharts (with SVG gradients & tracking interpolation)
- **Icons**: Lucide Icons
- **RTSP Media**: Streamedian (HTML5 WebSocket player client)
