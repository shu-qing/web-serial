# HTTP 服务器（重定向到 HTTPS）
# 注意：使用 Cloudflare Origin Certificate 时，建议将 SSL/TLS 模式设置为 "Full (strict)"
# 这样 Cloudflare 会使用 HTTPS 连接源服务器，所有 HTTP 请求重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name webserialtool.com www.webserialtool.com;
    
    # 重定向所有 HTTP 请求到 HTTPS
    # Cloudflare 会处理用户到 Cloudflare 的 HTTPS 连接
    # 源服务器使用 HTTPS 提供更好的安全性
    return 301 https://$host$request_uri;
}

# HTTPS 服务器（使用 Cloudflare Origin Certificate）
# Cloudflare Origin Certificate 用于保护 Cloudflare 和源服务器之间的连接
# SSL/TLS 模式应设置为 "Full" 或 "Full (strict)"
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webserialtool.com www.webserialtool.com;

    # Cloudflare Origin Certificate
    # 证书文件路径：/etc/nginx/ssl/webserialtool.com.crt
    # 私钥文件路径：/etc/nginx/ssl/webserialtool.com.key
    ssl_certificate /etc/nginx/ssl/webserialtool.com.crt;
    ssl_certificate_key /etc/nginx/ssl/webserialtool.com.key;
    
    # SSL 配置（优化用于 Cloudflare Origin Certificate）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # 安全头（增强安全性）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Let's Encrypt 验证目录
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 处理常见的 favicon 和图标请求（避免 404 错误）
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        return 204;
    }
    
    location = /apple-touch-icon.png {
        root /var/www/webserialtool.com;
        try_files $uri =204;
        access_log off;
        log_not_found off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Content-Type image/png;
    }
    
    # 处理其他缺失的图标文件请求
    location ~ ^/(favicon-16x16\.png|favicon-32x32\.png|android-chrome-.*\.png)$ {
        access_log off;
        log_not_found off;
        return 204;
    }
    
    # 处理扫描/攻击请求（静默忽略，返回 444 关闭连接）
    location ~ ^/(owa|wp-admin|wp-login|phpmyadmin|admin|\.env|\.git|\.svn|\.htaccess) {
        access_log off;
        return 444;
    }

    # 健康检查端点（必须在 location / 之前）
    location = /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # Wiki 静态文件 - 只匹配 .md 文件
    location ~ ^/wiki/.+\.md$ {
        root /var/www/webserialtool.com;
        try_files $uri =404;
        add_header Content-Type text/markdown;
        add_header Access-Control-Allow-Origin *;
        # 允许访问 markdown 文件
    }

    # Wiki 路由 - 直接返回前端 index.html（避免目录访问 403）
    location = /wiki {
        root /var/www/webserialtool.com;
        try_files /index.html =404;
    }

    location = /wiki/ {
        root /var/www/webserialtool.com;
        try_files /index.html =404;
    }

    # 前端静态文件（包括其他路由，由前端处理）
    location / {
        root /var/www/webserialtool.com;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理
    location /ws/ {
        proxy_pass http://localhost:3001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        root /var/www/webserialtool.com;
        try_files $uri =204;
        log_not_found off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 访问日志和错误日志
    access_log /var/log/nginx/webserialtool.com.access.log;
    error_log /var/log/nginx/webserialtool.com.error.log warn;
}