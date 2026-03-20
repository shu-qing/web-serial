import { Icon } from '@/components/common/Icons'
import { useState, useEffect, useRef } from 'react'
import { TestSuite, TestCase, TestExecutionStatus, TestVariable } from '@/types'
import Modal from '@/components/common/Modal'
import TestCaseModal from '@/components/TestLibrary/TestCaseModal'
import VariableInputModal from '@/components/TestLibrary/VariableInputModal'
import { useUIStore } from '@/stores/useUIStore'
import { useSerialStore } from '@/stores/useSerialStore'
import { useTestLibraryStore } from '@/stores/useTestLibraryStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { testExecutor } from '@/lib/testExecutor'
import { serialManager } from '@/lib/serialManager'
import { useTranslation } from 'react-i18next'

export default function TestLibPanel() {
  const { t } = useTranslation()
  const { showToast } = useUIStore()
  
  // 获取当前项目
  const currentProject = useProjectStore((state) => state.currentProject)
  
  // 使用测试库 store（自动持久化到 localStorage）
  const library = useTestLibraryStore((state) => state.library)
  const loadLibraryForProject = useTestLibraryStore((state) => state.loadLibraryForProject)
  const addSuite = useTestLibraryStore((state) => state.addSuite)
  const updateSuite = useTestLibraryStore((state) => state.updateSuite)
  const deleteSuite = useTestLibraryStore((state) => state.deleteSuite)
  const copySuite = useTestLibraryStore((state) => state.copySuite)
  const addCase = useTestLibraryStore((state) => state.addCase)
  const updateCase = useTestLibraryStore((state) => state.updateCase)
  const deleteCase = useTestLibraryStore((state) => state.deleteCase)
  const copyCase = useTestLibraryStore((state) => state.copyCase)
  const reorderCases = useTestLibraryStore((state) => state.reorderCases)
  const reorderSuites = useTestLibraryStore((state) => state.reorderSuites)

  // 监听项目切换，重新加载测试库
  useEffect(() => {
    if (currentProject?.id) {
      loadLibraryForProject(currentProject.id)
    }
  }, [currentProject?.id, loadLibraryForProject])

  const testSuites = library?.suites || []

  // 新建/编辑测试单模态框
  const [showSuiteModal, setShowSuiteModal] = useState(false)
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [suiteName, setSuiteName] = useState('')
  const [suiteDesc, setSuiteDesc] = useState('')
  const [suiteError, setSuiteError] = useState('')
  const [suiteActiveTab, setSuiteActiveTab] = useState<'basic' | 'advanced'>('basic')
  const [suiteVariables, setSuiteVariables] = useState<TestVariable[]>([])
  const [suiteRepeatCount, setSuiteRepeatCount] = useState(1)
  const [suiteRepeatDelay, setSuiteRepeatDelay] = useState(1000)
  const [suiteStopOnError, setSuiteStopOnError] = useState(false)

  // 测试用例模态框
  const [showTestCaseModal, setShowTestCaseModal] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [currentSuiteId, setCurrentSuiteId] = useState<string>('')

  // 变量输入模态框
  const [showVariableModal, setShowVariableModal] = useState(false)
  const [pendingTestCase, setPendingTestCase] = useState<TestCase | null>(null)
  const [pendingTestSuite, setPendingTestSuite] = useState<TestSuite | null>(null)

  // 执行状态
  const [executionStatus, setExecutionStatus] = useState<Map<string, TestExecutionStatus>>(new Map())
  const [isExecuting, setIsExecuting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [executingSuiteId, setExecutingSuiteId] = useState<string | null>(null)
  const pauseRef = useRef(false)
  
  // 保存暂停时的执行上下文，用于恢复
  const pausedContextRef = useRef<{
    suite: TestSuite
    variables: Record<string, unknown>
    currentRun: number
    currentCaseIndex: number // 当前执行到哪个测试用例
    totalPassCount: number
    totalFailCount: number
    totalErrorCount: number
  } | null>(null)
  
  // 测试单执行统计
  const [suiteStats, setSuiteStats] = useState<{
    suiteName: string
    startTime: Date
    endTime?: Date
    currentRun: number
    totalRuns: number
    passCount: number
    failCount: number
    errorCount: number
    isRunning: boolean
  } | null>(null)
  
  // 展开/折叠状态
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set(['example-echo-test']))

  // 测试用例拖放状态
  const [draggedCase, setDraggedCase] = useState<{ suiteId: string; caseId: string } | null>(null)
  const [dragOverCase, setDragOverCase] = useState<string | null>(null)

  // 测试单拖放状态
  const [draggedSuite, setDraggedSuite] = useState<string | null>(null)
  const [dragOverSuite, setDragOverSuite] = useState<string | null>(null)

  // 获取串口状态
  const { isConnected, setStatusMessage } = useSerialStore()
  
  // 切换测试单展开/折叠
  const toggleSuiteExpand = (suiteId: string) => {
    setExpandedSuites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(suiteId)) {
        newSet.delete(suiteId)
      } else {
        newSet.add(suiteId)
      }
      return newSet
    })
  }
  
  // 打开新建测试单模态框
  const handleOpenNewSuiteModal = () => {
    setEditingSuite(null)
    setSuiteName('')
    setSuiteDesc('')
    setSuiteError('')
    setSuiteActiveTab('basic')
    setSuiteVariables([])
    setSuiteRepeatCount(1)
    setSuiteRepeatDelay(1000)
    setSuiteStopOnError(false)
    setShowSuiteModal(true)
  }
  
  // 打开编辑测试单模态框
  const handleOpenEditSuiteModal = (suite: TestSuite) => {
    setEditingSuite(suite)
    setSuiteName(suite.name)
    setSuiteDesc(suite.description || '')
    setSuiteError('')
    setSuiteActiveTab('basic')
    setSuiteVariables(suite.variables || [])
    // 兼容旧数据：如果 repeatCount 为 0 或未定义，设置为 1
    setSuiteRepeatCount(suite.repeatCount && suite.repeatCount > 0 ? suite.repeatCount : 1)
    setSuiteRepeatDelay(suite.repeatDelay || 1000)
    setSuiteStopOnError(suite.stopOnError || false)
    setShowSuiteModal(true)
  }
  
  // 保存测试单（新建或编辑）
  const handleSaveSuite = () => {
    // 验证
    if (!suiteName.trim()) {
      setSuiteError('请输入测试单名称')
      return
    }
    
    if (editingSuite) {
      // 编辑模式
      updateSuite(editingSuite.id, {
        name: suiteName.trim(),
        description: suiteDesc.trim() || undefined,
        variables: suiteVariables.length > 0 ? suiteVariables : undefined,
        repeatCount: suiteRepeatCount,
        repeatDelay: suiteRepeatDelay,
        stopOnError: suiteStopOnError,
      })
      setShowSuiteModal(false)
      showToast('success', t('notification.suiteUpdated', { defaultValue: 'Test suite "{{name}}" updated', name: suiteName }))
    } else {
      // 新建模式
      const suiteId = `suite-${Date.now()}`
      addSuite({
        name: suiteName.trim(),
        description: suiteDesc.trim() || undefined,
        tags: [],
        variables: suiteVariables.length > 0 ? suiteVariables : undefined,
        repeatCount: suiteRepeatCount,
        repeatDelay: suiteRepeatDelay,
        stopOnError: suiteStopOnError,
      cases: [],
      })
    
    // 默认展开新建的测试单
      setExpandedSuites((prev) => new Set(prev).add(suiteId))
    
      setShowSuiteModal(false)
      showToast('success', t('notification.suiteCreated', { defaultValue: 'Test suite "{{name}}" created', name: suiteName }))
    }
  }
  
  // 删除测试单
  const handleDeleteSuite = (suiteId: string, suiteName: string) => {
    const confirmed = window.confirm(t('testLib.confirmDeleteSuite', { 
      defaultValue: '确定要删除测试单"{{name}}"吗？\n\n此操作不可恢复！',
      name: suiteName 
    }))
    if (!confirmed) return
    
    deleteSuite(suiteId) // 自动保存到 localStorage
    setExpandedSuites((prev) => {
      const newSet = new Set(prev)
      newSet.delete(suiteId)
      return newSet
    })
    showToast('success', t('notification.suiteDeleted', { defaultValue: 'Test suite "{{name}}" deleted', name: suiteName }))
  }
  
  // 复制测试单
  const handleCopySuite = (suite: TestSuite) => {
    copySuite(suite.id) // 自动保存到 localStorage
    showToast('success', t('notification.suiteCopied', { defaultValue: 'Test suite "{{name}}" copied', name: suite.name }))
  }
  
  // 设置串口（不会覆盖回调，只设置实例）
  useEffect(() => {
    const currentPort = serialManager.getCurrentPort()
    testExecutor.setSerialPort(currentPort)
  }, [isConnected])

  // 执行测试单（批量执行）
  const handleRunSuite = async (suite: TestSuite) => {
    // 如果已暂停，则恢复执行
    if (isPaused && pausedContextRef.current) {
      const { suite: pausedSuite, variables, currentRun, currentCaseIndex } = pausedContextRef.current
      
      // 计算总轮次
      const repeatCount = pausedSuite.repeatCount || 1
      const totalRuns = repeatCount
      
      // 检查是否还有剩余轮次或剩余测试用例
      const hasMoreCases = currentCaseIndex < pausedSuite.cases.length
      const hasMoreRuns = currentRun < totalRuns
      
      if (!hasMoreCases && !hasMoreRuns) {
        setStatusMessage(t('testLib.allTestsCompleted', { defaultValue: '测试已完成，所有轮次和用例已执行完毕' }), 'info')
        setSuiteStats(prev => prev ? {
          ...prev,
          endTime: new Date(),
          isRunning: false,
        } : null)
        // 清除暂停状态
        setIsPaused(false)
        setExecutingSuiteId(null)
        pausedContextRef.current = null
        pauseRef.current = false
        return
      }
      
      // 重置暂停状态
      pauseRef.current = false
      setIsPaused(false)
      
      // 从暂停的位置继续执行
      executeTestSuite(pausedSuite, variables, currentRun, currentCaseIndex)
      return
    }

    if (!isConnected) {
      setStatusMessage(t('testLib.connectSerialFirst', { defaultValue: '请先连接串口' }), 'error')
      return
    }

    if (suite.cases.length === 0) {
      setStatusMessage(t('testLib.noCasesInSuite', { defaultValue: '测试单中没有测试用例' }), 'warning')
      return
    }

    // 收集所有变量（测试单全局变量 + 测试用例变量）
    const allVariables: TestVariable[] = []
    const variableNames = new Set<string>()
    
    // 添加测试单全局变量
    if (suite.variables) {
      suite.variables.forEach(v => {
        allVariables.push(v)
        variableNames.add(v.name)
      })
    }
    
    // 添加测试用例变量（去重）
    suite.cases.forEach(c => {
      if (c.variables) {
        c.variables.forEach(v => {
          if (!variableNames.has(v.name)) {
            allVariables.push(v)
            variableNames.add(v.name)
          }
        })
      }
    })
    
    // 检查是否需要用户输入：只有当存在必需变量且没有默认值时才弹窗
    const needsUserInput = allVariables.some(v => {
      return v.required && (!v.defaultValue || v.defaultValue === '')
    })
    
    if (needsUserInput) {
      setPendingTestSuite(suite)
      setShowVariableModal(true)
      return
    }

    // 直接执行（使用默认值）
    executeTestSuite(suite, {})
  }

  // 执行测试单的实际逻辑
  const executeTestSuite = async (
    suite: TestSuite, 
    variables: Record<string, unknown>, 
    resumeFromRun: number = 0,
    startCaseIndex: number = 0 // 从哪个测试用例开始执行
  ) => {
    setIsExecuting(true)
    setExecutingSuiteId(suite.id)
    
    const repeatCount = suite.repeatCount || 1
    const totalRuns = repeatCount // 执行总次数
    const startTime = suiteStats?.startTime || new Date()
    
    // 初始化或恢复统计信息
    if (resumeFromRun === 0) {
      setSuiteStats({
        suiteName: suite.name,
        startTime,
        currentRun: 0,
        totalRuns,
        passCount: 0,
        failCount: 0,
        errorCount: 0,
        isRunning: true,
      })
    } else {
      setSuiteStats(prev => prev ? { ...prev, isRunning: true } : null)
    }
    
    // 显示开始消息
    setStatusMessage(
      repeatCount > 1
        ? t('testLib.startExecutingSuiteWithRepeat', { 
            defaultValue: '开始执行测试单【{{name}}】（将执行{{count}}次）',
            name: suite.name,
            count: repeatCount
          })
        : t('testLib.startExecutingSuite', { 
            defaultValue: '开始执行测试单【{{name}}】',
            name: suite.name
          }),
      'info'
    )

    // 合并测试单全局变量的默认值和用户提供的变量
    const mergedVariables: Record<string, unknown> = {}
    
    // 首先应用测试单全局变量的默认值
    if (suite.variables) {
      suite.variables.forEach(v => {
        if (v.defaultValue !== undefined && v.defaultValue !== '') {
          mergedVariables[v.name] = v.defaultValue
        }
      })
    }
    
    // 然后用用户提供的值覆盖
    Object.assign(mergedVariables, variables)

    // 从暂停的上下文恢复或从0开始
    let totalPassCount = resumeFromRun > 0 && pausedContextRef.current ? pausedContextRef.current.totalPassCount : 0
    let totalFailCount = resumeFromRun > 0 && pausedContextRef.current ? pausedContextRef.current.totalFailCount : 0
    let totalErrorCount = resumeFromRun > 0 && pausedContextRef.current ? pausedContextRef.current.totalErrorCount : 0

    try {
      for (let run = resumeFromRun; run < totalRuns; run++) {
        // 检查是否暂停
        if (pauseRef.current) {
          setStatusMessage(t('testLib.testPaused', { defaultValue: '测试已暂停' }), 'warning')
          return // 退出执行
        }
        
        // 更新当前执行次数
        setSuiteStats(prev => prev ? { 
          ...prev, 
          currentRun: run + 1,
        } : null)
        
        // 显示执行进度
        if (repeatCount > 1) {
          setStatusMessage(t('testLib.executingRun', {
            defaultValue: '正在执行第 {{current}}/{{total}} 次',
            current: run + 1,
            total: totalRuns
          }), 'info')
        }

        // 确定要执行的测试用例范围
        const casesToExecute = run === resumeFromRun 
          ? suite.cases.slice(startCaseIndex) // 恢复执行时，从保存的索引开始
          : suite.cases // 新一轮执行时，执行所有用例
        
        // 如果是新一轮，重置所有测试用例的执行结果（清除背景颜色）
        if (run > resumeFromRun || startCaseIndex === 0) {
          suite.cases.forEach((testCase) => {
            updateCase(suite.id, testCase.id, {
              lastRunAt: undefined,
              lastResult: undefined,
              lastError: undefined,
              lastDuration: undefined,
            })
          })
        }

        // 等待一小段时间让UI更新
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // 记录已完成的测试用例数量（用于暂停时保存位置）
        let completedCasesInThisRun = startCaseIndex

        const results = await testExecutor.executeTestCases(
          casesToExecute,
          {
            stopOnError: suite.stopOnError || false,
            delayBetweenTests: 1000,
            variables: mergedVariables,
          },
          (caseId, status) => {
            setExecutionStatus((prev) => new Map(prev).set(caseId, status))
          },
          (result) => {
            // 更新已完成的测试用例计数
            completedCasesInThisRun++
            
            // 更新测试用例的执行结果（自动保存到 localStorage）
            updateCase(suite.id, result.testCaseId, {
              lastRunAt: new Date(),
              lastResult: result.result,
              lastError: result.errorMessage,
              lastDuration: result.duration,
              runCount: (suite.cases.find((c) => c.id === result.testCaseId)?.runCount || 0) + 1,
              passCount:
                result.result === 'pass'
                  ? (suite.cases.find((c) => c.id === result.testCaseId)?.passCount || 0) + 1
                  : suite.cases.find((c) => c.id === result.testCaseId)?.passCount,
              failCount:
                result.result === 'fail'
                  ? (suite.cases.find((c) => c.id === result.testCaseId)?.failCount || 0) + 1
                  : suite.cases.find((c) => c.id === result.testCaseId)?.failCount,
            })
          }
        )

        const passCount = results.filter((r) => r.result === 'pass').length
        const failCount = results.filter((r) => r.result === 'fail').length
        const errorCount = results.filter((r) => r.result === 'error').length

        // 累计统计
        totalPassCount += passCount
        totalFailCount += failCount
        totalErrorCount += errorCount
        
        // 更新统计信息
        setSuiteStats(prev => prev ? {
          ...prev,
          passCount: totalPassCount,
          failCount: totalFailCount,
          errorCount: totalErrorCount,
        } : null)
        
        // 再次检查是否暂停（在测试用例执行期间可能已点击暂停）
        if (pauseRef.current) {
          // 检查是否还有下一轮测试或剩余测试用例
          const hasMoreCasesInThisRun = completedCasesInThisRun < suite.cases.length
          const hasNextRun = (run + 1) < totalRuns
          
          // 确定下次继续的位置
          let nextRun = run
          let nextCaseIndex = completedCasesInThisRun
          
          if (!hasMoreCasesInThisRun && hasNextRun) {
            // 当前轮的测试用例已全部完成，从下一轮的第一个用例开始
            nextRun = run + 1
            nextCaseIndex = 0
          }
          
          // 保存当前执行上下文，用于恢复
          pausedContextRef.current = {
            suite,
            variables: mergedVariables,
            currentRun: nextRun,
            currentCaseIndex: nextCaseIndex,
            totalPassCount,
            totalFailCount,
            totalErrorCount,
          }
          
          setSuiteStats(prev => prev ? {
            ...prev,
            isRunning: false,
          } : null)
          
          const totalCases = suite.cases.length
          if (hasMoreCasesInThisRun) {
            setStatusMessage(t('testLib.pausedWithProgress', {
              defaultValue: '测试已暂停（第 {{current}}/{{total}} 次，已完成 {{completed}}/{{totalCases}} 个用例）',
              current: run + 1,
              total: totalRuns,
              completed: completedCasesInThisRun,
              totalCases
            }), 'warning')
          } else if (hasNextRun) {
            setStatusMessage(t('testLib.pausedRunCompleted', {
              defaultValue: '测试已暂停（第 {{current}}/{{total}} 次已完成）',
              current: run + 1,
              total: totalRuns
            }), 'warning')
          } else {
            setStatusMessage(t('testLib.pausedAllCompleted', { defaultValue: '测试已暂停（已完成所有轮次）' }), 'warning')
          }
          return
        }
        
        setStatusMessage(t('testLib.runCompleted', {
          defaultValue: '完成第 {{current}} 次执行',
          current: run + 1
        }), 'info')

        // 如果有失败且设置了失败时停止，终止重复执行
        if ((failCount > 0 || errorCount > 0) && suite.stopOnError) {
          setSuiteStats(prev => prev ? {
            ...prev,
            endTime: new Date(),
            isRunning: false,
          } : null)
          setStatusMessage(t('testLib.stoppedOnFailure', {
            defaultValue: '第 {{current}} 次执行有失败，已停止重复执行',
            current: run + 1
          }), 'warning')
          break
        }

        if (run === totalRuns - 1) {
          // 最后一次执行，标记完成
          setSuiteStats(prev => prev ? {
            ...prev,
            endTime: new Date(),
            isRunning: false,
          } : null)
          
          setStatusMessage(
            totalPassCount === results.length * totalRuns 
              ? t('testLib.allTestsPassed', { defaultValue: '所有测试通过！' })
              : t('testLib.testsCompleted', {
                  defaultValue: '测试完成：{{pass}} 通过，{{fail}} 失败{{error}}',
                  pass: totalPassCount,
                  fail: totalFailCount,
                  error: totalErrorCount > 0 ? `，${totalErrorCount} ${t('testLib.errors', { defaultValue: '错误' })}` : ''
                }),
            totalPassCount === results.length * totalRuns ? 'success' : 'warning'
          )
        } else {
          // 非最后一次，等待间隔后继续
          setStatusMessage(t('testLib.waitingToContinue', {
            defaultValue: '等待 {{seconds}} 秒后继续...',
            seconds: (suite.repeatDelay || 1000) / 1000
          }), 'info')
          await new Promise((resolve) => setTimeout(resolve, suite.repeatDelay || 1000))
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('testLib.unknownError', { defaultValue: '未知错误' })
      setSuiteStats(prev => prev ? {
        ...prev,
        endTime: new Date(),
        isRunning: false,
      } : null)
      setStatusMessage(t('testLib.executionFailed', {
        defaultValue: '执行失败：{{error}}',
        error: errorMessage
      }), 'error')
    } finally {
      // 只有在不是暂停状态时才清理
      if (!pauseRef.current) {
        setIsExecuting(false)
        setIsPaused(false)
        setExecutingSuiteId(null)
        pausedContextRef.current = null
        setExecutionStatus(new Map())
      }
    }
  }
  
  // 暂停测试执行
  const handlePauseTest = () => {
    pauseRef.current = true
    setIsPaused(true)
    setIsExecuting(false)
    testExecutor.cancel() // 立即取消当前执行的测试用例
    setStatusMessage(t('testLib.testPaused', { defaultValue: '测试已暂停' }), 'warning')
  }
  
  // 新建测试命令
  const handleNewTestCase = (suiteId: string) => {
    setCurrentSuiteId(suiteId)
    setEditingTestCase(null)
    setShowTestCaseModal(true)
  }

  // 执行单个测试用例
  const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase.isEnabled) {
      setStatusMessage(t('testLib.caseDisabled', { defaultValue: '该测试用例未启用' }), 'warning')
      return
    }

    if (!isConnected) {
      setStatusMessage(t('testLib.connectSerialFirst', { defaultValue: '请先连接串口' }), 'error')
      return
    }

    // 检查是否需要变量输入：只有当存在必需变量且没有默认值时才弹窗
    const needsUserInput = testCase.variables && testCase.variables.some(v => {
      return v.required && (!v.defaultValue || v.defaultValue === '')
    })
    
    if (needsUserInput) {
      setPendingTestCase(testCase)
      setShowVariableModal(true)
      return
    }

    // 直接执行（使用默认值）
    executeTestCase(testCase, {})
  }

  // 执行测试用例的实际逻辑
  const executeTestCase = async (testCase: TestCase, variables: Record<string, unknown>) => {
    setIsExecuting(true)
    const startTime = new Date()
    
    // 初始化统计面板
    setSuiteStats({
      suiteName: testCase.name,
      startTime,
      currentRun: 1,
      totalRuns: 1,
      passCount: 0,
      failCount: 0,
      errorCount: 0,
      isRunning: true,
    })
    
    setStatusMessage(t('testLib.executingCase', {
      defaultValue: '正在执行测试用例【{{name}}】...',
      name: testCase.name
    }), 'info')

    try {
      const result = await testExecutor.executeTestCase(testCase, variables, (status) => {
        setExecutionStatus((prev) => new Map(prev).set(testCase.id, status))
        // 更新状态栏消息
        setStatusMessage(status.message || t('testLib.executing', { defaultValue: '执行中...' }), 'info')
      })

      // 更新测试用例的执行结果（自动保存到 localStorage）
      const updates = {
        lastRunAt: new Date(),
        lastResult: result.result,
        lastError: result.errorMessage,
        lastDuration: result.duration,
        runCount: testCase.runCount + 1,
        passCount: result.result === 'pass' ? testCase.passCount + 1 : testCase.passCount,
        failCount: result.result === 'fail' ? testCase.failCount + 1 : testCase.failCount,
      }
      
      updateCase(testCase.suiteId, testCase.id, updates)

      // 更新统计面板
      setSuiteStats(prev => prev ? {
        ...prev,
        endTime: new Date(),
        isRunning: false,
        passCount: result.result === 'pass' ? 1 : 0,
        failCount: result.result === 'fail' ? 1 : 0,
        errorCount: result.result === 'error' ? 1 : 0,
      } : null)
      
      // 显示结果消息
      if (result.result === 'pass') {
        setStatusMessage(t('testLib.casePassedWithDuration', {
          defaultValue: '测试通过：{{name}} ({{duration}}ms)',
          name: testCase.name,
          duration: result.duration
        }), 'success')
      } else if (result.result === 'fail') {
        setStatusMessage(t('testLib.caseFailed', {
          defaultValue: '测试失败：{{name}}',
          name: testCase.name
        }), 'error')
      } else {
        setStatusMessage(t('testLib.caseError', {
          defaultValue: '测试错误：{{error}}',
          error: result.errorMessage
        }), 'error')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('testLib.unknownError', { defaultValue: '未知错误' })
      console.error('[TestLibPanel] 测试执行错误:', error)
      
      setSuiteStats(prev => prev ? {
        ...prev,
        endTime: new Date(),
        isRunning: false,
        errorCount: 1,
      } : null)
      
      setStatusMessage(t('testLib.executionFailed', {
        defaultValue: '执行失败：{{error}}',
        error: errorMessage
      }), 'error')
    } finally {
      setIsExecuting(false)
      setExecutionStatus((prev) => {
        const newMap = new Map(prev)
        newMap.delete(testCase.id)
        return newMap
      })
    }
  }

  // 处理变量输入确认
  const handleVariableConfirm = (variables: Record<string, unknown>) => {
    if (pendingTestCase) {
      executeTestCase(pendingTestCase, variables)
      setPendingTestCase(null)
    } else if (pendingTestSuite) {
      executeTestSuite(pendingTestSuite, variables)
      setPendingTestSuite(null)
    }
  }
  
  // 编辑测试用例
  const handleEditTestCase = (testCase: TestCase) => {
    setCurrentSuiteId(testCase.suiteId)
    setEditingTestCase(testCase)
    setShowTestCaseModal(true)
  }

  // 保存测试用例（创建或更新）
  const handleSaveTestCase = (testCaseData: Partial<TestCase>) => {
    if (editingTestCase) {
      // 更新现有测试用例（自动保存到 localStorage）
      updateCase(currentSuiteId, editingTestCase.id, testCaseData)
      showToast('success', t('notification.caseUpdated', { defaultValue: 'Test case "{{name}}" updated', name: testCaseData.name }))
    } else {
      // 创建新测试用例（自动保存到 localStorage）
      const caseData = {
        name: testCaseData.name || '新测试用例',
        description: testCaseData.description,
        command: testCaseData.command || '',
        encoding: (testCaseData.encoding || 'utf-8') as 'utf-8' | 'hex',
        lineEnding: (testCaseData.lineEnding || 'none') as 'none' | 'cr' | 'lf' | 'crlf',
        expectedResponse: testCaseData.expectedResponse,
        timeout: testCaseData.timeout || 1000,
        assertions: testCaseData.assertions,
        preconditions: testCaseData.preconditions,
        variables: testCaseData.variables,
        checksumType: testCaseData.checksumType,
        checksumPosition: testCaseData.checksumPosition,
        retryCount: testCaseData.retryCount || 0,
        retryDelay: testCaseData.retryDelay || 1000,
        continueOnFail: testCaseData.continueOnFail || false,
        tags: testCaseData.tags || [],
        isEnabled: testCaseData.isEnabled !== false,
        lastRunAt: testCaseData.lastRunAt,
        lastResult: testCaseData.lastResult,
        lastError: testCaseData.lastError,
        lastDuration: testCaseData.lastDuration,
      }
      addCase(currentSuiteId, caseData)
      showToast('success', t('notification.caseCreated', { defaultValue: 'Test case "{{name}}" created', name: testCaseData.name }))
    }
  }
  
  // 复制测试用例
  const handleCopyTestCase = (testCase: TestCase) => {
    copyCase(testCase.suiteId, testCase.id) // 自动保存到 localStorage
    showToast('success', t('notification.caseCopied', { defaultValue: 'Test case "{{name}}" copied', name: testCase.name }))
  }
  
  // 删除测试用例
  const handleDeleteTestCase = (suiteId: string, caseId: string, caseName: string) => {
    const confirmed = window.confirm(t('testLib.confirmDeleteCase', { 
      defaultValue: '确定要删除测试用例"{{name}}"吗？',
      name: caseName 
    }))
    if (!confirmed) return
    
    deleteCase(suiteId, caseId) // 自动保存到 localStorage
    showToast('success', t('notification.caseDeleted', { defaultValue: 'Test case "{{name}}" deleted', name: caseName }))
  }
  
  // 测试单拖放处理
  const handleSuiteDragStart = (e: React.DragEvent, suiteId: string) => {
    setDraggedSuite(suiteId)
    e.dataTransfer.effectAllowed = 'move'
    ;(e.target as HTMLElement).style.opacity = '0.5'
  }

  const handleSuiteDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1'
    setDraggedSuite(null)
    setDragOverSuite(null)
  }

  const handleSuiteDragOver = (e: React.DragEvent, suiteId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSuite(suiteId)
  }

  const handleSuiteDragLeave = () => {
    setDragOverSuite(null)
  }

  const handleSuiteDrop = (e: React.DragEvent, targetSuiteId: string) => {
    e.preventDefault()

    if (!draggedSuite || draggedSuite === targetSuiteId) {
      setDraggedSuite(null)
      setDragOverSuite(null)
      return
    }

    // 获取当前顺序（已排序）
    const suites = [...testSuites].sort((a, b) => a.order - b.order)
    const draggedIndex = suites.findIndex((s) => s.id === draggedSuite)
    const targetIndex = suites.findIndex((s) => s.id === targetSuiteId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // 重新排序
    const [removed] = suites.splice(draggedIndex, 1)
    suites.splice(targetIndex, 0, removed)

    // 一次性更新整个测试库的 suites
    reorderSuites(suites)

    setDraggedSuite(null)
    setDragOverSuite(null)
    showToast('success', t('notification.suiteOrderUpdated', { defaultValue: 'Test suite order updated' }))
  }

  // 测试用例拖放处理
  const handleDragStart = (e: React.DragEvent, suiteId: string, caseId: string) => {
    setDraggedCase({ suiteId, caseId })
    e.dataTransfer.effectAllowed = 'move'
    // 添加拖动样式
    ;(e.target as HTMLElement).style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1'
    setDraggedCase(null)
    setDragOverCase(null)
  }

  const handleDragOver = (e: React.DragEvent, caseId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCase(caseId)
  }

  const handleDragLeave = () => {
    setDragOverCase(null)
  }

  const handleDrop = (e: React.DragEvent, targetSuiteId: string, targetCaseId: string) => {
    e.preventDefault()
    
    if (!draggedCase || draggedCase.suiteId !== targetSuiteId) {
      return
    }

    if (draggedCase.caseId === targetCaseId) {
      setDraggedCase(null)
      setDragOverCase(null)
      return
    }

    // 找到源测试单
    const suite = testSuites.find((s) => s.id === targetSuiteId)
    if (!suite) return

    // 获取当前顺序（已排序）
    const cases = [...suite.cases].sort((a, b) => a.order - b.order)
    const draggedIndex = cases.findIndex((c) => c.id === draggedCase.caseId)
    const targetIndex = cases.findIndex((c) => c.id === targetCaseId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // 重新排序
    const [removed] = cases.splice(draggedIndex, 1)
    cases.splice(targetIndex, 0, removed)

    // 一次性更新整个测试单的 cases（更高效）
    reorderCases(targetSuiteId, cases)

    setDraggedCase(null)
    setDragOverCase(null)
    showToast('success', t('notification.caseOrderUpdated', { defaultValue: 'Test case order updated' }))
  }
  
  // 工具栏按钮处理
  const handleAIImport = () => {
    showToast('info', 'AI ' + t('notification.inDevelopment'))
  }
  
  const handleUploadTestLib = () => {
    showToast('info', t('testLib.import', { defaultValue: 'Import' }) + ' ' + t('notification.inDevelopment'))
  }
  
  const handleDownloadTestLib = () => {
    showToast('info', t('testLib.export', { defaultValue: 'Export' }) + ' ' + t('notification.inDevelopment'))
  }
  
  const handleGenerateReport = () => {
    showToast('info', t('testLib.report', { defaultValue: 'Report' }) + ' ' + t('notification.inDevelopment'))
  }
  
  // 重置测试单结果
  const handleResetSuite = (suite: TestSuite) => {
    // 重置所有测试用例的执行结果
    suite.cases.forEach(testCase => {
      updateCase(suite.id, testCase.id, {
        lastResult: undefined,
        lastError: undefined,
        lastDuration: undefined,
        lastRunAt: undefined,
      })
    })
    
    // 清除执行状态
    const newExecutionStatus = new Map(executionStatus)
    suite.cases.forEach(testCase => {
      newExecutionStatus.delete(testCase.id)
    })
    setExecutionStatus(newExecutionStatus)
    
    showToast('success', t('testLib.resetSuccess', { defaultValue: '测试结果已重置' }))
  }
  
  return (
    <>
      {/* 标题栏 */}
      <div className="h-10 px-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t('testLib.testLibrary')}</h3>
        <div className="flex items-center">
          <button 
            onClick={handleAIImport}
            className="test-lib-icon-btn" 
            title="AI Import"
          >
            <Icon name="ai" className="w-4 h-4" />
          </button>
          <button 
            onClick={handleUploadTestLib}
            className="test-lib-icon-btn" 
            title="Import"
          >
            <Icon name="import" className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDownloadTestLib}
            className="test-lib-icon-btn" 
            title="Export"
          >
            <Icon name="export-alt" className="w-4 h-4" />
          </button>
          <button 
            onClick={handleGenerateReport}
            className="test-lib-icon-btn" 
            title="Report"
          >
            <Icon name="report" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 测试单列表（可滚动区域） */}
      <div className="overflow-y-auto scrollbar-thin p-4 flex-1">
        {/* 新建测试单按钮 */}
        <div 
          onClick={handleOpenNewSuiteModal}
          className="test-suite new-suite-btn mb-2 cursor-pointer border-dashed border-2 border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 rounded-md transition-all"
        >
          <div className="flex items-center justify-center py-2">
            <Icon name="plus" className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-xs font-semibold text-blue-600">{t('testLib.newSuite')}</span>
          </div>
        </div>

        {/* 测试单列表 */}
        {testSuites
          .sort((a, b) => a.order - b.order)
          .map((suite) => {
          const isExpanded = expandedSuites.has(suite.id)
          
          return (
            <div 
              key={suite.id} 
              draggable={!isExecuting}
              onDragStart={(e) => handleSuiteDragStart(e, suite.id)}
              onDragEnd={handleSuiteDragEnd}
              onDragOver={(e) => handleSuiteDragOver(e, suite.id)}
              onDragLeave={handleSuiteDragLeave}
              onDrop={(e) => handleSuiteDrop(e, suite.id)}
              className={`test-suite mb-2 ${dragOverSuite === suite.id ? 'drag-over-suite' : ''}`}
              style={{ cursor: isExecuting ? 'default' : 'move' }}
            >
              <div 
                className="test-suite-header"
                style={isExpanded ? { background: '#F3F4F6' } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <button 
                      onClick={() => toggleSuiteExpand(suite.id)}
                      className="suite-expand-btn" 
                      title={isExpanded ? t('common.collapse', { defaultValue: 'Collapse' }) : t('common.expand', { defaultValue: 'Expand' })}
                    >
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                    <span className="suite-name">{suite.name}</span>
                    <span className="suite-count ml-1 text-xs text-gray-500">({suite.cases.length})</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResetSuite(suite)
                      }}
                      className="test-lib-icon-btn text-gray-600 hover:bg-gray-50" 
                      title={t('testLib.resetSuite', { defaultValue: '重置测试结果' })}
                    >
                      <Icon name="refresh" className="w-4 h-4" />
                    </button>
                    {/* 执行/暂停按钮 - 根据执行状态切换 */}
                    {executingSuiteId === suite.id && (isExecuting || isPaused) ? (
                      isPaused ? (
                        // 暂停状态 - 显示播放按钮（恢复）
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRunSuite(suite)
                          }}
                          className="test-lib-icon-btn text-green-600 hover:bg-green-50" 
                          title={t('testLib.resumeTest', { defaultValue: '继续测试' })}
                        >
                          <Icon name="play" className="w-4 h-4" />
                        </button>
                      ) : (
                        // 执行状态 - 显示暂停按钮
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePauseTest()
                          }}
                          className="test-lib-icon-btn text-orange-600 hover:bg-orange-50" 
                          title={t('testLib.pauseTest', { defaultValue: '暂停测试' })}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        </button>
                      )
                    ) : (
                      // 未执行状态 - 显示执行按钮
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRunSuite(suite)
                        }}
                        className="test-lib-icon-btn text-green-600 hover:bg-green-50" 
                        title={t('testLib.runEntireSuite', { defaultValue: 'Run entire test suite' })}
                        disabled={isExecuting && executingSuiteId !== suite.id}
                      >
                        <Icon name="play" className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditSuiteModal(suite)
                      }}
                      className="test-lib-icon-btn" 
                      title={t('testLib.editSuite')}
                    >
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopySuite(suite)
                      }}
                      className="test-lib-icon-btn" 
                      title={t('testLib.copySuite', { defaultValue: 'Copy test suite' })}
                    >
                      <Icon name="copy" className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSuite(suite.id, suite.name)
                      }}
                      className="test-lib-icon-btn text-red-600 hover:bg-red-50" 
                      title={t('testLib.deleteSuite', { defaultValue: 'Delete test suite' })}
                    >
                      <Icon name="delete" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 测试用例 - 根据展开状态显示/隐藏 */}
              {isExpanded && (
                <div className="test-cases-container" style={{ padding: '4px 10px 6px 10px', background: 'white' }}>
                  {/* 新建测试命令按钮 */}
                  <div 
                    onClick={() => handleNewTestCase(suite.id)}
                    className="new-case-btn cursor-pointer" 
                    style={{ 
                      background: '#F0F9FF', 
                      borderBottom: '1px solid #DBEAFE',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <Icon name="plus" className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-xs font-semibold text-blue-600">{t('testLib.newCase')}</span>
                    </div>
                  </div>

                  {/* 测试用例列表 */}
                  {suite.cases
                    .sort((a, b) => a.order - b.order)
                    .map((testCase) => {
                    const status = executionStatus.get(testCase.id)
                    const isRunning = status?.status === 'running'
                    
                    // 根据执行结果确定状态类名
                    let statusClass = 'status-pending'
                    let bgColor = '#FAFBFC'
                    let borderLeft = 'none'
                    
                    // 未启用状态
                    if (!testCase.isEnabled) {
                      statusClass = 'status-disabled'
                      bgColor = '#F9FAFB'
                      borderLeft = '3px solid #D1D5DB'
                    } else if (isRunning) {
                      statusClass = 'status-running'
                      bgColor = '#FEF3C7'
                    } else if (testCase.lastResult === 'pass') {
                      statusClass = 'status-passed'
                      bgColor = '#D1FAE5'
                      borderLeft = '3px solid #10B981'
                    } else if (testCase.lastResult === 'fail') {
                      statusClass = 'status-failed'
                      bgColor = '#FEE2E2'
                      borderLeft = '3px solid #EF4444'
                    } else if (testCase.lastResult === 'error') {
                      statusClass = 'status-failed'
                      bgColor = '#FEE2E2'
                      borderLeft = '3px solid #F59E0B'
                    }

                    return (
                    <div 
                      key={testCase.id} 
                        draggable={!isExecuting}
                        onDragStart={(e) => handleDragStart(e, suite.id, testCase.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, testCase.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, suite.id, testCase.id)}
                        className={`test-case-item ${statusClass} ${dragOverCase === testCase.id ? 'drag-over' : ''}`}
                      style={{ 
                        padding: '4px 8px',
                        background: bgColor,
                        border: 'none', 
                        borderLeft: borderLeft,
                        borderBottom: '1px solid #F3F4F6',
                        borderRadius: 0,
                        marginBottom: 0,
                        transition: 'background-color 0.3s ease',
                        cursor: isExecuting ? 'default' : 'move',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            {/* 第一行：名称和状态 */}
                            <div className="flex items-center justify-between" style={{
                              height: '20px',
                              overflow: 'hidden'
                            }}>
                              <div className={`test-case-name text-xs font-medium truncate flex-1 min-w-0 ${!testCase.isEnabled ? 'text-gray-400' : 'text-gray-700'}`} style={{
                                lineHeight: '20px'
                              }}>
                                {testCase.name}
                              </div>
                              {/* 状态区域 - 固定宽度，右对齐 */}
                              <div className="flex-shrink-0 ml-2" style={{ 
                                minWidth: '85px',
                                maxWidth: '120px',
                                fontSize: '10px',
                                lineHeight: '20px',
                                textAlign: 'right',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={
                                !testCase.isEnabled ? '未启用' :
                                isRunning ? (status.message || '执行中...') :
                                testCase.lastResult ? (
                                  (testCase.lastResult === 'pass' ? '✓ ' + t('testLib.passed', { defaultValue: 'Passed' }) :
                                   testCase.lastResult === 'fail' ? '✗ ' + t('testLib.failed', { defaultValue: 'Failed' }) : '⚠ ' + t('testLib.error', { defaultValue: 'Error' })) +
                                  (testCase.lastDuration ? ` · ${testCase.lastDuration}ms` : '')
                                ) : ''
                              }>
                                {!testCase.isEnabled && (
                                  <span className="text-gray-400">
                                    未启用
                                  </span>
                                )}
                                {testCase.isEnabled && isRunning && (
                                  <span className="text-amber-700">
                                    {status.message}
                                  </span>
                                )}
                                {testCase.isEnabled && testCase.lastResult && !isRunning && (
                                  <span className="text-gray-600">
                                    {testCase.lastResult === 'pass' && '✓ ' + t('testLib.passed', { defaultValue: 'Passed' })}
                                    {testCase.lastResult === 'fail' && '✗ ' + t('testLib.failed', { defaultValue: 'Failed' })}
                                    {testCase.lastResult === 'error' && '⚠ ' + t('testLib.error', { defaultValue: 'Error' })}
                                    {testCase.lastDuration && ` · ${testCase.lastDuration}ms`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* 第二行：命令 */}
                            <div className={`test-case-code text-xs font-mono truncate ${!testCase.isEnabled ? 'text-gray-400' : 'text-gray-500'}`}>
                              {testCase.command}
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button 
                            onClick={() => handleRunTestCase(testCase)}
                            className="command-btn bg-blue-50 text-blue-600 hover:bg-blue-100" 
                              title={t('testLib.runCase')}
                              disabled={isExecuting || !testCase.isEnabled}
                          >
                            <Icon name="play" className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleEditTestCase(testCase)}
                            className="command-btn text-gray-500 hover:text-gray-700" 
                            title={t('common.edit')}
                              disabled={isExecuting}
                          >
                            <Icon name="edit" className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleCopyTestCase(testCase)}
                            className="command-btn text-gray-500 hover:text-gray-700" 
                            title={t('common.copy')}
                              disabled={isExecuting}
                          >
                            <Icon name="copy" className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTestCase(suite.id, testCase.id, testCase.name)}
                            className="command-btn-delete" 
                            title={t('common.delete')}
                              disabled={isExecuting}
                          >
                            <Icon name="delete" className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        
        {/* 拖放到末尾的区域 */}
        {testSuites.length > 0 && draggedSuite && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverSuite('_end_')
            }}
            onDragLeave={handleSuiteDragLeave}
            onDrop={(e) => {
              e.preventDefault()
              if (!draggedSuite) return

              // 获取当前顺序（已排序）
              const suites = [...testSuites].sort((a, b) => a.order - b.order)
              const draggedIndex = suites.findIndex((s) => s.id === draggedSuite)

              if (draggedIndex === -1) return

              // 如果已经是最后一个，不需要移动
              if (draggedIndex === suites.length - 1) {
                setDraggedSuite(null)
                setDragOverSuite(null)
                return
              }

              // 移动到最后
              const [removed] = suites.splice(draggedIndex, 1)
              suites.push(removed)

              // 一次性更新整个测试库的 suites
              reorderSuites(suites)

              setDraggedSuite(null)
              setDragOverSuite(null)
            }}
            className={`transition-all ${dragOverSuite === '_end_' ? 'h-12 bg-blue-50 border-2 border-dashed border-blue-400' : 'h-6 bg-transparent border-2 border-dashed border-transparent'}`}
            style={{
              marginBottom: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dragOverSuite === '_end_' && (
              <span className="text-xs text-blue-600 font-medium">
                {t('testLib.dropAsLast', { defaultValue: '放到此处作为最后一个测试单' })}
              </span>
            )}
          </div>
        )}
        
        {/* 空状态提示 */}
        {testSuites.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Icon name="folder" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('testLib.noSuites', { defaultValue: '暂无测试单' })}</p>
            <p className="text-xs mt-1">{t('testLib.clickToCreate', { defaultValue: '点击上方"新建测试单"开始创建' })}</p>
          </div>
        )}
        
        {/* 测试单执行统计信息 */}
        {suiteStats && (
          <div className="border border-gray-200 rounded-md p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              {suiteStats.isRunning || isPaused ? (
                <>
                  <span className={`inline-block w-2 h-2 rounded-full ${isPaused ? 'bg-orange-500' : 'bg-green-500 animate-pulse'}`}></span>
                  {isPaused ? t('testLib.paused', { defaultValue: '已暂停' }) : t('testLib.executing', { defaultValue: '执行中' })}
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                  {t('testLib.completed', { defaultValue: '已完成' })}
                </>
              )}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSuiteStats(null)
                  // 清理暂停状态
                  if (isPaused) {
                    setIsPaused(false)
                    setExecutingSuiteId(null)
                    pausedContextRef.current = null
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-base leading-none"
                title={t('common.close')}
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('testLib.testSuite', { defaultValue: '测试单' })}</span>
              <span className="font-medium text-gray-900 truncate ml-2" title={suiteStats.suiteName}>
                {suiteStats.suiteName}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">{t('testLib.loopCount', { defaultValue: '循环次数' })}</span>
              <span className="font-medium text-gray-900">
                {suiteStats.isRunning 
                  ? `${suiteStats.currentRun} / ${suiteStats.totalRuns}`
                  : `${suiteStats.totalRuns}`
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">{t('testLib.startTime', { defaultValue: '开始时间' })}</span>
              <span className="font-mono text-gray-900">
                {suiteStats.startTime.toLocaleTimeString()}
              </span>
            </div>
            
            {suiteStats.endTime && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('testLib.endTime', { defaultValue: '结束时间' })}</span>
                  <span className="font-mono text-gray-900">
                    {suiteStats.endTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('testLib.totalDuration', { defaultValue: '总时长' })}</span>
                  <span className="font-mono text-gray-900">
                    {((suiteStats.endTime.getTime() - suiteStats.startTime.getTime()) / 1000).toFixed(2)}s
                  </span>
                </div>
              </>
            )}
            
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-gray-600">{t('testLib.testResults', { defaultValue: '测试结果' })}</span>
              <div className="flex gap-3 font-medium">
                <span className="text-green-600">✓ {suiteStats.passCount}</span>
                <span className="text-red-600">✗ {suiteStats.failCount}</span>
                {suiteStats.errorCount > 0 && (
                  <span className="text-orange-600">⚠ {suiteStats.errorCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 新建/编辑测试单模态框 */}
      <Modal
        isOpen={showSuiteModal}
        onClose={() => {
          setShowSuiteModal(false)
          setEditingSuite(null)
        }}
        title={editingSuite ? t('testLib.editSuiteTitle', { defaultValue: '编辑测试单' }) : t('testLib.newSuiteTitle', { defaultValue: '新建测试单' })}
      >
        <div className="space-y-4">
          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSuiteActiveTab('basic')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                suiteActiveTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('testLib.basicInfo', { defaultValue: '基本信息' })}
            </button>
            <button
              onClick={() => setSuiteActiveTab('advanced')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                suiteActiveTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('testLib.advancedOptions', { defaultValue: '高级选项' })}
            </button>
          </div>

          {/* 基本信息标签页 */}
          {suiteActiveTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('testLib.suiteName', { defaultValue: '测试单名称' })} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={suiteName}
              onChange={(e) => {
                    setSuiteName(e.target.value)
                    setSuiteError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                      handleSaveSuite()
                }
              }}
              placeholder={t('testLib.suiteNamePlaceholder', { defaultValue: '例如: ESP32 WiFi测试' })}
              autoFocus
            />
                {suiteError && <p className="mt-1 text-xs text-red-600">{suiteError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('testLib.description', { defaultValue: '描述' })} <span className="text-gray-400 text-xs">({t('testLib.optional', { defaultValue: '可选' })})</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  value={suiteDesc}
                  onChange={(e) => setSuiteDesc(e.target.value)}
              placeholder={t('testLib.descriptionPlaceholder', { defaultValue: '简要描述该测试单的用途...' })}
              rows={3}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-900">
                  💡 <strong>{t('common.tips', { defaultValue: '提示' })}：</strong>{editingSuite ? t('testLib.editSuiteTip', { defaultValue: '修改测试单信息后点击保存' }) : t('testLib.newSuiteTip', { defaultValue: '创建测试单后，可以添加多个测试命令来组成完整的测试流程' })}。
            </p>
          </div>
            </div>
          )}

          {/* 高级选项标签页 */}
          {suiteActiveTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('testLib.globalVariables', { defaultValue: '全局变量' })} <span className="text-gray-400 text-xs">({t('testLib.optional', { defaultValue: '可选' })})</span>
                  </label>
                  <button
                    onClick={() => {
                      setSuiteVariables([
                        ...suiteVariables,
                        { name: '', type: 'string', description: '', defaultValue: '' },
                      ])
                    }}
                    className="px-2 py-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  >
                    + {t('testLib.addVariable', { defaultValue: '添加变量' })}
                  </button>
                </div>

                {suiteVariables.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center">
                    <p className="text-xs text-gray-500">
                      {t('testLib.noVariables', { defaultValue: '暂无全局变量，点击"添加变量"按钮创建' })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {suiteVariables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => {
                            const newVars = [...suiteVariables]
                            newVars[index].name = e.target.value
                            setSuiteVariables(newVars)
                          }}
                          placeholder={t('testLib.variableName', { defaultValue: '变量名' })}
                          className="w-32 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                          value={variable.type}
                          onChange={(e) => {
                            const newVars = [...suiteVariables]
                            newVars[index].type = e.target.value as 'string' | 'number' | 'boolean' | 'hex'
                            setSuiteVariables(newVars)
                          }}
                          className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="string">{t('testLib.varType_string', { defaultValue: '字符串' })}</option>
                          <option value="number">{t('testLib.varType_number', { defaultValue: '数字' })}</option>
                          <option value="boolean">{t('testLib.varType_boolean', { defaultValue: '布尔' })}</option>
                          <option value="hex">{t('testLib.varType_hex', { defaultValue: '十六进制' })}</option>
                        </select>
                        <input
                          type="text"
                          value={variable.defaultValue || ''}
                          onChange={(e) => {
                            const newVars = [...suiteVariables]
                            newVars[index].defaultValue = e.target.value
                            setSuiteVariables(newVars)
                          }}
                          placeholder={t('testLib.defaultValue', { defaultValue: '默认值' })}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => {
                            setSuiteVariables(suiteVariables.filter((_, i) => i !== index))
                          }}
                          className="w-12 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                          title={t('common.delete')}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mt-4">
                  <p className="text-xs text-amber-900">
                    💡 <strong>{t('testLib.note', { defaultValue: '说明' })}：</strong>{t('testLib.variablesNote', { defaultValue: '全局变量在执行整个测试单时生效，测试单内的所有测试用例都可以使用这些变量。测试用例中可以用 ${变量名} 引用变量。' })}
            </p>
          </div>
              </div>

              {/* 重复执行配置 */}
              <div className="pt-4">
                <h4 className="text-xs font-medium text-gray-700 mb-3">{t('testLib.executionConfig', { defaultValue: '重复执行配置' })}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('testLib.executionCount', { defaultValue: '执行次数' })}</label>
                    <input
                      type="number"
                      value={suiteRepeatCount}
                      onChange={(e) => setSuiteRepeatCount(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">{t('testLib.executionCountNote', { defaultValue: '执行测试单的次数' })}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('testLib.interval', { defaultValue: '间隔(ms)' })}</label>
                    <input
                      type="number"
                      value={suiteRepeatDelay}
                      onChange={(e) => setSuiteRepeatDelay(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('testLib.failureStrategy', { defaultValue: '失败策略' })}</label>
                    <select
                      value={suiteStopOnError ? 'stop' : 'continue'}
                      onChange={(e) => setSuiteStopOnError(e.target.value === 'stop')}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="continue">{t('testLib.continueOnFail', { defaultValue: '失败后继续' })}</option>
                      <option value="stop">{t('testLib.stopOnFail', { defaultValue: '失败时停止' })}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowSuiteModal(false)
                setEditingSuite(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveSuite}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {editingSuite ? t('common.save') : t('common.create')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 测试用例编辑模态框 */}
      <TestCaseModal
        isOpen={showTestCaseModal}
        onClose={() => {
          setShowTestCaseModal(false)
          setEditingTestCase(null)
        }}
        onSave={handleSaveTestCase}
        testCase={editingTestCase}
        suiteId={currentSuiteId}
        suiteVariables={testSuites.find(s => s.id === currentSuiteId)?.variables || []}
      />

      {/* 变量输入模态框 */}
      <VariableInputModal
        isOpen={showVariableModal}
        onClose={() => {
          setShowVariableModal(false)
          setPendingTestCase(null)
          setPendingTestSuite(null)
        }}
        onConfirm={handleVariableConfirm}
        variables={
          pendingTestCase?.variables ||
          (() => {
            // 执行测试单时，收集测试单全局变量和所有测试用例的变量
            if (pendingTestSuite) {
              const allVariables: typeof pendingTestSuite.variables = []
              const variableNames = new Set<string>()
              
              // 首先添加测试单全局变量
              if (pendingTestSuite.variables) {
                pendingTestSuite.variables.forEach(v => {
                  allVariables.push(v)
                  variableNames.add(v.name)
                })
              }
              
              // 然后添加测试用例中定义的但不在全局变量中的变量
              pendingTestSuite.cases.forEach(c => {
                if (c.variables) {
                  c.variables.forEach(v => {
                    if (!variableNames.has(v.name)) {
                      allVariables.push(v)
                      variableNames.add(v.name)
                    }
                  })
                }
              })
              
              return allVariables
            }
            return []
          })()
        }
      />
    </>
  )
}

