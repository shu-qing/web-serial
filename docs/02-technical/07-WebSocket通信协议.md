# WebSocket 通信协议

> 文档版本：1.0.0

## 1. 信令消息格式

```typescript
interface SignalMessage {
  type: 'offer' | 'answer' | 'candidate'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}
```

## 2. 会话事件

连接、断开、控制权变更、数据同步。

## 3. 心跳

每 5 秒 ping/pong。

## 4. 相关文档

- [WebRTC实现](./06-WebRTC实现方案.md)
- [API规范](../03-api/02-WebSocket-API规范.md)

