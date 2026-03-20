// Web Serial Debugger - Shared JavaScript

// ==================== 全局变量 ====================
let isConnected = false;
let loopSendInterval = null;
let selectedPort = null;
let reader = null;

// ==================== 测试库数据生成 ====================
function generateTestLibrary() {
    const suites = [];
    const suiteTemplates = [
        { name: 'ESP32基础', prefix: 'AT', commands: ['AT', 'AT+GMR', 'AT+RST', 'AT+RESTORE', 'ATE0', 'ATE1'] },
        { name: 'WiFi配置', prefix: 'CWMODE', commands: ['AT+CWMODE=1', 'AT+CWJAP="SSID","PWD"', 'AT+CWQAP', 'AT+CWSAP', 'AT+CWLAP'] },
        { name: 'TCP通信', prefix: 'CIP', commands: ['AT+CIPSTART', 'AT+CIPSEND', 'AT+CIPCLOSE', 'AT+CIPSTATUS', 'AT+CIPMUX'] },
        { name: 'HTTP请求', prefix: 'HTTP', commands: ['AT+HTTPGET', 'AT+HTTPPOST', 'AT+HTTPCLIENT', 'AT+HTTPHEAD'] },
        { name: '蓝牙配置', prefix: 'BT', commands: ['AT+BTINIT', 'AT+BTSCAN', 'AT+BTCONNECT', 'AT+BTSEND'] },
        { name: 'MQTT协议', prefix: 'MQTT', commands: ['AT+MQTTCONN', 'AT+MQTTPUB', 'AT+MQTTSUB', 'AT+MQTTDISCONN'] },
        { name: 'GPIO控制', prefix: 'GPIO', commands: ['AT+GPIOSET', 'AT+GPIOGET', 'AT+GPIOMODE', 'AT+GPIOWRITE'] },
        { name: '传感器读取', prefix: 'SENSOR', commands: ['AT+TEMPREAD', 'AT+HUMREAD', 'AT+PRESSREAD', 'AT+LIGHTREAD'] },
        { name: 'PWM输出', prefix: 'PWM', commands: ['AT+PWMSET', 'AT+PWMSTART', 'AT+PWMSTOP', 'AT+PWMFREQ'] },
        { name: 'ADC采集', prefix: 'ADC', commands: ['AT+ADCREAD', 'AT+ADCCAL', 'AT+ADCVOLT', 'AT+ADCRAW'] },
        { name: '定时器', prefix: 'TIMER', commands: ['AT+TIMERSTART', 'AT+TIMERSTOP', 'AT+TIMERGET', 'AT+TIMERSET'] },
        { name: '看门狗', prefix: 'WDT', commands: ['AT+WDTINIT', 'AT+WDTFEED', 'AT+WDTSTOP', 'AT+WDTGET'] },
        { name: '中断处理', prefix: 'IRQ', commands: ['AT+IRQENABLE', 'AT+IRQDISABLE', 'AT+IRQGET', 'AT+IRQCLEAR'] },
        { name: 'SPI通信', prefix: 'SPI', commands: ['AT+SPIINIT', 'AT+SPISEND', 'AT+SPIREAD', 'AT+SPICLOSE'] },
        { name: 'I2C通信', prefix: 'I2C', commands: ['AT+I2CINIT', 'AT+I2CWRITE', 'AT+I2CREAD', 'AT+I2CSCAN'] },
        { name: 'UART配置', prefix: 'UART', commands: ['AT+UART_DEF', 'AT+UART_CUR', 'AT+UART_FLOW', 'AT+UART_PARITY'] },
        { name: '电源管理', prefix: 'SLEEP', commands: ['AT+SLEEP', 'AT+GSLP', 'AT+WAKEUP', 'AT+SLEEPMODE'] },
        { name: '固件更新', prefix: 'OTA', commands: ['AT+OTASTART', 'AT+OTASTATUS', 'AT+OTAABORT', 'AT+OTAVER'] },
        { name: '存储管理', prefix: 'FS', commands: ['AT+FSWRITE', 'AT+FSREAD', 'AT+FSLIST', 'AT+FSDELETE'] },
        { name: '系统诊断', prefix: 'SYS', commands: ['AT+SYSMEM', 'AT+SYSCPU', 'AT+SYSINFO', 'AT+SYSLOG'] }
    ];
    
    for (let i = 0; i < 20; i++) {
        const template = suiteTemplates[i % suiteTemplates.length];
        const suiteNum = i + 1;
        const suite = {
            id: `suite-${suiteNum}`,
            name: `${template.name}${Math.floor(i / suiteTemplates.length) > 0 ? ` ${Math.floor(i / suiteTemplates.length) + 1}` : ''}`,
            description: `${template.name}相关测试用例`,
            expanded: false, // 默认折叠以优化显示
            testCases: []
        };
        
        // 为每个测试单生成20个测试用例
        for (let j = 0; j < 20; j++) {
            const caseNum = i * 20 + j + 1;
            const cmdTemplate = template.commands[j % template.commands.length];
            suite.testCases.push({
                id: `case-${caseNum}`,
                name: `测试${j + 1}`,
                code: `${cmdTemplate}${j > template.commands.length - 1 ? `_${Math.floor(j / template.commands.length) + 1}` : ''}`,
                expectedResponse: j % 3 === 0 ? 'OK' : null
            });
        }
        
        suites.push(suite);
    }
    
    return suites;
}

const testLibrary = generateTestLibrary();

// ==================== 项目数据 ====================
// 全局变量：用户登录状态
let isUserLoggedIn = false;

// 未登录时的默认项目
const defaultProject = { 
    name: '未保存项目', 
    lastModified: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).replace(/\//g, '-'), 
    isCurrent: true,
    isUnsaved: true
};

// 登录后的项目列表（示例数据）
const userProjects = [
    { name: 'ESP32调试', lastModified: '2024-11-02 14:30', isCurrent: true },
    { name: 'STM32开发', lastModified: '2024-11-01 09:15', isCurrent: false },
    { name: 'Arduino测试', lastModified: '2024-10-28 16:45', isCurrent: false }
];

// 根据登录状态获取项目列表
function getProjects() {
    return isUserLoggedIn ? userProjects : [defaultProject];
}

// ==================== 测试库状态持久化 ====================
function saveSuiteState(suiteId, expanded) {
    const states = JSON.parse(localStorage.getItem('testSuiteStates') || '{}');
    states[suiteId] = expanded;
    localStorage.setItem('testSuiteStates', JSON.stringify(states));
}

function loadSuiteState(suiteId) {
    const states = JSON.parse(localStorage.getItem('testSuiteStates') || '{}');
    return states[suiteId] !== undefined ? states[suiteId] : true; // default expanded
}

// ==================== 测试单统计 ====================
function calculateSuiteStats(suite) {
    let passed = 0;
    let failed = 0;
    let running = 0;
    let pending = 0;
    
    suite.testCases.forEach(testCase => {
        const status = testCase.status || 'pending';
        switch(status) {
            case 'passed':
                passed++;
                break;
            case 'failed':
                failed++;
                break;
            case 'running':
                running++;
                break;
            case 'pending':
                pending++;
                break;
        }
    });
    
    return {
        passed,
        failed,
        running,
        pending,
        total: suite.testCases.length
    };
}

function updateSuiteStats(suiteId) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    const stats = calculateSuiteStats(suite);
    const suiteElement = document.querySelector(`[data-suite-id="${suiteId}"]`);
    if (!suiteElement) return;
    
    // 查找数量显示区域
    const countElement = suiteElement.querySelector('.suite-count');
    if (!countElement) return;
    
    const testCaseCount = suite.testCases.length;
    
    if (stats.passed === 0 && stats.failed === 0) {
        // 没有执行过的测试，只显示总数
        countElement.innerHTML = `(${testCaseCount})`;
    } else {
        // 有测试结果时显示：总数/通过/失败
        countElement.innerHTML = `(<span class="stat-total">${testCaseCount}</span>/<span class="stat-passed">${stats.passed}</span>/<span class="stat-failed">${stats.failed}</span>)`;
    }
}

// ==================== 渲染测试库 ====================
function renderTestLibrary() {
    const commandList = document.getElementById('commandList');
    if (!commandList) return;
    
    let html = '';
    
    // 添加"新建测试单"按钮
    html += `
        <div class="test-suite new-suite-btn" id="newSuiteBtn">
            <div class="test-suite-header">
                <div class="flex items-center justify-center">
                    <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor"><use href="#icon-plus"/></svg>
                    <span class="suite-name text-blue-600">新建测试单</span>
                </div>
            </div>
        </div>
    `;
    
    testLibrary.forEach((suite, suiteIndex) => {
        // Load saved state
        const isExpanded = loadSuiteState(suite.id);
        const testCaseCount = suite.testCases.length;
        
        // 计算统计信息
        const stats = calculateSuiteStats(suite);
        let countText = '';
        if (stats.passed > 0 || stats.failed > 0) {
            // 有测试结果时显示：总数/通过/失败
            countText = `(<span class="stat-total">${testCaseCount}</span>/<span class="stat-passed">${stats.passed}</span>/<span class="stat-failed">${stats.failed}</span>)`;
        } else {
            // 没有测试结果时只显示总数
            countText = `(${testCaseCount})`;
        }
        
        // Suite header
        html += `
            <div class="test-suite" data-suite-id="${suite.id}">
                <!-- Suite Header -->
                <div class="test-suite-header">
            <div class="flex items-center justify-between">
                        <div class="flex items-center flex-1 min-w-0">
                            <button class="suite-expand-btn" data-suite-id="${suite.id}" title="${isExpanded ? '折叠' : '展开'}">
                                <svg class="w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                            <span class="suite-name">${suite.name}</span>
                            <span class="suite-count">${countText}</span>
                        </div>
                        <div class="suite-actions">
                            <button class="suite-play-btn" data-suite-id="${suite.id}" title="执行整个测试单">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor"><use href="#icon-play"/></svg>
                    </button>
                            <button class="suite-edit-btn" data-suite-id="${suite.id}" title="编辑测试单">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor"><use href="#icon-edit"/></svg>
                    </button>
                            <button class="suite-copy-btn" data-suite-id="${suite.id}" title="复制测试单">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor"><use href="#icon-copy"/></svg>
                    </button>
                            <button class="suite-delete-btn" data-suite-id="${suite.id}" title="删除测试单">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor"><use href="#icon-delete"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="suite-description">${suite.description}</div>
                </div>
                
                <!-- Test Cases -->
                <div class="test-cases-container" style="display: ${isExpanded ? 'block' : 'none'}">
        `;
        
        // 添加"新建测试命令"按钮
        html += `
                <div class="test-case-item new-case-btn" data-suite-id="${suite.id}">
                    <div class="flex items-center justify-center">
                        <svg class="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor"><use href="#icon-plus"/></svg>
                        <span class="test-case-name text-blue-600">新建测试命令</span>
                    </div>
                </div>
        `;
        
        // Render test cases
        suite.testCases.forEach(testCase => {
            // 获取测试状态，默认为pending
            const status = testCase.status || 'pending';
            const statusClass = `status-${status}`;
            
            html += `
                <div class="test-case-item ${statusClass}" data-case-id="${testCase.id}" data-status="${status}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0 mr-2">
                            <div class="test-case-name">${testCase.name}</div>
                            <div class="test-case-code">${testCase.code}</div>
                        </div>
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                            <button class="command-btn bg-blue-50 text-blue-600 hover:bg-blue-100" data-action="play" data-case-id="${testCase.id}" title="发送">
                                <svg fill="none" stroke="currentColor"><use href="#icon-play"/></svg>
                            </button>
                            <button class="command-btn text-gray-500 hover:text-gray-700" data-action="edit" data-case-id="${testCase.id}" title="编辑">
                                <svg fill="none" stroke="currentColor"><use href="#icon-edit"/></svg>
                            </button>
                            <button class="command-btn text-gray-500 hover:text-gray-700" data-action="copy" data-case-id="${testCase.id}" title="复制">
                                <svg fill="none" stroke="currentColor"><use href="#icon-copy"/></svg>
                            </button>
                            <button class="command-btn-delete" data-action="delete" data-case-id="${testCase.id}" title="删除">
                        <svg fill="none" stroke="currentColor"><use href="#icon-delete"/></svg>
                    </button>
                </div>
            </div>
        </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    commandList.innerHTML = html;
    
    // Attach event listeners
    attachTestLibraryEventListeners();
    
    // 添加"新建测试单"按钮事件
    const newSuiteBtn = document.getElementById('newSuiteBtn');
    if (newSuiteBtn) {
        newSuiteBtn.addEventListener('click', function() {
            createNewTestSuite();
        });
    }
    
    // 添加"新建测试命令"按钮事件
    commandList.querySelectorAll('.new-case-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const suiteId = this.dataset.suiteId;
            addNewTestCase(suiteId);
        });
    });
}

// ==================== 测试库事件监听器 ====================
function attachTestLibraryEventListeners() {
    const commandList = document.getElementById('commandList');
    if (!commandList) return;
    
    // Suite expand/collapse buttons
    commandList.querySelectorAll('.suite-expand-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const suiteId = this.dataset.suiteId;
            const suite = commandList.querySelector(`.test-suite[data-suite-id="${suiteId}"]`);
            const container = suite.querySelector('.test-cases-container');
            const icon = this.querySelector('svg');
            
            const isExpanded = container.style.display !== 'none';
            container.style.display = isExpanded ? 'none' : 'block';
            icon.classList.toggle('rotate-90', !isExpanded);
            this.title = isExpanded ? '展开' : '折叠';
            
            // Save state
            saveSuiteState(suiteId, !isExpanded);
        });
    });
    
    // Suite play buttons (execute all tests in suite)
    commandList.querySelectorAll('.suite-play-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const suiteId = this.dataset.suiteId;
            executeSuite(suiteId);
        });
    });
    
    // Suite copy buttons (copy test suite)
    commandList.querySelectorAll('.suite-copy-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const suiteId = this.dataset.suiteId;
            copyTestSuite(suiteId);
        });
    });
    
    // Suite edit buttons (edit test suite)
    commandList.querySelectorAll('.suite-edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const suiteId = this.dataset.suiteId;
            editTestSuite(suiteId);
        });
    });
    
    // Suite delete buttons (delete test suite)
    commandList.querySelectorAll('.suite-delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const suiteId = this.dataset.suiteId;
            const btn = this;
            confirmDeleteTestSuite(suiteId, btn);
        });
    });
    
    // Test case action buttons
    commandList.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const caseId = btn.dataset.caseId;
        
        switch(action) {
            case 'play':
                executeTestCase(caseId);
                break;
            case 'edit':
                editTestCase(caseId);
                break;
            case 'copy':
                copyTestCase(caseId);
                break;
            case 'delete':
                deleteTestCase(caseId, btn);
                break;
        }
    });
}

// ==================== 测试用例执行函数 ====================
function executeSuite(suiteId) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    console.log(`执行测试单: ${suite.name}`);
    showStatusMessage(`开始执行测试单: ${suite.name}`, 'info');
    
    // 重置所有测试用例状态
    suite.testCases.forEach(testCase => {
        updateTestCaseStatus(testCase.id, 'pending');
    });
    
    // 顺序执行所有测试用例
    let executed = 0;
    let passed = 0;
    let failed = 0;
    
    suite.testCases.forEach((testCase, index) => {
        setTimeout(() => {
            // 设置为运行中
            updateTestCaseStatus(testCase.id, 'running');
            
            // 模拟测试执行
            setTimeout(() => {
                const success = Math.random() > 0.3; // 70%通过率
                updateTestCaseStatus(testCase.id, success ? 'passed' : 'failed');
                
                if (success) passed++;
                else failed++;
                
                executed++;
                
                if (executed === suite.testCases.length) {
                    showStatusMessage(`测试单完成: ${suite.name} (通过:${passed} 失败:${failed})`, 
                                    failed === 0 ? 'success' : 'warning');
                }
            }, 800);
        }, index * 1500); // 1.5秒间隔执行每个测试
    });
}

function executeTestCase(caseId) {
    // Find the test case
    let testCase = null;
    for (const suite of testLibrary) {
        testCase = suite.testCases.find(tc => tc.id === caseId);
        if (testCase) break;
    }
    
    if (!testCase) return;
    
    console.log(`执行测试用例: ${testCase.name} - ${testCase.code}`);
    
    // 更新UI状态为运行中
    updateTestCaseStatus(caseId, 'running');
    showStatusMessage(`执行中: ${testCase.code}`, 'info');
    
    // 模拟测试执行（实际应该是串口发送和响应检测）
    setTimeout(() => {
        // 随机模拟测试结果（实际应根据串口响应判断）
        const success = Math.random() > 0.3; // 70%通过率
        updateTestCaseStatus(caseId, success ? 'passed' : 'failed');
        
        if (success) {
            showStatusMessage(`测试通过: ${testCase.name}`, 'success');
        } else {
            showStatusMessage(`测试失败: ${testCase.name}`, 'error');
        }
    }, 1000);
    
    // TODO: Implement actual serial send and response verification
}

function updateTestCaseStatus(caseId, status) {
    const testCaseElement = document.querySelector(`[data-case-id="${caseId}"]`);
    if (!testCaseElement) return;
    
    // 移除所有状态类
    testCaseElement.classList.remove('status-pending', 'status-running', 'status-passed', 'status-failed');
    
    // 添加新状态类
    testCaseElement.classList.add(`status-${status}`);
    testCaseElement.setAttribute('data-status', status);
    
    // 更新数据结构中的状态并更新测试单统计
    for (const suite of testLibrary) {
        const testCase = suite.testCases.find(tc => tc.id === caseId);
        if (testCase) {
            testCase.status = status;
            // 更新该测试单的统计显示
            updateSuiteStats(suite.id);
            break;
        }
    }
}

function editTestCase(caseId) {
    // Find the test case
    let testCase = null;
    for (const suite of testLibrary) {
        testCase = suite.testCases.find(tc => tc.id === caseId);
        if (testCase) break;
    }
    
    if (!testCase) return;
    
    console.log(`编辑测试用例: ${testCase.name}`);
    showStatusMessage('编辑功能开发中...', 'info');
    // TODO: Implement edit dialog
}

function copyTestCase(caseId) {
    // Find the test case
    let testCase = null;
    for (const suite of testLibrary) {
        testCase = suite.testCases.find(tc => tc.id === caseId);
        if (testCase) break;
    }
    
    if (!testCase) return;
    
    // Copy code to clipboard
    navigator.clipboard.writeText(testCase.code).then(() => {
        showStatusMessage(`已复制: ${testCase.code}`, 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showStatusMessage('复制失败', 'error');
    });
}

function deleteTestCase(caseId, btnElement) {
    const testCaseItem = btnElement.closest('.test-case-item');
    if (!testCaseItem) return;
    
    // Add fade out animation
    testCaseItem.style.transition = 'opacity 0.2s, transform 0.2s';
    testCaseItem.style.opacity = '0';
    testCaseItem.style.transform = 'translateX(10px)';
    
    // Remove element after animation
    setTimeout(() => {
        testCaseItem.remove();
        showStatusMessage('测试用例已删除', 'success');
        // TODO: Also remove from data structure and save
    }, 200);
}

function copyTestSuite(suiteId) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    console.log(`复制测试单: ${suite.name}`);
    showStatusMessage(`复制测试单"${suite.name}"功能开发中...`, 'info');
    
    // TODO: Implement copy test suite functionality
    // 应该创建一个新的测试单，包含所有测试用例的副本
}

function createNewTestSuite() {
    console.log('创建新的测试单');
    showStatusMessage('新建测试单功能开发中...', 'info');
    // TODO: Implement create new test suite dialog
}

function addNewTestCase(suiteId) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    console.log(`在"${suite.name}"中新建测试命令`);
    showStatusMessage('新建测试命令功能开发中...', 'info');
    // TODO: Implement add new test case dialog
}

function editTestSuite(suiteId) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    console.log(`编辑测试单: ${suite.name}`);
    showStatusMessage('编辑测试单功能开发中...', 'info');
    // TODO: Implement edit suite dialog
}

function confirmDeleteTestSuite(suiteId, btnElement) {
    const suite = testLibrary.find(s => s.id === suiteId);
    if (!suite) return;
    
    const suiteElement = btnElement.closest('.test-suite');
    if (!suiteElement) return;
    
    // Create confirmation popup
    const confirmBox = document.createElement('div');
    confirmBox.className = 'suite-delete-confirm';
    confirmBox.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-title">确认删除测试单？</div>
            <div class="confirm-message">将删除"${suite.name}"及其包含的 ${suite.testCases.length} 个测试用例</div>
            <div class="confirm-buttons">
                <button class="confirm-btn confirm-cancel">取消</button>
                <button class="confirm-btn confirm-delete">删除</button>
            </div>
        </div>
    `;
    
    // Position the confirm box near the button
    const rect = btnElement.getBoundingClientRect();
    const parentRect = btnElement.closest('#commandList').getBoundingClientRect();
    confirmBox.style.position = 'absolute';
    confirmBox.style.top = (rect.top - parentRect.top - 10) + 'px';
    confirmBox.style.right = '10px';
    confirmBox.style.zIndex = '1000';
    
    // Add to DOM
    btnElement.closest('#commandList').style.position = 'relative';
    btnElement.closest('#commandList').appendChild(confirmBox);
    
    // Add event listeners
    const cancelBtn = confirmBox.querySelector('.confirm-cancel');
    const deleteBtn = confirmBox.querySelector('.confirm-delete');
    
    cancelBtn.addEventListener('click', function() {
        confirmBox.remove();
    });
    
    deleteBtn.addEventListener('click', function() {
        deleteTestSuite(suiteId, suiteElement);
        confirmBox.remove();
    });
    
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeConfirm(e) {
            if (!confirmBox.contains(e.target) && e.target !== btnElement) {
                confirmBox.remove();
                document.removeEventListener('click', closeConfirm);
            }
        });
    }, 100);
}

function deleteTestSuite(suiteId, suiteElement) {
    if (!suiteElement) return;
    
    // Add fade out animation
    suiteElement.style.transition = 'opacity 0.2s, transform 0.2s';
    suiteElement.style.opacity = '0';
    suiteElement.style.transform = 'translateX(10px)';
    
    // Remove element after animation
    setTimeout(() => {
        suiteElement.remove();
        
        // Remove from data structure
        const index = testLibrary.findIndex(s => s.id === suiteId);
        if (index !== -1) {
            const suite = testLibrary[index];
            testLibrary.splice(index, 1);
            showStatusMessage(`已删除测试单"${suite.name}"及其 ${suite.testCases.length} 个测试用例`, 'success');
        }
        
        // TODO: Save to backend
    }, 200);
}

// ==================== 渲染项目列表 ====================
function renderProjectList() {
    const projectList = document.getElementById('projectList');
    if (!projectList) return;
    
    const projects = getProjects();
    
    // 更新项目计数
    const projectCountEl = document.querySelector('.px-3.py-3 .flex.items-center.justify-between .text-gray-500');
    if (projectCountEl) {
        projectCountEl.textContent = `共 ${projects.length} 个`;
    }
    
    // 更新状态栏的当前项目信息
    updateStatusBarProject();
    
    projectList.innerHTML = projects.map(proj => `
        <div class="project-item ${proj.isCurrent ? 'border-l-2 border-blue-500' : 'cursor-pointer hover:border-blue-300'}" ${!proj.isCurrent ? `onclick="alert('切换到此项目')"` : ''}>
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <span class="project-name">${proj.name}</span>
                    ${proj.isCurrent ? '<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">当前</span>' : ''}
                </div>
                <div class="flex items-center gap-1">
                    <button class="project-btn-delete" title="删除" onclick="event.stopPropagation()">
                        <svg fill="none" stroke="currentColor"><use href="#icon-delete"/></svg>
                    </button>
                </div>
            </div>
            <div class="project-time">最后修改: ${proj.lastModified}</div>
        </div>
    `).join('');
}

// ==================== 导航栏激活状态 ====================
function updateNavbarActiveState() {
    const currentPath = window.location.pathname;
    const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    // 移除所有激活状态
    document.querySelectorAll('.vertical-navbar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 根据文件名添加激活状态
    if (filename === '01-主页.html' || filename === '' || filename === './') {
        // 主页 - Logo链接激活
        const logoLink = document.querySelector('.vertical-navbar a[href*="01-主页"]');
        if (logoLink) logoLink.classList.add('active');
    } else if (filename === '02-下载页.html') {
        const downloadLink = document.querySelector('.vertical-navbar a[href*="02-下载页"]');
        if (downloadLink) downloadLink.classList.add('active');
    } else if (filename === '03-Wiki页.html') {
        const wikiLink = document.querySelector('.vertical-navbar a[href*="03-Wiki页"]');
        if (wikiLink) wikiLink.classList.add('active');
    }
}

// ==================== 选择设备并连接（一键完成） ====================
async function selectAndConnectDevice() {
    const statusDots = document.querySelectorAll('.status-dot');
    const connectBtn = document.getElementById('connectBtn2');
    const sendBtn = document.querySelector('textarea')?.nextElementSibling;
    const deviceNameDisplays = document.querySelectorAll('#deviceNameDisplay');
    
    if (!connectBtn) return;
    
    try {
        // 检查浏览器是否支持Web Serial API
        if (!('serial' in navigator)) {
            showStatusMessage('浏览器不支持Web Serial API，请使用Chrome、Edge或Opera', 'error');
            return;
        }
        
        // 如果已连接，则断开
        if (isConnected && selectedPort) {
            // 关闭读取器
            if (reader) {
                await reader.cancel();
                reader = null;
            }
            
            // 关闭端口
            await selectedPort.close();
            selectedPort = null;
            isConnected = false;
            
            // 更新UI为未连接状态
            statusDots.forEach(dot => dot.className = 'status-dot status-disconnected');
            // 更新所有设备名显示位置
            const allDeviceNameDisplays = document.querySelectorAll('#deviceNameDisplay, .device-name-display');
            allDeviceNameDisplays.forEach(display => display.textContent = '未连接');
            connectBtn.textContent = '选择设备并连接';
            connectBtn.className = 'w-full px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 text-sm font-medium rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors';
            if (sendBtn) sendBtn.disabled = true;
            
            stopLoopSend();
            console.log('已断开连接');
            return;
        }
        
        // 步骤1: 请求用户选择串口设备
        selectedPort = await navigator.serial.requestPort();
        
        // 获取设备信息
        const info = selectedPort.getInfo();
        let deviceName = '串口设备';
        if (info.usbProductId && info.usbVendorId) {
            deviceName = `USB设备 (${info.usbVendorId.toString(16)}:${info.usbProductId.toString(16)})`;
        }
        
        // 步骤2: 打开串口连接
        await selectedPort.open({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1
        });
        
        isConnected = true;
        
        // 更新UI为已连接状态
        statusDots.forEach(dot => dot.className = 'status-dot status-connected');
        // 更新所有设备名显示位置
        const allDeviceNameDisplays = document.querySelectorAll('#deviceNameDisplay, .device-name-display');
        allDeviceNameDisplays.forEach(display => display.textContent = deviceName);
        connectBtn.textContent = '断开连接';
        connectBtn.className = 'w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-md hover:bg-red-100 hover:border-red-300 transition-colors';
        if (sendBtn) sendBtn.disabled = false;
        
        console.log('已连接设备:', deviceName);
        
    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log('用户取消选择设备');
        } else {
            console.error('连接失败:', error);
            showStatusMessage('连接失败: ' + error.message, 'error');
        }
    }
}

// ==================== 停止循环发送 ====================
function stopLoopSend() {
    if (loopSendInterval) {
        clearInterval(loopSendInterval);
        loopSendInterval = null;
        const sendBtn = document.querySelector('textarea')?.nextElementSibling;
        if (sendBtn) sendBtn.textContent = '发送';
    }
}

// ==================== 远程桥接管理 ====================
let isRemoteConnected = false;

function joinRemoteConnection() {
    const remoteCodeInput = document.getElementById('remoteCodeInput');
    const remoteStatusDot = document.getElementById('remoteStatusDot');
    const remoteStatusDotBar = document.getElementById('remoteStatusDotBar');
    const remoteStatusText = document.getElementById('remoteStatusText');
    const remoteStatusTextBar = document.getElementById('remoteStatusTextBar');
    const joinBtn = document.getElementById('joinRemoteBtn');
    
    if (!remoteCodeInput || !joinBtn) return;
    
    const remoteCode = remoteCodeInput.value.trim();
    
    if (!isRemoteConnected) {
        // 建立桥接
        if (!remoteCode) {
            showStatusMessage('请输入连接码', 'warning');
            return;
        }
        
        // TODO: 实际的桥接连接逻辑（WebRTC/WebSocket）
        console.log('建立桥接连接:', remoteCode);
        
        // 模拟连接成功
        isRemoteConnected = true;
        
        // 更新UI
        if (remoteStatusDot) remoteStatusDot.className = 'status-dot status-connected';
        if (remoteStatusDotBar) remoteStatusDotBar.className = 'status-dot status-connected';
        if (remoteStatusText) remoteStatusText.textContent = '已桥接';
        if (remoteStatusTextBar) remoteStatusTextBar.textContent = '桥接已连接';
        joinBtn.textContent = '断开桥接';
        joinBtn.className = 'w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-md hover:bg-red-100 hover:border-red-300 transition-colors';
        
    } else {
        // 断开桥接
        isRemoteConnected = false;
        
        // 更新UI
        if (remoteStatusDot) remoteStatusDot.className = 'status-dot status-disconnected';
        if (remoteStatusDotBar) remoteStatusDotBar.className = 'status-dot status-disconnected';
        if (remoteStatusText) remoteStatusText.textContent = '未桥接';
        if (remoteStatusTextBar) remoteStatusTextBar.textContent = '桥接未连接';
        joinBtn.textContent = '建立桥接';
        joinBtn.className = 'w-full px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 text-sm font-medium rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors';
        
        console.log('已断开桥接连接');
    }
}

// ==================== 状态消息系统 ====================
const MESSAGE_TYPES = {
    success: {
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-green-600',
        duration: 3000
    },
    warning: {
        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        color: 'text-yellow-600',
        duration: 4000
    },
    error: {
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-red-600',
        duration: 5000
    },
    info: {
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: 'text-blue-600',
        duration: 3000
    }
};

let messageTimer = null;

// 显示状态消息
function showStatusMessage(message, type = 'info') {
    const statusIcon = document.getElementById('statusIcon');
    const statusMessage = document.getElementById('statusMessage');
    
    if (!statusIcon || !statusMessage) return;
    
    // 清除之前的定时器
    if (messageTimer) clearTimeout(messageTimer);
    
    const config = MESSAGE_TYPES[type] || MESSAGE_TYPES.info;
    
    // 更新图标
    const iconPath = statusIcon.querySelector('path');
    if (iconPath) {
        iconPath.setAttribute('d', config.icon);
    }
    statusIcon.className = `w-3.5 h-3.5 ${config.color}`;
    
    // 更新文字
    statusMessage.textContent = message;
    statusMessage.className = 'text-gray-700';
    
    // 自动恢复
    messageTimer = setTimeout(() => {
        const defaultIcon = MESSAGE_TYPES.success.icon;
        const defaultColor = MESSAGE_TYPES.success.color;
        if (iconPath) {
            iconPath.setAttribute('d', defaultIcon);
        }
        statusIcon.className = `w-3.5 h-3.5 ${defaultColor}`;
        statusMessage.textContent = '就绪';
    }, config.duration);
}

// ==================== 会话共享管理 ====================
let isSessionActive = false;
let isSessionOwner = false;
let hasSendRight = false;

// 生成6位随机邀请码
function generateInviteCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 创建会话
function createSession() {
    if (isSessionActive) {
        showStatusMessage('会话已存在', 'warning');
        return;
    }
    
    // TODO: 实际的会话创建逻辑（WebRTC/WebSocket）
    const inviteCode = generateInviteCode();
    console.log('创建会话，邀请码:', inviteCode);
    
    // 模拟创建成功
    isSessionActive = true;
    isSessionOwner = true;
    hasSendRight = true;
    
    // 更新UI
    const shareStatusDot = document.getElementById('shareStatusDot');
    const shareStatusText = document.getElementById('shareStatusText');
    const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
    const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
    const joinCodeInput = document.getElementById('joinCodeInput');
    const joinSessionBtn = document.getElementById('joinSessionBtn');
    const sendControlArea = document.getElementById('sendControlArea');
    const sendOwnerDisplay = document.getElementById('sendOwnerDisplay');
    const grabSendRightBtn = document.getElementById('grabSendRightBtn');
    const participantList = document.getElementById('participantList');
    const participantCount = document.getElementById('participantCount');
    const endSessionBtn = document.getElementById('endSessionBtn');
    
    // 更新会话状态
    if (shareStatusDot) shareStatusDot.className = 'status-dot status-connected';
    if (shareStatusText) shareStatusText.textContent = '已创建';
    
    // 更新邀请码显示
    if (inviteCodeDisplay) {
        inviteCodeDisplay.value = inviteCode;
        inviteCodeDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-center text-sm text-gray-700 tracking-widest mb-2';
    }
    if (copyInviteCodeBtn) {
        copyInviteCodeBtn.disabled = false;
        copyInviteCodeBtn.classList.remove('opacity-50');
        copyInviteCodeBtn.textContent = '复制邀请码';
    }
    
    // 禁用加入会话
    if (joinCodeInput) {
        joinCodeInput.disabled = true;
        joinCodeInput.placeholder = '已在会话中';
    }
    if (joinSessionBtn) {
        joinSessionBtn.disabled = true;
        joinSessionBtn.classList.add('opacity-50');
    }
    
    // 更新发送权
    if (sendControlArea) {
        sendControlArea.className = 'mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md';
    }
    if (sendOwnerDisplay) {
        sendOwnerDisplay.textContent = '您';
        sendOwnerDisplay.className = 'text-xs font-medium text-yellow-700';
    }
    if (grabSendRightBtn) {
        grabSendRightBtn.disabled = true;
        grabSendRightBtn.className = 'w-full px-3 py-2 bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-medium rounded-md transition-colors opacity-50';
    }
    
    // 更新参与者列表
    if (participantList) {
        participantList.innerHTML = `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div class="flex items-center space-x-2">
                    <span class="status-dot status-connected"></span>
                    <span class="font-medium">您（发起者）</span>
                </div>
                <span class="text-gray-500">在线</span>
            </div>
        `;
    }
    if (participantCount) participantCount.textContent = '1/5';
    
    // 启用结束会话
    if (endSessionBtn) {
        endSessionBtn.disabled = false;
        endSessionBtn.className = 'w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-md hover:bg-red-100 hover:border-red-300 transition-colors';
    }
}

// 加入会话
function joinSession() {
    const joinCodeInput = document.getElementById('joinCodeInput');
    if (!joinCodeInput) return;
    
    const inviteCode = joinCodeInput.value.trim();
    
    if (!inviteCode || inviteCode.length !== 6) {
        showStatusMessage('请输入6位邀请码', 'warning');
        return;
    }
    
    // TODO: 实际的会话加入逻辑（WebRTC/WebSocket）
    console.log('加入会话，邀请码:', inviteCode);
    
    // 模拟加入成功
    isSessionActive = true;
    isSessionOwner = false;
    hasSendRight = true; // 协作者加入后默认获得发送权
    
    // 更新UI
    const shareStatusDot = document.getElementById('shareStatusDot');
    const shareStatusText = document.getElementById('shareStatusText');
    const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
    const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
    const joinSessionBtn = document.getElementById('joinSessionBtn');
    const sendControlArea = document.getElementById('sendControlArea');
    const sendOwnerDisplay = document.getElementById('sendOwnerDisplay');
    const grabSendRightBtn = document.getElementById('grabSendRightBtn');
    const participantList = document.getElementById('participantList');
    const participantCount = document.getElementById('participantCount');
    const endSessionBtn = document.getElementById('endSessionBtn');
    
    // 更新会话状态
    if (shareStatusDot) shareStatusDot.className = 'status-dot status-connected';
    if (shareStatusText) shareStatusText.textContent = '已加入';
    
    // 禁用邀请码生成
    if (inviteCodeDisplay) {
        inviteCodeDisplay.value = '协作者无邀请码';
        inviteCodeDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-center tracking-widest text-sm text-gray-500 mb-2';
    }
    if (copyInviteCodeBtn) {
        copyInviteCodeBtn.disabled = true;
        copyInviteCodeBtn.classList.add('opacity-50');
    }
    
    // 禁用加入会话
    if (joinCodeInput) {
        joinCodeInput.disabled = true;
        joinCodeInput.value = '';
        joinCodeInput.placeholder = '已在会话中';
    }
    if (joinSessionBtn) {
        joinSessionBtn.disabled = true;
        joinSessionBtn.classList.add('opacity-50');
    }
    
    // 更新发送权（协作者默认获得发送权）
    if (sendControlArea) {
        sendControlArea.className = 'mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md';
    }
    if (sendOwnerDisplay) {
        sendOwnerDisplay.textContent = '您';
        sendOwnerDisplay.className = 'text-xs font-medium text-yellow-700';
    }
    if (grabSendRightBtn) {
        grabSendRightBtn.disabled = true;
        grabSendRightBtn.className = 'w-full px-3 py-2 bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-medium rounded-md transition-colors opacity-50';
    }
    
    // 更新参与者列表
    if (participantList) {
        participantList.innerHTML = `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div class="flex items-center space-x-2">
                    <span class="status-dot status-connected"></span>
                    <span class="font-medium">发起者</span>
                </div>
                <span class="text-gray-500">在线</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div class="flex items-center space-x-2">
                    <span class="status-dot status-connected"></span>
                    <span class="font-medium">您（协作者）</span>
                </div>
                <span class="text-gray-500">在线</span>
            </div>
        `;
    }
    if (participantCount) participantCount.textContent = '2/5';
    
    // 启用结束会话按钮（协作者可以离开会话）
    if (endSessionBtn) {
        endSessionBtn.disabled = false;
        endSessionBtn.textContent = '离开会话';
        endSessionBtn.className = 'w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-md hover:bg-red-100 hover:border-red-300 transition-colors';
    }
}

// 抢占发送权
function grabSendRight() {
    if (!isSessionActive) return;
    
    // TODO: 实际的发送权抢占逻辑（WebRTC/WebSocket）
    console.log('抢占发送权');
    
    hasSendRight = true;
    
    // 更新UI
    const sendControlArea = document.getElementById('sendControlArea');
    const sendOwnerDisplay = document.getElementById('sendOwnerDisplay');
    const grabSendRightBtn = document.getElementById('grabSendRightBtn');
    
    if (sendControlArea) {
        sendControlArea.className = 'mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md';
    }
    if (sendOwnerDisplay) {
        sendOwnerDisplay.textContent = '您';
        sendOwnerDisplay.className = 'text-xs font-medium text-yellow-700';
    }
    if (grabSendRightBtn) {
        grabSendRightBtn.disabled = true;
        grabSendRightBtn.className = 'w-full px-3 py-2 bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-medium rounded-md transition-colors opacity-50';
    }
    
    // TODO: 启用发送区
}

// 结束会话
function endSession() {
    if (!isSessionActive) return;
    
    // TODO: 实际的会话结束逻辑（WebRTC/WebSocket）
    const msg = isSessionOwner ? '会话已结束' : '已离开会话';
    console.log(isSessionOwner ? '结束会话' : '离开会话');
    
    isSessionActive = false;
    isSessionOwner = false;
    hasSendRight = false;
    
    // 更新UI
    const shareStatusDot = document.getElementById('shareStatusDot');
    const shareStatusText = document.getElementById('shareStatusText');
    const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
    const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
    const joinCodeInput = document.getElementById('joinCodeInput');
    const joinSessionBtn = document.getElementById('joinSessionBtn');
    const sendControlArea = document.getElementById('sendControlArea');
    const sendOwnerDisplay = document.getElementById('sendOwnerDisplay');
    const grabSendRightBtn = document.getElementById('grabSendRightBtn');
    const participantList = document.getElementById('participantList');
    const participantCount = document.getElementById('participantCount');
    const sessionDuration = document.getElementById('sessionDuration');
    const endSessionBtn = document.getElementById('endSessionBtn');
    
    // 重置会话状态
    if (shareStatusDot) shareStatusDot.className = 'status-dot status-disconnected';
    if (shareStatusText) shareStatusText.textContent = '未创建';
    
    // 重置邀请码
    if (inviteCodeDisplay) {
        inviteCodeDisplay.value = '未创建会话';
        inviteCodeDisplay.className = 'w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-center tracking-widest text-sm text-gray-400 mb-2';
    }
    if (copyInviteCodeBtn) {
        copyInviteCodeBtn.disabled = false;
        copyInviteCodeBtn.classList.remove('opacity-50');
        copyInviteCodeBtn.textContent = '创建并复制邀请码';
    }
    
    // 启用加入会话
    if (joinCodeInput) {
        joinCodeInput.disabled = false;
        joinCodeInput.placeholder = '输入6位邀请码';
    }
    if (joinSessionBtn) {
        joinSessionBtn.disabled = false;
        joinSessionBtn.classList.remove('opacity-50');
    }
    
    // 重置发送权
    if (sendControlArea) {
        sendControlArea.className = 'mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md';
    }
    if (sendOwnerDisplay) {
        sendOwnerDisplay.textContent = '未分配';
        sendOwnerDisplay.className = 'text-xs font-medium text-gray-500';
    }
    if (grabSendRightBtn) {
        grabSendRightBtn.disabled = true;
        grabSendRightBtn.className = 'w-full px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 text-xs font-medium rounded-md transition-colors opacity-50';
    }
    
    // 重置参与者列表
    if (participantList) {
        participantList.innerHTML = `
            <div class="flex items-center justify-center p-2 bg-gray-50 rounded text-xs text-gray-400">
                暂无参与者
            </div>
        `;
    }
    if (participantCount) participantCount.textContent = '0/5';
    if (sessionDuration) sessionDuration.textContent = '00:00:00';
    
    // 禁用结束会话
    if (endSessionBtn) {
        endSessionBtn.disabled = true;
        endSessionBtn.textContent = '结束会话';
        endSessionBtn.className = 'w-full px-4 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 text-sm font-medium rounded-md transition-colors opacity-50';
    }
    
    // 显示成功消息
    showStatusMessage(isSessionOwner ? '会话已结束' : '已离开会话', 'success');
}

// ==================== 侧边栏面板管理 ====================
let currentActivePanel = null;

// 显示指定的侧边栏面板
function showSidebarPanel(panelId) {
    const sidebarContainer = document.getElementById('sidebarContainer');
    const panels = document.querySelectorAll('.sidebar-panel');
    const navButtons = document.querySelectorAll('.vertical-navbar-item[data-panel]');
    
    if (!sidebarContainer) return;
    
    // 如果点击的是当前激活的面板，则隐藏侧边栏
    if (currentActivePanel === panelId && !sidebarContainer.classList.contains('collapsed')) {
        hideSidebar();
        return;
    }
    
    // 显示侧边栏容器
    sidebarContainer.classList.remove('collapsed');
    
    // 恢复保存的宽度
    restoreSidebarWidth();
    
    // 隐藏所有面板
    panels.forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // 移除所有导航按钮的激活状态
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示指定面板
    const targetPanel = document.getElementById(panelId + 'Panel');
    const targetNavBtn = document.querySelector(`.vertical-navbar-item[data-panel="${panelId}"]`);
    
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
    }
    if (targetNavBtn) {
        targetNavBtn.classList.add('active');
    }
    
    // 更新当前激活的面板
    currentActivePanel = panelId;
    
    // 保存状态
    localStorage.setItem('activeSidebarPanel', panelId);
}

// ==================== 侧边栏宽度调整 ====================
function initSidebarResize() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    const resizeHandle = document.getElementById('sidebarResizeHandle');
    
    if (!sidebarContainer || !resizeHandle) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebarContainer.offsetWidth;
        
        sidebarContainer.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        // 计算新宽度（向左拖动增加宽度）
        const deltaX = startX - e.clientX;
        let newWidth = startWidth + deltaX;
        
        // 限制最小宽度和最大宽度
        const minWidth = 280;
        const maxWidth = window.innerWidth * 0.5; // 屏幕宽度的50%
        
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        // 应用新宽度
        sidebarContainer.style.width = newWidth + 'px';
        sidebarContainer.style.minWidth = newWidth + 'px';
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isResizing) return;
        
        isResizing = false;
        sidebarContainer.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // 保存宽度
        const currentWidth = sidebarContainer.offsetWidth;
        localStorage.setItem('sidebarWidth', currentWidth);
    });
}

function restoreSidebarWidth() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (!sidebarContainer) return;
    
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        const width = parseInt(savedWidth);
        const maxWidth = window.innerWidth * 0.5;
        const actualWidth = Math.min(width, maxWidth);
        
        sidebarContainer.style.width = actualWidth + 'px';
        sidebarContainer.style.minWidth = actualWidth + 'px';
    }
}

// 隐藏侧边栏
function hideSidebar() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    const navButtons = document.querySelectorAll('.vertical-navbar-item[data-panel]');
    
    if (!sidebarContainer) return;
    
    // 添加collapsed类（会触发CSS过渡）
    sidebarContainer.classList.add('collapsed');
    
    // 移除所有激活状态
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    currentActivePanel = null;
    localStorage.removeItem('activeSidebarPanel');
}

// 恢复侧边栏状态
function restoreSidebarState() {
    const savedPanel = localStorage.getItem('activeSidebarPanel');
    if (savedPanel) {
        showSidebarPanel(savedPanel);
    }
}

// ==================== 更新状态栏项目信息 ====================
function updateStatusBarProject() {
    const currentProjectNameEl = document.getElementById('currentProjectName');
    const projectSaveStatusEl = document.getElementById('projectSaveStatus');
    const projectSaveTimeEl = document.getElementById('projectSaveTime');
    
    const projects = getProjects();
    const currentProject = projects.find(p => p.isCurrent);
    
    if (currentProject && currentProjectNameEl) {
        currentProjectNameEl.textContent = currentProject.name;
        
        // 未保存项目显示未保存状态
        if (currentProject.isUnsaved) {
            if (projectSaveStatusEl) projectSaveStatusEl.textContent = '未保存';
            if (projectSaveTimeEl) projectSaveTimeEl.textContent = '--:--:--';
        } else {
            if (projectSaveStatusEl) projectSaveStatusEl.textContent = '已保存';
            if (projectSaveTimeEl) {
                const time = currentProject.lastModified.split(' ')[1] || '--:--:--';
                projectSaveTimeEl.textContent = time;
            }
        }
    }
}

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 渲染测试库和项目列表
    renderTestLibrary();
    renderProjectList();
    
    // 更新导航栏激活状态
    updateNavbarActiveState();
    
    // 初始化侧边栏宽度调整功能
    initSidebarResize();
    
    // 恢复侧边栏状态
    restoreSidebarState();
    
    // 初始化邀请码显示（确保类名正确）
    const inviteCodeDisplayInit = document.getElementById('inviteCodeDisplay');
    if (inviteCodeDisplayInit && inviteCodeDisplayInit.value === '未创建会话') {
        // 确保初始状态的类名正确
        inviteCodeDisplayInit.classList.add('text-gray-400', 'text-sm');
    }
    
    // 绑定导航栏按钮事件
    const toggleSerialBtn = document.getElementById('toggleSerialBtn');
    const toggleTestLibBtn = document.getElementById('toggleTestLibBtn');
    const toggleUserBtn = document.getElementById('toggleUserBtn');
    const toggleRemoteBtn = document.getElementById('toggleRemoteBtn');
    const toggleShareBtn = document.getElementById('toggleShareBtn');
    
    if (toggleSerialBtn) {
        toggleSerialBtn.addEventListener('click', function() {
            showSidebarPanel('serial');
        });
    }
    
    if (toggleTestLibBtn) {
        toggleTestLibBtn.addEventListener('click', function() {
            showSidebarPanel('testlib');
        });
    }
    
    if (toggleUserBtn) {
        toggleUserBtn.addEventListener('click', function() {
            showSidebarPanel('project');
        });
    }
    
    if (toggleRemoteBtn) {
        toggleRemoteBtn.addEventListener('click', function() {
            showSidebarPanel('remote');
        });
    }
    
    if (toggleShareBtn) {
        toggleShareBtn.addEventListener('click', function() {
            showSidebarPanel('share');
        });
    }
    
    // 远程桥接按钮事件
    const joinRemoteBtn = document.getElementById('joinRemoteBtn');
    if (joinRemoteBtn) {
        joinRemoteBtn.addEventListener('click', joinRemoteConnection);
    }
    
    // 会话共享按钮事件
    const joinSessionBtn = document.getElementById('joinSessionBtn');
    if (joinSessionBtn) {
        joinSessionBtn.addEventListener('click', joinSession);
    }
    
    const grabSendRightBtn = document.getElementById('grabSendRightBtn');
    if (grabSendRightBtn) {
        grabSendRightBtn.addEventListener('click', grabSendRight);
    }
    
    const endSessionBtn = document.getElementById('endSessionBtn');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', endSession);
    }
    
    const copyInviteCodeBtn = document.getElementById('copyInviteCodeBtn');
    if (copyInviteCodeBtn) {
        copyInviteCodeBtn.addEventListener('click', function() {
            // 如果会话未创建，先创建会话
            if (!isSessionActive) {
                createSession();
            }
            
            // 复制邀请码
            const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
            if (inviteCodeDisplay && inviteCodeDisplay.value && inviteCodeDisplay.value !== '未创建会话') {
                navigator.clipboard.writeText(inviteCodeDisplay.value).then(() => {
                    // 更新按钮文本为"复制邀请码"
                    copyInviteCodeBtn.textContent = '复制邀请码';
                    
                    // 显示复制成功提示
                    const originalText = copyInviteCodeBtn.textContent;
                    copyInviteCodeBtn.textContent = '✓ 已复制';
                    setTimeout(() => {
                        copyInviteCodeBtn.textContent = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                    showStatusMessage('复制失败，请手动复制', 'error');
                });
            }
        });
    }
    
    // 以下是主页特有的功能，只在主页执行
    const connectBtn = document.getElementById('connectBtn2');
    if (!connectBtn) return; // 如果不是主页，直接返回
    
    const loopCheckbox = document.getElementById('loopSendCheckbox');
    const loopIntervalInput = document.querySelector('#loopInterval input');
    const sendBtn = document.querySelector('textarea')?.nextElementSibling;
    const commandListContainer = document.querySelector('.overflow-y-auto.scrollbar-thin');
    const displayFormatRadios = document.querySelectorAll('input[name="displayFormat"]');
    const autoWrapCheckbox = document.getElementById('autoWrapCheckbox');
    
    // 连接按钮事件 - 一键选择设备并连接
    if (connectBtn) {
        connectBtn.addEventListener('click', selectAndConnectDevice);
    }
    
    // 自动换行控制
    if (autoWrapCheckbox) {
        autoWrapCheckbox.addEventListener('change', function() {
            const dataContents = document.querySelectorAll('.data-content');
            dataContents.forEach(content => {
                if (this.checked) {
                    content.classList.remove('no-wrap');
                } else {
                    content.classList.add('no-wrap');
                }
            });
        });
        
        // 初始化状态（默认勾选，允许换行）
        if (!autoWrapCheckbox.checked) {
            const dataContents = document.querySelectorAll('.data-content');
            dataContents.forEach(content => {
                content.classList.add('no-wrap');
            });
        }
    }
    
    // 显示格式切换事件
    if (displayFormatRadios) {
        displayFormatRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const format = this.value;
                console.log('显示格式切换为:', format);
                // 这里可以添加实际的数据格式转换逻辑
                // ASCII模式：正常文本显示
                // HEX模式：转换为十六进制显示（如：41 54 0D 0A）
            });
        });
    }
    
    // 命令操作功能（使用事件委托 - 支持动态生成的元素）
    const commandListElement = document.getElementById('commandList');
    if (commandListElement) {
        commandListElement.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.command-btn-delete');
            if (deleteBtn) {
                const commandItem = deleteBtn.closest('.command-item');
                if (commandItem) {
                    // 添加淡出动画
                    commandItem.style.transition = 'opacity 0.2s, transform 0.2s';
                    commandItem.style.opacity = '0';
                    commandItem.style.transform = 'translateX(10px)';
                    
                    // 动画结束后移除元素
                    setTimeout(() => {
                        commandItem.remove();
                    }, 200);
                }
            }
        });
    }
    
    // 项目删除功能（使用事件委托 - 支持动态生成的元素）
    const projectListElement = document.getElementById('projectList');
    if (projectListElement) {
        projectListElement.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.project-btn-delete');
            if (deleteBtn) {
                e.stopPropagation(); // 防止触发项目切换
                const projectItem = deleteBtn.closest('.project-item');
                if (projectItem && !projectItem.classList.contains('border-blue-500')) {
                    // 不允许删除当前项目
                    projectItem.style.transition = 'opacity 0.2s, transform 0.2s';
                    projectItem.style.opacity = '0';
                    projectItem.style.transform = 'translateX(10px)';
                    
                    setTimeout(() => {
                        projectItem.remove();
                        // 更新项目计数
                        const count = document.querySelectorAll('.project-item').length;
                        const countDisplay = document.querySelector('.px-3.py-3 .text-gray-500');
                        if (countDisplay) countDisplay.textContent = `共 ${count} 个`;
                    }, 200);
                }
            }
        });
    }
    
    // 循环发送复选框事件
    if (loopCheckbox && loopIntervalInput) {
        loopCheckbox.addEventListener('change', function() {
            loopIntervalInput.disabled = !this.checked;
            
            // 如果取消循环发送，停止正在进行的循环
            if (!this.checked) {
                stopLoopSend();
            }
        });
    }
    
    // 发送按钮事件（支持循环发送）
    if (sendBtn && loopCheckbox && loopIntervalInput) {
        sendBtn.addEventListener('click', function() {
            if (!isConnected) return;
            
            const isLoopEnabled = loopCheckbox.checked;
            
            if (isLoopEnabled) {
                // 循环发送模式
                if (loopSendInterval) {
                    // 停止循环发送
                    stopLoopSend();
                } else {
                    // 开始循环发送
                    const interval = parseInt(loopIntervalInput.value) || 1000;
                    sendBtn.textContent = '停止';
                    sendBtn.className = 'px-6 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors h-full';
                    
                    // 立即发送一次
                    console.log('发送数据...');
                    
                    // 设置定时器循环发送
                    loopSendInterval = setInterval(() => {
                        console.log('循环发送数据...');
                    }, interval);
                }
            } else {
                // 单次发送模式
                console.log('单次发送数据...');
            }
        });
    }
});

// ==================== Wiki页特定功能 ====================
// Wiki分类折叠状态管理
function saveWikiSectionState(sectionIndex, collapsed) {
    const states = JSON.parse(localStorage.getItem('wikiSectionStates') || '{}');
    states[sectionIndex] = collapsed;
    localStorage.setItem('wikiSectionStates', JSON.stringify(states));
}

function loadWikiSectionState(sectionIndex) {
    const states = JSON.parse(localStorage.getItem('wikiSectionStates') || '{}');
    return states[sectionIndex] !== undefined ? states[sectionIndex] : false; // 默认展开
}

function initWikiPage() {
    // Wiki侧边栏折叠功能
    const navSections = document.querySelectorAll('.wiki-nav-section');
    navSections.forEach((section, index) => {
        const title = section.querySelector('.wiki-nav-title');
        if (title) {
            // 恢复保存的折叠状态
            const isCollapsed = loadWikiSectionState(index);
            if (isCollapsed) {
                section.classList.add('collapsed');
            }
            
            // 添加点击事件
            title.addEventListener('click', () => {
                section.classList.toggle('collapsed');
                const collapsed = section.classList.contains('collapsed');
                saveWikiSectionState(index, collapsed);
            });
        }
    });
    
    // Wiki搜索功能（简单演示）
    const searchInput = document.querySelector('.wiki-search-nav');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const navSections = document.querySelectorAll('.wiki-nav-section');
            
            // 如果搜索框为空，恢复所有分类的折叠状态
            if (!searchTerm) {
                navSections.forEach((section, index) => {
                    const isCollapsed = loadWikiSectionState(index);
                    if (isCollapsed) {
                        section.classList.add('collapsed');
                    } else {
                        section.classList.remove('collapsed');
                    }
                    
                    const items = section.querySelectorAll('.wiki-nav-item');
                    items.forEach(item => {
                        item.style.display = 'block';
                    });
                });
                return;
            }
            
            // 搜索时展开所有分类并过滤项目
            navSections.forEach(section => {
                section.classList.remove('collapsed');
                let hasVisibleItems = false;
                
                const items = section.querySelectorAll('.wiki-nav-item');
                items.forEach(item => {
                    const link = item.querySelector('.wiki-nav-link');
                    if (link) {
                        const text = link.textContent.toLowerCase();
                        const visible = text.includes(searchTerm);
                        item.style.display = visible ? 'block' : 'none';
                        if (visible) hasVisibleItems = true;
                    }
                });
                
                // 如果分类下没有匹配项，隐藏整个分类
                section.style.display = hasVisibleItems ? 'block' : 'none';
            });
        });
    }
}

// 如果是Wiki页面，初始化Wiki功能
if (window.location.pathname.includes('WikiPage') || window.location.pathname.includes('02-WikiPage')) {
    document.addEventListener('DOMContentLoaded', initWikiPage);
}

// ==================== 虚拟串口功能 (开发测试) ====================
// 全局变量：虚拟串口连接状态
let isVirtualConnected = false;

// 初始化虚拟串口按钮事件
document.addEventListener('DOMContentLoaded', function() {
    const connectVirtualBtn = document.getElementById('connectVirtualBtn');
    const disconnectVirtualBtn = document.getElementById('disconnectVirtualBtn');
    
    // 连接虚拟串口
    connectVirtualBtn?.addEventListener('click', function() {
        console.log('连接虚拟串口...');
        
        // 模拟连接虚拟串口
        isVirtualConnected = true;
        
        // 切换按钮显示状态
        connectVirtualBtn.classList.add('hidden');
        disconnectVirtualBtn.classList.remove('hidden');
        
        // 显示状态消息
        showStatusMessage('虚拟串口已连接', 'success');
        
        // TODO: 这里可以添加虚拟串口的实际连接逻辑
        // 例如：模拟数据接收、虚拟设备响应等
    });
    
    // 断开虚拟串口
    disconnectVirtualBtn?.addEventListener('click', function() {
        console.log('断开虚拟串口...');
        
        // 断开虚拟串口
        isVirtualConnected = false;
        
        // 切换回连接状态
        disconnectVirtualBtn.classList.add('hidden');
        connectVirtualBtn.classList.remove('hidden');
        
        // 显示状态消息
        showStatusMessage('虚拟串口已断开', 'info');
        
        // TODO: 这里可以添加清理虚拟串口连接的逻辑
    });
});

// ==================== 导出数据功能 ====================
// 获取接收区所有数据行
function getReceiveDataLines() {
    const dataLines = document.querySelectorAll('.data-line');
    const lines = [];
    
    dataLines.forEach(line => {
        const timestamp = line.querySelector('.timestamp')?.textContent || '';
        const direction = line.querySelector('.data-direction-receive, .data-direction-send')?.textContent || '';
        const content = line.querySelector('.data-content')?.textContent || '';
        
        lines.push({
            timestamp: timestamp.trim(),
            direction: direction.trim(),
            content: content.trim()
        });
    });
    
    return lines;
}

// 格式化导出数据
function formatExportData(lines, includeTimestamp, includeDirection) {
    let result = '';
    
    lines.forEach(line => {
        let lineText = '';
        
        if (includeTimestamp && line.timestamp) {
            lineText += line.timestamp + ' ';
        }
        
        if (includeDirection && line.direction) {
            lineText += line.direction + ' ';
        }
        
        lineText += line.content;
        
        result += lineText + '\n';
    });
    
    return result;
}

// 下载文本文件
function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// 初始化导出功能
document.addEventListener('DOMContentLoaded', function() {
    const exportDataBtn = document.getElementById('exportDataBtn');
    const exportModal = document.getElementById('exportModal');
    const exportModalClose = document.getElementById('exportModalClose');
    const exportModalCancel = document.getElementById('exportModalCancel');
    const exportModalConfirm = document.getElementById('exportModalConfirm');
    const exportDataCount = document.getElementById('exportDataCount');
    
    // 打开导出对话框
    exportDataBtn?.addEventListener('click', function() {
        const dataLines = getReceiveDataLines();
        
        // 更新数据统计
        if (exportDataCount) {
            exportDataCount.textContent = dataLines.length;
        }
        
        // 生成默认文件名（带日期时间）
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
        const exportFileName = document.getElementById('exportFileName');
        if (exportFileName) {
            exportFileName.value = `serial-data-${dateStr}-${timeStr}`;
        }
        
        // 显示对话框
        exportModal?.classList.remove('hidden');
    });
    
    // 关闭对话框
    function closeExportModal() {
        exportModal?.classList.add('hidden');
    }
    
    exportModalClose?.addEventListener('click', closeExportModal);
    exportModalCancel?.addEventListener('click', closeExportModal);
    
    // 点击背景关闭
    exportModal?.addEventListener('click', function(e) {
        if (e.target === exportModal) {
            closeExportModal();
        }
    });
    
    // 确认导出
    exportModalConfirm?.addEventListener('click', function() {
        const dataLines = getReceiveDataLines();
        const fileName = document.getElementById('exportFileName')?.value || 'serial-data';
        const includeTimestamp = document.getElementById('exportIncludeTimestamp')?.checked || false;
        const includeDirection = document.getElementById('exportIncludeDirection')?.checked || false;
        
        // 格式化数据
        const content = formatExportData(dataLines, includeTimestamp, includeDirection);
        
        // 下载文件
        downloadTextFile(content, fileName + '.txt');
        
        // 显示成功消息
        showStatusMessage(`已导出 ${dataLines.length} 行数据`, 'success');
        
        // 关闭对话框
        closeExportModal();
    });
    
    // ESC键关闭对话框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !exportModal?.classList.contains('hidden')) {
            closeExportModal();
        }
    });
});

// ==================== 接收区搜索功能 ====================
let searchMatches = [];
let currentSearchIndex = -1;

// 清除所有搜索高亮
function clearSearchHighlights() {
    // 移除所有高亮标记
    document.querySelectorAll('.search-highlight, .search-current').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
    
    // 移除数据行高亮
    document.querySelectorAll('.data-line.search-match, .data-line.search-current-line').forEach(line => {
        line.classList.remove('search-match', 'search-current-line');
    });
    
    searchMatches = [];
    currentSearchIndex = -1;
}

// 高亮搜索结果
function highlightSearchResults(searchText) {
    clearSearchHighlights();
    
    if (!searchText || searchText.trim() === '') {
        updateSearchCount(0, 0);
        return;
    }
    
    const dataLines = document.querySelectorAll('.data-line');
    const searchLower = searchText.toLowerCase();
    let matchCount = 0;
    
    dataLines.forEach((line, lineIndex) => {
        const contentElement = line.querySelector('.data-content');
        if (!contentElement) return;
        
        const originalText = contentElement.textContent;
        const originalLower = originalText.toLowerCase();
        
        // 检查是否匹配
        if (originalLower.includes(searchLower)) {
            line.classList.add('search-match');
            
            // 高亮匹配的文本
            let highlightedHTML = '';
            let lastIndex = 0;
            let searchIndex = originalLower.indexOf(searchLower);
            
            while (searchIndex !== -1) {
                // 添加匹配前的文本
                highlightedHTML += escapeHtml(originalText.substring(lastIndex, searchIndex));
                
                // 添加高亮的匹配文本
                const matchText = originalText.substring(searchIndex, searchIndex + searchText.length);
                highlightedHTML += `<span class="search-highlight">${escapeHtml(matchText)}</span>`;
                
                // 记录匹配位置
                searchMatches.push({
                    lineElement: line,
                    lineIndex: lineIndex,
                    matchIndex: matchCount
                });
                matchCount++;
                
                lastIndex = searchIndex + searchText.length;
                searchIndex = originalLower.indexOf(searchLower, lastIndex);
            }
            
            // 添加剩余文本
            highlightedHTML += escapeHtml(originalText.substring(lastIndex));
            
            // 更新内容（保留原有的class）
            contentElement.innerHTML = highlightedHTML;
        }
    });
    
    updateSearchCount(matchCount > 0 ? 1 : 0, matchCount);
    
    // 如果有匹配，跳转到第一个
    if (matchCount > 0) {
        currentSearchIndex = 0;
        highlightCurrentMatch();
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 更新匹配计数显示
function updateSearchCount(current, total) {
    const searchCount = document.getElementById('searchCount');
    if (searchCount) {
        searchCount.textContent = `${current}/${total}`;
    }
}

// 高亮当前匹配项
function highlightCurrentMatch() {
    if (currentSearchIndex < 0 || currentSearchIndex >= searchMatches.length) {
        return;
    }
    
    // 移除之前的当前高亮
    document.querySelectorAll('.search-current').forEach(el => {
        el.classList.remove('search-current');
        el.classList.add('search-highlight');
    });
    document.querySelectorAll('.data-line.search-current-line').forEach(line => {
        line.classList.remove('search-current-line');
    });
    
    // 获取当前匹配
    const match = searchMatches[currentSearchIndex];
    const lineElement = match.lineElement;
    
    // 高亮当前匹配的行
    lineElement.classList.add('search-current-line');
    
    // 高亮当前匹配的文本
    const highlights = lineElement.querySelectorAll('.search-highlight');
    const matchIndexInLine = searchMatches.filter(m => 
        m.lineIndex === match.lineIndex && m.matchIndex <= match.matchIndex
    ).length - 1;
    
    if (highlights[matchIndexInLine]) {
        highlights[matchIndexInLine].classList.remove('search-highlight');
        highlights[matchIndexInLine].classList.add('search-current');
    }
    
    // 滚动到可见区域
    lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 更新计数显示
    updateSearchCount(currentSearchIndex + 1, searchMatches.length);
}

// 上一个匹配
function searchPrevious() {
    if (searchMatches.length === 0) return;
    
    currentSearchIndex--;
    if (currentSearchIndex < 0) {
        currentSearchIndex = searchMatches.length - 1;
    }
    
    highlightCurrentMatch();
}

// 下一个匹配
function searchNextMatch() {
    if (searchMatches.length === 0) return;
    
    currentSearchIndex++;
    if (currentSearchIndex >= searchMatches.length) {
        currentSearchIndex = 0;
    }
    
    highlightCurrentMatch();
}

// 初始化搜索功能
document.addEventListener('DOMContentLoaded', function() {
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const searchControls = document.getElementById('searchControls');
    const searchInput = document.getElementById('searchInput');
    const searchClose = document.getElementById('searchClose');
    const searchPrev = document.getElementById('searchPrev');
    const searchNext = document.getElementById('searchNext');
    
    // 切换搜索控件显示
    searchToggleBtn?.addEventListener('click', function() {
        const isHidden = searchControls?.classList.contains('hidden');
        
        if (isHidden) {
            // 显示搜索控件
            searchControls?.classList.remove('hidden');
            searchInput?.focus();
        } else {
            // 隐藏搜索控件
            searchControls?.classList.add('hidden');
            clearSearchHighlights();
        }
    });
    
    // 关闭搜索
    searchClose?.addEventListener('click', function() {
        searchControls?.classList.add('hidden');
        clearSearchHighlights();
        if (searchInput) searchInput.value = '';
    });
    
    // 实时搜索
    searchInput?.addEventListener('input', function() {
        highlightSearchResults(this.value);
    });
    
    // Enter键跳转到下一个
    searchInput?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                searchPrevious();
            } else {
                searchNextMatch();
            }
        }
    });
    
    // 导航按钮
    searchPrev?.addEventListener('click', searchPrevious);
    searchNext?.addEventListener('click', searchNextMatch);
    
    // Ctrl+F 打开搜索
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchControls?.classList.remove('hidden');
            searchInput?.focus();
        }
        
        // ESC关闭搜索
        if (e.key === 'Escape' && !searchControls?.classList.contains('hidden')) {
            searchControls?.classList.add('hidden');
            clearSearchHighlights();
            if (searchInput) searchInput.value = '';
        }
    });
});

// ==================== 新建项目对话框功能 ====================
document.addEventListener('DOMContentLoaded', function() {
    const newProjectBtn = document.getElementById('newProjectBtn');
    const newProjectModal = document.getElementById('newProjectModal');
    const newProjectModalClose = document.getElementById('newProjectModalClose');
    const newProjectModalCancel = document.getElementById('newProjectModalCancel');
    const newProjectModalConfirm = document.getElementById('newProjectModalConfirm');
    
    // 打开新建项目对话框
    newProjectBtn?.addEventListener('click', function() {
        newProjectModal?.classList.remove('hidden');
        // 自动聚焦到项目名称输入框
        setTimeout(() => {
            document.getElementById('newProjectName')?.focus();
        }, 100);
    });
    
    // 关闭对话框
    function closeNewProjectModal() {
        newProjectModal?.classList.add('hidden');
        clearNewProjectForm();
    }
    
    newProjectModalClose?.addEventListener('click', closeNewProjectModal);
    newProjectModalCancel?.addEventListener('click', closeNewProjectModal);
    
    // 点击背景关闭
    newProjectModal?.addEventListener('click', function(e) {
        if (e.target === newProjectModal) {
            closeNewProjectModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !newProjectModal?.classList.contains('hidden')) {
            closeNewProjectModal();
        }
    });
    
    // 清空表单
    function clearNewProjectForm() {
        const nameInput = document.getElementById('newProjectName');
        const descInput = document.getElementById('newProjectDesc');
        
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
    }
    
    // 创建项目
    newProjectModalConfirm?.addEventListener('click', function() {
        const projectName = document.getElementById('newProjectName')?.value.trim();
        const projectDesc = document.getElementById('newProjectDesc')?.value.trim();
        
        // 验证项目名称
        if (!projectName) {
            showStatusMessage('请输入项目名称', 'error');
            document.getElementById('newProjectName')?.focus();
            return;
        }
        
        if (projectName.length < 2) {
            showStatusMessage('项目名称至少需要2个字符', 'error');
            return;
        }
        
        if (projectName.length > 50) {
            showStatusMessage('项目名称不能超过50个字符', 'error');
            return;
        }
        
        // 构建项目数据
        const projectData = {
            name: projectName,
            description: projectDesc,
            createdAt: new Date().toISOString()
        };
        
        console.log('创建新项目:', projectData);
        showStatusMessage('项目创建功能开发中...', 'info');
        
        // TODO: 实现实际的项目创建逻辑
        // POST /api/projects
        // Body: projectData
        // 成功后：
        // - 关闭对话框
        // - 添加到项目列表
        // - 切换到新项目
        // - 如果已登录，自动同步到云端
        
        // closeNewProjectModal();
    });
});

// ==================== 登录/注册对话框功能 ====================
// 密码强度检测
function checkPasswordStrength(password) {
    let strength = 0;
    let strengthText = '弱';
    let strengthColor = '#EF4444'; // 红色
    let strengthWidth = '25%';
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength >= 4) {
        strengthText = '强';
        strengthColor = '#10B981'; // 绿色
        strengthWidth = '100%';
    } else if (strength >= 3) {
        strengthText = '中';
        strengthColor = '#F59E0B'; // 黄色
        strengthWidth = '66%';
    } else if (strength >= 2) {
        strengthText = '一般';
        strengthColor = '#F59E0B';
        strengthWidth = '50%';
    }
    
    return { strength, strengthText, strengthColor, strengthWidth };
}

document.addEventListener('DOMContentLoaded', function() {
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const authTabLogin = document.getElementById('authTabLogin');
    const authTabRegister = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const openLoginBtn = document.getElementById('openLoginBtn');
    const openRegisterBtn = document.getElementById('openRegisterBtn');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const registerSubmitBtn = document.getElementById('registerSubmitBtn');
    
    // 打开登录对话框
    openLoginBtn?.addEventListener('click', function() {
        authModal?.classList.remove('hidden');
        showLoginTab();
    });
    
    // 打开注册对话框
    openRegisterBtn?.addEventListener('click', function() {
        authModal?.classList.remove('hidden');
        showRegisterTab();
    });
    
    // 关闭对话框
    function closeAuthModal() {
        authModal?.classList.add('hidden');
        clearAuthForms();
    }
    
    authModalClose?.addEventListener('click', closeAuthModal);
    
    // 点击背景关闭
    authModal?.addEventListener('click', function(e) {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !authModal?.classList.contains('hidden')) {
            closeAuthModal();
        }
    });
    
    // 切换到登录标签页
    function showLoginTab() {
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
        authTabLogin?.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        authTabLogin?.classList.remove('text-gray-400');
        authTabRegister?.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        authTabRegister?.classList.add('text-gray-400');
    }
    
    // 切换到注册标签页
    function showRegisterTab() {
        registerForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        authTabRegister?.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        authTabRegister?.classList.remove('text-gray-400');
        authTabLogin?.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        authTabLogin?.classList.add('text-gray-400');
    }
    
    authTabLogin?.addEventListener('click', showLoginTab);
    authTabRegister?.addEventListener('click', showRegisterTab);
    
    // 清空表单
    function clearAuthForms() {
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');
        const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
        const rememberMe = document.getElementById('rememberMe');
        const agreeTerms = document.getElementById('agreeTerms');
        
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (registerEmail) registerEmail.value = '';
        if (registerPassword) registerPassword.value = '';
        if (registerPasswordConfirm) registerPasswordConfirm.value = '';
        if (rememberMe) rememberMe.checked = false;
        if (agreeTerms) agreeTerms.checked = false;
        
        // 重置密码强度显示
        const strengthFill = document.getElementById('passwordStrengthFill');
        const strengthText = document.getElementById('passwordStrengthText');
        if (strengthFill) {
            strengthFill.style.width = '0%';
            strengthFill.style.backgroundColor = '#D1D5DB';
        }
        if (strengthText) strengthText.textContent = '弱';
    }
    
    // 密码显示/隐藏切换 - 登录
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const loginPasswordInput = document.getElementById('loginPassword');
    toggleLoginPassword?.addEventListener('click', function() {
        const type = loginPasswordInput?.type === 'password' ? 'text' : 'password';
        if (loginPasswordInput) loginPasswordInput.type = type;
    });
    
    // 密码显示/隐藏切换 - 注册
    const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
    const registerPasswordInput = document.getElementById('registerPassword');
    toggleRegisterPassword?.addEventListener('click', function() {
        const type = registerPasswordInput?.type === 'password' ? 'text' : 'password';
        if (registerPasswordInput) registerPasswordInput.type = type;
    });
    
    // 密码强度实时检测
    registerPasswordInput?.addEventListener('input', function() {
        const password = this.value;
        const result = checkPasswordStrength(password);
        
        const strengthFill = document.getElementById('passwordStrengthFill');
        const strengthText = document.getElementById('passwordStrengthText');
        
        if (strengthFill) {
            strengthFill.style.width = result.strengthWidth;
            strengthFill.style.backgroundColor = result.strengthColor;
        }
        if (strengthText) {
            strengthText.textContent = result.strengthText;
            strengthText.style.color = result.strengthColor;
        }
    });
    
    // 忘记密码
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    forgotPasswordBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        showStatusMessage('忘记密码功能开发中...', 'info');
        // TODO: 实现忘记密码对话框
    });
    
    // 第三方登录事件
    document.getElementById('loginWechat')?.addEventListener('click', function() {
        console.log('微信登录');
        showStatusMessage('微信登录功能开发中...', 'info');
        // TODO: 实现微信OAuth流程
    });
    
    document.getElementById('loginGoogle')?.addEventListener('click', function() {
        console.log('Google登录');
        showStatusMessage('Google登录功能开发中...', 'info');
        // TODO: 实现Google OAuth流程
    });
    
    // 第三方注册事件
    document.getElementById('registerWechat')?.addEventListener('click', function() {
        console.log('微信注册');
        showStatusMessage('微信快速注册功能开发中...', 'info');
        // TODO: 实现微信OAuth流程
    });
    
    document.getElementById('registerGoogle')?.addEventListener('click', function() {
        console.log('Google注册');
        showStatusMessage('Google注册功能开发中...', 'info');
        // TODO: 实现Google OAuth流程
    });
    
    // 邮箱格式验证
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // 密码强度验证
    function validatePassword(password) {
        // 至少8位，包含字母和数字
        if (password.length < 8) {
            return { valid: false, message: '密码至少需要8个字符' };
        }
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, message: '密码必须包含字母' };
        }
        if (!/\d/.test(password)) {
            return { valid: false, message: '密码必须包含数字' };
        }
        return { valid: true, message: '' };
    }
    
    // 登录提交
    loginSubmitBtn?.addEventListener('click', function() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        
        // 表单验证
        if (!email || !password) {
            showStatusMessage('请填写完整的登录信息', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showStatusMessage('请输入有效的邮箱地址', 'error');
            return;
        }
        
        console.log('登录提交:', { email, rememberMe });
        showStatusMessage('登录功能开发中...', 'info');
        
        // TODO: 实现实际的登录API调用
        // POST /api/auth/login
        // Body: { email, password, rememberMe }
        // Response: { token, refreshToken, user }
        // 成功后：
        // - 保存Token到localStorage (rememberMe ? 7天 : session)
        // - 关闭对话框
        // - 切换到已登录状态
        // - 拉取用户配置和项目列表
    });
    
    // 注册提交
    registerSubmitBtn?.addEventListener('click', function() {
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked;
        
        // 表单验证
        if (!email || !password || !passwordConfirm) {
            showStatusMessage('请填写完整的注册信息', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showStatusMessage('请输入有效的邮箱地址', 'error');
            return;
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            showStatusMessage(passwordValidation.message, 'error');
            return;
        }
        
        if (password !== passwordConfirm) {
            showStatusMessage('两次输入的密码不一致', 'error');
            return;
        }
        
        if (!agreeTerms) {
            showStatusMessage('请阅读并同意用户协议和隐私政策', 'error');
            return;
        }
        
        console.log('注册提交:', { email });
        showStatusMessage('注册功能开发中...', 'info');
        
        // TODO: 实现实际的注册API调用
        // POST /api/auth/register
        // Body: { email, password }
        // Response: { message: '验证邮件已发送' }
        // 成功后：
        // - 显示"验证邮件已发送"提示
        // - 提示用户查收邮件
        // - 关闭对话框或切换到登录标签页
    });
});

