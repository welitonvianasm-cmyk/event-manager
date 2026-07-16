// Script de reset do usuário MASTER — rodar uma vez e deletar
// Uso: node scripts/reset-master.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'welitonviana.sm@gmail.com'
  const password = '092930'

  const hash = await bcrypt.hash(password, 10)

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hash, role: 'MASTER', status: 'APROVADO' },
    })
    console.log(`✅ Senha atualizada para ${email} (role: MASTER)`)
  } else {
    await prisma.user.create({
      data: {
        name: 'Weliton Viana',
        email,
        password: hash,
        role: 'MASTER',
        status: 'APROVADO',
      },
    })
    console.log(`✅ Usuário MASTER criado: ${email}`)
  }
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
