import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create team
  const team = await prisma.team.create({
    data: {
      name: 'Demo Team',
    }
  })
  console.log('Created team:', team.name)

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      teamId: team.id,
    }
  })

  const sales = await prisma.user.create({
    data: {
      email: 'sales@demo.com',
      name: 'Sales User',
      password: hashedPassword,
      role: 'SALES',
      teamId: team.id,
    }
  })

  const pm = await prisma.user.create({
    data: {
      email: 'pm@demo.com',
      name: 'PM User',
      password: hashedPassword,
      role: 'PM',
      teamId: team.id,
    }
  })

  const finance = await prisma.user.create({
    data: {
      email: 'finance@demo.com',
      name: 'Finance User',
      password: hashedPassword,
      role: 'FINANCE',
      teamId: team.id,
    }
  })

  console.log('Created users: admin, sales, pm, finance')

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: '阿里巴巴（中国）有限公司',
        industry: '互联网',
        source: '线上推广',
        level: 'A',
        phone: '13800138000',
        email: 'contact@alibaba.com',
        address: '杭州市余杭区',
        teamId: team.id,
        ownerId: sales.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: '腾讯科技（深圳）有限公司',
        industry: '互联网',
        source: '展会',
        level: 'A',
        phone: '13800138001',
        email: 'contact@tencent.com',
        address: '深圳市南山区',
        teamId: team.id,
        ownerId: sales.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: '华为技术有限公司',
        industry: '通信设备',
        source: '老客户介绍',
        level: 'A',
        phone: '13800138002',
        email: 'contact@huawei.com',
        address: '深圳市龙岗区',
        teamId: team.id,
        ownerId: sales.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: '字节跳动科技有限公司',
        industry: '互联网',
        source: '线上推广',
        level: 'B',
        phone: '13800138003',
        email: 'contact@bytedance.com',
        address: '北京市海淀区',
        teamId: team.id,
        ownerId: sales.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: '京东集团',
        industry: '电商',
        source: '展会',
        level: 'B',
        phone: '13800138004',
        email: 'contact@jd.com',
        address: '北京市亦庄',
        teamId: team.id,
        ownerId: sales.id,
      },
    }),
  ])
  console.log('Created customers:', customers.length)

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: '张经理',
        position: '采购经理',
        phone: '13900139000',
        email: 'zhang@alibaba.com',
        customerId: customers[0].id,
        teamId: team.id,
        isPrimary: true,
      },
    }),
    prisma.contact.create({
      data: {
        name: '李总监',
        position: '技术总监',
        phone: '13900139001',
        email: 'li@tencent.com',
        customerId: customers[1].id,
        teamId: team.id,
        isPrimary: true,
      },
    }),
    prisma.contact.create({
      data: {
        name: '王经理',
        position: '项目经理',
        phone: '13900139002',
        email: 'wang@huawei.com',
        customerId: customers[2].id,
        teamId: team.id,
        isPrimary: true,
      },
    }),
  ])
  console.log('Created contacts:', contacts.length)

  // Create opportunities
  const opportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        name: 'CRM系统采购项目',
        amount: 500000,
        stage: 'PROPOSAL',
        probability: 60,
        expectedDate: new Date('2024-06-30'),
        description: '客户需要一套完整的CRM系统',
        customerId: customers[0].id,
        teamId: team.id,
        owners: { create: { userId: sales.id } },
      },
    }),
    prisma.opportunity.create({
      data: {
        name: '数据分析平台',
        amount: 300000,
        stage: 'NEGOTIATION',
        probability: 80,
        expectedDate: new Date('2024-05-15'),
        description: '数据分析平台建设',
        customerId: customers[1].id,
        teamId: team.id,
        owners: { create: { userId: sales.id } },
      },
    }),
    prisma.opportunity.create({
      data: {
        name: '企业管理系统',
        amount: 800000,
        stage: 'QUALIFICATION',
        probability: 30,
        expectedDate: new Date('2024-08-30'),
        description: '企业数字化转型',
        customerId: customers[2].id,
        teamId: team.id,
        owners: { create: { userId: sales.id } },
      },
    }),
    prisma.opportunity.create({
      data: {
        name: '营销自动化工具',
        amount: 150000,
        stage: 'CLOSED_WON',
        probability: 100,
        expectedDate: new Date('2024-03-01'),
        description: '营销工具采购',
        customerId: customers[3].id,
        teamId: team.id,
        owners: { create: { userId: sales.id } },
      },
    }),
    prisma.opportunity.create({
      data: {
        name: '智能客服系统',
        amount: 200000,
        stage: 'PROSPECTING',
        probability: 20,
        expectedDate: new Date('2024-09-30'),
        description: '客服系统升级',
        customerId: customers[4].id,
        teamId: team.id,
        owners: { create: { userId: sales.id } },
      },
    }),
  ])
  console.log('Created opportunities:', opportunities.length)

  // Create contracts
  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        name: 'CRM系统采购合同',
        number: 'CTR-2024-001',
        amount: 500000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
        customerId: customers[0].id,
        opportunityId: opportunities[0].id,
        teamId: team.id,
      },
    }),
    prisma.contract.create({
      data: {
        name: '数据分析平台合同',
        number: 'CTR-2024-002',
        amount: 300000,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-07-31'),
        status: 'SIGNED',
        customerId: customers[1].id,
        opportunityId: opportunities[1].id,
        teamId: team.id,
      },
    }),
    prisma.contract.create({
      data: {
        name: '营销工具采购合同',
        number: 'CTR-2024-003',
        amount: 150000,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        status: 'COMPLETED',
        customerId: customers[3].id,
        opportunityId: opportunities[3].id,
        teamId: team.id,
      },
    }),
    prisma.contract.create({
      data: {
        name: '企业邮箱服务合同',
        number: 'CTR-2024-004',
        amount: 50000,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-01-14'),
        status: 'ACTIVE',
        customerId: customers[2].id,
        teamId: team.id,
      },
    }),
    prisma.contract.create({
      data: {
        name: '云存储服务合同',
        number: 'CTR-2024-005',
        amount: 80000,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2025-03-31'),
        status: 'PENDING',
        customerId: customers[4].id,
        teamId: team.id,
      },
    }),
  ])
  console.log('Created contracts:', contracts.length)

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'CRM系统实施项目',
        description: '为客户部署CRM系统',
        status: 'IN_PROGRESS',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        budget: 100000,
        customerId: customers[0].id,
        contractId: contracts[0].id,
        teamId: team.id,
        owners: { create: { userId: pm.id } },
      },
    }),
    prisma.project.create({
      data: {
        name: '数据分析平台建设',
        description: '建设客户数据分析平台',
        status: 'PLANNING',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-10-31'),
        budget: 80000,
        customerId: customers[1].id,
        contractId: contracts[1].id,
        teamId: team.id,
        owners: { create: { userId: pm.id } },
      },
    }),
    prisma.project.create({
      data: {
        name: '营销工具部署',
        description: '部署营销自动化工具',
        status: 'COMPLETED',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-04-30'),
        budget: 30000,
        customerId: customers[3].id,
        contractId: contracts[2].id,
        teamId: team.id,
        owners: { create: { userId: pm.id } },
      },
    }),
  ])
  console.log('Created projects:', projects.length)

  // Create visits
  const now = new Date()
  const visits = await Promise.all([
    // Today visits
    prisma.visit.create({
      data: {
        title: '需求确认会议',
        type: 'FOLLOW_UP',
        status: 'PLANNED',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
        location: '客户公司',
        description: '确认CRM系统需求细节',
        customerId: customers[0].id,
        contactId: contacts[0].id,
        opportunityId: opportunities[0].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
    prisma.visit.create({
      data: {
        title: '产品演示',
        type: 'DEMO',
        status: 'PLANNED',
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
        location: '我司会议室',
        description: '向客户演示产品功能',
        customerId: customers[1].id,
        contactId: contacts[1].id,
        opportunityId: opportunities[1].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
    // Past visits
    prisma.visit.create({
      data: {
        title: '初次拜访',
        type: 'FIRST_MEETING',
        status: 'COMPLETED',
        startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: '客户公司',
        description: '初次接触，了解客户需求',
        notes: '客户对CRM系统有明确需求，预算约50万',
        keyPoints: '1. 客户规模较大\n2. 已有部分系统\n3. 需要定制化开发',
        nextSteps: '提供解决方案',
        rating: 5,
        customerId: customers[0].id,
        contactId: contacts[0].id,
        opportunityId: opportunities[0].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
    prisma.visit.create({
      data: {
        title: '方案汇报',
        type: 'DEMO',
        status: 'COMPLETED',
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        location: '客户公司',
        description: '汇报解决方案',
        notes: '客户对方案表示认可，需要进一步讨论价格',
        keyPoints: '1. 方案通过\n2. 价格敏感\n3. 需要高层确认',
        nextSteps: '安排商务谈判',
        rating: 4,
        customerId: customers[0].id,
        contactId: contacts[0].id,
        opportunityId: opportunities[0].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
    prisma.visit.create({
      data: {
        title: '合同洽谈',
        type: 'CONTRACT',
        status: 'COMPLETED',
        startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: '我司会议室',
        description: '讨论合同细节',
        notes: '合同条款基本确定',
        keyPoints: '1. 合同条款确认\n2. 付款方式确定',
        nextSteps: '等待客户盖章',
        rating: 5,
        customerId: customers[0].id,
        contactId: contacts[0].id,
        opportunityId: opportunities[0].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
    // Future visits
    prisma.visit.create({
      data: {
        title: '项目启动会',
        type: 'FOLLOW_UP',
        status: 'PLANNED',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        location: '客户公司',
        description: '项目启动会议',
        customerId: customers[0].id,
        contactId: contacts[0].id,
        projectId: projects[0].id,
        teamId: team.id,
        createdById: pm.id,
      },
    }),
    prisma.visit.create({
      data: {
        title: '技术交流',
        type: 'DEMO',
        status: 'PLANNED',
        startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: '客户公司',
        description: '技术方案交流',
        customerId: customers[1].id,
        contactId: contacts[1].id,
        opportunityId: opportunities[1].id,
        teamId: team.id,
        createdById: sales.id,
      },
    }),
  ])
  console.log('Created visits:', visits.length)

  // Create invoices
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        number: 'INV-2024-001',
        amount: 250000,
        taxAmount: 32500,
        totalAmount: 282500,
        issueDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'PAID',
        contractId: contracts[0].id,
        teamId: team.id,
      },
    }),
    prisma.invoice.create({
      data: {
        number: 'INV-2024-002',
        amount: 250000,
        taxAmount: 32500,
        totalAmount: 282500,
        issueDate: new Date('2024-04-01'),
        dueDate: new Date('2024-05-01'),
        status: 'ISSUED',
        contractId: contracts[0].id,
        teamId: team.id,
      },
    }),
    prisma.invoice.create({
      data: {
        number: 'INV-2024-003',
        amount: 300000,
        taxAmount: 39000,
        totalAmount: 339000,
        issueDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        status: 'PAID',
        contractId: contracts[1].id,
        teamId: team.id,
      },
    }),
  ])
  console.log('Created invoices:', invoices.length)

  // Create payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        amount: 282500,
        paymentDate: new Date('2024-02-10'),
        method: 'BANK_TRANSFER',
        reference: '转账-001',
        status: 'COMPLETED',
        invoiceId: invoices[0].id,
        contractId: contracts[0].id,
        teamId: team.id,
      },
    }),
    prisma.payment.create({
      data: {
        amount: 339000,
        paymentDate: new Date('2024-03-10'),
        method: 'BANK_TRANSFER',
        reference: '转账-002',
        status: 'COMPLETED',
        invoiceId: invoices[2].id,
        contractId: contracts[1].id,
        teamId: team.id,
      },
    }),
  ])
  console.log('Created payments:', payments.length)

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
