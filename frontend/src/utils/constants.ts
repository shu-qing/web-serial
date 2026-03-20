/**
 * 常量定义
 */

// ========== 串口配置常量 ==========

export const BAUD_RATES = [
  300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600,
  115200, 230400, 460800, 921600, 1000000, 1500000, 2000000,
] as const

export const DATA_BITS = [7, 8] as const

export const PARITY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'even', label: 'Even' },
  { value: 'odd', label: 'Odd' },
  { value: 'mark', label: 'Mark' },
  { value: 'space', label: 'Space' },
] as const

export const STOP_BITS = [1, 1.5, 2] as const

export const FLOW_CONTROL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'hardware', label: 'Hardware (RTS/CTS)' },
] as const

export const DEFAULT_SERIAL_CONFIG = {
  baudRate: 19200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: 'none',
  bufferSize: 65536,
} as const

// ========== 行结束符常量 ==========

export const LINE_ENDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'cr', label: 'CR (\\r)' },
  { value: 'lf', label: 'LF (\\n)' },
  { value: 'crlf', label: 'CRLF (\\r\\n)' },
  { value: 'auto', label: 'Auto' },
] as const

// ========== 编码常量 ==========

export const ENCODING_OPTIONS = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'hex', label: 'HEX' },
] as const

// ========== 高亮规则预设 ==========

export const PRESET_HIGHLIGHT_RULES = [
  { pattern: /ERROR/i, color: '#ef4444', label: 'ERROR' },
  { pattern: /WARN/i, color: '#f59e0b', label: 'WARN' },
  { pattern: /INFO/i, color: '#3b82f6', label: 'INFO' },
  { pattern: /OK|SUCCESS/i, color: '#10b981', label: 'OK/SUCCESS' },
] as const

// ========== 缓冲区限制 ==========

export const BUFFER_LIMITS = {
  MAX_LINES: 100000,
  MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  KEEP_LINES_ON_CLEAR: 100,
} as const

// ========== 导出选项 ==========

export const EXPORT_FORMATS = [
  { value: 'txt', label: 'TXT (文本)' },
  { value: 'csv', label: 'CSV (表格)' },
  { value: 'json', label: 'JSON (数据)' },
] as const

export const EXPORT_DIRECTIONS = [
  { value: 'all', label: '全部数据' },
  { value: 'receive', label: '仅接收数据' },
  { value: 'send', label: '仅发送数据' },
  { value: 'paired', label: '配对数据' },
] as const

// ========== 时间范围选项 ==========

export const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '5m', label: '最近 5 分钟' },
  { value: '10m', label: '最近 10 分钟' },
  { value: '30m', label: '最近 30 分钟' },
  { value: '1h', label: '最近 1 小时' },
  { value: 'custom', label: '自定义范围' },
] as const

// ========== 循环发送间隔 ==========

export const REPEAT_INTERVALS = [
  { value: 100, label: '100ms' },
  { value: 500, label: '500ms' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
] as const

// ========== API 端点 ==========

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const API_ENDPOINTS = {
  // 用户认证
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  
  // 用户信息
  USER_PROFILE: '/user/profile',
  USER_UPDATE: '/user/update',
  USER_CHANGE_PASSWORD: '/user/change-password',
  
  // 用户偏好设置
  USER_PREFERENCE: '/user/preference',
  USER_PREFERENCE_RESET: '/user/preference/reset',
  
  // 项目管理
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  
  // 命令库
  COMMANDS: '/commands',
  COMMAND_BY_ID: (id: string) => `/commands/${id}`,
  
  // 远程会话
  SESSIONS: '/sessions',
  SESSION_CREATE: '/sessions/create',
  SESSION_JOIN: '/sessions/join',
  SESSION_BY_ID: (id: string) => `/sessions/${id}`,
  
  // 数据分析
  ANALYSIS: '/analysis',
  ANALYSIS_REPORT: (projectId: string) => `/analysis/${projectId}/report`,
  
  // 测试库
  TEST_LIBRARIES_BY_PROJECT: (projectId: string) => `/projects/${projectId}/test-libraries`,
  TEST_LIBRARY_GET_OR_CREATE: (projectId: string) => `/projects/${projectId}/test-libraries/get-or-create`,
  TEST_LIBRARY_BY_ID: (id: string) => `/test-libraries/${id}`,
  TEST_SUITES_BY_LIBRARY: (libraryId: string) => `/test-libraries/${libraryId}/suites`,
  TEST_SUITE_BY_ID: (id: string) => `/test-suites/${id}`,
  TEST_CASES_BY_SUITE: (suiteId: string) => `/test-suites/${suiteId}/cases`,
  TEST_CASE_BY_ID: (id: string) => `/test-cases/${id}`,
} as const

// ========== WebSocket 端点 ==========

export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:3001' : 'wss://www.webserialtool.com/ws')

export const WS_ENDPOINTS = {
  SIGNALING: '/ws/signaling',
  SESSION: (sessionId: string) => `/ws/session/${sessionId}`,
} as const

// ========== 本地存储键 ==========

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  CURRENT_PROJECT: 'current_project',
  RECENT_DEVICES: 'recent_devices',
  LAYOUT_CONFIG: 'layout_config',
  THEME_CONFIG: 'theme_config',
  SEND_HISTORY: 'send_history',
} as const

// ========== 主题配置 ==========

export const THEMES = ['light', 'dark', 'auto'] as const

// ========== 快捷键 ==========

export const KEYBOARD_SHORTCUTS = {
  SEND: 'Ctrl+Enter',
  CLEAR: 'Ctrl+K',
  SEARCH: 'Ctrl+F',
  SETTINGS: 'Ctrl+,',
  SAVE: 'Ctrl+S',
  EXPORT: 'Ctrl+Shift+E',
  EXPORT_RECEIVE: 'Ctrl+Shift+R',
  EXPORT_SEND: 'Ctrl+Shift+S',
  TOGGLE_HISTORY: 'Ctrl+H',
  TOGGLE_WRAP: 'Ctrl+W',
  PROJECT_SWITCHER: 'Ctrl+P',
} as const

// ========== 性能配置 ==========

export const PERFORMANCE = {
  VIRTUAL_SCROLL_ITEM_HEIGHT: 24,
  VIRTUAL_SCROLL_OVERSCAN: 5,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  MAX_SEND_HISTORY: 100,
  MAX_RECENT_DEVICES: 5,
} as const

