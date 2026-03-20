import { TestCase, TestResult, Assertion, Precondition, TestVariable, TestExecutionStatus } from '@/types';
import { WebSerialPort, VirtualSerialPort } from './serial';
import { serialManager } from './serialManager';
import i18n from '@/i18n';

/**
 * 测试执行引擎
 * 负责执行测试用例、验证断言、记录结果
 */
export class TestExecutor {
  private serialPort: WebSerialPort | VirtualSerialPort | null = null;
  private executionStatus: Map<string, TestExecutionStatus> = new Map();
  private isExecuting = false;
  private shouldCancel = false;
  private receivedData: string = '';
  private dataListener: ((data: Uint8Array) => void) | null = null;

  constructor() {
    // 创建数据监听器（收集数据用于测试验证）
    this.dataListener = (data: Uint8Array) => {
      const text = new TextDecoder().decode(data);
      this.receivedData += text;
    };
    
    // 注册为额外的监听器（不覆盖主回调）
    serialManager.addDataListener(this.dataListener);
  }

  /**
   * 设置串口实例
   */
  setSerialPort(port: WebSerialPort | VirtualSerialPort | null) {
    this.serialPort = port;
  }

  /**
   * 获取执行状态
   */
  getExecutionStatus(testCaseId: string): TestExecutionStatus | undefined {
    return this.executionStatus.get(testCaseId);
  }

  /**
   * 执行单个测试用例
   */
  async executeTestCase(
    testCase: TestCase,
    variables?: Record<string, any>,
    onProgress?: (status: TestExecutionStatus) => void
  ): Promise<TestResult> {
    if (!this.serialPort || !this.serialPort.isConnected()) {
      throw new Error('串口未连接');
    }

    const startTime = Date.now();
    const status: TestExecutionStatus = {
      testCaseId: testCase.id,
      status: 'running',
      progress: 0,
      message: i18n.t('testStatus.preparing', { defaultValue: '准备执行...' }),
    };

    this.executionStatus.set(testCase.id, status);
    onProgress?.(status);

    try {
      // 1. 执行前置条件
      if (testCase.preconditions && testCase.preconditions.length > 0) {
        status.message = i18n.t('testStatus.executingPreconditions', { defaultValue: '执行前置条件...' });
        status.progress = 10;
        onProgress?.(status);
        await this.executePreconditions(testCase.preconditions);
      }

      // 2. 解析变量
      const resolvedVariables = this.resolveVariables(testCase.variables || [], variables);

      // 3. 替换命令中的变量
      let command = this.replaceVariables(testCase.command, resolvedVariables);

      // 4. 添加校验码
      if (testCase.checksumType) {
        command = this.addChecksum(command, testCase.checksumType, testCase.encoding);
      }

      // 5. 清空接收缓冲区
      this.receivedData = '';

      // 6. 发送命令
      status.message = i18n.t('testStatus.sendingCommand', { defaultValue: '发送命令...' });
      status.progress = 30;
      onProgress?.(status);

      // 构造完整命令（包含行结束符）
      let fullCommand = command;
      if (testCase.lineEnding !== 'none') {
        const lineEndings = {
          cr: '\r',
          lf: '\n',
          crlf: '\r\n',
        };
        fullCommand += lineEndings[testCase.lineEnding] || '';
      }

      await this.serialPort.write(fullCommand);

      // 7. 等待响应
      status.message = i18n.t('testStatus.waitingResponse', { defaultValue: '等待响应...' });
      status.progress = 50;
      onProgress?.(status);

      const receivedData = await this.waitForResponse(testCase.timeout);

      // 8. 执行断言
      status.message = i18n.t('testStatus.verifyingAssertions', { defaultValue: '验证断言...' });
      status.progress = 70;
      onProgress?.(status);

      // 替换期望响应中的变量
      const expectedResponse = testCase.expectedResponse 
        ? this.replaceVariables(testCase.expectedResponse, resolvedVariables)
        : undefined;

      // 替换断言规则中的变量
      const resolvedAssertions = (testCase.assertions || []).map(assertion => ({
        ...assertion,
        value: this.replaceVariables(assertion.value, resolvedVariables)
      }));

      const assertionResults = this.executeAssertions(
        resolvedAssertions,
        receivedData,
        expectedResponse
      );

      // 9. 判断测试结果
      const allPassed = assertionResults.length === 0 || assertionResults.every((r) => r.passed);
      const result: 'pass' | 'fail' = allPassed ? 'pass' : 'fail';

      status.status = 'completed';
      status.progress = 100;
      status.message = result === 'pass' ? i18n.t('testStatus.passed', { defaultValue: '测试通过' }) : i18n.t('testStatus.failed', { defaultValue: '测试失败' });
      onProgress?.(status);

      const duration = Date.now() - startTime;

      return {
        id: `result-${Date.now()}`,
        testCaseId: testCase.id,
        result,
        duration,
        sentCommand: command,
        receivedData,
        assertionResults,
        variables: resolvedVariables,
        createdAt: new Date(),
      };
    } catch (error: any) {
      status.status = 'failed';
      status.message = error.message;
      onProgress?.(status);

      const duration = Date.now() - startTime;

      return {
        id: `result-${Date.now()}`,
        testCaseId: testCase.id,
        result: 'error',
        duration,
        sentCommand: testCase.command,
        errorMessage: error.message,
        variables,
        createdAt: new Date(),
      };
    } finally {
      this.executionStatus.delete(testCase.id);
    }
  }

  /**
   * 批量执行测试用例
   */
  async executeTestCases(
    testCases: TestCase[],
    options: {
      stopOnError?: boolean;
      delayBetweenTests?: number;
      variables?: Record<string, any>;
    } = {},
    onProgress?: (caseId: string, status: TestExecutionStatus) => void,
    onCaseComplete?: (result: TestResult) => void
  ): Promise<TestResult[]> {
    if (this.isExecuting) {
      throw new Error('已有测试正在执行');
    }

    this.isExecuting = true;
    this.shouldCancel = false;
    const results: TestResult[] = [];

    try {
      for (let i = 0; i < testCases.length; i++) {
        if (this.shouldCancel) {
          break;
        }

        const testCase = testCases[i];

        // 跳过已禁用的用例
        if (!testCase.isEnabled) {
          continue;
        }

        const result = await this.executeTestCase(testCase, options.variables, (status) => {
          onProgress?.(testCase.id, status);
        });

        results.push(result);
        onCaseComplete?.(result);

        // 如果失败且配置了停止，则终止执行
        if (result.result === 'fail' && options.stopOnError) {
          break;
        }

        // 延迟
        if (i < testCases.length - 1 && options.delayBetweenTests) {
          await this.delay(options.delayBetweenTests);
        }
      }
    } finally {
      this.isExecuting = false;
      this.shouldCancel = false;
    }

    return results;
  }

  /**
   * 取消执行
   */
  cancel() {
    this.shouldCancel = true;
  }

  /**
   * 执行前置条件
   */
  private async executePreconditions(preconditions: Precondition[]) {
    for (const precondition of preconditions) {
      switch (precondition.type) {
        case 'wait':
          await this.delay(Number(precondition.value));
          break;
        case 'send':
          if (this.serialPort) {
            await this.serialPort.write(String(precondition.value));
          }
          break;
        case 'clear':
          // 清空接收缓冲区
          this.receivedData = '';
          break;
        default:
          // 未知的前置条件类型，跳过
          break;
      }
    }
  }

  /**
   * 解析变量
   */
  private resolveVariables(
    variableDefinitions: TestVariable[],
    providedVariables?: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const varDef of variableDefinitions) {
      if (providedVariables && varDef.name in providedVariables) {
        resolved[varDef.name] = providedVariables[varDef.name];
      } else if (varDef.defaultValue !== undefined) {
        resolved[varDef.name] = varDef.defaultValue;
      } else if (varDef.required) {
        throw new Error(`缺少必需变量: ${varDef.name}`);
      }
    }

    return resolved;
  }

  /**
   * 替换命令中的变量
   */
  private replaceVariables(command: string, variables: Record<string, any>): string {
    let result = command;

    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\$\\{${name}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  /**
   * 添加校验码
   */
  private addChecksum(command: string, checksumType: string, encoding: 'utf-8' | 'hex'): string {
    // 将命令转换为字节数组
    const bytes = encoding === 'hex' ? this.hexToBytes(command) : this.stringToBytes(command);

    // 计算校验码
    const checksum = this.calculateChecksum(bytes, checksumType);

    // 追加校验码
    if (encoding === 'hex') {
      return command + ' ' + this.bytesToHex(checksum);
    } else {
      return command + String.fromCharCode(...checksum);
    }
  }

  /**
   * 计算校验码
   */
  private calculateChecksum(data: number[], type: string): number[] {
    switch (type) {
      case 'CRC16-Modbus':
        return this.calculateCRC16Modbus(data);
      case 'CRC16-CCITT':
        return this.calculateCRC16CCITT(data);
      case 'CRC8':
        return this.calculateCRC8(data);
      case 'XOR':
        return this.calculateXOR(data);
      case 'Checksum':
        return this.calculateSimpleChecksum(data);
      default:
        throw new Error(`不支持的校验码类型: ${type}`);
    }
  }

  /**
   * CRC16-Modbus 计算
   */
  private calculateCRC16Modbus(data: number[]): number[] {
    let crc = 0xffff;

    for (const byte of data) {
      crc ^= byte;

      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xa001;
        } else {
          crc = crc >> 1;
        }
      }
    }

    // 低字节在前
    return [crc & 0xff, (crc >> 8) & 0xff];
  }

  /**
   * CRC16-CCITT 计算
   */
  private calculateCRC16CCITT(data: number[]): number[] {
    let crc = 0xffff;

    for (const byte of data) {
      crc ^= byte << 8;

      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }

    crc &= 0xffff;
    return [(crc >> 8) & 0xff, crc & 0xff];
  }

  /**
   * CRC8 计算
   */
  private calculateCRC8(data: number[]): number[] {
    let crc = 0;

    for (const byte of data) {
      crc ^= byte;

      for (let i = 0; i < 8; i++) {
        if (crc & 0x80) {
          crc = (crc << 1) ^ 0x07;
        } else {
          crc = crc << 1;
        }
      }
    }

    return [crc & 0xff];
  }

  /**
   * XOR 校验计算
   */
  private calculateXOR(data: number[]): number[] {
    let xor = 0;
    for (const byte of data) {
      xor ^= byte;
    }
    return [xor];
  }

  /**
   * 简单累加和校验
   */
  private calculateSimpleChecksum(data: number[]): number[] {
    let sum = 0;
    for (const byte of data) {
      sum = (sum + byte) & 0xff;
    }
    return [sum];
  }

  /**
   * 等待响应
   */
  private async waitForResponse(timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('响应超时'));
      }, timeout);

      // 等待一段时间后返回接收到的数据
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve(this.receivedData);
      }, Math.min(timeout - 100, timeout * 0.8));
    });
  }

  /**
   * 执行断言
   */
  private executeAssertions(
    assertions: Assertion[],
    actualData: string,
    expectedResponse?: string
  ): Array<{ assertion: Assertion; passed: boolean; actualValue?: string; message?: string }> {
    const results = [];

    // 如果有期望响应但没有断言，自动添加一个 equals 断言
    if (expectedResponse && assertions.length === 0) {
      assertions = [{ type: 'equals', value: expectedResponse }];
    }

    for (const assertion of assertions) {
      const result = this.executeAssertion(assertion, actualData);
      results.push({
        assertion,
        ...result,
      });
    }

    return results;
  }

  /**
   * 执行单个断言
   */
  private executeAssertion(
    assertion: Assertion,
    actualData: string
  ): { passed: boolean; actualValue?: string; message?: string } {
    let passed = false;
    let message = '';

    try {
      switch (assertion.type) {
        case 'equals':
          passed = actualData === assertion.value;
          message = passed ? '完全匹配' : `期望 "${assertion.value}"，实际 "${actualData}"`;
          break;

        case 'contains':
          passed = actualData.includes(assertion.value);
          message = passed ? '包含期望内容' : `不包含 "${assertion.value}"`;
          break;

        case 'not_contains':
          passed = !actualData.includes(assertion.value);
          message = passed ? '不包含指定内容' : `不应包含 "${assertion.value}"`;
          break;

        case 'regex': {
          const regex = new RegExp(assertion.value);
          passed = regex.test(actualData);
          message = passed ? '匹配正则表达式' : `不匹配正则 "${assertion.value}"`;
          break;
        }

        case 'starts_with':
          passed = actualData.startsWith(assertion.value);
          message = passed ? '以指定内容开头' : `不以 "${assertion.value}" 开头`;
          break;

        case 'ends_with':
          passed = actualData.endsWith(assertion.value);
          message = passed ? '以指定内容结尾' : `不以 "${assertion.value}" 结尾`;
          break;

        case 'length_eq': {
          const expectedLen = Number(assertion.value);
          passed = actualData.length === expectedLen;
          message = passed ? '长度匹配' : `期望长度 ${expectedLen}，实际 ${actualData.length}`;
          break;
        }

        case 'length_gt': {
          const minLen = Number(assertion.value);
          passed = actualData.length > minLen;
          message = passed ? '长度满足要求' : `长度应大于 ${minLen}，实际 ${actualData.length}`;
          break;
        }

        case 'length_lt': {
          const maxLen = Number(assertion.value);
          passed = actualData.length < maxLen;
          message = passed ? '长度满足要求' : `长度应小于 ${maxLen}，实际 ${actualData.length}`;
          break;
        }

        default:
          message = `未知的断言类型: ${assertion.type}`;
      }

      // 处理取反
      if (assertion.negate) {
        passed = !passed;
      }
    } catch (error: any) {
      passed = false;
      message = `断言执行错误: ${error.message}`;
    }

    return { passed, actualValue: actualData, message };
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 十六进制字符串转字节数组
   */
  private hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    const cleaned = hex.replace(/\s+/g, '');

    for (let i = 0; i < cleaned.length; i += 2) {
      bytes.push(parseInt(cleaned.substr(i, 2), 16));
    }

    return bytes;
  }

  /**
   * 字符串转字节数组
   */
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  /**
   * 字节数组转十六进制字符串
   */
  private bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  }
}

export const testExecutor = new TestExecutor();

