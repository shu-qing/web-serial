import { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import { TestVariable } from '@/types';

interface VariableInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (variables: Record<string, any>) => void;
  variables: TestVariable[];
}

export default function VariableInputModal({ isOpen, onClose, onConfirm, variables }: VariableInputModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // 初始化默认值
      const initialValues: Record<string, any> = {};
      variables.forEach((v) => {
        initialValues[v.name] = v.defaultValue || '';
      });
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen, variables]);

  const handleChange = (name: string, value: string) => {
    setValues({ ...values, [name]: value });
    // 清除错误
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    variables.forEach((v) => {
      const value = values[v.name];

      // 检查必填
      if (v.required && !value) {
        newErrors[v.name] = '此变量为必填项';
        return;
      }

      // 类型验证
      if (value) {
        switch (v.type) {
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[v.name] = '必须为数字';
            }
            break;
          case 'boolean':
            if (value !== 'true' && value !== 'false') {
              newErrors[v.name] = '必须为 true 或 false';
            }
            break;
          case 'hex':
            if (!/^[0-9A-Fa-f\s]+$/.test(value)) {
              newErrors[v.name] = '必须为十六进制';
            }
            break;
        }
      }

      // 自定义验证
      if (value && v.validation) {
        try {
          const regex = new RegExp(v.validation);
          if (!regex.test(value)) {
            newErrors[v.name] = '格式不正确';
          }
        } catch (error) {
          console.error('验证规则错误:', error);
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) {
      // 转换类型
      const convertedValues: Record<string, any> = {};
      variables.forEach((v) => {
        const value = values[v.name];
        if (value !== undefined && value !== '') {
          switch (v.type) {
            case 'number':
              convertedValues[v.name] = Number(value);
              break;
            case 'boolean':
              convertedValues[v.name] = value === 'true';
              break;
            default:
              convertedValues[v.name] = value;
          }
        }
      });

      onConfirm(convertedValues);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="输入变量值">
      <div className="space-y-4">
        {variables.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">无需输入变量</p>
        ) : (
          variables.map((v) => (
            <div key={v.name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {v.name}
                {v.required && <span className="text-red-500 ml-1">*</span>}
                {v.description && <span className="text-gray-500 ml-2 text-xs">({v.description})</span>}
              </label>

              {v.type === 'boolean' ? (
                <select
                  value={values[v.name] || ''}
                  onChange={(e) => handleChange(v.name, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    errors[v.name] ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">请选择</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={values[v.name] || ''}
                  onChange={(e) => handleChange(v.name, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    errors[v.name] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={
                    v.defaultValue
                      ? `默认值: ${v.defaultValue}`
                      : v.type === 'hex'
                      ? '例如: 01 02 03'
                      : ''
                  }
                />
              )}

              {errors[v.name] && <p className="mt-1 text-xs text-red-600">{errors[v.name]}</p>}
            </div>
          ))
        )}

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            确认
          </button>
        </div>
      </div>
    </Modal>
  );
}

