import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../utils/jwt';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  room?: string;
  lastPing?: number;
  isAlive?: boolean;
}

interface WSMessage {
  type: string;
  id?: string;
  timestamp?: number;
  payload?: any;
}

export class SignalingServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Set<ExtendedWebSocket>> = new Map();
  private roomLastActivity: Map<string, number> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private roomCleanupInterval: NodeJS.Timeout | null = null;
  private readonly ROOM_TIMEOUT = 10 * 60 * 1000; // 10分钟

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupServer();
    this.startPingInterval();
    // this.startRoomCleanup(); // Room cleanup happens in leaveRoom
  }

  private setupServer() {
    this.wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private handleConnection(ws: ExtendedWebSocket, req: IncomingMessage) {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const room = url.searchParams.get('room') || 'default';
    const token = url.searchParams.get('token');

    // 可选认证
    if (token) {
      try {
        const payload = verifyToken(token);
        ws.userId = payload.id;
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    }

    // 认证从请求头获取（生产环境推荐）
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        ws.userId = payload.id;
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    }

    ws.room = room;
    ws.isAlive = true;
    ws.lastPing = Date.now();

    // 加入房间
    this.joinRoom(ws, room);

    console.log(`Client connected to room: ${room}, userId: ${ws.userId || 'guest'}`);

    // 发送欢迎消息
    this.sendMessage(ws, {
      type: 'notification',
      payload: {
        level: 'info',
        title: '连接成功',
        message: `已加入房间：${room}`,
      },
    });

    // 消息处理
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Pong 响应
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });

    // 连接关闭
    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Client disconnected from room: ${room}, code: ${code}, reason: ${reason.toString()}`);
      this.leaveRoom(ws, room);
    });

    // 错误处理
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(ws: ExtendedWebSocket, data: Buffer) {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      // 心跳消息
      if (message.type === 'ping') {
        ws.lastPing = Date.now();
        this.sendMessage(ws, {
          type: 'pong',
          payload: {
            timestamp: message.payload?.timestamp || message.timestamp,
            serverTime: Date.now(),
          },
        });
        return;
      }

      // 转发给同房间的其他客户端
      if (ws.room) {
        this.broadcastToRoom(ws.room, data, ws);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      this.sendMessage(ws, {
        type: 'error',
        payload: {
          code: 'INVALID_MESSAGE',
          message: '消息格式错误',
        },
      });
    }
  }

  private joinRoom(ws: ExtendedWebSocket, room: string) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
    
    // 更新房间活动时间
    this.roomLastActivity.set(room, Date.now());
  }

  private leaveRoom(ws: ExtendedWebSocket, room: string) {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
        this.roomLastActivity.delete(room);
        console.log(`Room ${room} deleted (no clients)`);
      }
    }
  }

  private broadcastToRoom(room: string, data: Buffer, sender: ExtendedWebSocket) {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      // 更新房间活动时间
      this.roomLastActivity.set(room, Date.now());
      
      roomClients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  }

  private sendMessage(ws: ExtendedWebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private startPingInterval() {
    // 每30秒检查一次连接状态
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const extWs = ws as ExtendedWebSocket;

        // 检查是否超时（超过60秒没有心跳）- 给客户端足够的容错时间
        if (extWs.lastPing && Date.now() - extWs.lastPing > 60000) {
          console.log('Client ping timeout, terminating connection');
          extWs.terminate();
          return;
        }

        if (!extWs.isAlive) {
          console.log('Client not alive, terminating connection');
          extWs.terminate();
          return;
        }

        extWs.isAlive = false;
        extWs.ping();
      });
    }, 30000);
  }

  private startRoomCleanup() {
    // 每分钟检查一次房间超时
    this.roomCleanupInterval = setInterval(() => {
      const now = Date.now();
      
      this.roomLastActivity.forEach((lastActivity, room) => {
        if (now - lastActivity > this.ROOM_TIMEOUT) {
          console.log(`Room ${room} timeout (10min inactive), cleaning up...`);
          
          // 通知房间内所有客户端
          const roomClients = this.rooms.get(room);
          if (roomClients) {
            roomClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                this.sendMessage(client, {
                  type: 'error',
                  payload: {
                    code: 'ROOM_TIMEOUT',
                    message: '房间已过期（10分钟无活动）',
                  },
                });
                client.close(1000, 'Room timeout');
              }
            });
          }
          
          // 删除房间
          this.rooms.delete(room);
          this.roomLastActivity.delete(room);
        }
      });
    }, 60000); // 每分钟检查一次
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.roomCleanupInterval) {
      clearInterval(this.roomCleanupInterval);
      this.roomCleanupInterval = null;
    }
  }

  public getRoomInfo(room: string) {
    const clients = this.rooms.get(room);
    return {
      room,
      clientCount: clients ? clients.size : 0,
      clients: clients
        ? Array.from(clients).map((ws) => ({
            userId: ws.userId || 'guest',
            connected: ws.readyState === WebSocket.OPEN,
          }))
        : [],
    };
  }
}

