import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { PaginationParams } from '../types';
import projectService from './projectService';

export class TestLibraryService {
  /**
   * 验证项目权限
   */
  private async verifyProjectAccess(projectId: string, userId: string) {
    await projectService.getProject(projectId, userId);
  }

  /**
   * 测试库查询的通用 include 配置
   */
  private readonly libraryIncludeConfig = {
    suites: {
      include: {
        cases: true,
      },
      orderBy: { order: 'asc' as const },
    },
  };

  /**
   * 获取测试库列表（按项目）
   */
  async getLibraries(userId: string, projectId: string, params: PaginationParams & { deviceType?: string; protocol?: string }) {
    // 验证项目权限
    await this.verifyProjectAccess(projectId, userId);

    const { page = 1, limit = 20, deviceType, protocol } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId, projectId };
    if (deviceType) {
      where.deviceType = deviceType;
    }
    if (protocol) {
      where.protocol = protocol;
    }

    const [libraries, total] = await Promise.all([
      prisma.testLibrary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          suites: {
            include: {
              cases: true,
            },
          },
        },
      }),
      prisma.testLibrary.count({ where }),
    ]);

    return { libraries, total };
  }

  /**
   * 获取或创建项目的测试库（如果不存在则创建空测试库）
   */
  async getOrCreateLibraryForProject(userId: string, projectId: string) {
    // 验证项目权限
    await this.verifyProjectAccess(projectId, userId);

    // 查找项目的测试库
    let library = await prisma.testLibrary.findFirst({
      where: { userId, projectId },
      include: this.libraryIncludeConfig,
    });

    // 如果不存在，创建空测试库
    if (!library) {
      library = await prisma.testLibrary.create({
        data: {
          userId,
          projectId,
          name: '默认测试库',
          description: '项目测试库',
          tags: [],
        },
        include: this.libraryIncludeConfig,
      });
    }

    return library;
  }

  /**
   * 获取测试库详情
   */
  async getLibrary(id: string, userId: string) {
    const library = await prisma.testLibrary.findUnique({
      where: { id },
      include: this.libraryIncludeConfig,
    });

    if (!library) {
      throw new NotFoundError('测试库不存在');
    }

    if (library.userId !== userId) {
      throw new ForbiddenError('无权访问此测试库');
    }

    // 验证项目权限
    await this.verifyProjectAccess(library.projectId, userId);

    return library;
  }

  /**
   * 创建测试库
   */
  async createLibrary(userId: string, projectId: string, data: any) {
    // 验证项目权限
    await this.verifyProjectAccess(projectId, userId);

    // 检查项目是否已有测试库
    const existing = await prisma.testLibrary.findFirst({
      where: { userId, projectId },
    });

    if (existing) {
      throw new ValidationError('项目已存在测试库');
    }

    const library = await prisma.testLibrary.create({
      data: {
        userId,
        projectId,
        name: data.name || '默认测试库',
        description: data.description,
        deviceType: data.deviceType,
        protocol: data.protocol,
        tags: data.tags || [],
      },
      include: {
        suites: true,
      },
    });

    return library;
  }

  /**
   * 更新测试库
   */
  async updateLibrary(id: string, userId: string, data: any) {
    await this.getLibrary(id, userId);

    const updated = await prisma.testLibrary.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        deviceType: data.deviceType,
        protocol: data.protocol,
        tags: data.tags,
      },
      include: this.libraryIncludeConfig,
    });

    return updated;
  }

  /**
   * 删除测试库
   */
  async deleteLibrary(id: string, userId: string) {
    await this.getLibrary(id, userId);

    await prisma.testLibrary.delete({
      where: { id },
    });

    return { message: '测试库已删除' };
  }

  /**
   * 获取测试单列表
   */
  async getSuites(libraryId: string, userId: string) {
    const library = await this.getLibrary(libraryId, userId);

    const suites = await prisma.testSuite.findMany({
      where: { libraryId },
      include: {
        cases: true,
      },
      orderBy: { order: 'asc' },
    });

    return suites;
  }

  /**
   * 获取测试单详情
   */
  async getSuite(id: string, userId: string) {
    const suite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        library: true,
        cases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!suite) {
      throw new NotFoundError('测试单不存在');
    }

    if (suite.library.userId !== userId) {
      throw new ForbiddenError('无权访问此测试单');
    }

    return suite;
  }

  /**
   * 创建测试单
   */
  async createSuite(libraryId: string, userId: string, data: any) {
    // 验证测试库权限
    await this.getLibrary(libraryId, userId);

    // 获取当前最大order值
    const maxOrder = await prisma.testSuite.aggregate({
      where: { libraryId },
      _max: { order: true },
    });

    const suite = await prisma.testSuite.create({
      data: {
        libraryId,
        name: data.name,
        description: data.description,
        tags: data.tags || [],
        order: (maxOrder._max.order || 0) + 1,
      },
      include: {
        cases: true,
      },
    });

    return suite;
  }

  /**
   * 更新测试单
   */
  async updateSuite(id: string, userId: string, data: any) {
    await this.getSuite(id, userId);

    const updated = await prisma.testSuite.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        tags: data.tags,
        order: data.order,
      },
      include: {
        cases: true,
      },
    });

    return updated;
  }

  /**
   * 删除测试单
   */
  async deleteSuite(id: string, userId: string) {
    await this.getSuite(id, userId);

    await prisma.testSuite.delete({
      where: { id },
    });

    return { message: '测试单已删除' };
  }

  /**
   * 复制测试单
   */
  async copySuite(id: string, userId: string) {
    const suite = await this.getSuite(id, userId);

    // 获取当前最大order值
    const maxOrder = await prisma.testSuite.aggregate({
      where: { libraryId: suite.libraryId },
      _max: { order: true },
    });

    // 复制测试单
    const newSuite = await prisma.testSuite.create({
      data: {
        libraryId: suite.libraryId,
        name: `${suite.name} (副本)`,
        description: suite.description,
        tags: suite.tags,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    // 复制所有测试用例
    if (suite.cases && suite.cases.length > 0) {
      const casesToCreate = suite.cases.map((testCase: any, index: number) => ({
        suiteId: newSuite.id,
        name: testCase.name,
        description: testCase.description,
        order: index,
        command: testCase.command,
        encoding: testCase.encoding,
        lineEnding: testCase.lineEnding,
        expectedResponse: testCase.expectedResponse,
        responsePattern: testCase.responsePattern,
        timeout: testCase.timeout,
        assertions: testCase.assertions,
        preconditions: testCase.preconditions,
        variables: testCase.variables,
        checksumType: testCase.checksumType,
        checksumPosition: testCase.checksumPosition,
        retryCount: testCase.retryCount,
        retryDelay: testCase.retryDelay,
        continueOnFail: testCase.continueOnFail,
        tags: testCase.tags,
        isEnabled: testCase.isEnabled,
      }));

      await prisma.testCase.createMany({
        data: casesToCreate,
      });
    }

    // 返回包含用例的完整测试单
    return await prisma.testSuite.findUnique({
      where: { id: newSuite.id },
      include: {
        cases: true,
      },
    });
  }

  /**
   * 获取测试用例列表
   */
  async getCases(suiteId: string, userId: string) {
    await this.getSuite(suiteId, userId);

    const cases = await prisma.testCase.findMany({
      where: { suiteId },
      orderBy: { order: 'asc' },
    });

    return cases;
  }

  /**
   * 获取测试用例详情
   */
  async getCase(id: string, userId: string) {
    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        suite: {
          include: {
            library: true,
          },
        },
      },
    });

    if (!testCase) {
      throw new NotFoundError('测试用例不存在');
    }

    if (testCase.suite.library.userId !== userId) {
      throw new ForbiddenError('无权访问此测试用例');
    }

    return testCase;
  }

  /**
   * 创建测试用例
   */
  async createCase(suiteId: string, userId: string, data: any) {
    await this.getSuite(suiteId, userId);

    // 获取当前最大order值
    const maxOrder = await prisma.testCase.aggregate({
      where: { suiteId },
      _max: { order: true },
    });

    const testCase = await prisma.testCase.create({
      data: {
        suiteId,
        name: data.name,
        description: data.description,
        order: (maxOrder._max.order || 0) + 1,
        command: data.command,
        encoding: data.encoding || 'utf-8',
        lineEnding: data.lineEnding || 'none',
        expectedResponse: data.expectedResponse,
        responsePattern: data.responsePattern,
        timeout: data.timeout || 1000,
        assertions: data.assertions || [],
        preconditions: data.preconditions || [],
        variables: data.variables || [],
        checksumType: data.checksumType,
        checksumPosition: data.checksumPosition,
        retryCount: data.retryCount || 0,
        retryDelay: data.retryDelay || 1000,
        continueOnFail: data.continueOnFail || false,
        tags: data.tags || [],
        isEnabled: data.isEnabled !== false,
      },
    });

    return testCase;
  }

  /**
   * 更新测试用例
   */
  async updateCase(id: string, userId: string, data: any) {
    await this.getCase(id, userId);

    const updated = await prisma.testCase.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        order: data.order,
        command: data.command,
        encoding: data.encoding,
        lineEnding: data.lineEnding,
        expectedResponse: data.expectedResponse,
        responsePattern: data.responsePattern,
        timeout: data.timeout,
        assertions: data.assertions,
        preconditions: data.preconditions,
        variables: data.variables,
        checksumType: data.checksumType,
        checksumPosition: data.checksumPosition,
        retryCount: data.retryCount,
        retryDelay: data.retryDelay,
        continueOnFail: data.continueOnFail,
        tags: data.tags,
        isEnabled: data.isEnabled,
      },
    });

    return updated;
  }

  /**
   * 删除测试用例
   */
  async deleteCase(id: string, userId: string) {
    await this.getCase(id, userId);

    await prisma.testCase.delete({
      where: { id },
    });

    return { message: '测试用例已删除' };
  }

  /**
   * 更新测试用例执行结果
   */
  async updateCaseResult(id: string, userId: string, result: any) {
    await this.getCase(id, userId);

    const updated = await prisma.testCase.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastResult: result.result,
        lastError: result.error,
        lastDuration: result.duration,
        runCount: { increment: 1 },
        passCount: result.result === 'pass' ? { increment: 1 } : undefined,
        failCount: result.result === 'fail' ? { increment: 1 } : undefined,
      },
    });

    return updated;
  }

  /**
   * 创建测试执行结果记录
   */
  async createTestResult(testCaseId: string, userId: string, data: any) {
    await this.getCase(testCaseId, userId);

    const result = await prisma.testResult.create({
      data: {
        testCaseId,
        result: data.result,
        duration: data.duration,
        sentCommand: data.sentCommand,
        receivedData: data.receivedData,
        errorMessage: data.errorMessage,
        assertionResults: data.assertionResults || [],
        variables: data.variables || {},
        metadata: data.metadata || {},
      },
    });

    // 同时更新测试用例的执行结果
    await this.updateCaseResult(testCaseId, userId, {
      result: data.result,
      error: data.errorMessage,
      duration: data.duration,
    });

    return result;
  }

  /**
   * 获取测试用例的执行历史
   */
  async getTestResults(testCaseId: string, userId: string, params: PaginationParams) {
    await this.getCase(testCaseId, userId);

    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      prisma.testResult.findMany({
        where: { testCaseId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.testResult.count({ where: { testCaseId } }),
    ]);

    return { results, total };
  }
}

export default new TestLibraryService();

