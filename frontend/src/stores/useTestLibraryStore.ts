import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TestSuite, TestCase, TestLibrary } from '@/types'

interface TestLibraryStore {
  // 当前项目的测试库（一个项目只有一个测试库）
  library: TestLibrary | null
  currentProjectId: string | null
  
  // 操作方法
  initializeLibrary: (projectId: string, isEmpty?: boolean) => void
  loadLibraryForProject: (projectId: string) => void
  updateLibrary: (updates: Partial<TestLibrary>) => void
  
  // 测试单操作
  addSuite: (suite: Omit<TestSuite, 'id' | 'libraryId' | 'order' | 'createdAt' | 'updatedAt'>) => void
  updateSuite: (id: string, updates: Partial<TestSuite>) => void
  deleteSuite: (id: string) => void
  copySuite: (id: string) => void
  reorderSuites: (suites: TestSuite[]) => void
  
  // 测试用例操作
  addCase: (suiteId: string, testCase: Omit<TestCase, 'id' | 'suiteId' | 'order' | 'runCount' | 'passCount' | 'failCount' | 'createdAt' | 'updatedAt'>) => void
  updateCase: (suiteId: string, caseId: string, updates: Partial<TestCase>) => void
  deleteCase: (suiteId: string, caseId: string) => void
  copyCase: (suiteId: string, caseId: string) => void
  reorderCases: (suiteId: string, cases: TestCase[]) => void
  
  // 清空数据
  clearLibrary: () => void
}

export const useTestLibraryStore = create<TestLibraryStore>()(
  persist(
    (set) => ({
      library: null,
      currentProjectId: null,

      // 初始化测试库（如果不存在则创建空库或默认库）
      initializeLibrary: (projectId: string, isEmpty: boolean = false) =>
        set((state) => {
          if (state.currentProjectId === projectId && state.library) {
            return state
          }
          
          // 创建新的测试库
          const newLibrary: TestLibrary = {
            id: projectId,
            userId: 'local', // 本地用户标识
            name: '默认测试库',
            description: '项目测试库',
            deviceType: undefined,
            protocol: undefined,
            tags: [],
            suites: isEmpty ? [] : [
              {
                id: 'example-echo-test',
                libraryId: projectId,
                name: '串口回显测试示例',
                description: '适用于虚拟串口（回显模式）的测试用例集',
                order: 0,
                tags: ['虚拟串口', '回显测试', '基础'],
                repeatCount: 0,
                repeatDelay: 1000,
                stopOnError: false,
                cases: [
                  {
                    id: 'echo-0',
                    suiteId: 'example-echo-test',
                    name: '仅发送测试',
                    description: '仅发送数据，不校验响应（用于单向通信测试）',
                    command: 'SEND_ONLY',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: undefined,
                    timeout: 500,
                    order: 0,
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['基础', '单向'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-1',
                    suiteId: 'example-echo-test',
                    name: '简单文本回显',
                    description: '测试基本的文本回显功能',
                    command: 'Hello',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'Hello',
                    timeout: 1000,
                    order: 1,
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['基础', '文本'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-2',
                    suiteId: 'example-echo-test',
                    name: 'AT指令回显',
                    description: '测试AT指令格式的回显',
                    command: 'AT',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'AT',
                    timeout: 1000,
                    order: 2,
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['AT指令'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-3',
                    suiteId: 'example-echo-test',
                    name: '查询指令回显',
                    description: '测试查询类指令的回显',
                    command: 'AT+STATUS?',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'AT+STATUS?',
                    timeout: 1000,
                    order: 3,
                    assertions: [
                      { type: 'contains', value: 'STATUS' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['查询'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-4',
                    suiteId: 'example-echo-test',
                    name: '变量替换示例',
                    description: '演示如何使用变量进行参数化测试',
                    command: 'SET_${param}_${value}',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'SET_${param}_${value}',
                    timeout: 1000,
                    order: 4,
                    variables: [
                      { name: 'param', type: 'string', description: '参数名称', required: false, defaultValue: 'SPEED' },
                      { name: 'value', type: 'string', description: '参数值', required: false, defaultValue: '9600' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['变量', '参数化'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-5',
                    suiteId: 'example-echo-test',
                    name: '数字回显测试',
                    description: '测试数字内容的回显',
                    command: '12345',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: '12345',
                    timeout: 1000,
                    order: 5,
                    assertions: [
                      { type: 'equals', value: '12345' },
                      { type: 'length_eq', value: '5' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['数字'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-6',
                    suiteId: 'example-echo-test',
                    name: '包含断言测试',
                    description: '测试包含类型的断言',
                    command: 'TEST_OK_PASS',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'TEST_OK_PASS',
                    timeout: 1000,
                    order: 6,
                    assertions: [
                      { type: 'contains', value: 'OK' },
                      { type: 'contains', value: 'PASS' },
                      { type: 'starts_with', value: 'TEST' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['断言'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-7',
                    suiteId: 'example-echo-test',
                    name: '正则匹配测试',
                    description: '测试正则表达式匹配',
                    command: 'TEMP:25.5C',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'TEMP:25.5C',
                    timeout: 1000,
                    order: 7,
                    assertions: [
                      { type: 'regex', value: '^TEMP:\\d+\\.\\d+C$' },
                      { type: 'contains', value: '25.5' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['正则', '温度'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-8',
                    suiteId: 'example-echo-test',
                    name: '长度验证测试',
                    description: '测试响应长度验证',
                    command: 'ABCDEFGHIJ',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'ABCDEFGHIJ',
                    timeout: 1000,
                    order: 8,
                    assertions: [
                      { type: 'length_eq', value: '10' },
                      { type: 'length_gt', value: '5' },
                      { type: 'length_lt', value: '15' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['长度验证'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-9',
                    suiteId: 'example-echo-test',
                    name: '前后缀验证测试',
                    description: '测试开头和结尾匹配',
                    command: 'START_DATA_END',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'START_DATA_END',
                    timeout: 1000,
                    order: 9,
                    assertions: [
                      { type: 'starts_with', value: 'START' },
                      { type: 'ends_with', value: 'END' },
                      { type: 'contains', value: 'DATA' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['前后缀'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-10',
                    suiteId: 'example-echo-test',
                    name: '取反断言测试',
                    description: '测试取反断言功能',
                    command: 'SUCCESS',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'SUCCESS',
                    timeout: 1000,
                    order: 10,
                    assertions: [
                      { type: 'contains', value: 'SUCCESS' },
                      { type: 'contains', value: 'FAIL', negate: true }, // 不应包含FAIL
                      { type: 'contains', value: 'ERROR', negate: true } // 不应包含ERROR
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['取反'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                  {
                    id: 'echo-11',
                    suiteId: 'example-echo-test',
                    name: '多断言组合测试',
                    description: '测试多个断言的组合使用',
                    command: 'DEVICE:ESP32:OK',
                    encoding: 'utf-8',
                    lineEnding: 'none',
                    expectedResponse: 'DEVICE:ESP32:OK',
                    timeout: 1000,
                    order: 11,
                    assertions: [
                      { type: 'contains', value: 'DEVICE' },
                      { type: 'contains', value: 'ESP32' },
                      { type: 'contains', value: 'OK' },
                      { type: 'starts_with', value: 'DEVICE:' },
                      { type: 'ends_with', value: ':OK' },
                      { type: 'regex', value: '^DEVICE:[A-Z0-9]+:OK$' }
                    ],
                    retryCount: 0,
                    retryDelay: 1000,
                    continueOnFail: false,
                    tags: ['综合测试'],
                    isEnabled: true,
                    runCount: 0,
                    passCount: 0,
                    failCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          return { library: newLibrary, currentProjectId: projectId }
        }),

      // 按项目 ID 加载测试库（从 localStorage 或创建新的）
      loadLibraryForProject: (projectId: string) =>
        set((state) => {
          // 如果已经是当前项目，不需要重新加载
          if (state.currentProjectId === projectId && state.library) {
            return state
          }

          // 保存当前项目的测试库（如果有）
          if (state.currentProjectId && state.library) {
            const currentStorageKey = `test-library-storage-${state.currentProjectId}`
            localStorage.setItem(currentStorageKey, JSON.stringify({
              state: {
                library: state.library,
                currentProjectId: state.currentProjectId,
              },
            }))
          }

          // 尝试从 localStorage 加载该项目的测试库
          const storageKey = `test-library-storage-${projectId}`
          const stored = localStorage.getItem(storageKey)
          
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              if (parsed.state?.library) {
                return {
                  library: parsed.state.library,
                  currentProjectId: projectId,
                }
              }
            } catch (e) {
              console.error('Failed to load library from storage:', e)
            }
          }

          // 如果不存在，创建空的测试库
          const newLibrary: TestLibrary = {
            id: projectId,
            userId: 'local',
            name: '默认测试库',
            description: '项目测试库',
            deviceType: undefined,
            protocol: undefined,
            tags: [],
            suites: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          return { library: newLibrary, currentProjectId: projectId }
        }),

      updateLibrary: (updates) =>
        set((state) => {
          if (!state.library) return state
          return {
            library: {
              ...state.library,
              ...updates,
              updatedAt: new Date(),
            },
          }
        }),

      addSuite: (suite) =>
        set((state) => {
          if (!state.library) return state
          
          const newSuite: TestSuite = {
            ...suite,
            id: `suite-${Date.now()}`,
            libraryId: state.library.id,
            order: state.library.suites.length,
            cases: suite.cases || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          return {
            library: {
              ...state.library,
              suites: [newSuite, ...state.library.suites],
              updatedAt: new Date(),
            },
          }
        }),

      updateSuite: (id, updates) =>
        set((state) => {
          if (!state.library) return state
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((suite) =>
                suite.id === id
                  ? { ...suite, ...updates, updatedAt: new Date() }
                  : suite
              ),
              updatedAt: new Date(),
            },
          }
        }),

      deleteSuite: (id) =>
        set((state) => {
          if (!state.library) return state
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.filter((suite) => suite.id !== id),
              updatedAt: new Date(),
            },
          }
        }),

      copySuite: (id) =>
        set((state) => {
          if (!state.library) return state
          
          const suite = state.library.suites.find((s) => s.id === id)
          if (!suite) return state
          
          const copiedSuite: TestSuite = {
            ...suite,
            id: `suite-${Date.now()}`,
            name: `${suite.name} (副本)`,
            order: state.library.suites.length,
            cases: suite.cases.map((c, index) => ({
              ...c,
              id: `case-${Date.now()}-${index}`,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          return {
            library: {
              ...state.library,
              suites: [copiedSuite, ...state.library.suites],
              updatedAt: new Date(),
            },
          }
        }),

      reorderSuites: (suites) =>
        set((state) => {
          if (!state.library) return state

          return {
            library: {
              ...state.library,
              suites: suites.map((s, index) => ({
                ...s,
                order: index,
                updatedAt: new Date(),
              })),
              updatedAt: new Date(),
            },
          }
        }),

      addCase: (suiteId, testCase) =>
        set((state) => {
          if (!state.library) return state
          
          const suite = state.library.suites.find((s) => s.id === suiteId)
          if (!suite) return state
          
          const newCase: TestCase = {
            ...testCase,
            id: `case-${Date.now()}`,
            suiteId,
            order: suite.cases.length,
            runCount: 0,
            passCount: 0,
            failCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as TestCase
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((s) =>
                s.id === suiteId
                  ? {
                      ...s,
                      cases: [...s.cases, newCase],
                      updatedAt: new Date(),
                    }
                  : s
              ),
              updatedAt: new Date(),
            },
          }
        }),

      updateCase: (suiteId, caseId, updates) =>
        set((state) => {
          if (!state.library) return state
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((suite) =>
                suite.id === suiteId
                  ? {
                      ...suite,
                      cases: suite.cases.map((c) =>
                        c.id === caseId
                          ? { ...c, ...updates, updatedAt: new Date() }
                          : c
                      ),
                      updatedAt: new Date(),
                    }
                  : suite
              ),
              updatedAt: new Date(),
            },
          }
        }),

      deleteCase: (suiteId, caseId) =>
        set((state) => {
          if (!state.library) return state
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((suite) =>
                suite.id === suiteId
                  ? {
                      ...suite,
                      cases: suite.cases.filter((c) => c.id !== caseId),
                      updatedAt: new Date(),
                    }
                  : suite
              ),
              updatedAt: new Date(),
            },
          }
        }),

      copyCase: (suiteId, caseId) =>
        set((state) => {
          if (!state.library) return state
          
          const suite = state.library.suites.find((s) => s.id === suiteId)
          if (!suite) return state
          
          const testCase = suite.cases.find((c) => c.id === caseId)
          if (!testCase) return state
          
          const copiedCase: TestCase = {
            ...testCase,
            id: `case-${Date.now()}`,
            name: `${testCase.name} (副本)`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((s) =>
                s.id === suiteId
                  ? {
                      ...s,
                      cases: [...s.cases, copiedCase],
                      updatedAt: new Date(),
                    }
                  : s
              ),
              updatedAt: new Date(),
            },
          }
        }),

      reorderCases: (suiteId, cases) =>
        set((state) => {
          if (!state.library) return state

          return {
            library: {
              ...state.library,
              suites: state.library.suites.map((suite) =>
                suite.id === suiteId
                  ? {
                      ...suite,
                      cases: cases.map((c, index) => ({
                        ...c,
                        order: index,
                        updatedAt: new Date(),
                      })),
                      updatedAt: new Date(),
                    }
                  : suite
              ),
              updatedAt: new Date(),
            },
          }
        }),

      clearLibrary: () => set({ library: null, currentProjectId: null }),
    }),
    {
      name: 'test-library-storage', // localStorage key (legacy, 保留兼容性)
      // 只持久化本地数据，不包含函数
      partialize: (state) => ({ 
        library: state.library,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
)

