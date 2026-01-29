// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Start seeding...')

  // 1. สร้าง Category: Source Control
  const catSource = await prisma.componentCategory.upsert({
    where: { slug: 'source_control' },
    update: { name: 'Source Control', displayOrder: 1, icon: 'Settings' },
    create: { name: 'Source Control', slug: 'source_control', displayOrder: 1, icon: 'Settings' },
  })

  // ⚠️ ลบ Trigger ตัวเก่าทิ้งก่อน (เพื่อเคลียร์ Config เก่าที่ไม่มี Branch Select)
  await prisma.pipelineComponent.deleteMany({
    where: {
      categoryId: catSource.id,
      name: 'Trigger Rules' // ลบตัวที่มีชื่อนี้ออก
    }
  });

  // 2. สร้าง Trigger Component ใหม่ (ที่มี Switch + Branch Select ครบชุด)
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catSource.id,
      name: 'Trigger Rules',
      type: 'group',
      
      // 🔥 Config UI ตัวใหม่ที่ถูกต้อง
      uiConfig: {
        fields: [
          // ================= PUSH =================
          {
            id: "enable_push",
            label: "Push",
            type: "switch",
            defaultValue: false
          },
          {
            id: "push_branches",
            label: "Select Push Branches",
            type: "branch_select", // 👈 ต้องมี type นี้
            dataSource: "api_branches",
            
            // ✨ เงื่อนไข: จะโชว์ก็ต่อเมื่อ enable_push = true
            visibleIf: { fieldId: "enable_push", value: true },

            // Template ของ Push
            templates: {
              github: "  push:\n    branches: {{value}}",
              gitlab: "    - if: $CI_COMMIT_BRANCH == {{value}}"
            }
          },

          // ================= PULL REQUEST =================
          {
            id: "enable_pr",
            label: "Pull Request",
            type: "switch",
            defaultValue: false
          },
          {
            id: "pr_branches",
            label: "Select PR Branches",
            type: "branch_select",
            dataSource: "api_branches",
            
            // ✨ เงื่อนไข: จะโชว์ก็ต่อเมื่อ enable_pr = true
            visibleIf: { fieldId: "enable_pr", value: true },

            // Template ของ PR
            templates: {
              github: "  pull_request:\n    branches: {{value}}",
              gitlab: "    - if: $CI_PIPELINE_SOURCE == \"merge_request_event\" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == {{value}}"
            }
          }
        ]
      },

      // Syntax Template หลัก (ตัวแม่)
      syntaxes: {
        create: [
          { platform: 'github', template: "name: Generated Pipeline\non:\n{{FIELDS}}" },
          { platform: 'gitlab', template: "workflow:\n  rules:\n{{FIELDS}}" }
        ]
      }
    }
  })

  console.log('✅ Seeding Finished (Reset Trigger Rules)!')
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); })