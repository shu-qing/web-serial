// ========== 串口相关类型 ==========

export interface SerialConfig {
  baudRate: number
  dataBits: 7 | 8
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space'
  stopBits: 1 | 1.5 | 2
  flowControl: 'none' | 'hardware'
  bufferSize?: number
}

export interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

// 设备类型
export type DeviceType = 'real' | 'virtual'

// 虚拟串口模拟模式
export type VirtualSerialMode = 
  | 'echo'           // 回显模式
  | 'at_command'     // AT 命令模式
  | 'sensor'         // 传感器模拟
  | 'custom'         // 自定义响应

// 设备信息（统一接口）
export interface DeviceInfo {
  id: string
  type: DeviceType
  name: string
  description?: string
  port?: SerialPort // 真实串口设备
  info?: SerialPortInfo
  // 虚拟设备特有属性
  mode?: VirtualSerialMode
}

// 虚拟串口配置
export interface VirtualSerialConfig {
  mode: VirtualSerialMode
  delay?: number // 响应延迟（毫秒）
  autoSendInterval?: number // 自动发送间隔（毫秒）
  customResponses?: CustomResponse[]
}

// 自定义响应规则
export interface CustomResponse {
  id: string
  pattern: string | RegExp
  response: string
  enabled: boolean
}

export interface LogEntry {
  id: string
  timestamp: Date
  direction: 'send' | 'receive'
  data: string
  encoding: 'utf-8' | 'hex'
  bytes: number
}

export interface SerialStats {
  rxBytes: number
  txBytes: number
  rxRate: number
  txRate: number
  lines: number
  connectedTime: number
}

// ========== 用户相关类型 ==========

export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  role?: string
  status?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ========== 项目相关类型 ==========

export interface Project {
  id: string
  name: string
  description?: string
  config: SerialConfig
  commands: Command[]
  createdAt: Date
  updatedAt: Date
  userId?: string
}

// ========== 命令库相关类型 ==========

export interface Command {
  id: string
  name: string
  data: string
  encoding: 'utf-8' | 'hex'
  description?: string
  category?: string
  createdAt: Date
}

// ========== 远程协作相关类型 ==========

export interface RemoteSession {
  id: string
  ownerId: string
  inviteCode: string
  connectionCode?: string
  mode: 'share' | 'bridge'
  participants: Participant[]
  createdAt: Date
  expiresAt: Date
}

export interface Participant {
  id: string
  userId?: string
  username: string
  role: 'owner' | 'guest'
  hasControl: boolean
  hasDevice: boolean
  joinedAt: Date
}

export type ControlState = 'owner_hold' | 'guest_hold' | 'none'

// ========== 数据分析相关类型 ==========

export interface DataAnalysis {
  projectId: string
  totalBytes: number
  totalLines: number
  sendCount: number
  receiveCount: number
  avgResponseTime: number
  errorCount: number
  patterns: DataPattern[]
  generatedAt: Date
}

export interface DataPattern {
  pattern: string
  count: number
  percentage: number
}

// ========== 测试库相关类型（三层结构） ==========

// 断言类型
export type AssertionType = 
  | 'equals'        // 完全相等
  | 'contains'      // 包含
  | 'not_contains'  // 不包含
  | 'regex'         // 正则匹配
  | 'starts_with'   // 以...开头
  | 'ends_with'     // 以...结尾
  | 'length_eq'     // 长度等于
  | 'length_gt'     // 长度大于
  | 'length_lt'     // 长度小于
  | 'custom'        // 自定义JS表达式

export interface Assertion {
  type: AssertionType
  value: string
  description?: string
  negate?: boolean // 是否取反
}

// 前置条件类型
export type PreconditionType = 
  | 'wait'          // 等待
  | 'send'          // 发送命令
  | 'clear'         // 清空接收区
  | 'check_status'  // 检查状态

export interface Precondition {
  type: PreconditionType
  value: any
  description?: string
}

// 变量定义
export interface TestVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'hex'
  defaultValue?: any
  description?: string
  required?: boolean
  validation?: string // 验证规则（正则表达式）
}

// 校验码类型
export type ChecksumType = 
  | 'CRC16-Modbus'
  | 'CRC16-CCITT'
  | 'CRC8'
  | 'XOR'
  | 'Checksum'
  | 'BCC'
  | 'LRC'

export type ChecksumPosition = 'append' | 'prepend' | 'custom'

// 测试用例（底层）- 最小的测试单元
export interface TestCase {
  id: string
  suiteId: string
  name: string
  description?: string
  order: number
  
  // 命令定义
  command: string
  encoding: 'utf-8' | 'hex'
  lineEnding: 'none' | 'cr' | 'lf' | 'crlf'
  
  // 期望响应
  expectedResponse?: string
  timeout: number // 毫秒
  
  // 断言规则
  assertions?: Assertion[]
  
  // 前置条件
  preconditions?: Precondition[]
  
  // 变量定义
  variables?: TestVariable[]
  
  // 校验码配置
  checksumType?: ChecksumType
  checksumPosition?: ChecksumPosition
  
  // 执行配置
  retryCount: number
  retryDelay: number
  continueOnFail: boolean
  
  // 执行结果
  lastRunAt?: Date
  lastResult?: 'pass' | 'fail' | 'error' | 'skip'
  lastError?: string
  lastDuration?: number
  runCount: number
  passCount: number
  failCount: number
  
  // 元数据
  tags: string[]
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

// 测试单（中层）- 用户自定义的测试分组
export interface TestSuite {
  id: string
  libraryId: string
  name: string
  description?: string
  order: number
  tags: string[]
  variables?: TestVariable[] // 测试单全局变量
  
  // 执行配置
  repeatCount?: number // 重复执行次数（0表示不重复）
  repeatDelay?: number // 重复执行间隔(ms)
  stopOnError?: boolean // 失败时停止
  
  cases: TestCase[]
  createdAt: Date
  updatedAt: Date
}

// 测试库（顶层）- 按设备或协议组织的测试集合
export interface TestLibrary {
  id: string
  userId: string
  name: string
  description?: string
  deviceType?: string // 设备类型，如"ESP32"、"STM32"
  protocol?: string // 协议类型，如"AT指令"、"Modbus RTU"
  tags: string[]
  suites: TestSuite[]
  createdAt: Date
  updatedAt: Date
}

// 测试执行结果（历史记录）
export interface TestResult {
  id: string
  testCaseId: string
  result: 'pass' | 'fail' | 'error' | 'skip'
  duration: number // 毫秒
  
  // 执行详情
  sentCommand: string // 实际发送的命令（变量已替换）
  receivedData?: string // 实际接收的数据
  errorMessage?: string
  
  // 断言结果
  assertionResults?: {
    assertion: Assertion
    passed: boolean
    actualValue?: string
    message?: string
  }[]
  
  // 执行上下文
  variables?: Record<string, any> // 使用的变量值
  metadata?: Record<string, any>
  
  createdAt: Date
}

// 测试执行状态
export interface TestExecutionStatus {
  testCaseId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  message?: string
}

// 批量测试配置
export interface BatchTestConfig {
  suiteId?: string
  testCaseIds?: string[]
  stopOnError: boolean
  parallel: boolean
  maxParallel?: number
  delayBetweenTests: number // 毫秒
}

// ========== UI 相关类型 ==========

export interface HighlightRule {
  id: string
  pattern: string | RegExp
  color: string
  enabled: boolean
}

// ========== API 相关类型 ==========

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ========== WebSocket 消息类型 ==========

export type WSMessageType = 
  | 'join_session'
  | 'leave_session'
  | 'serial_data'
  | 'control_request'
  | 'control_grant'
  | 'participant_joined'
  | 'participant_left'
  | 'error'

export interface WSMessage {
  type: WSMessageType
  sessionId: string
  data: any
  timestamp: Date
}

// ========== 导出格式类型 ==========

export type ExportFormat = 'txt' | 'csv' | 'json'

export type ExportDirection = 'all' | 'receive' | 'send' | 'paired'

export interface ExportOptions {
  format: ExportFormat
  direction: ExportDirection
  includeTimestamp: boolean
  includeDirection: boolean
  includeConfig: boolean
  encoding: 'utf-8' | 'hex'
  timeRange?: {
    start: Date
    end: Date
  }
}

