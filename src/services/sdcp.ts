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
    // Handle both wrapped "Data" structure and flat top-level structures
    const data = payload.Data || payload;
    
    if (data.MainboardID) {
      this.mainboardId = data.MainboardID;
      this.onStatusUpdate({ mainboardId: this.mainboardId });
    }

    const statusRoot = data.Status || data.Attributes;
    if (statusRoot) {
      const updates: Partial<SaturnStatus> = {};
      
      // PrintInfo has more specific details on S4 Ultra
      const printInfo = statusRoot.PrintInfo;
      // S4U uses Status inside PrintInfo for active print state
      const rawState = printInfo?.Status ?? statusRoot.State;

      if (rawState !== undefined) {
        const stateMap: Record<number, SaturnStatus['state']> = {
          0: 'IDLE',
          1: 'PRINTING',
          2: 'PRINTING', // S4U uses 2 for active printing
          3: 'PAUSED',
          4: 'FINISH',
          5: 'ERROR'
        };
        updates.state = stateMap[rawState] || 'IDLE';
      }

      // Layer info can be in statusRoot or statusRoot.PrintInfo
      const currentLayer = printInfo?.CurrentLayer ?? statusRoot.CurrentLayer;
      const totalLayers = printInfo?.TotalLayer ?? statusRoot.TotalLayer;

      if (currentLayer !== undefined) updates.currentLayer = currentLayer;
      if (totalLayers !== undefined) updates.totalLayers = totalLayers;
      
      if (updates.currentLayer !== undefined && updates.totalLayers) {
        updates.progress = Math.round((updates.currentLayer / updates.totalLayers) * 100);
      }

      const filename = printInfo?.Filename ?? statusRoot.Filename;
      if (filename) updates.filename = filename;
      
      // Temperature info fallback (UV LED temp is a good proxy if ResinTemp is missing)
      updates.temperatures = {
        enclosure: statusRoot.ChamberTemp || 0,
        resin: Math.round((statusRoot.ResinTemp || statusRoot.TempOfUVLED || 0) * 10) / 10
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
