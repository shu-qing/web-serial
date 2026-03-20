import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { useUIStore } from '@/stores/useUIStore';
import { api } from '@/lib/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useTranslation();
  const { showToast } = useUIStore();
  
  const [type, setType] = useState<'bug' | 'suggestion' | 'question'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 限制最多3张图片
    if (images.length + files.length > 3) {
      showToast('error', '最多只能上传3张图片');
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          // 限制图片大小为5MB
          if (file.size > 5 * 1024 * 1024) {
            reject(new Error('图片大小不能超过5MB'));
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(uploadPromises);
      setImages([...images, ...base64Images]);
    } catch (error) {
      showToast('error', (error as Error).message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      showToast('error', '请填写标题和描述');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/feedback', {
        type,
        title: title.trim(),
        description: description.trim(),
        contact: contact.trim() || null,
        images
      });

      showToast('success', '反馈提交成功，感谢您的反馈！');
      onClose();
      
      // 重置表单
      setType('bug');
      setTitle('');
      setDescription('');
      setContact('');
      setImages([]);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feedback.submitFeedback', { defaultValue: '提交反馈' })}>
      <div className="space-y-4">
        {/* 反馈类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('feedback.type', { defaultValue: '反馈类型' })} <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setType('bug')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                type === 'bug'
                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              🐛 {t('feedback.bug', { defaultValue: 'Bug' })}
            </button>
            <button
              type="button"
              onClick={() => setType('suggestion')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                type === 'suggestion'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              💡 {t('feedback.suggestion', { defaultValue: '建议' })}
            </button>
            <button
              type="button"
              onClick={() => setType('question')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                type === 'question'
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              ❓ {t('feedback.question', { defaultValue: '问题' })}
            </button>
          </div>
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('feedback.title', { defaultValue: '标题' })} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('feedback.titlePlaceholder', { defaultValue: '简要描述您的问题或建议' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
          />
        </div>

        {/* 详细描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('feedback.description', { defaultValue: '详细描述' })} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('feedback.descriptionPlaceholder', { defaultValue: '请详细描述您遇到的问题或想法...' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={5}
          />
        </div>

        {/* 联系方式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('feedback.contact', { defaultValue: '联系方式' })} ({t('common.optional', { defaultValue: '可选' })})
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t('feedback.contactPlaceholder', { defaultValue: '邮箱或其他联系方式' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 图片上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('feedback.screenshots', { defaultValue: '截图' })} ({t('feedback.upTo3', { defaultValue: '最多3张' })})
          </label>
          
          {images.length < 3 && (
            <label className="inline-block cursor-pointer">
              <div className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors">
                {uploading ? (
                  <span>{t('common.uploading', { defaultValue: '上传中...' })}</span>
                ) : (
                  <span>📎 {t('feedback.uploadImage', { defaultValue: '上传图片' })}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}

          {images.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-xs text-blue-800">
            💡 {t('feedback.tip', { defaultValue: '您的反馈对我们非常重要！我们会尽快处理并回复。' })}
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting || !title.trim() || !description.trim()}
          >
            {submitting ? t('common.submitting', { defaultValue: '提交中...' }) : t('common.submit', { defaultValue: '提交' })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

