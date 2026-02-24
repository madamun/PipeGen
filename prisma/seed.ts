// prisma/seed.ts

import { prisma } from "../packages/lib/auth";


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
          {
            id: "enable_schedule",
            label: "Run on Schedule (Cron)",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "cron_expression",
            label: "Cron Expression",
            type: "input",
            defaultValue: "0 * * * *",
            visibleIf: { fieldId: "enable_schedule", value: true },
            placeholder: "0 * * * * (every hour)",
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
              { label: "bun", value: "bun" },
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
              {
                label: "Yarn (Frozen Lockfile)",
                value: "yarn install --frozen-lockfile",
              },
              { label: "Yarn (Standard)", value: "yarn install" },
              {
                label: "PNPM (Frozen Lockfile)",
                value: "pnpm install --frozen-lockfile",
              },
              { label: "PNPM (Standard)", value: "pnpm install" },
              { label: "Bun (Frozen Lockfile)", value: "bun install --frozen-lockfile" },
              { label: "Bun (Standard)", value: "bun install" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          // 🟢 GitHub Actions (มี Yarn อยู่แล้ว)
          {
            platform: "github",
            template: `      - name: Prepare Package Manager
        run: |
          if [ "{{pkg_manager}}" == "pnpm" ]; then
            npm install -g pnpm
          elif [ "{{pkg_manager}}" == "yarn" ]; then
            npm install -g yarn
          elif [ "{{pkg_manager}}" == "bun" ]; then
            npm install -g bun
          fi
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '{{node_version}}'
          cache: '{{pkg_manager}}'
      - name: Install Dependencies
        run: {{install_cmd}}`,
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
    - if [ "{{pkg_manager}}" == "bun" ]; then npm install -g bun; fi
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

  // Go
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Go",
      type: "group",
      uiConfig: {
        fields: [
          { id: "use_go", label: "Enable Go", type: "switch", defaultValue: false },
          {
            id: "go_version",
            label: "Go Version",
            type: "select",
            defaultValue: "1.21",
            visibleIf: { fieldId: "use_go", value: true },
            options: [
              { label: "1.22", value: "1.22" },
              { label: "1.21", value: "1.21" },
              { label: "1.20", value: "1.20" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '{{go_version}}'
      - name: Build
        run: go build -v ./...
      - name: Test
        run: go test -v ./...`,
          },
          {
            platform: "gitlab",
            template: `setup_go:
  stage: setup
  image: golang:{{go_version}}
  script:
    - go build -v ./...
    - go test -v ./...`,
          },
        ],
      },
    },
  });

  // Rust
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Rust",
      type: "group",
      uiConfig: {
        fields: [
          { id: "use_rust", label: "Enable Rust", type: "switch", defaultValue: false },
          {
            id: "rust_version",
            label: "Rust Version",
            type: "select",
            defaultValue: "stable",
            visibleIf: { fieldId: "use_rust", value: true },
            options: [
              { label: "stable", value: "stable" },
              { label: "1.75", value: "1.75" },
              { label: "1.70", value: "1.70" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: {{rust_version}}
      - name: Build
        run: cargo build --release
      - name: Test
        run: cargo test`,
          },
          {
            platform: "gitlab",
            template: `setup_rust:
  stage: setup
  image: rust:{{rust_version}}
  script:
    - cargo build --release
    - cargo test`,
          },
        ],
      },
    },
  });

  // Dependency Cache (GitHub: actions/cache; GitLab: cache in default workflow)
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Dependency Cache",
      type: "group",
      uiConfig: {
        description: "Cache dependencies (e.g. node_modules) to speed up later runs. GitHub uses actions/cache; GitLab uses built-in cache in the workflow. No repo secrets required.",
        fields: [
          {
            id: "enable_cache",
            label: "Enable dependency cache",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "cache_path",
            label: "Cache path",
            type: "input",
            defaultValue: "node_modules",
            visibleIf: { fieldId: "enable_cache", value: true },
            placeholder: "node_modules",
          },
          {
            id: "cache_key",
            label: "Cache key (GitHub: use ${{ runner.os }}-${{ hashFiles('**/lock*') }} for lockfile)",
            type: "input",
            defaultValue: "npm-${{ runner.os }}",
            visibleIf: { fieldId: "enable_cache", value: true },
            placeholder: "npm-${{ runner.os }}",
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: {{cache_path}}
          key: {{cache_key}}`,
          },
          {
            platform: "gitlab",
            template: "",
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

  // Security / SAST
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Security (SAST / audit)",
      type: "group",
      uiConfig: {
        description: "Run security checks: npm audit (dependency audit), Trivy (container/files scan), or CodeQL (GitHub). No repo secrets needed for npm audit.",
        fields: [
          { id: "enable_security", label: "Run security checks", type: "switch", defaultValue: false },
          {
            id: "security_tool",
            label: "Tool",
            type: "select",
            defaultValue: "npm_audit",
            visibleIf: { fieldId: "enable_security", value: true },
            options: [
              { label: "npm audit", value: "npm_audit" },
              { label: "Trivy (container/files)", value: "trivy" },
              { label: "CodeQL (GitHub)", value: "codeql" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Security check
        run: |
          case "{{security_tool}}" in
            npm_audit) npm audit --audit-level=high ;;
            trivy) docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v \$PWD:/src aquasec/trivy fs --exit-code 1 /src ;;
            codeql) echo "Add CodeQL action step manually if needed" ;;
            *) npm audit --audit-level=high ;;
          esac`,
          },
          {
            platform: "gitlab",
            template: `security_job:
  stage: test
  image: node:{{node_version}}
  script:
    - |
      case "{{security_tool}}" in
        npm_audit) npm audit --audit-level=high ;;
        trivy) docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $PWD:/src aquasec/trivy fs --exit-code 1 /src ;;
        *) npm audit --audit-level=high ;;
      esac`,
          },
        ],
      },
    },
  });

  // Coverage (Codecov / Coveralls)
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Coverage report",
      type: "group",
      uiConfig: {
        description: "Upload test coverage to Codecov or Coveralls. The workflow uses a token from repo secrets/variables.",
        secretsHelp: "Add your coverage token (e.g. CODECOV_TOKEN) in repo Settings → Secrets (GitHub) or CI/CD Variables (GitLab).",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          { id: "enable_coverage", label: "Upload coverage", type: "switch", defaultValue: false },
          {
            id: "coverage_provider",
            label: "Provider",
            type: "select",
            defaultValue: "codecov",
            visibleIf: { fieldId: "enable_coverage", value: true },
            options: [
              { label: "Codecov", value: "codecov" },
              { label: "Coveralls", value: "coveralls" },
            ],
          },
          {
            id: "coverage_token_secret",
            label: "Token secret name",
            type: "input",
            defaultValue: "CODECOV_TOKEN",
            visibleIf: { fieldId: "enable_coverage", value: true },
            placeholder: "CODECOV_TOKEN",
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Upload coverage
        if: {{coverage_provider}} == 'codecov'
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
      - name: Upload to Coveralls
        if: {{coverage_provider}} == 'coveralls'
        uses: coverallsapp/github-action@v2
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}`,
          },
          {
            platform: "gitlab",
            template: `coverage_job:
  stage: test
  image: node:{{node_version}}
  script:
    - npm test -- --coverage
  coverage: '/All files[^|]*\\|\\s*([\\d.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml`,
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
        description: "Build a Docker image and optionally push it to Docker Hub. Pushing requires Docker Hub credentials in repo secrets.",
        secretsHelp: "If pushing to Docker Hub: add DOCKER_USERNAME and DOCKER_PASSWORD (or DOCKER_TOKEN) in repo Settings → Secrets / CI/CD Variables.",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
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
          docker push {{image_name}}:{{docker_tag}}`,
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

  // Deploy to Vercel
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catBuild.id,
      name: "Deploy to Vercel",
      type: "group",
      uiConfig: {
        description: "Deploy the built app to Vercel. The workflow uses the Vercel token (and optional org/project IDs) from repo secrets.",
        secretsHelp: "Add VERCEL_TOKEN in repo Settings → Secrets. On GitHub you can also set VERCEL_ORG_ID and VERCEL_PROJECT_ID.",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          {
            id: "deploy_vercel",
            label: "Deploy to Vercel",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "vercel_token_secret",
            label: "Secret name for Vercel token (add in repo secrets)",
            type: "input",
            defaultValue: "VERCEL_TOKEN",
            visibleIf: { fieldId: "deploy_vercel", value: true },
            placeholder: "VERCEL_TOKEN",
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}`,
          },
          {
            platform: "gitlab",
            template: `deploy_vercel:
  stage: deploy
  image: node:20
  script:
    - npm i -g vercel
    - vercel pull --yes --token=$VERCEL_TOKEN
    - vercel build --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --token=$VERCEL_TOKEN --prod
  variables:
    VERCEL_TOKEN: $VERCEL_TOKEN`,
          },
        ],
      },
    },
  });

  // =======================================================
  // 5. Notifications
  // =======================================================
  const catNotifications = await prisma.componentCategory.create({
    data: {
      name: "5. Notifications",
      slug: "notifications",
      displayOrder: 5,
      icon: "Bell",
    },
  });

  await prisma.pipelineComponent.create({
    data: {
      categoryId: catNotifications.id,
      name: "Slack Notification",
      type: "group",
      uiConfig: {
        description: "Send a notification to Slack when the job succeeds or fails, using an Incoming Webhook URL.",
        secretsHelp: "Add your Slack webhook URL as a secret (e.g. SLACK_WEBHOOK_URL) in repo Settings → Secrets / CI/CD Variables.",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          {
            id: "enable_slack",
            label: "Notify Slack on job result",
            type: "switch",
            defaultValue: false,
          },
          {
            id: "slack_webhook_secret",
            label: "Webhook secret name (e.g. SLACK_WEBHOOK_URL)",
            type: "input",
            defaultValue: "SLACK_WEBHOOK_URL",
            visibleIf: { fieldId: "enable_slack", value: true },
            placeholder: "SLACK_WEBHOOK_URL",
          },
          {
            id: "slack_notify_on",
            label: "When to notify",
            type: "select",
            defaultValue: "on_failure",
            visibleIf: { fieldId: "enable_slack", value: true },
            options: [
              { label: "On failure only", value: "on_failure" },
              { label: "On success only", value: "on_success" },
              { label: "Always", value: "always" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Notify Slack
        if: {{slack_notify_if}}
        run: |
          curl -X POST -H 'Content-type: application/json' --data '{"text":"Pipeline \${{ github.workflow }}: \${{ job.status }}"}' \${{ secrets.SLACK_WEBHOOK_URL }}`,
          },
          {
            platform: "gitlab",
            template: `notify_slack:
  stage: .post
  image: curlimages/curl:latest
  script:
    - |
      curl -X POST -H 'Content-type: application/json' --data '{"text":"Pipeline $CI_PIPELINE_STATUS"}' "$SLACK_WEBHOOK_URL"
  rules:
    - when: always`,
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
