# WebSocket API 规范

> 文档版本：1.1.0  
> 最后更新：2025-10-31  
> 负责人：后端架构师

---

## 1. 连接管理

### 1.1 连接地址

| 环境 | WebSocket URL | 说明 |
|------|--------------|------|
| 生产环境 | `wss://api.serial.app/ws/signal` | 使用 WSS（加密） |
| 开发环境 | `ws://localhost:3001/ws/signal` | 使用 WS（非加密） |

### 1.2 连接参数

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `room` | string | 否 | 房间/会话标识，用于隔离信令通道，未提供则使用 `default` |
| `token` | string | 否 | JWT Token（开发环境可省略，生产环境建议在 Header 中传递） |

**连接示例**：
```javascript
// 开发环境
const ws = new WebSocket('ws://localhost:3001/ws/signal?room=demo')

// 生产环境（带认证）
const ws = new WebSocket('wss://api.serial.app/ws/signal?room=demo', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
})
```

### 1.3 认证机制

**生产环境**：
- 使用 HTTP Header `Authorization: Bearer <token>` 传递 JWT Token
- 服务端验证 Token 有效性
- 无效 Token 立即关闭连接，返回状态码 `1008`（Policy Violation）

**开发环境**：
- 可选认证（MVP 阶段）
- 查询参数 `token` 或 Header 认证均可

### 1.4 连接状态

| 状态码 | 说明 | 处理建议 |
|--------|------|---------|
| `1000` | 正常关闭 | 客户端主动关闭，无需重连 |
| `1001` | 服务端关闭或刷新 | 需要重连 |
| `1006` | 异常关闭 | 网络问题，需要重连 |
| `1008` | 认证失败 | 需要重新登录获取新 Token |
| `1011` | 服务器错误 | 等待后重连 |

---

## 2. 消息格式规范

### 2.1 消息类型

所有消息使用 JSON 格式，UTF-8 编码。

**标准消息结构**：
```typescript
interface BaseMessage {
  type: string          // 消息类型
  id?: string          // 消息 ID（可选，用于请求-响应匹配）
  timestamp?: number    // 时间戳（毫秒）
  payload?: any        // 消息负载
}
```

### 2.2 信令消息（WebRTC）

用于 WebRTC 连接建立的信令交换。

**消息类型**：
- `offer`：WebRTC Offer
- `answer`：WebRTC Answer
- `candidate`：ICE 候选
- `candidate_end`：ICE 候选收集完成

**消息定义**：

```typescript
// Offer 消息
interface OfferMessage extends BaseMessage {
  type: 'offer'
  payload: {
    sdp: RTCSessionDescriptionInit
    from: string  // 发送者用户 ID
  }
}

// Answer 消息
interface AnswerMessage extends BaseMessage {
  type: 'answer'
  payload: {
    sdp: RTCSessionDescriptionInit
    from: string
  }
}

// ICE Candidate 消息
interface CandidateMessage extends BaseMessage {
  type: 'candidate'
  payload: {
    candidate: RTCIceCandidateInit
    from: string
  }
}

// ICE Candidate 完成
interface CandidateEndMessage extends BaseMessage {
  type: 'candidate_end'
  payload: {
    from: string
  }
}
```

**消息示例**：

```json
// Offer
{
  "type": "offer",
  "id": "msg-123",
  "timestamp": 1698742800000,
  "payload": {
    "sdp": {
      "type": "offer",
      "sdp": "v=0\r\no=- 123456789 123456789 IN IP4 0.0.0.0\r\n..."
    },
    "from": "550e8400-e29b-41d4-a716-446655440000"
  }
}

// ICE Candidate
{
  "type": "candidate",
  "id": "msg-124",
  "timestamp": 1698742801000,
  "payload": {
    "candidate": {
      "candidate": "candidate:842163049 1 udp 1677729535 192.168.1.100 54321 typ srflx raddr 192.168.1.100 rport 54321",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    },
    "from": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2.3 会话事件消息

用于会话管理和数据同步。

**消息类型**：
- `session_join`：用户加入会话
- `session_leave`：用户离开会话
- `control_request`：申请控制权
- `control_grant`：授予控制权
- `control_revoke`：收回控制权
- `data`：串口数据（WebSocket 中转模式）
- `state_sync`：状态同步

**消息定义**：

```typescript
// 用户加入会话
interface SessionJoinMessage extends BaseMessage {
  type: 'session_join'
  payload: {
    userId: string
    nickname: string
    role: 'owner' | 'guest'
  }
}

// 用户离开会话
interface SessionLeaveMessage extends BaseMessage {
  type: 'session_leave'
  payload: {
    userId: string
    reason?: string  // 'disconnect', 'kicked', 'timeout'
  }
}

// 控制权申请
interface ControlRequestMessage extends BaseMessage {
  type: 'control_request'
  payload: {
    userId: string
    requestId: string
  }
}

// 控制权授予
interface ControlGrantMessage extends BaseMessage {
  type: 'control_grant'
  payload: {
    userId: string
    grantedBy: string
  }
}

// 串口数据（WebSocket 中转）
interface DataMessage extends BaseMessage {
  type: 'data'
  payload: {
    data: string           // 数据内容
    direction: 'tx' | 'rx' // 方向：发送/接收
    encoding: string      // 编码格式
    timestamp: number     // 数据时间戳
  }
}

// 状态同步
interface StateSyncMessage extends BaseMessage {
  type: 'state_sync'
  payload: {
    controlState: 'owner_hold' | 'guest_hold' | 'queued' | 'none'
    connected: boolean
    config?: SerialConfig
  }
}
```

**消息示例**：

```json
// 用户加入
{
  "type": "session_join",
  "timestamp": 1698742800000,
  "payload": {
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "nickname": "Guest User",
    "role": "guest"
  }
}

// 串口数据
{
  "type": "data",
  "timestamp": 1698742801000,
  "payload": {
    "data": "Hello World\r\n",
    "direction": "rx",
    "encoding": "utf-8",
    "timestamp": 1698742801000
  }
}

// 控制权授予
{
  "type": "control_grant",
  "timestamp": 1698742802000,
  "payload": {
    "userId": "660e8400-e29b-41d4-a716-446655440001",
    "grantedBy": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2.4 系统消息

**消息类型**：
- `ping`：心跳 Ping
- `pong`：心跳 Pong
- `error`：错误消息
- `notification`：通知消息

**消息定义**：

```typescript
// 心跳 Ping
interface PingMessage extends BaseMessage {
  type: 'ping'
  payload?: {
    timestamp: number
  }
}

// 心跳 Pong
interface PongMessage extends BaseMessage {
  type: 'pong'
  payload: {
    timestamp: number      // 原始 Ping 的时间戳
    serverTime: number     // 服务器当前时间
  }
}

// 错误消息
interface ErrorMessage extends BaseMessage {
  type: 'error'
  payload: {
    code: string
    message: string
    details?: any
  }
}

// 通知消息
interface NotificationMessage extends BaseMessage {
  type: 'notification'
  payload: {
    level: 'info' | 'warn' | 'error'
    title: string
    message: string
    actions?: Array<{ label: string, action: string }>
  }
}
```

---

## 3. 连接生命周期

### 3.1 连接建立流程

```
1. 客户端发起 WebSocket 连接
   ↓
2. 服务端验证认证（如需要）
   ↓
3. 服务端加入房间（room）
   ↓
4. 服务端发送欢迎消息（可选）
   ↓
5. 连接就绪，开始信令交换
```

**欢迎消息示例**：
```json
{
  "type": "notification",
  "payload": {
    "level": "info",
    "title": "连接成功",
    "message": "已加入房间：demo"
  }
}
```

### 3.2 连接维持

**心跳机制**：
- 客户端每 5 秒发送 `ping` 消息
- 服务端收到 `ping` 立即回复 `pong`
- 服务端 15 秒未收到 `ping` 判定为超时，关闭连接

**心跳实现示例**：
```javascript
// 客户端
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    }))
  }
}, 5000)

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'pong') {
    // 更新最后心跳时间
    lastPongTime = Date.now()
  }
}

// 检测超时
setInterval(() => {
  if (Date.now() - lastPongTime > 15000) {
    console.warn('WebSocket timeout, reconnecting...')
    reconnect()
  }
}, 1000)
```

### 3.3 连接关闭

**正常关闭**：
```javascript
// 客户端主动关闭
ws.close(1000, 'Normal closure')

// 服务端发送关闭通知（可选）
{
  "type": "notification",
  "payload": {
    "level": "info",
    "title": "连接关闭",
    "message": "服务端主动关闭连接"
  }
}
```

**异常关闭处理**：
- 自动重连机制（见下文）
- 关闭原因记录
- 用户提示

---

## 4. 房间/会话管理协议

### 4.1 房间隔离

- 每个房间（room）隔离信令通道
- 同一房间内的客户端互相转发消息
- 不同房间互不干扰

**消息转发规则**：
```javascript
// 服务端伪代码
ws.on('message', (data, isBinary) => {
  const msg = JSON.parse(data)
  
  // 系统消息（ping/pong）不转发
  if (msg.type === 'ping' || msg.type === 'pong') {
    handleSystemMessage(msg)
    return
  }
  
  // 转发给同一房间的其他客户端
  roomClients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
})
```

### 4.2 房间状态

**房间信息查询**（可选扩展，通过 REST API）：
- 当前房间人数
- 房间内用户列表
- 房间创建时间

---

## 5. 错误处理与重连

### 5.1 错误消息格式

```json
{
  "type": "error",
  "payload": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      "field": "具体字段",
      "reason": "详细原因"
    }
  }
}
```

**错误代码**：
- `AUTH_FAILED`：认证失败
- `ROOM_FULL`：房间已满
- `INVALID_MESSAGE`：消息格式错误
- `RATE_LIMIT`：消息频率超限
- `SERVER_ERROR`：服务器错误

### 5.2 重连策略

**指数退避算法**：
```
重连间隔：1s, 2s, 4s, 8s, 16s, 30s（最大）
最大重连次数：10 次
```

**实现示例**：
```javascript
let reconnectAttempts = 0
let reconnectDelay = 1000
const maxDelay = 30000
const maxAttempts = 10

function reconnect() {
  if (reconnectAttempts >= maxAttempts) {
    console.error('Max reconnection attempts reached')
    showError('连接失败，请刷新页面')
    return
  }
  
  setTimeout(() => {
    console.log(`Reconnecting... (attempt ${reconnectAttempts + 1})`)
    connect()
    reconnectAttempts++
    reconnectDelay = Math.min(reconnectDelay * 2, maxDelay)
  }, reconnectDelay)
}

ws.onclose = (event) => {
  if (event.code !== 1000) { // 非正常关闭
    reconnect()
  }
}
```

### 5.3 消息队列（断线重连）

**客户端实现**：
```javascript
const messageQueue = []

// 连接断开时缓存消息
ws.onclose = () => {
  messageQueue.push(...pendingMessages)
}

// 重连成功后发送缓存消息
ws.onopen = () => {
  while (messageQueue.length > 0) {
    const msg = messageQueue.shift()
    ws.send(JSON.stringify(msg))
  }
}
```

**服务端支持**（可选）：
- 重连后补发最近 N 条消息
- 消息序号机制防止重复

---

## 6. 消息频率限制

### 6.1 限流规则

| 消息类型 | 频率限制 | 说明 |
|---------|---------|------|
| `ping` | 每 5 秒 1 次 | 心跳消息 |
| `offer`/`answer` | 每 10 秒 1 次 | WebRTC 信令 |
| `candidate` | 每 1 秒 10 次 | ICE 候选消息 |
| `data` | 每 1 秒 100 次 | 数据消息 |
| 其他 | 每 1 秒 20 次 | 会话事件消息 |

### 6.2 超限处理

服务端检测到超限时：
1. 发送 `error` 消息，code: `RATE_LIMIT`
2. 记录警告日志
3. 可选：临时断开连接（严重违规）

---

## 7. 消息序列化/反序列化

### 7.1 JSON 格式

所有消息使用 JSON 格式，UTF-8 编码。

**序列化规则**：
- 使用 `JSON.stringify()` 序列化
- 时间戳使用毫秒数（number）
- 二进制数据使用 Base64 编码（如需要）

**反序列化规则**：
- 使用 `JSON.parse()` 反序列化
- 验证消息类型和必需字段
- 处理解析错误（try-catch）

### 7.2 类型验证

**客户端示例**：
```typescript
interface MessageTypeMap {
  'offer': OfferMessage
  'answer': AnswerMessage
  'candidate': CandidateMessage
  'session_join': SessionJoinMessage
  'data': DataMessage
  'ping': PingMessage
  'pong': PongMessage
  'error': ErrorMessage
}

function parseMessage<T extends keyof MessageTypeMap>(
  data: string,
  expectedType: T
): MessageTypeMap[T] | null {
  try {
    const msg = JSON.parse(data)
    if (msg.type === expectedType) {
      return msg as MessageTypeMap[T]
    }
  } catch (e) {
    console.error('Failed to parse message:', e)
  }
  return null
}
```

---

## 8. 连接示例（完整）

### 8.1 客户端完整示例

```javascript
class WebSocketSignal {
  constructor(url, room) {
    this.url = `${url}?room=${encodeURIComponent(room)}`
    this.ws = null
    this.reconnectAttempts = 0
    this.messageHandlers = new Map()
  }

  connect() {
    this.ws = new WebSocket(this.url)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.startPing()
    }

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      this.handleMessage(msg)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      if (event.code !== 1000) {
        this.reconnect()
      }
    }
  }

  handleMessage(msg) {
    const handler = this.messageHandlers.get(msg.type)
    if (handler) {
      handler(msg)
    } else if (msg.type === 'pong') {
      // 心跳响应，无需处理
    } else {
      console.warn('Unhandled message type:', msg.type)
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not ready')
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() })
    }, 5000)
  }

  reconnect() {
    if (this.reconnectAttempts >= 10) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts + 1})`)
      this.connect()
      this.reconnectAttempts++
    }, delay)
  }

  on(messageType, handler) {
    this.messageHandlers.set(messageType, handler)
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    if (this.ws) {
      this.ws.close(1000, 'Normal closure')
    }
  }
}

// 使用示例
const signal = new WebSocketSignal('ws://localhost:3001/ws/signal', 'demo')

signal.on('offer', (msg) => {
  console.log('Received offer:', msg.payload.sdp)
})

signal.on('session_join', (msg) => {
  console.log('User joined:', msg.payload.nickname)
})

signal.connect()
```

### 8.2 服务端示例（Node.js）

```javascript
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3001, path: '/ws/signal' })

const rooms = new Map() // room -> Set<WebSocket>

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const room = url.searchParams.get('room') || 'default'

  // 加入房间
  if (!rooms.has(room)) {
    rooms.set(room, new Set())
  }
  const roomClients = rooms.get(room)
  roomClients.add(ws)

  // 心跳
  let lastPing = Date.now()
  const pingInterval = setInterval(() => {
    if (Date.now() - lastPing > 15000) {
      ws.close(1008, 'Ping timeout')
    }
  }, 5000)

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      
      // 处理心跳
      if (msg.type === 'ping') {
        lastPing = Date.now()
        ws.send(JSON.stringify({
          type: 'pong',
          payload: {
            timestamp: msg.timestamp || msg.payload?.timestamp,
            serverTime: Date.now()
          }
        }))
        return
      }

      // 转发给同房间其他客户端
      roomClients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(data)
        }
      })
    } catch (e) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: {
          code: 'INVALID_MESSAGE',
          message: 'Failed to parse message'
        }
      }))
    }
  })

  ws.on('close', () => {
    clearInterval(pingInterval)
    roomClients.delete(ws)
    if (roomClients.size === 0) {
      rooms.delete(room)
    }
  })
})
```

---

## 9. 相关文档

- [WebRTC 实现方案](../02-technical/06-WebRTC实现方案.md)
- [WebSocket 通信协议](../02-technical/07-WebSocket通信协议.md)
- [RESTful API 规范](./01-RESTful-API规范.md)

---

## 10. 变更历史

| 版本 | 日期 | 变更内容 | 负责人 |
|------|------|---------|--------|
| 1.0.0 | 2024-01-XX | 初始版本 | 后端架构师 |
| 1.1.0 | 2025-10-31 | 补充完整消息格式定义、连接生命周期、心跳机制、错误处理、重连策略、完整示例代码 | 后端架构师 |
