/**
 * Moonraker API Service for Klipper-based 3D Printers (like Elegoo Neptune 4)
 */

export interface PrinterStatus {
  state: 'ready' | 'printing' | 'paused' | 'error' | 'disconnected';
  filename?: string;
  progress: number;
  timeRemaining?: number;
  temperatures: {
    tool: { current: number; target: number };
    bed: { current: number; target: number };
  };
  toolhead: {
    position: [number, number, number];
  };
}

export class MoonrakerService {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private onStatusUpdate: (status: Partial<PrinterStatus>) => void;

  constructor(ip: string, onStatusUpdate: (status: Partial<PrinterStatus>) => void) {
    this.baseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
    this.onStatusUpdate = onStatusUpdate;
  }

  async connect() {
    try {
      const response = await fetch(`${this.baseUrl}/printer/info`);
      if (!response.ok) throw new Error('Failed to connect to printer');
      
      // Start WebSocket for real-time updates
      this.initWebSocket();
      
      // Initial fetch of state
      await this.refreshStatus();
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  private initWebSocket() {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/websocket';
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWsMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleWsMessage(data: any) {
    // Moonraker notifies via 'notify_status_update'
    if (data.method === 'notify_status_update') {
      const params = data.params[0];
      const updates: Partial<PrinterStatus> = {};

      if (params.extruder) {
        updates.temperatures = {
          ...updates.temperatures,
          tool: {
            current: params.extruder.temperature,
            target: params.extruder.target
          }
        } as any;
      }
      
      if (params.heater_bed) {
         updates.temperatures = {
          ...updates.temperatures,
          bed: {
            current: params.heater_bed.temperature,
            target: params.heater_bed.target
          }
        } as any;
      }

      if (params.display_status) {
        updates.progress = Math.round(params.display_status.progress * 100);
      }

      this.onStatusUpdate(updates);
    }
  }

  async refreshStatus() {
    const response = await fetch(`${this.baseUrl}/printer/objects/query?print_stats&toolhead&extruder&heater_bed&display_status`);
    const data = await response.json();
    const status = data.result.status;

    this.onStatusUpdate({
      state: status.print_stats.state,
      filename: status.print_stats.filename,
      progress: Math.round(status.display_status.progress * 100),
      timeRemaining: status.print_stats.print_duration, // Approximation
      temperatures: {
        tool: { current: status.extruder.temperature, target: status.extruder.target },
        bed: { current: status.heater_bed.temperature, target: status.heater_bed.target }
      },
      toolhead: {
        position: status.toolhead.position
      }
    });
  }

  async sendCommand(command: string) {
    await fetch(`${this.baseUrl}/printer/gcode/script?script=${encodeURIComponent(command)}`, {
      method: 'POST'
    });
  }

  disconnect() {
    if (this.ws) this.ws.close();
  }
}
