import { useState, useEffect } from 'react';
import { Icon } from '@/components/common/Icons';
import { api } from '@/lib/api';
import { useUIStore } from '@/stores/useUIStore';
import Modal from '@/components/common/Modal';

interface Feedback {
  id: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  type: 'bug' | 'suggestion' | 'question';
  title: string;
  description: string;
  contact?: string;
  images: string[];
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackManagement() {
  const { showToast } = useUIStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.type = filterType;

      const response = await api.getFeedbacks(params);
      if (response.success) {
        setFeedbacks(response.data.feedbacks);
      }
    } catch (error) {
      showToast('error', '加载反馈失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [filterStatus, filterType]);

  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminReply(feedback.adminReply || '');
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedFeedback) return;

    setUpdating(true);
    try {
      await api.updateFeedback(selectedFeedback.id, { status, adminReply: adminReply || undefined });
      showToast('success', '状态更新成功');
      setShowDetailModal(false);
      loadFeedbacks();
    } catch (error) {
      showToast('error', '更新失败');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条反馈吗？')) return;

    try {
      await api.deleteFeedback(id);
      showToast('success', '删除成功');
      loadFeedbacks();
    } catch (error) {
      showToast('error', '删除失败');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bug': return { label: 'Bug', icon: '🐛', color: 'text-red-600 bg-red-50' };
      case 'suggestion': return { label: '建议', icon: '💡', color: 'text-blue-600 bg-blue-50' };
      case 'question': return { label: '问题', icon: '❓', color: 'text-green-600 bg-green-50' };
      default: return { label: type, icon: '📝', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '待处理', color: 'text-orange-600 bg-orange-50' };
      case 'processing': return { label: '处理中', color: 'text-blue-600 bg-blue-50' };
      case 'resolved': return { label: '已解决', color: 'text-green-600 bg-green-50' };
      case 'closed': return { label: '已关闭', color: 'text-gray-600 bg-gray-50' };
      default: return { label: status, color: 'text-gray-600 bg-gray-50' };
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">用户反馈管理</h2>
        <p className="text-sm text-gray-600">查看和处理用户提交的反馈</p>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mr-2">状态:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mr-2">类型:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="bug">Bug</option>
              <option value="suggestion">建议</option>
              <option value="question">问题</option>
            </select>
          </div>
          <button
            onClick={loadFeedbacks}
            className="ml-auto px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Icon name="refresh" className="w-4 h-4 inline mr-1" />
            刷新
          </button>
        </div>
      </div>

      {/* 反馈列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无反馈</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {feedbacks.map((feedback) => {
              const typeInfo = getTypeLabel(feedback.type);
              const statusInfo = getStatusLabel(feedback.status);
              
              return (
                <div key={feedback.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {feedback.images.length > 0 && (
                          <span className="text-xs text-gray-500">📎 {feedback.images.length}张图片</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{feedback.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{feedback.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          提交人: {feedback.user ? `${feedback.user.username} (${feedback.user.email})` : '访客'}
                        </span>
                        {feedback.contact && <span>联系: {feedback.contact}</span>}
                        <span>{new Date(feedback.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDetail(feedback)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => handleDelete(feedback.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 详情模态框 */}
      {selectedFeedback && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="反馈详情"
        >
          <div className="space-y-4">
            {/* 基本信息 */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeLabel(selectedFeedback.type).color}`}>
                  {getTypeLabel(selectedFeedback.type).icon} {getTypeLabel(selectedFeedback.type).label}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusLabel(selectedFeedback.status).color}`}>
                  {getStatusLabel(selectedFeedback.status).label}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedFeedback.title}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{selectedFeedback.description}</p>
              
              {/* 提交者信息 */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>提交人: {selectedFeedback.user ? `${selectedFeedback.user.username} (${selectedFeedback.user.email})` : '访客'}</p>
                {selectedFeedback.contact && <p>联系方式: {selectedFeedback.contact}</p>}
                <p>提交时间: {new Date(selectedFeedback.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* 截图 */}
            {selectedFeedback.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">截图附件:</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedFeedback.images.map((image, index) => (
                    <a
                      key={index}
                      href={image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-300 rounded overflow-hidden hover:border-blue-500 transition-colors"
                    >
                      <img src={image} alt={`Screenshot ${index + 1}`} className="w-full h-32 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 管理员回复 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">管理员回复:</label>
              <textarea
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                placeholder="输入回复内容..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {/* 状态操作 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">更改状态:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleUpdateStatus('processing')}
                  disabled={updating}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  处理中
                </button>
                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={updating}
                  className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 disabled:opacity-50"
                >
                  已解决
                </button>
                <button
                  onClick={() => handleUpdateStatus('closed')}
                  disabled={updating}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

