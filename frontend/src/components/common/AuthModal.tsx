import { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/useUIStore'
import { useTranslation } from 'react-i18next'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'login' | 'register'
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useUIStore()
  const { setAuth } = useAuthStore()

  // 登录表单
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // 注册表单
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  // 密码强度计算
  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.match(/[a-z]+/)) strength += 25
    if (password.match(/[A-Z]+/)) strength += 25
    if (password.match(/[0-9]+/)) strength += 25
    
    if (strength <= 25) return { width: '25%', color: 'bg-red-500', text: t('auth.weak', { defaultValue: 'Weak' }) }
    if (strength <= 50) return { width: '50%', color: 'bg-yellow-500', text: t('auth.medium', { defaultValue: 'Medium' }) }
    if (strength <= 75) return { width: '75%', color: 'bg-blue-500', text: t('auth.good', { defaultValue: 'Good' }) }
    return { width: '100%', color: 'bg-green-500', text: t('auth.strong', { defaultValue: 'Strong' }) }
  }

  const passwordStrength = calculatePasswordStrength(registerPassword)

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!loginEmail || !loginPassword) {
      showToast('error', t('validation.fillEmailPassword', { defaultValue: 'Please fill in email and password' }))
      return
    }

    setIsLoading(true)
    try {
      const response = await api.login(loginEmail, loginPassword)
      
      if (response.success) {
        // 保存 token 和用户信息
        const { token, refreshToken, expiresIn, user } = response.data
        
        // 保存到 localStorage（用于API请求认证）
        localStorage.setItem('auth_token', token)
        localStorage.setItem('refresh_token', refreshToken)
        localStorage.setItem('user_info', JSON.stringify(user))
        
        // 更新 store（包含 refreshToken 和 expiresIn）
        setAuth(user, token, refreshToken, expiresIn)
        
        showToast('success', t('notification.loginSuccess', { defaultValue: 'Login successful' }))
        onClose()
      } else {
        showToast('error', response.message || t('notification.loginFailed', { defaultValue: 'Login failed' }))
      }
    } catch (error: any) {
      console.error('登录错误:', error)
      // 检查是否是邮箱未验证错误
      if (error.response?.data?.data?.needVerification) {
        const email = error.response.data.data.email
        showToast('error', '请先验证您的邮箱才能登录')
        // 显示重新发送验证邮件的提示
        setTimeout(() => {
          if (confirm('需要重新发送验证邮件吗？')) {
            resendVerificationEmail(email)
          }
        }, 500)
      } else {
        // 优先使用 error.message（已由拦截器处理），否则使用默认消息
        showToast('error', error.message || t('notification.loginFailedRetry', { defaultValue: 'Login failed, please try again' }))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 重新发送验证邮件
  const resendVerificationEmail = async (email: string) => {
    try {
      await api.post('/auth/resend-verification', { email })
      showToast('success', '验证邮件已重新发送，请查收邮箱')
    } catch (error) {
      showToast('error', '发送失败，请稍后再试')
    }
  }

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证
    if (!registerEmail || !registerPassword || !registerPasswordConfirm || !registerUsername) {
      showToast('error', t('validation.fillAllFields', { defaultValue: 'Please fill in all required fields' }))
      return
    }

    if (registerPassword !== registerPasswordConfirm) {
      showToast('error', t('validation.passwordMismatch', { defaultValue: 'Passwords do not match' }))
      return
    }

    if (registerPassword.length < 8) {
      showToast('error', t('validation.passwordLength', { defaultValue: 'Password must be at least 8 characters' }))
      return
    }

    if (!agreeTerms) {
      showToast('error', t('validation.agreeTerms', { defaultValue: 'Please read and agree to the terms and privacy policy' }))
      return
    }

    setIsLoading(true)
    try {
      // 注意：后端 API 需要额外的 agreeTerms 参数
      const response = await api.post('/auth/register', {
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        agreeTerms: true,
      })
      
      if (response.success) {
        showToast('success', '注册成功！请查收邮箱验证邮件')
        // 注册成功后不自动登录，需要先验证邮箱
        // 清空表单
        setRegisterEmail('')
        setRegisterUsername('')
        setRegisterPassword('')
        setRegisterPasswordConfirm('')
        setAgreeTerms(false)
        // 切换到登录标签页并提示
        setActiveTab('login')
        setTimeout(() => {
          showToast('info', '请先验证您的邮箱，然后再登录')
        }, 500)
      } else {
        showToast('error', response.message || t('notification.registerFailed', { defaultValue: 'Registration failed' }))
      }
    } catch (error: any) {
      console.error('注册错误:', error)
      // 优先使用 error.message（已由拦截器处理），否则使用默认消息
      showToast('error', error.message || t('notification.registerFailedRetry', { defaultValue: 'Registration failed, please try again' }))
    } finally {
      setIsLoading(false)
    }
  }


  const handleClose = () => {
    // 重置表单
    setLoginEmail('')
    setLoginPassword('')
    setRegisterEmail('')
    setRegisterPassword('')
    setRegisterPasswordConfirm('')
    setRegisterUsername('')
    setRememberMe(false)
    setAgreeTerms(false)
    setShowPassword(false)
    setShowConfirmPassword(false)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* 标题栏 */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex space-x-6">
                    <button
                      onClick={() => setActiveTab('login')}
                      className={`text-base font-semibold pb-1 transition-all ${
                        activeTab === 'login'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t('auth.login')}
                    </button>
                    <button
                      onClick={() => setActiveTab('register')}
                      className={`text-base font-semibold pb-1 transition-all ${
                        activeTab === 'register'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t('auth.register')}
                    </button>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* 登录表单 */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="px-6 py-6">
                    <div className="space-y-4">
                      {/* 邮箱 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.email')}</label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t('auth.enterEmail', { defaultValue: 'Enter email address' })}
                          disabled={isLoading}
                          autoComplete="username"
                        />
                      </div>

                      {/* 密码 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.password')}</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder={t('auth.enterPassword', { defaultValue: 'Enter password' })}
                            disabled={isLoading}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                              <EyeIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 记住我和忘记密码 */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                            disabled={isLoading}
                          />
                          <span>{t('auth.rememberMe', { defaultValue: 'Remember me (7 days)' })}</span>
                        </label>
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-700"
                          disabled={isLoading}
                        >
                          {t('auth.forgotPassword', { defaultValue: 'Forgot password?' })}
                        </button>
                      </div>

                      {/* 登录按钮 */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary"
                      >
                        {isLoading ? t('auth.loggingIn', { defaultValue: '登录中...' }) : t('auth.login')}
                      </button>
                    </div>
                  </form>
                )}

                {/* 注册表单 */}
                {activeTab === 'register' && (
                  <form onSubmit={handleRegister} className="px-6 py-6">
                    <div className="space-y-4">
                      {/* 用户名 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.username', { defaultValue: '用户名' })}</label>
                        <input
                          type="text"
                          value={registerUsername}
                          onChange={(e) => setRegisterUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t('auth.enterUsername', { defaultValue: '请输入用户名' })}
                          disabled={isLoading}
                          autoComplete="username"
                        />
                      </div>

                      {/* 邮箱 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.email')}</label>
                        <input
                          type="email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t('auth.enterEmail', { defaultValue: 'Enter email address' })}
                          disabled={isLoading}
                          autoComplete="email"
                        />
                      </div>

                      {/* 密码 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.password')}</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder={t('auth.enterPassword', { defaultValue: 'Enter password' })}
                            disabled={isLoading}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                              <EyeIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('auth.passwordRequirement', { defaultValue: '至少8个字符，必须包含字母和数字' })}</p>
                        {/* 密码强度指示器 */}
                        {registerPassword && (
                          <div className="mt-2 flex items-center space-x-2">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                style={{ width: passwordStrength.width }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{passwordStrength.text}</span>
                          </div>
                        )}
                      </div>

                      {/* 确认密码 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.confirmPassword', { defaultValue: '确认密码' })}</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={registerPasswordConfirm}
                            onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder={t('auth.enterPasswordAgain', { defaultValue: '请再次输入密码' })}
                            disabled={isLoading}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? (
                              <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                              <EyeIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 用户协议 */}
                      <div>
                        <label className="flex items-start text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 mt-0.5"
                            disabled={isLoading}
                          />
                          <span>
                            {t('auth.agreeTermsPrefix', { defaultValue: '我已阅读并同意' })}{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                              {t('auth.userAgreement', { defaultValue: '用户协议' })}
                            </a>{' '}
                            {t('auth.and', { defaultValue: '和' })}{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                              {t('auth.privacyPolicy', { defaultValue: '隐私政策' })}
                            </a>
                          </span>
                        </label>
                      </div>

                      {/* 注册按钮 */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary"
                      >
                        {isLoading ? t('auth.registering', { defaultValue: '注册中...' }) : t('auth.registerButton', { defaultValue: '注册并发送验证邮件' })}
                      </button>

                      {/* 注册提示 */}
                      <p className="text-xs text-gray-500 text-center">
                        {t('auth.registerNote', { defaultValue: '注册后将发送验证邮件到您的邮箱，请点击邮件中的链接完成激活' })}
                      </p>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

