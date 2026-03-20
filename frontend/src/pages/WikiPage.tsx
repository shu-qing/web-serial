import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

// Wiki 文章数据结构
interface WikiArticle {
  id: string
  title: string
  slug: string
  content: string
  category: string
  order: number
}

// Wiki 配置
const WIKI_CATEGORY = 'About'

// 定义文章列表（与 docs/09-wiki/About/ 目录下的文件对应）
const WIKI_ARTICLES: WikiArticle[] = [
  {
    id: '1',
    title: '什么是 WebSerialTool',
    slug: '01-WebSerialTool',
    content: '',
    category: WIKI_CATEGORY,
    order: 1,
  },
  {
    id: '2',
    title: '核心功能一览',
    slug: '02-CoreFeatures',
    content: '',
    category: WIKI_CATEGORY,
    order: 2,
  },
  {
    id: '3',
    title: '快速开始指南',
    slug: '03-QuickStart',
    content: '',
    category: WIKI_CATEGORY,
    order: 3,
  },
  {
    id: '4',
    title: '串口调试工具',
    slug: '04-SerialTool',
    content: '',
    category: WIKI_CATEGORY,
    order: 4,
  },
  {
    id: '5',
    title: '测试库',
    slug: '05-TestLibaray',
    content: '',
    category: WIKI_CATEGORY,
    order: 5,
  },
  {
    id: '6',
    title: '远程连接（智能桥接）',
    slug: '06-RemoteConnection',
    content: '',
    category: WIKI_CATEGORY,
    order: 6,
  },
  {
    id: '7',
    title: '会话共享',
    slug: '07-SessionShare',
    content: '',
    category: WIKI_CATEGORY,
    order: 7,
  },
  {
    id: '8',
    title: '常见问题（FAQ）',
    slug: '08-FAQ',
    content: '',
    category: WIKI_CATEGORY,
    order: 8,
  },
]

export default function WikiPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [articles, setArticles] = useState<WikiArticle[]>(WIKI_ARTICLES)
  const [currentArticle, setCurrentArticle] = useState<WikiArticle | null>(null)
  const [loading, setLoading] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<WikiArticle[]>([])
  const hasInitialized = useRef(false)

  // 从 URL 参数获取当前文章 slug
  const articleSlug = searchParams.get('article') || ''

  useEffect(() => {
    if (articleSlug) {
      loadArticle(articleSlug)
      hasInitialized.current = true
    } else if (!hasInitialized.current && articles.length > 0) {
      // 如果没有选择文章且未初始化，自动跳转到第一篇文章
      const firstArticle = articles[0]
      if (firstArticle) {
        setSearchParams({ article: firstArticle.slug }, { replace: true })
        hasInitialized.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleSlug])

  // 加载文章内容的公共函数
  const loadArticleContent = async (article: WikiArticle): Promise<string | null> => {
    if (article.content) {
      return article.content
    }

    try {
      const category = encodeURIComponent(article.category)
      const encodedSlug = encodeURIComponent(article.slug)
      const filePath = `/wiki/${category}/${encodedSlug}.md`
      const response = await fetch(filePath)
      
      if (response.ok) {
        const content = await response.text()
        // 更新文章列表
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, content } : a))
        )
        return content
      } else {
        console.error('加载文章失败:', response.statusText)
        return null
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      return null
    }
  }

  const loadArticle = async (slug: string) => {
    const article = articles.find((a) => a.slug === slug)
    if (!article) return

    // 如果文章内容已加载，直接使用
    if (article.content) {
      setCurrentArticle(article)
      return
    }

    // 否则加载内容
    setLoading(true)
    try {
      const content = await loadArticleContent(article)
      if (content !== null) {
        setCurrentArticle({ ...article, content })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const term = searchTerm.toLowerCase()
    // 确保所有文章内容都已加载后再搜索
    const articlesWithContent = await Promise.all(
      articles.map(async (article) => {
        const content = await loadArticleContent(article)
        return content !== null ? { ...article, content } : article
      })
    )

    const results = articlesWithContent.filter(
      (article) =>
        article.title.toLowerCase().includes(term) ||
        (article.content && article.content.toLowerCase().includes(term))
    )
    setSearchResults(results)
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleArticleClick = (article: WikiArticle) => {
    setSearchParams({ article: article.slug })
    setSearchTerm('')
    setSearchResults([])
  }

  const handleBackToList = () => {
    setSearchParams({})
  }

  // 获取分类的文章列表
  const getArticlesByCategory = (category: string) => {
    return articles.filter((a) => a.category === category)
  }

  // 获取所有分类
  const categories = Array.from(new Set(articles.map((a) => a.category)))

  return (
    <div className="bg-gray-50 h-screen flex flex-col overflow-hidden">
      {/* 顶部导航栏 - 带搜索框 */}
      <nav className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shadow-sm sticky top-0 z-50">
        {/* 左侧：Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo.svg" alt="Web Serial Logo" className="w-7 h-7" />
          <span className="text-base font-semibold text-gray-900">Web Serial Tool</span>
        </Link>

        {/* 导航链接 */}
        <div className="flex items-center space-x-6 ml-8">
          <Link to="/wiki" className="text-sm font-medium text-blue-600 hover:text-blue-700 font-semibold">
            Wiki
          </Link>
        </div>

        <div className="flex-1"></div>

        {/* 右侧：搜索框 */}
        <div className="w-64 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="搜索文档..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          {/* 搜索结果下拉 */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-96 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
              <div className="p-2">
                {searchResults.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded"
                  >
                    <div className="text-sm font-medium text-gray-900">{article.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{article.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Wiki 布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            {categories.map((category) => (
              <div
                key={category}
                className={`mb-2 ${collapsedSections.has(category) ? 'collapsed' : ''}`}
              >
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
                  onClick={() => toggleSection(category)}
                >
                  <span className="flex items-center">
                    <svg
                      className={`w-4 h-4 mr-2 transition-transform ${
                        collapsedSections.has(category) ? '-rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">
                    {getArticlesByCategory(category).length}
                  </span>
                </button>
                {!collapsedSections.has(category) && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {getArticlesByCategory(category).map((article) => (
                      <li key={article.id}>
                        <button
                          onClick={() => handleArticleClick(article)}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            currentArticle?.id === article.id
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* 右侧内容区 */}
        <article className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto p-8">
            {loading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : currentArticle ? (
              <>
                {/* 面包屑导航 */}
                <nav className="text-sm text-gray-500 mb-6">
                  <button onClick={handleBackToList} className="hover:text-gray-900">
                    Wiki
                  </button>
                  {' > '}
                  <span>{currentArticle.category}</span>
                  {' > '}
                  <span className="text-gray-900">{currentArticle.title}</span>
                </nav>

                {/* 文章内容 */}
                <div className="prose prose-lg max-w-none 
                  prose-headings:font-bold 
                  prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl 
                  prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600 prose-code:font-mono prose-code:text-sm
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-700
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:font-semibold prose-strong:text-gray-900
                  prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {currentArticle.content}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">欢迎来到 Wiki</h2>
                <p className="text-gray-600 mb-6">请从左侧菜单选择一篇文章开始阅读</p>
                <div className="text-left max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">文档列表</h3>
                  <ul className="space-y-2">
                    {articles.map((article) => (
                      <li key={article.id}>
                        <button
                          onClick={() => handleArticleClick(article)}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
