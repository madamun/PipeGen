// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing old data...");
  await prisma.pipelineComponent.deleteMany({});
  await prisma.componentCategory.deleteMany({});

  console.log("🌱 Seeding Ordered Components (Clean & Corrected)...");

  // =======================================================
  // 1. General Settings
  // =======================================================
  const catGeneral = await prisma.componentCategory.create({
    data: {
      name: "1. General Settings",
      slug: "general",
      displayOrder: 1,
      icon: "Settings",
    },
  });

  // 1.1 Project Info
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "Project Info",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "pipeline_name",
            label: "Pipeline Name",
            type: "input",
            defaultValue: "My-Pipeline",
            placeholder: "e.g. Production-Build",
          },
        ],
      },
      syntaxes: {
        create: [
          { platform: "github", template: "name: {{pipeline_name}}\n" },
          {
            platform: "gitlab",
            template: "# Pipeline Name: {{pipeline_name}}\n",
          },
        ],
      },
    },
  });

  // 1.2 Triggers (Push/PR)
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "When to Run? (Triggers)",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "enable_push",
            label: "Run on Push",
            type: "switch",
            defaultValue: true,
          },
          {
            id: "push_branches",
            label: "Select Branch",
            type: "branch_select",
            visibleIf: { fieldId: "enable_push", value: true },
            templates: {
              github: "  push:\n    branches: {{value}}",
              gitlab: "    - if: $CI_COMMIT_BRANCH == {{value}}",
            },
          },
          {
            id: "enable_pr",
            label: "Run on Pull Request",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "pr_branches",
            label: "Select Branch",
            type: "branch_select",
            visibleIf: { fieldId: "enable_pr", value: true },
            templates: {
              github: "  pull_request:\n    branches: {{value}}",
              gitlab:
                '    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == {{value}}',
            },
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template:
              "on:\n{{FIELDS}}\n\njobs:\n  build-and-deploy:\n    runs-on: {{runner_os}}\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@{{checkout_ver}}",
          },
          // 🔥 GitLab FIX: Cache logic without comments
          {
            platform: "gitlab",
            template: `workflow:
  rules:
{{FIELDS}}

cache:
  key: "$CI_COMMIT_REF_SLUG"
  paths:
    - node_modules/
  policy: pull-push

stages:
  - setup
  - test
  - build
  - deploy
`,
          },
        ],
      },
    },
  });

  // 1.3 System & Runner
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "System & Runner (Advanced)",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "runner_os",
            label: "Runner OS",
            type: "select",
            defaultValue: "ubuntu-latest",
            options: [
              { label: "Ubuntu Linux (Standard)", value: "ubuntu-latest" },
              { label: "Windows Server 2022", value: "windows-latest" },
              { label: "macOS 13", value: "macos-13" },
            ],
          },
          {
            id: "checkout_ver",
            label: "Checkout Action Version",
            type: "select",
            defaultValue: "v4",
            options: [
              { label: "v4 (Latest)", value: "v4" },
              { label: "v3 (Stable)", value: "v3" },
            ],
          },
        ],
      },
      syntaxes: { create: [] },
    },
  });

  // =======================================================
  // 2. Runtime Environment
  // =======================================================
  const catRuntime = await prisma.componentCategory.create({
    data: {
      name: "2. Language & Tools",
      slug: "runtime",
      displayOrder: 2,
      icon: "Server",
    },
  });

  // Node.js
  // Node.js
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Node.js / JavaScript",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "use_node",
            label: "Enable Node.js",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "node_version",
            label: "Node Version",
            type: "select",
            defaultValue: "18",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "v20 (LTS)", value: "20" },
              { label: "v18 (LTS)", value: "18" },
              { label: "v16 (Legacy)", value: "16" },
            ],
          },
          {
            id: "pkg_manager",
            label: "Package Manager",
            type: "select",
            defaultValue: "npm",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "npm", value: "npm" },
              { label: "yarn", value: "yarn" },
              { label: "pnpm", value: "pnpm" },
            ],
          },
          {
            id: "install_cmd",
            label: "Install Command (CI/CD Best Practice)",
            type: "select",
            defaultValue: "npm ci",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "npm (Clean Install - Recommended)", value: "npm ci" },
              { label: "npm (Standard)", value: "npm install" },
              { label: "Yarn (Frozen Lockfile)", value: "yarn install --frozen-lockfile" },
              { label: "Yarn (Standard)", value: "yarn install" },
              { label: "PNPM (Frozen Lockfile)", value: "pnpm install --frozen-lockfile" },
              { label: "PNPM (Standard)", value: "pnpm install" },
            ]
          },
        ],
      },
      syntaxes: {
        create: [
          // 🟢 GitHub Actions (มี Yarn อยู่แล้ว)
          {
            platform: 'github',
            template: `      - name: Prepare Package Manager
        run: |
          if [ "{{pkg_manager}}" == "pnpm" ]; then
            npm install -g pnpm
          elif [ "{{pkg_manager}}" == "yarn" ]; then
            npm install -g yarn
          fi
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '{{node_version}}'
          cache: '{{pkg_manager}}'
      - name: Install Dependencies
        run: {{install_cmd}}`
          },
          // 🦊 GitLab CI (🔥 เติม Yarn ให้แล้วครับ)
          {
            platform: "gitlab",
            template: `setup_node:
  stage: setup
  image: node:{{node_version}}
  script:
    - if [ "{{pkg_manager}}" == "pnpm" ]; then npm install -g pnpm; fi
    - if [ "{{pkg_manager}}" == "yarn" ]; then npm install -g yarn; fi
    - {{install_cmd}}`,
          },
        ],
      },
    },
  });

  // Python
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Python",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "use_python",
            label: "Enable Python",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "py_version",
            label: "Python Version",
            type: "select",
            defaultValue: "3.9",
            visibleIf: { fieldId: "use_python", value: true },
            options: [
              { label: "3.9", value: "3.9" },
              { label: "3.10", value: "3.10" },
              { label: "3.11", value: "3.11" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template:
              "      - name: Setup Python\n        uses: actions/setup-python@v4\n        with:\n          python-version: '{{py_version}}'\n      - run: pip install -r requirements.txt",
          },
          {
            platform: "gitlab",
            template:
              "setup_python:\n  stage: setup\n  image: python:{{py_version}}\n  script:\n    - pip install -r requirements.txt",
          },
        ],
      },
    },
  });

  // =======================================================
  // 3. Quality Checks
  // =======================================================
  const catQuality = await prisma.componentCategory.create({
    data: {
      name: "3. Quality Checks",
      slug: "quality",
      displayOrder: 3,
      icon: "ShieldCheck",
    },
  });

  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Testing Strategy",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "run_tests",
            label: "Run Automated Tests",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "test_cmd",
            label: "Test Framework",
            type: "select",
            defaultValue: "npm test",
            visibleIf: { fieldId: "run_tests", value: true },
            options: [
              { label: "Node.js (npm test)", value: "npm test" },
              { label: "Node.js (yarn test)", value: "yarn test" },
              { label: "Node.js (pnpm test)", value: "pnpm test" },
              { label: "Python (pytest)", value: "pytest" },
              { label: "Java (mvn test)", value: "mvn test" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: "      - name: Run Tests\n        run: {{test_cmd}}",
          },
          {
            platform: "gitlab",
            template: `test_job:
  stage: test
  image: node:{{node_version}}
  script:
    - {{test_cmd}}`,
          },
        ],
      },
    },
  });

  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Code Quality (Lint)",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "check_quality",
            label: "Check Code Quality (Lint)",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "lint_cmd",
            label: "Lint Command",
            type: "input",
            defaultValue: "",
            visibleIf: { fieldId: "check_quality", value: true },
            placeholder: "e.g. npm run lint, yarn lint, pnpm lint",
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template:
              "      - name: Check Code Quality\n        run: {{lint_cmd}}",
          },
          {
            platform: "gitlab",
            template: `lint_job:
  stage: test
  image: node:{{node_version}}
  script:
    - {{lint_cmd}}`,
          },
        ],
      },
    },
  });

  // =======================================================
  // 4. Build & Delivery
  // =======================================================
  const catBuild = await prisma.componentCategory.create({
    data: {
      name: "4. Build & Delivery",
      slug: "build",
      displayOrder: 4,
      icon: "Box",
    },
  });

  await prisma.pipelineComponent.create({
    data: {
      categoryId: catBuild.id,
      name: "Build Application",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "run_build",
            label: "Build Project",
            type: "switch",
            defaultValue: true,
          },
          {
            id: "build_cmd",
            label: "Build Command",
            type: "select",
            defaultValue: "npm run build",
            visibleIf: { fieldId: "run_build", value: true },
            options: [
              { label: "Node.js (npm run build)", value: "npm run build" },
              { label: "Node.js (yarn build)", value: "yarn build" },
              { label: "Node.js (pnpm run build)", value: "pnpm run build" },
              { label: "Java (mvn package)", value: "mvn package" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: "      - name: Build Project\n        run: {{build_cmd}}",
          },
          {
            platform: "gitlab",
            template: `build_job:
  stage: build
  image: node:{{node_version}}
  script:
    - {{build_cmd}}
  artifacts:
    paths:
      - dist/
      - build/
    expire_in: 1 day`,
          },
        ],
      },
    },
  });

// 🔥 Docker Containerization (Final Corrected: Dynamic Inputs)
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catBuild.id,
      name: "Docker Containerization",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "docker_build",
            label: "Build Docker Image",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "image_name",
            label: "Image Name",
            type: "input",
            defaultValue: "username/repo",
            visibleIf: { fieldId: "docker_build", value: true },
            placeholder: "e.g. myusername/myapp",
          },
          {
            id: "docker_tag",
            label: "Tag",
            type: "select",
            defaultValue: "latest",
            visibleIf: { fieldId: "docker_build", value: true },
            options: [
              { label: "Latest", value: "latest" },
              { label: "Commit SHA", value: "${{ github.sha }}" },
            ],
          },
          {
            id: "docker_push",
            label: "Push to Docker Hub",
            type: "switch",
            defaultValue: false,
            visibleIf: { fieldId: "docker_build", value: true },
          },
          // ✅ ใช้ platformDefaults เพื่อให้ค่าเปลี่ยนตาม Platform
          {
            id: "docker_username",
            label: "Docker Hub Username",
            type: "input",
            defaultValue: "${{ secrets.DOCKER_USERNAME }}",
            visibleIf: { fieldId: "docker_push", value: true },
            platformDefaults: {
              github: "${{ secrets.DOCKER_USERNAME }}",
              gitlab: "$DOCKER_USERNAME",
            },
          },
          {
            id: "docker_password",
            label: "Docker Hub Password",
            type: "input",
            defaultValue: "${{ secrets.DOCKER_PASSWORD }}",
            visibleIf: { fieldId: "docker_push", value: true },
            platformDefaults: {
              github: "${{ secrets.DOCKER_PASSWORD }}",
              gitlab: "$DOCKER_PASSWORD",
            },
          },
        ],
      },
      syntaxes: {
        create: [
          // 🟢 GitHub: ใช้ {{docker_username}} แทน Hardcode
          {
            platform: "github",
            template: `      - name: Build Docker Image
        run: docker build -t {{image_name}}:{{docker_tag}} .
      - name: Push to Docker Hub
        if: {{docker_push}}
        run: |
          echo "{{docker_password}}" | docker login -u "{{docker_username}}" --password-stdin
          docker push {{image_name}}:{{docker_tag}}`
          },

          // 🦊 GitLab: ใช้ {{docker_username}} แทน Hardcode เช่นกัน
          {
            platform: "gitlab",
            template: `docker_job:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t {{image_name}}:{{docker_tag}} .
    - |
      if [ "{{docker_push}}" == "true" ]; then
        echo "{{docker_password}}" | docker login -u "{{docker_username}}" --password-stdin
        docker push {{image_name}}:{{docker_tag}}
      fi`,
          },
        ],
      },
    },
  });

  console.log("✅ Re-Seeding Finished! (Full + Fixed)");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });