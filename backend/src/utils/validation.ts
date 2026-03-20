import { z } from 'zod';

// ========== 用户相关验证 ==========
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确').min(3).max(255),
  password: z.string().min(1, '密码不能为空'),
});

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确').min(3).max(255),
  username: z.string().min(1, '用户名不能为空').max(100),
  password: z
    .string()
    .min(8, '密码至少8位')
    .max(128, '密码最多128位')
    .regex(/(?=.*[a-zA-Z])(?=.*\d)/, '密码必须包含字母和数字'),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: '必须同意用户协议',
  }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token 不能为空'),
});

// ========== 串口配置验证 ==========
export const serialConfigSchema = z.object({
  name: z.string().min(1).max(100),
  deviceId: z.string().max(50).optional(),
  baudRate: z.number().int().min(300).max(4000000),
  dataBits: z.number().int().refine((val) => [5, 6, 7, 8].includes(val), {
    message: '数据位必须是 5, 6, 7 或 8',
  }),
  parity: z.enum(['none', 'even', 'odd', 'mark', 'space']),
  stopBits: z.number().refine((val) => [1, 1.5, 2].includes(val), {
    message: '停止位必须是 1, 1.5 或 2',
  }),
  flowControl: z.enum(['none', 'hardware', 'software']),
  lineEndingSend: z.enum(['none', 'cr', 'lf', 'crlf']).optional(),
  lineEndingParse: z.enum(['none', 'cr', 'lf', 'crlf', 'auto']).optional(),
  encoding: z.enum(['utf-8', 'ascii', 'hex']).optional(),
  bufferSize: z.number().int().min(1024).max(10485760).optional(),
  isDefault: z.boolean().optional(),
});

export const updateSerialConfigSchema = serialConfigSchema.partial();

// ========== 项目验证 ==========
export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  config: z.any().optional(), // SerialConfig object
});

export const updateProjectSchema = projectSchema.partial();

// ========== 用户信息更新验证 ==========
export const updateUserSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  avatar: z.string().max(100000).optional(), // 支持 base64 图片，约 100KB
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z
    .string()
    .min(8, '新密码至少8位')
    .max(128, '新密码最多128位')
    .regex(/(?=.*[a-zA-Z])(?=.*\d)/, '新密码必须包含字母和数字'),
});

// ========== 会话验证 ==========
export const sessionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  mode: z.enum(['share', 'bridge']),
  password: z.string().min(4).max(50).optional(),
  controlMode: z.enum(['exclusive', 'request', 'free']).optional(),
  autoAcceptControl: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  allowClipboard: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const joinSessionSchema = z.object({
  code: z.string().min(6).max(10),
  password: z.string().optional(),
});

// ========== 用户偏好验证 ==========
export const preferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  fontSize: z.number().int().min(12).max(24).optional(),
  fontFamily: z.string().max(100).optional(),
  lineHeight: z.enum(['compact', 'normal', 'comfort']).optional(),
  autoScroll: z.boolean().optional(),
  showLineNumber: z.boolean().optional(),
  timestampFormat: z.string().max(20).optional(),
  highlightRules: z.any().optional(), // JSON array
});

// ========== 历史记录验证 ==========
export const historySchema = z.object({
  content: z.string().min(1).max(10000),
  encoding: z.enum(['utf-8', 'hex']).optional(),
});

// ========== 分页验证 ==========
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ========== 测试库验证 ==========
export const testLibrarySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  deviceType: z.string().max(100).optional(),
  protocol: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTestLibrarySchema = testLibrarySchema.partial();

export const testSuiteSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  variables: z.any().optional(), // TestVariable[]
  repeatCount: z.number().int().min(0).optional(),
  repeatDelay: z.number().int().min(0).optional(),
  stopOnError: z.boolean().optional(),
});

export const updateTestSuiteSchema = testSuiteSchema.partial();

export const testCaseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0).optional(),
  command: z.string().min(1),
  encoding: z.enum(['utf-8', 'hex']).optional(),
  lineEnding: z.enum(['none', 'cr', 'lf', 'crlf']).optional(),
  expectedResponse: z.string().optional(),
  responsePattern: z.string().optional(),
  timeout: z.number().int().min(100).max(60000).optional(),
  assertions: z.any().optional(),
  preconditions: z.any().optional(),
  variables: z.any().optional(),
  checksumType: z.string().max(50).optional(),
  checksumPosition: z.string().max(20).optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  retryDelay: z.number().int().min(0).optional(),
  continueOnFail: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
});

export const updateTestCaseSchema = testCaseSchema.partial();

export const testResultSchema = z.object({
  result: z.enum(['pass', 'fail', 'error', 'skip']),
  duration: z.number().int().min(0),
  sentCommand: z.string(),
  receivedData: z.string().optional(),
  errorMessage: z.string().optional(),
  assertionResults: z.any().optional(),
  variables: z.any().optional(),
  metadata: z.any().optional(),
});

