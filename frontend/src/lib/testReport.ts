import { TestResult, TestSuite } from '@/types';

/**
 * 测试报告生成器
 */
export class TestReportGenerator {
  /**
   * 生成HTML报告
   */
  generateHTMLReport(
    suite: TestSuite,
    results: TestResult[],
    options?: {
      title?: string;
      includeDetails?: boolean;
    }
  ): string {
    const title = options?.title || `测试报告 - ${suite.name}`;
    const includeDetails = options?.includeDetails !== false;

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.result === 'pass').length;
    const failedTests = results.filter((r) => r.result === 'fail').length;
    const errorTests = results.filter((r) => r.result === 'error').length;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalTests > 0 ? (totalDuration / totalTests).toFixed(2) : '0.00';

    let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-card { padding: 20px; border-radius: 6px; background: #f9f9f9; }
    .summary-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .summary-card.pass { background: #f0f9ff; color: #0066cc; }
    .summary-card.fail { background: #fff0f0; color: #cc0000; }
    .summary-card.error { background: #fff8e6; color: #cc7700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:hover { background: #fafafa; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status.pass { background: #e6f7e6; color: #00aa00; }
    .status.fail { background: #ffe6e6; color: #dd0000; }
    .status.error { background: #fff4cc; color: #cc6600; }
    .details { margin-top: 10px; padding: 10px; background: #f9f9f9; border-left: 3px solid #ddd; font-size: 13px; }
    .details pre { margin: 5px 0; padding: 8px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; overflow-x: auto; }
    .assertion { margin: 5px 0; padding: 5px; }
    .assertion.passed { background: #e6f7e6; }
    .assertion.failed { background: #ffe6e6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    
    <div class="summary">
      <div class="summary-card">
        <h3>总测试数</h3>
        <div class="value">${totalTests}</div>
      </div>
      <div class="summary-card pass">
        <h3>通过</h3>
        <div class="value">${passedTests}</div>
      </div>
      <div class="summary-card fail">
        <h3>失败</h3>
        <div class="value">${failedTests}</div>
      </div>
      <div class="summary-card error">
        <h3>错误</h3>
        <div class="value">${errorTests}</div>
      </div>
      <div class="summary-card">
        <h3>通过率</h3>
        <div class="value">${passRate}%</div>
      </div>
      <div class="summary-card">
        <h3>平均耗时</h3>
        <div class="value">${avgDuration}ms</div>
      </div>
    </div>

    <h2>测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>测试用例</th>
          <th>状态</th>
          <th>耗时(ms)</th>
          <th>执行时间</th>
        </tr>
      </thead>
      <tbody>
`;

    results.forEach((result, index) => {
      const testCase = suite.cases.find((c) => c.id === result.testCaseId);
      const statusClass = result.result;

      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${testCase?.name || result.testCaseId}</td>
          <td><span class="status ${statusClass}">${this.getStatusText(result.result)}</span></td>
          <td>${result.duration}</td>
          <td>${result.createdAt.toLocaleString('zh-CN')}</td>
        </tr>
`;

      if (includeDetails) {
        html += `
        <tr>
          <td colspan="5">
            <div class="details">
              <p><strong>发送命令:</strong></p>
              <pre>${this.escapeHtml(result.sentCommand)}</pre>
              <p><strong>接收数据:</strong></p>
              <pre>${this.escapeHtml(result.receivedData || '(无)')}</pre>
`;

        if (result.assertionResults && result.assertionResults.length > 0) {
          html += `<p><strong>断言结果:</strong></p>`;
          result.assertionResults.forEach((ar) => {
            html += `<div class="assertion ${ar.passed ? 'passed' : 'failed'}">
              ${ar.passed ? '✓' : '✗'} ${ar.message || ar.assertion.type}
            </div>`;
          });
        }

        if (result.errorMessage) {
          html += `<p><strong>错误信息:</strong></p><pre>${this.escapeHtml(result.errorMessage)}</pre>`;
        }

        html += `
            </div>
          </td>
        </tr>
`;
      }
    });

    html += `
      </tbody>
    </table>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * 生成JSON报告
   */
  generateJSONReport(
    suite: TestSuite,
    results: TestResult[]
  ): string {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.result === 'pass').length;
    const failedTests = results.filter((r) => r.result === 'fail').length;
    const errorTests = results.filter((r) => r.result === 'error').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const report = {
      generatedAt: new Date().toISOString(),
      suite: {
        id: suite.id,
        name: suite.name,
        description: suite.description,
      },
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        error: errorTests,
        passRate: parseFloat(passRate.toFixed(2)),
      },
      results: results.map((r) => ({
        testCaseId: r.testCaseId,
        testCaseName: suite.cases.find((c) => c.id === r.testCaseId)?.name,
        result: r.result,
        duration: r.duration,
        sentCommand: r.sentCommand,
        receivedData: r.receivedData,
        errorMessage: r.errorMessage,
        assertionResults: r.assertionResults,
        variables: r.variables,
        executedAt: r.createdAt.toISOString(),
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 生成CSV报告
   */
  generateCSVReport(suite: TestSuite, results: TestResult[]): string {
    const headers = ['序号', '测试用例', '状态', '耗时(ms)', '发送命令', '接收数据', '错误信息', '执行时间'];
    const rows = [headers];

    results.forEach((result, index) => {
      const testCase = suite.cases.find((c) => c.id === result.testCaseId);
      rows.push([
        String(index + 1),
        testCase?.name || result.testCaseId,
        this.getStatusText(result.result),
        String(result.duration),
        result.sentCommand,
        result.receivedData || '',
        result.errorMessage || '',
        result.createdAt.toLocaleString('zh-CN'),
      ]);
    });

    return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * 下载报告文件
   */
  downloadReport(content: string, filename: string, mimeType: string) {
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
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pass: '通过',
      fail: '失败',
      error: '错误',
      skip: '跳过',
    };
    return statusMap[status] || status;
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export const testReportGenerator = new TestReportGenerator();

