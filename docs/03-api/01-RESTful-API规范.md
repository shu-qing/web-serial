# RESTful API 规范

> 文档版本：2.0.0  
> 最后更新：2025-01-XX  
> 负责人：后端架构师  
> 说明：本文档已根据实际代码实现反向梳理并更新

---

## 1. 基础信息

### 1.1 环境配置

| 环境 | Base URL | 说明 |
|------|----------|------|
| 生产环境 | `https://api.serial.app/v1` | 正式生产环境 |
| 开发环境 | `http://localhost:3001/api` | 本地开发环境 |
| 测试环境 | `https://test-api.serial.app/v1` | 测试环境 |

### 1.2 认证机制

- **认证方式**：JWT Bearer Token
- **请求头格式**：`Authorization: Bearer <token>`
- **Token 有效期**：
  - Access Token：7 天
  - Refresh Token：30 天
- **开发环境**：可使用简化登录（MVP 阶段）

### 1.3 响应格式

所有响应统一使用 JSON 格式，Content-Type: `application/json`

**成功响应标准格式**：
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... } // 可选，分页等信息
}
```

**错误响应标准格式**：
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... } // 可选，详细错误信息
  }
}
```

### 1.4 请求限制

- **限流规则**：
  - 认证接口：10 次/分钟
  - 其他接口：100 次/分钟
- **请求超时**：30 秒
- **请求体大小限制**：10 MB

---

## 2. 认证接口

### 2.1 POST /auth/register

注册新用户账户

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址，3-255 字符 |
| `password` | string | 是 | 密码，8-128 字符，至少包含字母和数字 |
| `nickname` | string | 否 | 昵称，1-100 字符 |
| `agreeTerms` | boolean | 是 | 必须同意用户协议 |

**请求示例**：
```http
POST /api/auth/register HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "nickname": "New User",
  "agreeTerms": true
}
```

**成功响应**（201 Created）：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "New User",
      "isEmailVerified": false
    },
    "message": "注册成功，请查收验证邮件"
  }
}
```

**错误响应示例**：
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "邮箱已被注册",
    "details": {
      "field": "email"
    }
  }
}
```

**验证规则**：
- `email`：邮箱格式验证，唯一性检查
- `password`：长度 8-128，至少包含字母和数字，推荐包含特殊字符
- `agreeTerms`：必须为 `true`

---

### 2.2 POST /auth/login

用户登录

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 邮箱地址 |
| `password` | string | 是 | 密码 |

**请求示例**：
```http
POST /api/auth/login HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 604800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "New User",
      "avatar": null,
      "isEmailVerified": true
    }
  }
}
```

**错误响应示例**：
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码错误"
  }
}
```

**开发环境简化登录**（MVP）：
```json
{
  "email": "demo@example.com",
  "password": "demo"
}
```

---

### 2.3 POST /auth/logout

用户退出登录

**请求头**：
```
Authorization: Bearer <token>
```

**请求示例**：
```http
POST /api/auth/logout HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "message": "已退出登录"
  }
}
```

---

### 2.4 POST /auth/refresh

刷新访问令牌

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `refreshToken` | string | 是 | 刷新令牌 |

**请求示例**：
```http
POST /api/auth/refresh HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "refreshToken": "refresh_token_string"
}
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "expiresIn": 604800
  }
}
```

**错误响应**：
- `401`：刷新令牌无效或已过期
- `403`：刷新令牌已被使用（防止重放攻击）

---

## 3. 配置接口

### 3.1 GET /profiles

获取当前用户的串口配置列表

**请求头**：
```
Authorization: Bearer <token>
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | number | 否 | 页码，从 1 开始，默认 1 |
| `limit` | number | 否 | 每页数量，默认 20，最大 100 |
| `deviceId` | string | 否 | 过滤设备 ID |

**请求示例**：
```http
GET /api/profiles?page=1&limit=20 HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "default",
        "deviceId": null,
        "baudRate": 115200,
        "dataBits": 8,
        "parity": "none",
        "stopBits": 1.0,
        "flowControl": "none",
        "lineEndingSend": "lf",
        "lineEndingParse": "auto",
        "encoding": "utf-8",
        "bufferSize": 65536,
        "isDefault": true,
        "updatedAt": "2025-10-31T08:00:00Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "Arduino Uno",
        "deviceId": "1A86:7523",
        "baudRate": 9600,
        "dataBits": 8,
        "parity": "none",
        "stopBits": 1.0,
        "flowControl": "none",
        "lineEndingSend": "crlf",
        "lineEndingParse": "auto",
        "encoding": "utf-8",
        "bufferSize": 65536,
        "isDefault": false,
        "updatedAt": "2025-10-31T07:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

### 3.2 GET /profiles/default

获取用户的默认配置

**请求头**：
```
Authorization: Bearer <token>
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "default",
    "baudRate": 115200,
    "dataBits": 8,
    "parity": "none",
    "stopBits": 1.0,
    "flowControl": "none",
    "lineEndingSend": "lf",
    "lineEndingParse": "auto",
    "encoding": "utf-8",
    "bufferSize": 65536,
    "isDefault": true
  }
}
```

**错误响应**（404）：
```json
{
  "success": false,
  "error": {
    "code": "DEFAULT_PROFILE_NOT_FOUND",
    "message": "未找到默认配置"
  }
}
```

---

### 3.3 POST /profiles

创建新的串口配置

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 配置名称，1-100 字符，同一用户下唯一 |
| `deviceId` | string | 否 | USB Vendor:Product ID，如 "1A86:7523" |
| `baudRate` | number | 是 | 波特率，300-4000000 |
| `dataBits` | number | 是 | 数据位，5/6/7/8 |
| `parity` | string | 是 | 校验位，'none'/'even'/'odd'/'mark'/'space' |
| `stopBits` | number | 是 | 停止位，1/1.5/2 |
| `flowControl` | string | 是 | 流控制，'none'/'hardware'/'software' |
| `lineEndingSend` | string | 否 | 发送行结束符，默认 'lf' |
| `lineEndingParse` | string | 否 | 接收行结束符解析，默认 'auto' |
| `encoding` | string | 否 | 编码格式，默认 'utf-8' |
| `bufferSize` | number | 否 | 缓冲区大小，默认 65536 |
| `isDefault` | boolean | 否 | 是否设为默认，默认 false |

**请求示例**：
```http
POST /api/profiles HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "ESP32 配置",
  "deviceId": "10C4:EA60",
  "baudRate": 115200,
  "dataBits": 8,
  "parity": "none",
  "stopBits": 1,
  "flowControl": "none",
  "lineEndingSend": "lf",
  "lineEndingParse": "auto",
  "encoding": "utf-8",
  "bufferSize": 65536,
  "isDefault": false
}
```

**成功响应**（201 Created）：
```json
{
  "success": true,
  "data": {
    "id": "new-profile-id",
    "name": "ESP32 配置",
    "deviceId": "10C4:EA60",
    "baudRate": 115200,
    "dataBits": 8,
    "parity": "none",
    "stopBits": 1.0,
    "flowControl": "none",
    "lineEndingSend": "lf",
    "lineEndingParse": "auto",
    "encoding": "utf-8",
    "bufferSize": 65536,
    "isDefault": false,
    "createdAt": "2025-10-31T10:00:00Z",
    "updatedAt": "2025-10-31T10:00:00Z"
  }
}
```

**错误响应示例**：
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {
      "baudRate": "波特率必须在 300-4000000 之间"
    }
  }
}
```

---

### 3.4 PUT /profiles/:id

更新串口配置

**路径参数**：
- `id`：配置 ID（UUID）

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**：同 POST /profiles（所有字段可选）

**请求示例**：
```http
PUT /api/profiles/770e8400-e29b-41d4-a716-446655440002 HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json

{
  "baudRate": 230400,
  "isDefault": true
}
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "baudRate": 230400,
    "isDefault": true,
    "updatedAt": "2025-10-31T10:30:00Z"
  }
}
```

**错误响应**：
- `404`：配置不存在
- `403`：无权修改此配置（非配置所有者）

---

### 3.5 DELETE /profiles/:id

删除串口配置

**路径参数**：
- `id`：配置 ID（UUID）

**请求头**：
```
Authorization: Bearer <token>
```

**请求示例**：
```http
DELETE /api/profiles/770e8400-e29b-41d4-a716-446655440002 HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "message": "配置已删除"
  }
}
```

**错误响应**：
- `404`：配置不存在
- `403`：无权删除此配置
- `400`：不能删除默认配置（需先设置其他为默认）

---

## 4. 项目管理接口

### 4.1 GET /projects

获取当前用户的项目列表

**请求头**：
```
Authorization: Bearer <token>
```

**查询参数**：支持分页（page, limit）

**成功响应**（200 OK）：返回项目列表

---

### 4.2 POST /projects

创建新项目

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 项目名称 |
| `description` | string | 否 | 项目描述 |
| `config` | object | 否 | 项目配置（JSON） |

---

### 4.3 PUT /projects/:id

更新项目

---

### 4.4 DELETE /projects/:id

删除项目

---

## 5. 发送历史接口

### 5.1 GET /history

获取发送历史列表

**查询参数**：支持分页（page, limit）

---

### 5.2 POST /history

创建发送历史记录

---

### 5.3 DELETE /history/clear

清空所有发送历史

---

### 5.4 DELETE /history/:id

删除单条发送历史

---

## 6. 测试库接口

### 6.1 GET /test-libraries

获取测试库列表

### 6.2 POST /test-libraries

创建测试库

### 6.3 GET /test-libraries/:libraryId/suites

获取测试单列表

### 6.4 POST /test-libraries/:libraryId/suites

创建测试单

### 6.5 GET /test-suites/:suiteId/cases

获取测试用例列表

### 6.6 POST /test-suites/:suiteId/cases

创建测试用例

### 6.7 POST /test-cases/:id/results

创建测试结果

**注意**：测试库接口支持完整的CRUD操作，包括测试库、测试单、测试用例的创建、更新、删除等。

---

## 7. Wiki接口

### 7.1 GET /wiki/categories

获取Wiki分类列表（公开接口）

### 7.2 GET /wiki/articles

获取Wiki文章列表（公开接口，管理员可查看未发布文章）

### 7.3 GET /wiki/articles/slug/:slug

根据slug获取文章详情（公开接口）

### 7.4 POST /wiki/articles

创建Wiki文章（需要管理员权限）

### 7.5 GET /wiki/search

搜索Wiki文章（公开接口）

**注意**：Wiki接口支持分类和文章的完整CRUD操作，管理员可管理所有内容，普通用户只能查看已发布的文章。

---

## 8. 反馈接口

### 8.1 POST /feedback

提交反馈（支持bug、suggestion、question类型）

### 8.2 GET /feedback

获取反馈列表（需要认证）

### 8.3 DELETE /feedback/:id

删除反馈（需要认证）

---

## 9. 管理员接口

### 9.1 GET /admin/users

获取用户列表（需要管理员权限）

### 9.2 GET /admin/stats

获取系统统计信息

### 9.3 GET /admin/logs/error

获取错误日志

### 9.4 GET /admin/logs/system

获取系统日志

**注意**：管理员接口包括用户管理、系统监控、日志查看等功能，需要管理员或超级管理员权限。

---

## 10. 会话接口

### 10.1 POST /sessions/create

创建远程协作会话

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 会话名称，1-200 字符 |
| `description` | string | 否 | 会话描述 |
| `password` | string | 否 | 会话密码（可选保护） |
| `controlMode` | string | 否 | 控制权模式：'exclusive'/'request'/'free'，默认 'request' |
| `autoAcceptControl` | boolean | 否 | 自动接受控制权申请，默认 false |
| `allowChat` | boolean | 否 | 允许聊天，默认 true |
| `allowClipboard` | boolean | 否 | 允许共享剪贴板，默认 false |
| `expiresAt` | string | 否 | 过期时间（ISO 8601），最长 30 天 |

**请求示例**：
```json
{
  "name": "ESP32 调试会话",
  "description": "远程调试 ESP32 设备",
  "controlMode": "request",
  "autoAcceptControl": false,
  "allowChat": true,
  "allowClipboard": false,
  "expiresAt": "2025-11-01T10:00:00Z"
}
```

**成功响应**（201 Created）：
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "ESP32 调试会话",
    "description": "远程调试 ESP32 设备",
    "controlMode": "request",
    "status": "created",
    "inviteCode": "123456",
    "inviteLink": "https://serial.app/s/aa0e8400-e29b-41d4-a716-446655440005",
    "expiresAt": "2025-11-01T10:00:00Z",
    "createdAt": "2025-10-31T09:00:00Z"
  }
}
```

---

### 5.2 POST /sessions/:id/join

加入远程会话

**路径参数**：
- `id`：会话 ID（UUID）或邀请码（6 位数字）

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `password` | string | 否 | 会话密码（如果会话有密码保护） |

**请求示例**：
```http
POST /api/sessions/aa0e8400-e29b-41d4-a716-446655440005/join HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "session_password"
}
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "name": "ESP32 调试会话",
      "status": "active"
    },
    "participant": {
      "id": "participant-id",
      "role": "guest",
      "controlState": "none",
      "joinedAt": "2025-10-31T09:30:00Z"
    }
  }
}
```

**错误响应**：
- `404`：会话不存在或已过期
- `400`：会话密码错误
- `403`：会话人数已满（MVP：最多 2 人）

---

### 5.3 POST /sessions/:id/control/request

申请控制权

**路径参数**：
- `id`：会话 ID（UUID）

**请求示例**：
```http
POST /api/sessions/aa0e8400-e29b-41d4-a716-446655440005/control/request HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "message": "控制权申请已发送",
    "controlState": "queued"
  }
}
```

**错误响应**：
- `400`：当前控制权模式不允许申请
- `403`：已有控制权或已在队列中

---

### 5.4 POST /sessions/:id/control/grant

批准控制权申请（仅发起者）

**路径参数**：
- `id`：会话 ID（UUID）

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 被授权用户的 ID |

**请求示例**：
```json
{
  "userId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "message": "控制权已授予",
    "controlState": "guest_hold"
  }
}
```

---

### 5.5 POST /sessions/:id/control/revoke

收回控制权（仅发起者）

**路径参数**：
- `id`：会话 ID（UUID）

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "message": "控制权已收回",
    "controlState": "owner_hold"
  }
}
```

---

### 5.6 GET /sessions/:id

获取会话详情

**路径参数**：
- `id`：会话 ID（UUID）

**成功响应**（200 OK）：
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "name": "ESP32 调试会话",
    "status": "active",
    "participants": [
      {
        "id": "participant-1",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "role": "owner",
        "controlState": "owner_hold",
        "joinedAt": "2025-10-31T09:00:00Z"
      },
      {
        "id": "participant-2",
        "userId": "660e8400-e29b-41d4-a716-446655440001",
        "role": "guest",
        "controlState": "none",
        "joinedAt": "2025-10-31T09:30:00Z"
      }
    ],
    "createdAt": "2025-10-31T09:00:00Z"
  }
}
```

---

## 6. 错误码详细定义

### 6.1 HTTP 状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| `200` | OK | 请求成功 |
| `201` | Created | 资源创建成功 |
| `400` | Bad Request | 请求参数错误 |
| `401` | Unauthorized | 未认证或 Token 无效 |
| `403` | Forbidden | 权限不足 |
| `404` | Not Found | 资源不存在 |
| `409` | Conflict | 资源冲突（如邮箱已注册） |
| `422` | Unprocessable Entity | 参数验证失败 |
| `429` | Too Many Requests | 请求频率超限 |
| `500` | Internal Server Error | 服务器内部错误 |
| `503` | Service Unavailable | 服务暂不可用 |

### 6.2 错误代码列表

| 错误代码 | HTTP 状态码 | 说明 | 示例场景 |
|---------|------------|------|---------|
| `VALIDATION_ERROR` | 422 | 参数验证失败 | 波特率超出范围 |
| `EMAIL_EXISTS` | 409 | 邮箱已被注册 | 注册时邮箱已存在 |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 | 登录失败 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 | Token 超过有效期 |
| `TOKEN_INVALID` | 401 | Token 无效 | Token 格式错误 |
| `UNAUTHORIZED` | 401 | 未认证 | 缺少 Authorization 头 |
| `FORBIDDEN` | 403 | 权限不足 | 无权访问该资源 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 | 配置 ID 不存在 |
| `DEFAULT_PROFILE_NOT_FOUND` | 404 | 未找到默认配置 | 用户未设置默认配置 |
| `SESSION_NOT_FOUND` | 404 | 会话不存在 | 会话 ID 无效或已过期 |
| `SESSION_PASSWORD_INVALID` | 400 | 会话密码错误 | 加入会话时密码错误 |
| `SESSION_FULL` | 403 | 会话人数已满 | 会话已达到最大人数 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 | 超过每分钟请求限制 |
| `SERVER_ERROR` | 500 | 服务器内部错误 | 数据库连接失败 |

### 6.3 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {
      "baudRate": "波特率必须在 300-4000000 之间",
      "dataBits": "数据位必须是 5, 6, 7 或 8"
    }
  }
}
```

---

## 13. 分页规范

### 7.1 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码，从 1 开始 |
| `limit` | number | 20 | 每页数量，最大 100 |

### 7.2 分页响应格式

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 14. 相关文档

- [系统架构](../02-technical/01-系统架构.md)
- [数据模型设计](../02-technical/04-数据模型设计.md)
- [数据格式约定](./04-数据格式与约定.md)
- [WebSocket API 规范](./02-WebSocket-API规范.md)

---

## 15. 变更历史

| 版本 | 日期 | 变更内容 | 负责人 |
|------|------|---------|--------|
| 1.0.0 | 2024-01-XX | 初始版本 | 后端架构师 |
| 1.1.0 | 2025-10-31 | 补充完整 API 定义、请求/响应示例、错误码详细说明、验证规则、分页规范 | 后端架构师 |
| 2.0.0 | 2025-01-XX | 根据实际代码实现反向梳理并更新，移除宏命令接口，新增项目管理、发送历史、测试库、Wiki、反馈、管理员接口 | 后端架构师 |
