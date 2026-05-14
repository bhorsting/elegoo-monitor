/**
 * SDCP (Smart Device Control Protocol) Service for Saturn 4 Ultra
 */

export interface SaturnStatus {
  state: 'IDLE' | 'PRINTING' | 'PAUSED' | 'FINISH' | 'ERROR';
  filename?: string;
  currentLayer: number;
  totalLayers: number;
  progress: number;
  exposureTime: number;
  temperatures: {
    enclosure: number;
    resin: number;
  };
  mainboardId?: string;
}

export class SDCPService {
  private ws: WebSocket | null = null;
  private mainboardId: string | null = null;
  private onStatusUpdate: (status: Partial<SaturnStatus>) => void;
  private ip: string;

  constructor(ip: string, onStatusUpdate: (status: Partial<SaturnStatus>) => void) {
    this.ip = ip;
    this.onStatusUpdate = onStatusUpdate;
  }

  async connect() {
    const wsUrl = `ws://${this.ip}:3030/websocket`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('SDCP Connected');
        // Request initial status to get MainboardID
        this.sendCommand(0); // Cmd 0: Status Refresh
        resolve(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleMessage(payload);
        } catch (e) {
          console.error('Failed to parse SDCP message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('SDCP WebSocket Error:', err);
        reject(err);
      };

      this.ws.onclose = () => {
        console.log('SDCP Disconnected');
      };
    });
  }

  private handleMessage(payload: any) {
    // SDCP V3 often uses a structure like: { Topic: "...", Data: { Attributes: {...}, Status: {...} } }
    // Or it might be direct topic-based JSON
    
    if (payload.Data?.MainboardID) {
      this.mainboardId = payload.Data.MainboardID;
      this.onStatusUpdate({ mainboardId: this.mainboardId });
    }

    const status = payload.Data?.Status || payload.Data?.Attributes;
    if (status) {
      const updates: Partial<SaturnStatus> = {};
      
      if (status.State !== undefined) {
        const stateMap: Record<number, SaturnStatus['state']> = {
          0: 'IDLE',
          1: 'PRINTING',
          2: 'PAUSED',
          3: 'FINISH',
          4: 'ERROR'
        };
        updates.state = stateMap[status.State] || 'IDLE';
      }

      if (status.CurrentLayer !== undefined) updates.currentLayer = status.CurrentLayer;
      if (status.TotalLayer !== undefined) updates.totalLayers = status.TotalLayer;
      
      if (updates.currentLayer !== undefined && updates.totalLayers) {
        updates.progress = Math.round((updates.currentLayer / updates.totalLayers) * 100);
      }

      if (status.Filename) updates.filename = status.Filename;
      
      // Saturn 4 Ultra specific sensors
      updates.temperatures = {
        enclosure: status.ChamberTemp || 0,
        resin: status.ResinTemp || 0
      };

      this.onStatusUpdate(updates);
    }
  }

  sendCommand(cmd: number, data: any = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      Id: crypto.randomUUID(),
      Data: {
        Cmd: cmd,
        ...data
      }
    };

    this.ws.send(JSON.stringify(payload));
  }

  disconnect() {
    if (this.ws) this.ws.close();
  }
}
