import nodemailer from 'nodemailer';

// 邮件发送服务
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // 检查是否配置了邮件服务
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');

    if (!emailUser || !emailPass) {
      console.warn('⚠️  邮件服务未配置，邮件发送功能将被禁用');
      console.warn('   请在 .env 文件中配置 EMAIL_USER 和 EMAIL_PASS');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      console.log('✅ 邮件服务已初始化');
    } catch (error) {
      console.error('❌ 邮件服务初始化失败:', error);
    }
  }

  /**
   * 发送验证邮件
   */
  async sendVerificationEmail(email: string, username: string, verifyToken: string) {
    if (!this.transporter) {
      console.error('邮件服务未配置，无法发送验证邮件');
      throw new Error('邮件服务暂不可用');
    }

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
    
    const mailOptions = {
      from: `"Web Serial Tool" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '验证您的邮箱 - Web Serial Tool',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>欢迎加入 Web Serial Tool！</h1>
            </div>
            <div class="content">
              <p>您好，<strong>${username}</strong>！</p>
              <p>感谢您注册 Web Serial Tool。请点击下方按钮验证您的邮箱地址：</p>
              <div style="text-align: center;">
                <a href="${verifyUrl}" class="button">验证邮箱</a>
              </div>
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                或者复制以下链接到浏览器：<br>
                <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-top: 10px;">${verifyUrl}</code>
              </p>
              <p style="margin-top: 20px; font-size: 13px; color: #ef4444;">
                ⚠️ 此验证链接将在 24 小时后过期。
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                如果您没有注册 Web Serial Tool 账号，请忽略此邮件。
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Web Serial Tool. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ 验证邮件已发送到 ${email}`);
    } catch (error) {
      console.error('❌ 发送验证邮件失败:', error);
      throw new Error('发送验证邮件失败');
    }
  }

  /**
   * 发送欢迎邮件（验证成功后）
   */
  async sendWelcomeEmail(email: string, username: string) {
    if (!this.transporter) {
      console.log('邮件服务未配置，跳过发送欢迎邮件');
      return;
    }

    const mailOptions = {
      from: `"Web Serial Tool" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '欢迎使用 Web Serial Tool！',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          <h2>欢迎，${username}！</h2>
          <p>您的邮箱已成功验证，现在可以使用 Web Serial Tool 的所有功能了！</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
              开始使用
            </a>
          </p>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ 欢迎邮件已发送到 ${email}`);
    } catch (error) {
      console.error('发送欢迎邮件失败:', error);
      // 欢迎邮件失败不影响主流程
    }
  }
}

export const emailService = new EmailService();

