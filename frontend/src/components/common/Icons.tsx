// SVG图标组件 - 从UI设计稿导入
export const Icons = () => (
  <svg style={{ display: 'none' }} aria-hidden="true">
    <defs>
      {/* Transfer/Arrows Icon */}
      <symbol id="icon-transfer" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
      </symbol>
      
      {/* Export/Download Icon */}
      <symbol id="icon-export" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </symbol>
      
      {/* Search Icon */}
      <symbol id="icon-search" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </symbol>
      
      {/* Send/Paper Plane Icon */}
      <symbol id="icon-send" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </symbol>
      
      {/* Play/Send Button Icon */}
      <symbol id="icon-play" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </symbol>
      
      {/* Edit/Pencil Icon */}
      <symbol id="icon-edit" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </symbol>
      
      {/* Copy Icon */}
      <symbol id="icon-copy" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </symbol>
      
      {/* Delete/Trash Icon */}
      <symbol id="icon-delete" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </symbol>
      
      {/* Plus/Add Icon */}
      <symbol id="icon-plus" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
      </symbol>
      
      {/* Success/Check Icon */}
      <symbol id="icon-success" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </symbol>
      
      {/* User Icon */}
      <symbol id="icon-user" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </symbol>
      
      {/* Unplug/Connection Icon */}
      <symbol id="icon-unplug" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 5 3-3"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m2 22 3-3"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.5 13.5 10 11"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 16.5 13 14"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>
      </symbol>
      
      {/* List/Menu Icon */}
      <symbol id="icon-list" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
      </symbol>
      
      {/* Remote Bridge Icon */}
      <symbol id="icon-remote" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12h.01"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12h.01"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m17 7 5 5-5 5"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 7-5 5 5 5"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01"/>
      </symbol>
      
      {/* Cast/Share Icon */}
      <symbol id="icon-share" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12a9 9 0 0 1 8 8"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 16a5 5 0 0 1 4 4"/>
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="2" x2="2.01" y1="20" y2="20"/>
      </symbol>
      
      {/* Book/Wiki Icon */}
      <symbol id="icon-book" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </symbol>
      
      {/* Settings Icon */}
      <symbol id="icon-settings" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </symbol>
      
      {/* Pencil Edit Small Icon */}
      <symbol id="icon-pencil-small" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
      </symbol>
      
      {/* AI/Sparkles Icon */}
      <symbol id="icon-ai" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
      </symbol>
      
      {/* Document Report Icon */}
      <symbol id="icon-report" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </symbol>
      
      {/* Import/File Upload Icon */}
      <symbol id="icon-import" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2v5a1 1 0 0 0 1 1h5"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12v6"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 15-3-3-3 3"/>
      </symbol>
      
      {/* Export/File Download Icon */}
      <symbol id="icon-export-alt" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2v5a1 1 0 0 0 1 1h5"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18v-6"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 15 3 3 3-3"/>
      </symbol>
      
      {/* Brush/Clear Icon */}
      <symbol id="icon-brush" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m16 22-1-4"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8 22 1-4"/>
      </symbol>
      
      {/* Shield/Admin Icon */}
      <symbol id="icon-shield" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4"/>
      </symbol>
      
      {/* Dashboard Icon */}
      <symbol id="icon-dashboard" viewBox="0 0 24 24">
        <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="3" y="3" width="7" height="7"/>
        <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="14" y="3" width="7" height="7"/>
        <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="14" y="14" width="7" height="7"/>
        <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="3" y="14" width="7" height="7"/>
      </symbol>
      
      {/* Users Icon */}
      <symbol id="icon-users" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" cx="9" cy="7" r="4"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </symbol>
      
      {/* Activity Icon */}
      <symbol id="icon-activity" viewBox="0 0 24 24">
        <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </symbol>
      
      {/* File-Text Icon */}
      <symbol id="icon-file-text" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="14 2 14 8 20 8"/>
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16" x2="8" y1="13" y2="13"/>
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16" x2="8" y1="17" y2="17"/>
        <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="10 9 9 9 8 9"/>
      </symbol>
      
      {/* Arrow-Left Icon */}
      <symbol id="icon-arrow-left" viewBox="0 0 24 24">
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="19" x2="5" y1="12" y2="12"/>
        <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="12 19 5 12 12 5"/>
      </symbol>
      
      {/* Alert-Triangle Icon */}
      <symbol id="icon-alert-triangle" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12" x2="12" y1="9" y2="13"/>
        <line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="12" x2="12.01" y1="17" y2="17"/>
      </symbol>
      
      {/* Video Icon */}
      <symbol id="icon-video" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m23 7-7 5 7 5V7z"/>
        <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="15" height="14" x="1" y="5" rx="2" ry="2"/>
      </symbol>
      
      {/* Refresh/Reset Icon */}
      <symbol id="icon-refresh" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 2v6h-6"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 22v-6h6"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </symbol>
      
      {/* Message Circle / Feedback Icon */}
      <symbol id="icon-message-circle" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </symbol>
    </defs>
  </svg>
)

// Icon组件 - 用于显示SVG图标
interface IconProps {
  name: string
  className?: string
}

export const Icon = ({ name, className = 'w-6 h-6' }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor">
    <use href={`#icon-${name}`} />
  </svg>
)

