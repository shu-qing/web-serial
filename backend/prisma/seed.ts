import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据...')

  // 创建默认管理员账号
  const adminEmail = 'webserialtool@gmail.com'
  const adminPassword = 'admin@webserial' // 默认密码

  // 检查管理员是否已存在
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    console.log('管理员账号已存在:', adminEmail)
    
    // 如果存在但不是管理员，更新为管理员
    if (existingAdmin.role !== 'admin' && existingAdmin.role !== 'superadmin') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'admin' },
      })
      console.log('已将现有账号提升为管理员')
    }
  } else {
    // 创建新管理员账号
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'Admin',
        passwordHash,
        role: 'admin',
        status: 'active',
        authProvider: 'email',
        isEmailVerified: true,
      },
    })

    console.log('✅ 默认管理员账号创建成功！')
    console.log('-----------------------------------')
    console.log('📧 邮箱:', adminEmail)
    console.log('🔑 密码:', adminPassword)
    console.log('-----------------------------------')
    console.log('⚠️  请登录后立即修改密码！')
  }

  console.log('数据初始化完成')
}

main()
  .catch((e) => {
    console.error('初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

