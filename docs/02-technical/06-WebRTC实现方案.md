# WebRTC 实现方案

> 文档版本：1.0.0

## 1. 架构

使用 RTCPeerConnection + DataChannel 建立 P2P 连接。

## 2. 连接流程

1. 创建 PeerConnection
2. 创建 DataChannel
3. ICE 候选交换
4. SDP Offer/Answer 交换
5. P2P 连接建立

## 3. 信令协议

通过 WebSocket 交换 SDP 和 ICE 候选。

## 4. TURN/STUN 配置

- STUN: `stun:stun.l.google.com:19302`
- TURN: 自建/公共中继

## 5. 降级策略

P2P 失败自动降级为 WebSocket 中转。

## 6. 相关文档

- [功能需求-远程协作](../01-product/08-功能需求-远程协作.md)
- [WebSocket协议](./07-WebSocket通信协议.md)

