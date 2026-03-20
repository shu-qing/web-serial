import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Icon } from '@/components/common/Icons';

export default function EmailVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('正在验证邮箱...');
  const hasVerified = useRef(false); // 防止重复验证

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('[EmailVerifyPage] useEffect triggered, token:', token?.substring(0, 20) + '...', 'hasVerified:', hasVerified.current);
    
    if (!token) {
      setStatus('error');
      setMessage('验证链接无效');
      return;
    }

    // 防止重复调用（React StrictMode 会导致 useEffect 执行两次）
    if (hasVerified.current) {
      console.log('[EmailVerifyPage] Already verified, skipping');
      return;
    }

    hasVerified.current = true;
    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.get(`/auth/verify-email?token=${token}`);
      if (response.success) {
        setStatus('success');
        
        // 检查是否已经验证过
        if (response.data?.alreadyVerified) {
          setMessage('您的邮箱已验证过，可以直接登录！');
        } else {
          setMessage('邮箱验证成功！');
        }
        
        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || '验证失败');
      }
    } catch (error: any) {
      console.error('[EmailVerifyPage] Verification error:', error);
      console.error('[EmailVerifyPage] Error response:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      setStatus('error');
      
      // 更友好的错误提示
      const errorData = error.response?.data;
      
      // 检查错误响应结构
      console.log('[EmailVerifyPage] Checking error data:', {
        hasError: !!errorData?.error,
        errorDetails: errorData?.error?.details,
        possiblyAlreadyVerified: errorData?.error?.details?.possiblyAlreadyVerified,
      });
      
      // 检查是否是已验证的情况（修正路径）
      if (errorData?.error?.details?.possiblyAlreadyVerified) {
        setMessage('验证链接无效。如果您已经验证过邮箱，可以直接登录。');
      } else {
        setMessage(errorData?.error?.message || errorData?.message || '验证链接无效或已过期');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin">
                  <Icon name="refresh" className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">验证中...</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="success" className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">验证成功！</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">即将跳转到登录页...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✗</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">验证失败</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                返回首页
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

