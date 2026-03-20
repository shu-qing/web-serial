import { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { TestCase, TestVariable, Assertion, Precondition, ChecksumType } from '@/types';
import { addChecksum } from '@/utils/checksum';
import { useTranslation } from 'react-i18next';

interface TestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testCase: Partial<TestCase>) => void;
  testCase?: TestCase | null;
  suiteId: string;
  suiteVariables?: TestVariable[]; // 测试单的全局变量（只读）
}

export default function TestCaseModal({ isOpen, onClose, onSave, testCase, suiteId, suiteVariables = [] }: TestCaseModalProps) {
  const { t } = useTranslation();
  const isEdit = !!testCase;

  // 基本信息
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  // 命令配置
  const [command, setCommand] = useState('');
  const [encoding, setEncoding] = useState<'utf-8' | 'hex'>('utf-8');
  const [lineEnding, setLineEnding] = useState<'none' | 'cr' | 'lf' | 'crlf'>('none');

  // 期望响应
  const [expectedResponse, setExpectedResponse] = useState('');
  const [timeout, setTimeout] = useState(1000);

  // 变量
  const [variables, setVariables] = useState<TestVariable[]>([]);

  // 断言
  const [assertions, setAssertions] = useState<Assertion[]>([]);

  // 前置条件
  const [preconditions, setPreconditions] = useState<Precondition[]>([]);

  // 校验码类型选择
  const [checksumType, setChecksumType] = useState<ChecksumType>('CRC16-Modbus');
  const [responseChecksumType, setResponseChecksumType] = useState<ChecksumType>('CRC16-Modbus');

  // 执行配置
  const [retryCount, setRetryCount] = useState(1);
  const [retryDelay, setRetryDelay] = useState(1000);
  const [continueOnFail, setContinueOnFail] = useState(false);

  // 当前标签页
  const [activeTab, setActiveTab] = useState<'basic' | 'command' | 'variables' | 'assertions' | 'advanced'>('basic');

  // 初始化
  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setDescription(testCase.description || '');
      setIsEnabled(testCase.isEnabled);
      setCommand(testCase.command);
      setEncoding(testCase.encoding);
      setLineEnding(testCase.lineEnding);
      setExpectedResponse(testCase.expectedResponse || '');
      setTimeout(testCase.timeout);
      setVariables(testCase.variables || []);
      setAssertions(testCase.assertions || []);
      setPreconditions(testCase.preconditions || []);
      setChecksumType('CRC16-Modbus');
      setResponseChecksumType('CRC16-Modbus');
      // 兼容旧数据：如果 retryCount 为 0 或未定义，设置为 1
      setRetryCount(testCase.retryCount && testCase.retryCount > 0 ? testCase.retryCount : 1);
      setRetryDelay(testCase.retryDelay);
      setContinueOnFail(testCase.continueOnFail);
    } else {
      // 重置表单
      resetForm();
    }
  }, [testCase, isOpen]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsEnabled(true);
    setCommand('');
    setEncoding('utf-8');
    setLineEnding('none');
    setExpectedResponse('');
    setTimeout(1000);
    setVariables([]);
    setAssertions([]);
    setPreconditions([]);
    setChecksumType('CRC16-Modbus');
    setResponseChecksumType('CRC16-Modbus');
    setRetryCount(1);
    setRetryDelay(1000);
    setContinueOnFail(false);
    setActiveTab('basic');
  };

  // 添加校验码到命令
  const handleAddChecksumToCommand = () => {
    if (!command.trim()) return;
    
    try {
      const encodingType = encoding === 'utf-8' ? 'text' : 'hex';
      const withChecksum = addChecksum(command, checksumType, encodingType);
      setCommand(withChecksum);
    } catch (error) {
      alert(t('notification.checksumFailed', { defaultValue: 'Checksum generation failed' }) + ': ' + (error as Error).message);
    }
  };

  // 添加校验码到期望响应
  const handleAddChecksumToResponse = () => {
    if (!expectedResponse.trim()) return;
    
    try {
      const encodingType = encoding === 'utf-8' ? 'text' : 'hex';
      const withChecksum = addChecksum(expectedResponse, responseChecksumType, encodingType);
      setExpectedResponse(withChecksum);
    } catch (error) {
      alert(t('notification.checksumFailed', { defaultValue: 'Checksum generation failed' }) + ': ' + (error as Error).message);
    }
  };

  const handleSave = () => {
    const data: Partial<TestCase> = {
      suiteId,
      name,
      description,
      tags: [],  // 移除标签功能
      command,
      encoding,
      lineEnding,
      expectedResponse,
      timeout,
      variables,
      assertions,
      preconditions,
      checksumType: undefined,  // 不再保存校验码配置
      checksumPosition: 'append',
      retryCount,
      retryDelay,
      continueOnFail,
      isEnabled,
      order: testCase?.order || 0,
      runCount: testCase?.runCount || 0,
      passCount: testCase?.passCount || 0,
      failCount: testCase?.failCount || 0,
    };

    onSave(data);
    onClose();
  };

  // 添加变量
  const addVariable = () => {
    setVariables([
      ...variables,
      {
        name: `var${variables.length + 1}`,
        type: 'string',
        required: false,
      },
    ]);
  };

  // 删除变量
  const deleteVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  // 更新变量
  const updateVariable = (index: number, field: keyof TestVariable, value: any) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setVariables(newVariables);
  };

  // 添加断言
  const addAssertion = () => {
    setAssertions([
      ...assertions,
      {
        type: 'contains',
        value: '',
      },
    ]);
  };

  // 删除断言
  const deleteAssertion = (index: number) => {
    setAssertions(assertions.filter((_, i) => i !== index));
  };

  // 更新断言
  const updateAssertion = (index: number, field: keyof Assertion, value: any) => {
    const newAssertions = [...assertions];
    newAssertions[index] = { ...newAssertions[index], [field]: value };
    setAssertions(newAssertions);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? t('testLib.editCase') : t('testLib.newCase')} size="md">
      <div className="space-y-4">
        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4">
            {[
              { key: 'basic', label: t('testLib.basicConfig') },
              { key: 'advanced', label: t('testLib.advancedOptions') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 基本配置 - 优化布局 */}
        {activeTab === 'basic' && (
          <div className="space-y-3">
            {/* 第一行：名称 + 启用开关（上下对齐） */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('testLib.testCaseName', { defaultValue: 'Test Case Name' })} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder={t('testLib.namePlaceholder', { defaultValue: 'e.g., Query device status' })}
                />
              </div>
              <div className="flex flex-col items-center">
                <label className="block text-xs font-medium text-gray-700 mb-1">{isEnabled ? t('testLib.enabled') : t('testLib.disabled')}</label>
                <div className="h-[34px] flex items-center justify-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer-checked:bg-blue-600 transition-colors">
                      <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform ${isEnabled ? 'translate-x-5' : ''}`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 第二行：命令内容 + 校验码 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('testLib.commandContent', { defaultValue: '命令内容' })} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono resize-none flex-1"
                  rows={2}
                  placeholder={t('testLib.commandPlaceholder', { defaultValue: 'e.g., AT+STATUS? or 01 03 00 00 00 0A\nSupports variables: ${varName}' })}
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.checksum')}</label>
                <div className="flex-1 flex flex-col gap-1">
                  <select
                    value={checksumType}
                    onChange={(e) => setChecksumType(e.target.value as ChecksumType)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="CRC16-Modbus">CRC16-Modbus</option>
                    <option value="CRC16-CCITT">CRC16-CCITT</option>
                    <option value="CRC8">CRC8</option>
                    <option value="XOR">XOR</option>
                    <option value="Checksum">{t('checksum.checksum', { defaultValue: 'Checksum' })}</option>
                    <option value="BCC">BCC</option>
                    <option value="LRC">LRC</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddChecksumToCommand}
                    className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                    disabled={!command.trim()}
                  >
                    {t('checksum.appendToEnd', { defaultValue: 'Calculate and append to end' })}
                  </button>
                </div>
              </div>
            </div>

            {/* 第三行：编码、行结束符、超时 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('testLib.encoding', { defaultValue: 'Encoding' })}</label>
                <select
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value as any)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="utf-8">{t('testLib.textASCII', { defaultValue: 'Text (ASCII)' })}</option>
                  <option value="hex">{t('testLib.hexadecimal', { defaultValue: 'Hexadecimal (HEX)' })}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('testLib.lineEnding', { defaultValue: 'Line Ending' })}</label>
                <select
                  value={lineEnding}
                  onChange={(e) => setLineEnding(e.target.value as any)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="none">{t('common.none', { defaultValue: 'None' })}</option>
                  <option value="cr">CR</option>
                  <option value="lf">LF</option>
                  <option value="crlf">CRLF</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('testLib.timeout', { defaultValue: 'Timeout' })} (ms)</label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  min="100"
                  step="100"
                />
              </div>
            </div>

            {/* 第四行：期望响应 + 校验码 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('testLib.expectedResponse')}</label>
                <textarea
                  value={expectedResponse}
                  onChange={(e) => setExpectedResponse(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono resize-none flex-1"
                  rows={2}
                  placeholder={t('testLib.responsePlaceholder', { defaultValue: 'e.g., OK (leave empty to skip validation)' })}
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('serial.checksum')}</label>
                <div className="flex-1 flex flex-col gap-1">
                  <select
                    value={responseChecksumType}
                    onChange={(e) => setResponseChecksumType(e.target.value as ChecksumType)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="CRC16-Modbus">CRC16-Modbus</option>
                    <option value="CRC16-CCITT">CRC16-CCITT</option>
                    <option value="CRC8">CRC8</option>
                    <option value="XOR">XOR</option>
                    <option value="Checksum">{t('checksum.checksum', { defaultValue: 'Checksum' })}</option>
                    <option value="BCC">BCC</option>
                    <option value="LRC">LRC</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddChecksumToResponse}
                    className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                    disabled={!expectedResponse.trim()}
                  >
                    {t('checksum.appendToEnd', { defaultValue: 'Calculate and append to end' })}
                  </button>
                </div>
              </div>
            </div>

            {/* 第五行：描述 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('testLib.description', { defaultValue: 'Description' })}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder={t('testLib.descriptionPlaceholder', { defaultValue: 'Brief description...' })}
              />
            </div>
          </div>
        )}

        {/* 高级选项 - 紧凑布局 */}
        {activeTab === 'advanced' && (
          <div className="space-y-3">
            {/* 变量部分 */}
            <div className="border-b pb-3">
              {/* 全局变量（继承自测试单，只读） */}
              {suiteVariables && suiteVariables.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    {t('testLib.suiteGlobalVariables', { defaultValue: 'Suite Global Variables' })} <span className="text-gray-400 font-normal">({t('common.readonly', { defaultValue: 'Read-only' })})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {suiteVariables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={variable.name}
                          className="w-32 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded cursor-not-allowed"
                          readOnly
                          disabled
                        />
                        <select
                          value={variable.type}
                          className="w-24 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded cursor-not-allowed"
                          disabled
                        >
                          <option value="string">{t('testLib.string', { defaultValue: 'String' })}</option>
                          <option value="number">{t('testLib.number', { defaultValue: 'Number' })}</option>
                          <option value="boolean">{t('testLib.boolean', { defaultValue: 'Boolean' })}</option>
                          <option value="hex">{t('testLib.hex', { defaultValue: 'Hex' })}</option>
                        </select>
                        <input
                          type="text"
                          value={variable.defaultValue || ''}
                          className="flex-1 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded cursor-not-allowed"
                          placeholder={t('testLib.defaultValue', { defaultValue: 'Default value' })}
                          readOnly
                          disabled
                        />
                        <div className="w-12 text-xs text-gray-400 text-center">{t('testLib.global', { defaultValue: 'Global' })}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 测试用例变量（可编辑） */}
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-medium text-gray-700">{t('testLib.caseVariables', { defaultValue: 'Case Variables' })}</h4>
                <button
                  onClick={addVariable}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + {t('common.add', { defaultValue: 'Add' })}
                </button>
              </div>
              {variables.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">{t('testLib.noVariables', { defaultValue: 'No variables' })}</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                        className="w-32 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('testLib.variableName', { defaultValue: 'Variable name' })}
                      />
                      <select
                        value={variable.type}
                        onChange={(e) => updateVariable(index, 'type', e.target.value)}
                        className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="string">{t('testLib.string', { defaultValue: 'String' })}</option>
                        <option value="number">{t('testLib.number', { defaultValue: 'Number' })}</option>
                        <option value="boolean">{t('testLib.boolean', { defaultValue: 'Boolean' })}</option>
                        <option value="hex">{t('testLib.hex', { defaultValue: 'Hex' })}</option>
                      </select>
                      <input
                        type="text"
                        value={variable.defaultValue || ''}
                        onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('testLib.defaultValue')}
                      />
                      <button
                        onClick={() => deleteVariable(index)}
                        className="w-12 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 断言部分 */}
            <div className="border-b pb-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-medium text-gray-700">{t('testLib.assertions')}</h4>
                <button
                  onClick={addAssertion}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + {t('common.add', { defaultValue: 'Add' })}
                </button>
              </div>
              {assertions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">{t('testLib.noAssertions', { defaultValue: 'No assertions (will use expected response for matching)' })}</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {assertions.map((assertion, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={assertion.type}
                        onChange={(e) => updateAssertion(index, 'type', e.target.value)}
                        className="w-32 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="equals">{t('testLib.equals', { defaultValue: 'Equals' })}</option>
                        <option value="contains">{t('testLib.contains', { defaultValue: 'Contains' })}</option>
                        <option value="not_contains">{t('testLib.notContains', { defaultValue: 'Not Contains' })}</option>
                        <option value="regex">{t('testLib.regex', { defaultValue: 'Regex Match' })}</option>
                        <option value="starts_with">{t('testLib.startsWith', { defaultValue: 'Starts With' })}</option>
                        <option value="ends_with">{t('testLib.endsWith', { defaultValue: 'Ends With' })}</option>
                        <option value="length_eq">{t('testLib.lengthEquals', { defaultValue: 'Length Equals' })}</option>
                        <option value="length_gt">{t('testLib.lengthGreaterThan', { defaultValue: 'Length Greater Than' })}</option>
                        <option value="length_lt">{t('testLib.lengthLessThan', { defaultValue: 'Length Less Than' })}</option>
                      </select>
                      <input
                        type="text"
                        value={assertion.value}
                        onChange={(e) => updateAssertion(index, 'value', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('testLib.expectedValue', { defaultValue: 'Expected value' })}
                      />
                      <label className="flex items-center text-xs w-14">
                        <input
                          type="checkbox"
                          checked={assertion.negate || false}
                          onChange={(e) => updateAssertion(index, 'negate', e.target.checked)}
                          className="mr-1"
                        />
                        {t('testLib.negate', { defaultValue: 'Negate' })}
                      </label>
                      <button
                        onClick={() => deleteAssertion(index)}
                        className="w-12 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 执行配置 */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">{t('testLib.executionConfig', { defaultValue: 'Execution Config' })}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('testLib.executionCount', { defaultValue: 'Execution Count' })}</label>
                  <input
                    type="number"
                    value={retryCount}
                    onChange={(e) => setRetryCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{t('testLib.executionCountNote', { defaultValue: 'Number of times to execute this test case' })}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('testLib.interval')} (ms)</label>
                  <input
                    type="number"
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('testLib.failureStrategy', { defaultValue: 'Failure Strategy' })}</label>
                  <select
                    value={continueOnFail ? 'continue' : 'stop'}
                    onChange={(e) => setContinueOnFail(e.target.value === 'continue')}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="continue">{t('testLib.continueOnFail', { defaultValue: 'Continue on Fail' })}</option>
                    <option value="stop">{t('testLib.stopOnFail', { defaultValue: 'Stop on Fail' })}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={!name.trim() || !command.trim()}
          >
            {isEdit ? t('common.save') : t('common.create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}


