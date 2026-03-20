import { TestLibrary, TestSuite, TestCase } from '@/types';

/**
 * 测试库导入导出工具
 */
export class TestImportExport {
  /**
   * 导出测试库为JSON
   */
  exportLibraryAsJSON(library: TestLibrary): string {
    return JSON.stringify(library, null, 2);
  }

  /**
   * 导出测试单为JSON
   */
  exportSuiteAsJSON(suite: TestSuite): string {
    return JSON.stringify(suite, null, 2);
  }

  /**
   * 导出测试用例为JSON
   */
  exportCasesAsJSON(cases: TestCase[]): string {
    return JSON.stringify(cases, null, 2);
  }

  /**
   * 导出测试用例为CSV
   */
  exportCasesAsCSV(cases: TestCase[]): string {
    const headers = [
      '名称',
      '描述',
      '命令',
      '编码',
      '行结束符',
      '期望响应',
      '超时(ms)',
      '校验码类型',
      '重试次数',
      '启用',
      '标签',
    ];

    const rows = [headers];

    cases.forEach((testCase) => {
      rows.push([
        testCase.name,
        testCase.description || '',
        testCase.command,
        testCase.encoding,
        testCase.lineEnding,
        testCase.expectedResponse || '',
        String(testCase.timeout),
        testCase.checksumType || '',
        String(testCase.retryCount),
        testCase.isEnabled ? '是' : '否',
        testCase.tags.join('; '),
      ]);
    });

    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * 从JSON导入测试库
   */
  importLibraryFromJSON(json: string): TestLibrary {
    try {
      const data = JSON.parse(json);
      this.validateLibrary(data);
      return this.normalizeLibrary(data);
    } catch (error: any) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 从JSON导入测试单
   */
  importSuiteFromJSON(json: string): TestSuite {
    try {
      const data = JSON.parse(json);
      this.validateSuite(data);
      return this.normalizeSuite(data);
    } catch (error: any) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 从JSON导入测试用例
   */
  importCasesFromJSON(json: string): TestCase[] {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) {
        throw new Error('数据格式错误: 期望数组');
      }
      return data.map((item, index) => {
        this.validateCase(item);
        return this.normalizeCase(item, index);
      });
    } catch (error: any) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 从CSV导入测试用例
   */
  importCasesFromCSV(csv: string, suiteId: string): TestCase[] {
    const lines = csv.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV文件为空或格式错误');
    }

    // 跳过表头
    const dataLines = lines.slice(1);
    const cases: TestCase[] = [];

    dataLines.forEach((line, index) => {
      const cells = this.parseCSVLine(line);
      if (cells.length < 6) {
        console.warn(`跳过第 ${index + 2} 行: 列数不足`);
        return;
      }

      const testCase: TestCase = {
        id: `imported-${Date.now()}-${index}`,
        suiteId,
        name: cells[0],
        description: cells[1] || undefined,
        command: cells[2],
        encoding: (cells[3] as 'utf-8' | 'hex') || 'utf-8',
        lineEnding: (cells[4] as any) || 'none',
        expectedResponse: cells[5] || undefined,
        timeout: parseInt(cells[6]) || 1000,
        checksumType: (cells[7] as any) || undefined,
        retryCount: parseInt(cells[8]) || 0,
        retryDelay: 1000,
        continueOnFail: false,
        isEnabled: cells[9] === '是',
        tags: cells[10] ? cells[10].split(';').map((t) => t.trim()).filter(Boolean) : [],
        order: index,
        runCount: 0,
        passCount: 0,
        failCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      cases.push(testCase);
    });

    return cases;
  }

  /**
   * 下载文件
   */
  downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 读取文件内容
   */
  readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 验证测试库数据
   */
  private validateLibrary(data: any) {
    if (!data.name) {
      throw new Error('缺少测试库名称');
    }
    if (!Array.isArray(data.suites)) {
      throw new Error('测试单列表格式错误');
    }
  }

  /**
   * 验证测试单数据
   */
  private validateSuite(data: any) {
    if (!data.name) {
      throw new Error('缺少测试单名称');
    }
    if (!Array.isArray(data.cases)) {
      throw new Error('测试用例列表格式错误');
    }
  }

  /**
   * 验证测试用例数据
   */
  private validateCase(data: any) {
    if (!data.name) {
      throw new Error('缺少测试用例名称');
    }
    if (!data.command) {
      throw new Error('缺少命令内容');
    }
  }

  /**
   * 规范化测试库数据
   */
  private normalizeLibrary(data: any): TestLibrary {
    return {
      id: data.id || `lib-${Date.now()}`,
      userId: data.userId || '',
      name: data.name,
      description: data.description,
      deviceType: data.deviceType,
      protocol: data.protocol,
      tags: Array.isArray(data.tags) ? data.tags : [],
      suites: Array.isArray(data.suites) ? data.suites.map((s: any) => this.normalizeSuite(s)) : [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }

  /**
   * 规范化测试单数据
   */
  private normalizeSuite(data: any): TestSuite {
    return {
      id: data.id || `suite-${Date.now()}`,
      libraryId: data.libraryId || '',
      name: data.name,
      description: data.description,
      order: data.order || 0,
      tags: Array.isArray(data.tags) ? data.tags : [],
      cases: Array.isArray(data.cases) ? data.cases.map((c: any, i: number) => this.normalizeCase(c, i)) : [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }

  /**
   * 规范化测试用例数据
   */
  private normalizeCase(data: any, index: number): TestCase {
    return {
      id: data.id || `case-${Date.now()}-${index}`,
      suiteId: data.suiteId || '',
      name: data.name,
      description: data.description,
      order: data.order ?? index,
      command: data.command,
      encoding: data.encoding || 'utf-8',
      lineEnding: data.lineEnding || 'none',
      expectedResponse: data.expectedResponse,
      timeout: data.timeout || 1000,
      assertions: data.assertions || [],
      preconditions: data.preconditions || [],
      variables: data.variables || [],
      checksumType: data.checksumType,
      checksumPosition: data.checksumPosition || 'append',
      retryCount: data.retryCount || 0,
      retryDelay: data.retryDelay || 1000,
      continueOnFail: data.continueOnFail || false,
      tags: Array.isArray(data.tags) ? data.tags : [],
      isEnabled: data.isEnabled !== false,
      lastRunAt: data.lastRunAt ? new Date(data.lastRunAt) : undefined,
      lastResult: data.lastResult,
      lastError: data.lastError,
      lastDuration: data.lastDuration,
      runCount: data.runCount || 0,
      passCount: data.passCount || 0,
      failCount: data.failCount || 0,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }

  /**
   * 解析CSV行
   */
  private parseCSVLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 转义的引号
          current += '"';
          i++;
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 字段分隔符
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);
    return cells;
  }
}

export const testImportExport = new TestImportExport();

