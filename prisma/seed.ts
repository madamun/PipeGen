// prisma/seed.ts

import { prisma } from "../packages/lib/auth";

async function main() {
  console.log("🧹 Clearing old data...");
  await prisma.pipelineComponent.deleteMany({});
  await prisma.componentCategory.deleteMany({});

  console.log("🌱 Seeding Ordered Components...");

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
          { platform: "gitlab", template: "# Pipeline Name: {{pipeline_name}}\n" },
        ],
      },
    },
  });

  // 1.2 Triggers
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "When to Run? (Triggers)",
      type: "group",
      uiConfig: {
        fields: [
          { id: "enable_push", label: "Run on Push", type: "switch", defaultValue: false },
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
          { id: "enable_pr", label: "Run on Pull Request", type: "switch", defaultValue: false },
          {
            id: "pr_branches",
            label: "Select Branch",
            type: "branch_select",
            visibleIf: { fieldId: "enable_pr", value: true },
            templates: {
              github: "  pull_request:\n    branches: {{value}}",
              gitlab: '    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == {{value}}',
            },
          },
          { id: "enable_schedule", label: "Run on Schedule (Cron)", type: "switch", defaultValue: false },
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
            template: "on:\n{{FIELDS}}\n\njobs:\n  build-and-deploy:\n    runs-on: {{runner_os}}\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@{{checkout_ver}}",
          },
          {
            platform: "gitlab",
            template: `workflow:
  rules:
{{FIELDS}}

{{DEFAULT_BLOCK}}
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

  // 1.3 Include Pipeline Files
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "Include Pipeline Files",
      type: "group",
      uiConfig: {
        fields: [
          { id: "use_include", label: "Include Child Pipelines", type: "switch", defaultValue: false },
          { id: "include_paths", label: "Select Target Files", type: "file_multi_select", visibleIf: { fieldId: "use_include", value: true } },
        ],
      },
      syntaxes: {
        create: [{ platform: "gitlab", template: "include:{{include_paths}}" }],
      },
    },
  });

  // 1.4 System & Runner
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catGeneral.id,
      name: "System & Runner (Advanced)",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "runner_os", label: "Runner OS", type: "select", defaultValue: "ubuntu-latest",
            options: [
              { label: "Ubuntu Linux (Standard)", value: "ubuntu-latest" },
              { label: "Windows Server 2022", value: "windows-latest" },
              { label: "macOS 13", value: "macos-13" },
            ],
          },
          {
            id: "checkout_ver", label: "Checkout Action Version", type: "select", defaultValue: "v4",
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
  // 2. Language & Tools
  // =======================================================
  const catRuntime = await prisma.componentCategory.create({
    data: { name: "2. Language & Tools", slug: "runtime", displayOrder: 2, icon: "Server" },
  });

  // Node.js
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Node.js / JavaScript",
      type: "group",
      uiConfig: {
        fields: [
          { id: "use_node", label: "Enable Node.js", type: "switch", defaultValue: false },
          {
            id: "node_version", label: "Node Version", type: "select", defaultValue: "18",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "v20 (LTS)", value: "20" },
              { label: "v18 (LTS)", value: "18" },
              { label: "v16 (Legacy)", value: "16" },
            ],
          },
          {
            id: "pkg_manager", label: "Package Manager", type: "select", defaultValue: "npm",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "npm", value: "npm" },
              { label: "yarn", value: "yarn" },
              { label: "pnpm", value: "pnpm" },
              { label: "bun", value: "bun" },
            ],
            linkedFields: {
              install_cmd: {
                npm: "npm ci",
                yarn: "yarn install --frozen-lockfile",
                pnpm: "pnpm install --frozen-lockfile",
                bun: "bun install --frozen-lockfile",
              },
              test_cmd: {
                npm: "npm test",
                yarn: "yarn test",
                pnpm: "pnpm test",
                bun: "bun test",
              },
              build_cmd: {
                npm: "npm run build",
                yarn: "yarn build",
                pnpm: "pnpm run build",
                bun: "bun run build",
              },
              lint_cmd: {
                npm: "npm run lint",
                yarn: "yarn lint",
                pnpm: "pnpm run lint",
                bun: "bun run lint",
              },
            },
          },
          {
            id: "install_cmd", label: "Install Command", type: "select", defaultValue: "npm ci",
            visibleIf: { fieldId: "use_node", value: true },
            options: [
              { label: "npm (Clean Install - Recommended)", value: "npm ci" },
              { label: "npm (Standard)", value: "npm install" },
              { label: "Yarn (Frozen Lockfile)", value: "yarn install --frozen-lockfile" },
              { label: "Yarn (Standard)", value: "yarn install" },
              { label: "PNPM (Frozen Lockfile)", value: "pnpm install --frozen-lockfile" },
              { label: "PNPM (Standard)", value: "pnpm install" },
              { label: "Bun (Frozen Lockfile)", value: "bun install --frozen-lockfile" },
              { label: "Bun (Standard)", value: "bun install" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '{{node_version}}'
      - name: Install Dependencies
        run: |
          if ! command -v {{pkg_manager}} > /dev/null 2>&1; then npm install -g {{pkg_manager}}; fi
          {{install_cmd}}`,
          },
          {
            platform: "gitlab",
            template: `setup_node:
  stage: setup
  image: node:{{node_version}}
  script:
    - {{install_cmd}}`,
          },
        ],
      },
    },
  });

  // Python — linkedFields เปลี่ยน test/lint/build ตามภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Python",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "use_python", label: "Enable Python", type: "switch", defaultValue: false,
            linkedFields: {
              test_cmd: { "true": "pytest" },
              lint_cmd: { "true": "flake8" },
              build_cmd: { "true": "python -m build" },
            },
          },
          {
            id: "py_version", label: "Python Version", type: "select", defaultValue: "3.9",
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
            template: `      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '{{py_version}}'
      - name: Install Python Dependencies
        run: pip install -r requirements.txt`,
          },
          {
            platform: "gitlab",
            template: `setup_python:
  stage: setup
  image: python:{{py_version}}
  before_script: []
  script:
    - pip install -r requirements.txt`,
          },
        ],
      },
    },
  });

  // Go — linkedFields เปลี่ยน test/lint/build ตามภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Go",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "use_go", label: "Enable Go", type: "switch", defaultValue: false,
            linkedFields: {
              test_cmd: { "true": "go test -v ./..." },
              lint_cmd: { "true": "golangci-lint run" },
              build_cmd: { "true": "go build -v ./..." },
            },
          },
          {
            id: "go_version", label: "Go Version", type: "select", defaultValue: "1.21",
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
          go-version: '{{go_version}}'`,
          },
          {
            platform: "gitlab",
            template: `setup_go:
  stage: setup
  image: golang:{{go_version}}
  before_script: []
  script:
    - echo "Go environment ready"`,
          },
        ],
      },
    },
  });

  // Rust — linkedFields เปลี่ยน test/lint/build ตามภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Rust",
      type: "group",
      uiConfig: {
        fields: [
          {
            id: "use_rust", label: "Enable Rust", type: "switch", defaultValue: false,
            linkedFields: {
              test_cmd: { "true": "cargo test" },
              lint_cmd: { "true": "cargo clippy -- -D warnings" },
              build_cmd: { "true": "cargo build --release" },
            },
          },
          {
            id: "rust_version", label: "Rust Version", type: "select", defaultValue: "stable",
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
          toolchain: {{rust_version}}`,
          },
          {
            platform: "gitlab",
            template: `setup_rust:
  stage: setup
  image: rust:{{rust_version}}
  before_script: []
  script:
    - echo "Rust environment ready"`,
          },
        ],
      },
    },
  });

  // Dependency Cache
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catRuntime.id,
      name: "Dependency Cache",
      type: "group",
      uiConfig: {
        description: "Cache dependencies to speed up later runs.",
        fields: [
          { id: "enable_cache", label: "Enable dependency cache", type: "switch", defaultValue: false },
          { id: "cache_path", label: "Cache path", type: "input", defaultValue: "node_modules", visibleIf: { fieldId: "enable_cache", value: true }, placeholder: "node_modules" },
          { id: "cache_key", label: "Cache key", type: "input", defaultValue: "npm-${{ runner.os }}", visibleIf: { fieldId: "enable_cache", value: true }, placeholder: "npm-${{ runner.os }}" },
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
          { platform: "gitlab", template: "" },
        ],
      },
    },
  });

  // =======================================================
  // 3. Quality Checks
  // =======================================================
  const catQuality = await prisma.componentCategory.create({
    data: { name: "3. Quality Checks", slug: "quality", displayOrder: 3, icon: "ShieldCheck" },
  });

  // Testing — รองรับทุกภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Testing Strategy",
      type: "group",
      uiConfig: {
        fields: [
          { id: "run_tests", label: "Run Automated Tests", type: "switch", defaultValue: false },
          {
            id: "test_cmd", label: "Test Command", type: "select", defaultValue: "npm test",
            visibleIf: { fieldId: "run_tests", value: true },
            options: [
              { label: "npm test", value: "npm test" },
              { label: "yarn test", value: "yarn test" },
              { label: "pnpm test", value: "pnpm test" },
              { label: "bun test", value: "bun test" },
              { label: "pytest", value: "pytest" },
              { label: "go test -v ./...", value: "go test -v ./..." },
              { label: "cargo test", value: "cargo test" },
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
  script:
    - {{runtime_install}}
    - {{test_cmd}}`,
          },
        ],
      },
    },
  });

  // Lint — รองรับทุกภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Code Quality (Lint)",
      type: "group",
      uiConfig: {
        fields: [
          { id: "check_quality", label: "Check Code Quality (Lint)", type: "switch", defaultValue: false },
          {
            id: "lint_cmd",
            label: "Lint Command",
            type: "select",
            defaultValue: "npm run lint",
            visibleIf: { fieldId: "check_quality", value: true },
            options: [
              { label: "npm run lint", value: "npm run lint" },
              { label: "yarn lint", value: "yarn lint" },
              { label: "pnpm run lint", value: "pnpm run lint" },
              { label: "bun run lint", value: "bun run lint" },
              { label: "flake8", value: "flake8" },
              { label: "pylint", value: "pylint ." },
              { label: "golangci-lint run", value: "golangci-lint run" },
              { label: "cargo clippy", value: "cargo clippy -- -D warnings" },
            ],
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: "      - name: Check Code Quality\n        run: {{lint_cmd}}",
          },
          {
            platform: "gitlab",
            template: `lint_job:
  stage: test
  script:
    - {{runtime_install}}
    - {{lint_cmd}}`,
          },
        ],
      },
    },
  });

  // Security
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Security (SAST / audit)",
      type: "group",
      uiConfig: {
        description: "Run security checks: npm audit, Trivy, or CodeQL.",
        fields: [
          { id: "enable_security", label: "Run security checks", type: "switch", defaultValue: false },
          {
            id: "security_tool", label: "Tool", type: "select", defaultValue: "npm_audit",
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
  script:
    - {{runtime_install}}
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

  // Coverage — รองรับทุกภาษา ทั้ง Codecov + Coveralls
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catQuality.id,
      name: "Coverage report",
      type: "group",
      uiConfig: {
        description: "Upload test coverage to Codecov or Coveralls.",
        secretsHelp: "Add your coverage token (e.g. CODECOV_TOKEN) in repo Settings → Secrets (GitHub) or CI/CD Variables (GitLab).",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          { id: "enable_coverage", label: "Upload coverage", type: "switch", defaultValue: false },
          {
            id: "coverage_provider", label: "Provider", type: "select",
            defaultValue: "codecov/codecov-action@v4",
            visibleIf: { fieldId: "enable_coverage", value: true },
            options: [
              { label: "Codecov", value: "codecov/codecov-action@v4" },
              { label: "Coveralls", value: "coverallsapp/github-action@v2" },
            ],
            linkedFields: {
              coverage_gitlab_upload: {
                "codecov/codecov-action@v4": "curl -Os https://cli.codecov.io/latest/linux/codecov && chmod +x codecov && ./codecov upload-process --token $CODECOV_TOKEN",
                "coverallsapp/github-action@v2": "npx coveralls < coverage/lcov.info",
              },
              coverage_token_secret: {
                "codecov/codecov-action@v4": "CODECOV_TOKEN",
                "coverallsapp/github-action@v2": "COVERALLS_TOKEN",
              },
            },
          },
          {
            id: "coverage_token_secret", label: "Token secret name", type: "input",
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
            template: `      - name: Upload Coverage
        uses: {{coverage_provider}}
        with:
          token: \${{ secrets.{{coverage_token_secret}} }}`,
          },
          {
            platform: "gitlab",
            template: `coverage_job:
  stage: test
  script:
    - {{runtime_install}}
    - {{coverage_test_cmd}}
    - {{coverage_gitlab_upload}}
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
    data: { name: "4. Build & Delivery", slug: "build", displayOrder: 4, icon: "Box" },
  });

  // Build — รองรับทุกภาษา
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catBuild.id,
      name: "Build Application",
      type: "group",
      uiConfig: {
        fields: [
          { id: "run_build", label: "Build Project", type: "switch", defaultValue: false },
          {
            id: "build_cmd", label: "Build Command", type: "select", defaultValue: "npm run build",
            visibleIf: { fieldId: "run_build", value: true },
            options: [
              { label: "npm run build", value: "npm run build" },
              { label: "yarn build", value: "yarn build" },
              { label: "pnpm run build", value: "pnpm run build" },
              { label: "bun run build", value: "bun run build" },
              { label: "python -m build", value: "python -m build" },
              { label: "go build -v ./...", value: "go build -v ./..." },
              { label: "cargo build --release", value: "cargo build --release" },
              { label: "mvn package", value: "mvn package" },
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
  script:
    - {{runtime_install}}
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

  // Docker
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catBuild.id,
      name: "Docker Containerization",
      type: "group",
      uiConfig: {
        description: "Build a Docker image and optionally push to Docker Hub.",
        secretsHelp: "If pushing, add DOCKER_USERNAME and DOCKER_PASSWORD in repo secrets.",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          { id: "docker_build", label: "Build Docker Image", type: "switch", defaultValue: false },
          { id: "image_name", label: "Image Name", type: "input", defaultValue: "username/repo", visibleIf: { fieldId: "docker_build", value: true }, placeholder: "e.g. myusername/myapp" },
          { id: "docker_tag", label: "Tag", type: "select", defaultValue: "latest", visibleIf: { fieldId: "docker_build", value: true }, options: [{ label: "Latest", value: "latest" }, { label: "Commit SHA", value: "${{ github.sha }}" }] },
          { id: "docker_push", label: "Push to Docker Hub", type: "switch", defaultValue: false, visibleIf: { fieldId: "docker_build", value: true } },
          { id: "docker_username", label: "Docker Hub Username", type: "input", defaultValue: "${{ secrets.DOCKER_USERNAME }}", visibleIf: { fieldId: "docker_push", value: true }, platformDefaults: { github: "${{ secrets.DOCKER_USERNAME }}", gitlab: "$DOCKER_USERNAME" } },
          { id: "docker_password", label: "Docker Hub Password", type: "input", defaultValue: "${{ secrets.DOCKER_PASSWORD }}", visibleIf: { fieldId: "docker_push", value: true }, platformDefaults: { github: "${{ secrets.DOCKER_PASSWORD }}", gitlab: "$DOCKER_PASSWORD" } },
        ],
      },
      syntaxes: {
        create: [
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
          {
            platform: "gitlab",
            template: `docker_job:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  before_script: []
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
        description: "Deploy the built app to Vercel.",
        secretsHelp: "Add VERCEL_TOKEN in repo Settings → Secrets.",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          { id: "deploy_vercel", label: "Deploy to Vercel", type: "switch", defaultValue: false },
          { id: "vercel_token_secret", label: "Secret name for Vercel token", type: "input", defaultValue: "VERCEL_TOKEN", visibleIf: { fieldId: "deploy_vercel", value: true }, placeholder: "VERCEL_TOKEN" },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}`,
          },
          {
            platform: "gitlab",
            template: `deploy_vercel:
  stage: deploy
  image: node:20
  before_script: []
  script:
    - npm i -g vercel
    - vercel pull --yes --environment=production --token=$VERCEL_TOKEN
    - vercel build --prod --token=$VERCEL_TOKEN
    - vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`,
          },
        ],
      },
    },
  });

  // =======================================================
  // 5. Notifications
  // =======================================================
  const catNotifications = await prisma.componentCategory.create({
    data: { name: "5. Notifications", slug: "notifications", displayOrder: 5, icon: "Bell" },
  });

  // Slack
  await prisma.pipelineComponent.create({
    data: {
      categoryId: catNotifications.id,
      name: "Slack Notification",
      type: "group",
      uiConfig: {
        description: "Send a notification to Slack when the job succeeds or fails.",
        secretsHelp: "Add your Slack webhook URL as a secret (e.g. SLACK_WEBHOOK_URL).",
        settingsPathByProvider: { github: "settings/secrets/actions", gitlab: "-/settings/ci_cd" },
        fields: [
          { id: "enable_slack", label: "Notify Slack on job result", type: "switch", defaultValue: false },
          { id: "slack_webhook_secret", label: "Webhook secret name", type: "input", defaultValue: "SLACK_WEBHOOK_URL", visibleIf: { fieldId: "enable_slack", value: true }, placeholder: "SLACK_WEBHOOK_URL" },
          {
            id: "slack_notify_on", label: "When to notify", type: "select", defaultValue: "always",
            visibleIf: { fieldId: "enable_slack", value: true },
            options: [
              { label: "On failure only", value: "on_failure" },
              { label: "On success only", value: "on_success" },
              { label: "Always", value: "always" },
            ],
            linkedFields: {
              slack_github_condition: {
                on_failure: "failure()",
                on_success: "success()",
                always: "always()",
              },
              slack_gitlab_when: {
                on_failure: "on_failure",
                on_success: "on_success",
                always: "always",
              },
              slack_github_status: {
                on_failure: "failed",
                on_success: "passed",
                always: "completed",
              },
              slack_gitlab_status: {
                on_failure: "failed",
                on_success: "passed",
                always: "completed",
              },
            },
          },
        ],
      },
      syntaxes: {
        create: [
          {
            platform: "github",
            template: `      - name: Notify Slack
        if: {{slack_github_condition}}
        run: |
          curl -X POST -H 'Content-type: application/json' --data '{"text":"\${{ github.repository }} pipeline #\${{ github.run_number }} on \${{ github.ref_name }} - {{slack_github_status}}"}' \${{ secrets.SLACK_WEBHOOK_URL }}`,
          },
          {
            platform: "gitlab",
            template: `notify_slack:
  stage: .post
  image: curlimages/curl:latest
  before_script: []
  script:
    - |
      curl -X POST -H 'Content-type: application/json' --data '{"text":"'"$CI_PROJECT_NAME"' pipeline #'"$CI_PIPELINE_IID"' on '"$CI_COMMIT_REF_NAME"' - {{slack_gitlab_status}}"}' "$SLACK_WEBHOOK_URL"
  rules:
    - when: {{slack_gitlab_when}}`,
          },
        ],
      },
    },
  });

  console.log("✅ Seeding Finished!");
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });