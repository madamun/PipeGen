// packages/lib/pipelineEngine.ts
//
// Database-Driven Pipeline Engine v2
// - อ่าน template ทั้งหมดจาก DB (ComponentSyntax)
// - ไม่ hardcode โครงสร้าง YAML ใน engine
// - runtime_image / runtime_install คำนวณจากภาษาที่เปิดอยู่
// - linkedFields ทำงานทั้งใน UI และตอน generate
// - parser ดึง input values จาก YAML structure โดยตรง (ไม่พึ่ง regex อย่างเดียว)

import yaml from 'js-yaml';
import type { ComponentCategory, ComponentValues } from '../types/pipeline';

// =========================================================
// Types
// =========================================================

export interface YamlValidationError {
  line: number;
  column: number;
  message: string;
}

// =========================================================
// Helpers
// =========================================================

function buildAllContext(
  categories: ComponentCategory[],
  values: ComponentValues,
  targetSyntax: string
): Record<string, any> {
  const ctx: Record<string, any> = {};

  categories.forEach(cat => {
    cat.components.forEach((comp: any) => {
      (comp.uiConfig?.fields || []).forEach((field: any) => {
        let val = field.defaultValue;
        if (field.platformDefaults?.[targetSyntax]) {
          val = field.platformDefaults[targetSyntax];
        }
        if (val !== undefined) ctx[field.id] = val;
      });
    });
  });

  Object.keys(values).forEach(key => {
    const val = values[key];
    if (val !== '' && val !== null && val !== undefined) ctx[key] = val;
  });

  categories.forEach(cat => {
    cat.components.forEach((comp: any) => {
      (comp.uiConfig?.fields || []).forEach((field: any) => {
        if (field.linkedFields && ctx[field.id] !== undefined) {
          const currentVal = String(ctx[field.id]);
          Object.entries(field.linkedFields).forEach(([targetId, mapping]: [string, any]) => {
            const mapped = mapping[currentVal];
            if (mapped !== undefined && values[targetId] === undefined) {
              ctx[targetId] = mapped;
            }
          });
        }
      });
    });
  });

  if (ctx['use_node']) {
    ctx['runtime_image'] = `node:${ctx['node_version'] || '18'}`;
    ctx['runtime_install'] = ctx['install_cmd'] || 'npm ci';

    // Prisma: append to install_cmd (template ใช้ {{install_cmd}} ตรงๆ)
    if (ctx['has_prisma']) {
      if (targetSyntax === 'github') {
        ctx['install_cmd'] = `${ctx['install_cmd'] || 'npm ci'}\nnpx prisma generate`;
      } else {
        ctx['install_cmd'] = `${ctx['install_cmd'] || 'npm ci'}\nnpx prisma generate`;
      }
      ctx['runtime_install'] = ctx['install_cmd'];
    }

    // Monorepo: Docker path จากโฟลเดอร์ย่อย
    if (ctx['detected_docker_path'] && ctx['detected_docker_path'] !== 'Dockerfile') {
      const dockerDir = ctx['detected_docker_path'].replace(/\/Dockerfile$/i, '') || '.';
      ctx['docker_build_cmd'] = `docker build -t \${ctx['image_name'] || 'username/repo'}:\${ctx['docker_tag'] || 'latest'} -f ${ctx['detected_docker_path']} ./${dockerDir}`;
    }
  } else if (ctx['use_python']) {
    ctx['runtime_image'] = `python:${ctx['py_version'] || '3.9'}`;
    ctx['runtime_install'] = 'pip install -r requirements.txt';
    ctx['runtime_before_script'] = '';
  } else if (ctx['use_go']) {
    ctx['runtime_image'] = `golang:${ctx['go_version'] || '1.21'}`;
    ctx['runtime_install'] = '';
    ctx['runtime_before_script'] = '';
  } else if (ctx['use_rust']) {
    ctx['runtime_image'] = `rust:${ctx['rust_version'] || 'stable'}`;
    ctx['runtime_install'] = '';
    ctx['runtime_before_script'] = '';
  } else {
    ctx['runtime_image'] = 'node:18';
    ctx['runtime_install'] = '';
    ctx['runtime_before_script'] = '';
  }

  // Docker: ถ้าเจอ Dockerfile ใน subfolder → แก้ build context
  if (ctx['detected_docker_path'] && ctx['detected_docker_path'] !== 'Dockerfile') {
    const dockerDir = String(ctx['detected_docker_path']).replace(/\/[^/]*$/, '') || '.';
    ctx['docker_build_override'] = `docker build -t ${ctx['image_name'] || 'username/repo'}:${ctx['docker_tag'] || 'latest'} -f ${ctx['detected_docker_path']} ./${dockerDir}`;
  }

  // Coverage test command ตามภาษา
  if (ctx['use_node']) {
    ctx['coverage_test_cmd'] = `${ctx['test_cmd'] || 'npm test'} -- --coverage`;
  } else if (ctx['use_python']) {
    ctx['coverage_test_cmd'] = 'pytest --cov --cov-report=xml --cov-report=term';
  } else if (ctx['use_go']) {
    ctx['coverage_test_cmd'] = 'go test -coverprofile=coverage.out ./...';
  } else if (ctx['use_rust']) {
    ctx['coverage_test_cmd'] = 'cargo tarpaulin --out xml';
  } else {
    ctx['coverage_test_cmd'] = `${ctx['test_cmd'] || 'npm test'} -- --coverage`;
  }

  return ctx;
}

function findBaseComponents(categories: ComponentCategory[], targetSyntax: string) {
  const generalCat = categories.find((c: any) => c.slug === 'general');
  let projectInfo: any = null;
  let triggers: any = null;
  let systemRunner: any = null;

  if (generalCat) {
    for (const comp of generalCat.components as any[]) {
      const syn = comp.syntaxes?.find((s: any) => s.platform === targetSyntax);
      const fields: any[] = comp.uiConfig?.fields || [];

      if (syn?.template?.includes('{{FIELDS}}')) {
        triggers = comp;
      } else if (fields.some((f: any) => f.id === 'pipeline_name')) {
        projectInfo = comp;
      } else if (fields.some((f: any) => f.id === 'runner_os')) {
        systemRunner = comp;
      }
    }
  }

  const baseIds = new Set<string>();
  if (projectInfo) baseIds.add(projectInfo.id);
  if (triggers) baseIds.add(triggers.id);
  if (systemRunner) baseIds.add(systemRunner.id);

  return { projectInfo, triggers, systemRunner, baseIds };
}

function buildTriggerBlock(
  triggersComp: any,
  allContext: Record<string, any>,
  targetSyntax: string
): string {
  const fields: any[] = triggersComp?.uiConfig?.fields || [];
  let block = '';

  for (const field of fields) {
    if (field.type !== 'switch' || allContext[field.id] !== true) continue;

    const dataField = fields.find(
      (f: any) => f.visibleIf?.fieldId === field.id && f.type === 'branch_select'
    );

    if (dataField?.templates?.[targetSyntax]) {
      const tpl = dataField.templates[targetSyntax] as string;
      const branches: string[] = Array.isArray(allContext[dataField.id])
        ? allContext[dataField.id]
        : ['main'];

      if (targetSyntax === 'github') {
        block += tpl.replace('{{value}}', JSON.stringify(branches)) + '\n';
      } else {
        for (const b of branches) {
          block += tpl.replace('{{value}}', `"${b}"`) + '\n';
        }
      }
    }

    if (field.id === 'enable_schedule' && allContext['cron_expression']) {
      if (targetSyntax === 'github') {
        block += `  schedule:\n  - cron: '${String(allContext['cron_expression']).trim()}'\n`;
      }
    }
  }

  if (!block.trim()) {
    block = targetSyntax === 'github' ? '  workflow_dispatch:' : '    - when: manual';
  }

  return block;
}

function buildGitLabDefaultBlock(allContext: Record<string, any>): string {
  const hasLanguage = allContext['use_node'] || allContext['use_python'] || allContext['use_go'] || allContext['use_rust'];
  if (!hasLanguage) return '';

  let block = `default:\n  image: ${allContext['runtime_image'] || 'node:18'}\n`;
  if (allContext['runtime_before_script']) {
    block += `  before_script:\n    - ${allContext['runtime_before_script']}\n`;
  }
  return block;
}

function replaceTemplateVars(template: string, ctx: Record<string, any>): string {
  let result = template;
  let prev = '';
  while (result !== prev) {
    prev = result;
    result = result.replace(/\{\{([^{}]+)\}\}/g, (_match, varName, offset) => {
      const val = ctx[varName];
      if (val === undefined) return _match;
      const strVal = String(val);
      // ถ้าค่ามี newline → เพิ่ม indent ให้ตรงกับตำแหน่งใน template
      if (strVal.includes('\n')) {
        const lineStart = result.lastIndexOf('\n', offset);
        const indent = lineStart >= 0 ? result.slice(lineStart + 1, offset).match(/^(\s*)/)?.[1] || '' : '';
        return strVal.replace(/\n/g, '\n' + indent);
      }
      return strVal;
    });
  }
  return result;
}
function cleanEmptyLines(rendered: string): string {
  return rendered
    .split('\n')
    .filter(l => l.trim() !== '-' && l.trim() !== '- ""' && l.trim() !== "- ''")
    .join('\n');
}

function beautifyYaml(raw: string, syntax: string): string {
  let out = raw;
  if (syntax === 'github') {
    out = out.replace(/\n(\s*)- name:/g, '\n\n$1- name:');
  } else {
    out = out.replace(/\n([a-zA-Z0-9_-]+):\n\s+stage:/g, '\n\n$1:\n  stage:');
  }
  return out.replace(/\n{3,}/g, '\n\n');
}

function isComponentActive(comp: any, ctx: Record<string, any>): boolean {
  const sw = (comp.uiConfig?.fields || []).find((f: any) => f.type === 'switch');
  return comp.type === 'group' ? (sw ? ctx[sw.id] === true : true) : ctx[comp.id] === true;
}

function getSelectOptions(comp: any): string[] {
  const opts: string[] = [];
  (comp.uiConfig?.fields || []).forEach((f: any) => {
    if (f.type === 'select' && f.options) {
      f.options.forEach((o: any) => opts.push(String(o.value)));
    }
  });
  return opts;
}

function isIncludeComponent(comp: any): boolean {
  return (comp.uiConfig?.fields || []).some((f: any) => f.id === 'include_paths');
}

// =========================================================
// GENERATOR: UI -> YAML
// =========================================================

export const generateYamlFromValues = (
  categories: ComponentCategory[],
  values: ComponentValues,
  targetSyntax: string,
  currentYaml: string
): string => {
  if (!categories || categories.length === 0) return currentYaml;

  const allContext = buildAllContext(categories, values, targetSyntax);
  const { projectInfo, triggers, baseIds } = findBaseComponents(categories, targetSyntax);

  let baseYaml = '';

  if (projectInfo) {
    const syn = (projectInfo.syntaxes || []).find((s: any) => s.platform === targetSyntax);
    if (syn?.template) baseYaml += replaceTemplateVars(syn.template, allContext);
  }

  if (triggers) {
    const syn = (triggers.syntaxes || []).find((s: any) => s.platform === targetSyntax);
    if (syn?.template) {
      const triggerBlock = buildTriggerBlock(triggers, allContext, targetSyntax);
      let tpl = syn.template.replace('{{FIELDS}}', triggerBlock);
      if (targetSyntax === 'gitlab') {
        tpl = tpl.replace('{{DEFAULT_BLOCK}}', buildGitLabDefaultBlock(allContext));
      }
      tpl = replaceTemplateVars(tpl, allContext);
      baseYaml += tpl;
    }
  }

  let additionalCode = '';

  categories.forEach(cat => {
    (cat.components as any[]).forEach(comp => {
      if (baseIds.has(comp.id)) return;

      if (isIncludeComponent(comp)) {
        if (
          targetSyntax === 'gitlab' &&
          allContext['use_include'] &&
          Array.isArray(allContext['include_paths']) &&
          allContext['include_paths'].length > 0
        ) {
          const paths = (allContext['include_paths'] as string[])
            .map(p => `  - local: ${p}`)
            .join('\n');
          additionalCode += `\ninclude:\n${paths}\n`;
        }
        return;
      }

      if (!isComponentActive(comp, allContext)) return;

      const syn = (comp.syntaxes || []).find((s: any) => s.platform === targetSyntax);
      if (!syn?.template) return;

      let rendered = replaceTemplateVars(syn.template, allContext);
      rendered = cleanEmptyLines(rendered);
      additionalCode += '\n' + rendered;
    });
  });

  const fullGeneratedYaml = beautifyYaml(baseYaml + additionalCode, targetSyntax);

  try {
    if (currentYaml && currentYaml.trim() && !currentYaml.startsWith('# Error')) {
      const doc = yaml.load(currentYaml) as any;
      if (doc && typeof doc === 'object') {
        if (targetSyntax === 'github') {
          return mergeGitHub(doc, categories, baseIds, allContext);
        }
        return mergeGitLab(doc, categories, baseIds, allContext);
      }
    }
  } catch (e) {
    console.warn('[PipelineEngine] Merge failed, falling back to full generate:', e);
  }

  return fullGeneratedYaml;
};

// ---- GitHub Merge ----

function mergeGitHub(
  doc: any,
  categories: ComponentCategory[],
  baseIds: Set<string>,
  allContext: Record<string, any>
): string {
  const { triggers } = findBaseComponents(categories, 'github');
  const triggerBlock = buildTriggerBlock(triggers, allContext, 'github');

  if (allContext['pipeline_name']) doc.name = allContext['pipeline_name'];

  const onParsed = yaml.load('on:\n' + triggerBlock.replace('workflow_dispatch:', 'workflow_dispatch: null')) as any;
  doc.on = onParsed?.on ?? onParsed;

  const runnerOS = allContext['runner_os'] || 'ubuntu-latest';
  if (!doc.jobs) doc.jobs = { 'build-and-deploy': { 'runs-on': runnerOS, steps: [] } };
  const jobKey = Object.keys(doc.jobs)[0];
  if (!doc.jobs[jobKey].steps) doc.jobs[jobKey].steps = [];

  categories.forEach(cat => {
    (cat.components as any[]).forEach(comp => {
      if (baseIds.has(comp.id) || isIncludeComponent(comp)) return;

      const active = isComponentActive(comp, allContext);
      const syn = (comp.syntaxes || []).find((s: any) => s.platform === 'github');
      if (!syn?.template) return;

      const selectOpts = getSelectOptions(comp);

      if (active) {
        let rendered = replaceTemplateVars(syn.template, allContext);
        rendered = cleanEmptyLines(rendered);
        const parsedSteps = yaml.load(rendered) as any;

        if (Array.isArray(parsedSteps)) {
          // ลบ steps เดิมของ component นี้ออกก่อน แล้วใส่ใหม่ทั้งชุด
          // ป้องกัน step ซ้ำ/หาย เมื่อ component มีหลาย steps (เช่น Docker มี Build + Push)
          const stepsToRemove = new Set<number>();
          parsedSteps.forEach((newStep: any) => {
            const idx = doc.jobs[jobKey].steps.findIndex((s: any, i: number) => {
              if (stepsToRemove.has(i)) return false;
              if (newStep.name && s.name === newStep.name) return true;
              if (newStep.uses && s.uses && s.uses.split('@')[0] === newStep.uses.split('@')[0]) return true;
              return false;
            });
            if (idx >= 0) stepsToRemove.add(idx);
          });

          // ลบ steps เดิมออก (จากท้ายไปหัว เพื่อไม่ให้ index เลื่อน)
          const removeArr = Array.from(stepsToRemove).sort((a, b) => b - a);
          removeArr.forEach(i => doc.jobs[jobKey].steps.splice(i, 1));

          // ใส่ steps ใหม่ทั้งชุด
          doc.jobs[jobKey].steps.push(...parsedSteps);
        }
      } else {
        doc.jobs[jobKey].steps = doc.jobs[jobKey].steps.filter((s: any) => {
          if (s.run && selectOpts.filter(opt => opt.length > 5 && s.run.includes(opt)).length >= 2) return false;
          try {
            const dummy = yaml.load(syn.template.replace(/\{\{.*?\}\}/g, 'DUMMY')) as any[];
            if (Array.isArray(dummy)) {
              if (dummy.some((tpl: any) =>
                (tpl.uses && s.uses && s.uses.startsWith(tpl.uses.split('@')[0])) ||
                (tpl.name && s.name === tpl.name)
              )) return false;
            }
          } catch { }
          return true;
        });
      }
    });
  });

  const stepOrder = [
    'Checkout', 'Setup', 'Prepare', 'Install', 'Cache',
    'Run Tests', 'Check Code', 'Security', 'Upload Coverage',
    'Build', 'Docker', 'Push', 'Deploy', 'Notify',
  ];
  if (doc.jobs[jobKey]?.steps) {
    doc.jobs[jobKey].steps.sort((a: any, b: any) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      const idxA = stepOrder.findIndex(s => nameA.includes(s));
      const idxB = stepOrder.findIndex(s => nameB.includes(s));
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  return beautifyYaml(yaml.dump(doc, { lineWidth: -1, noRefs: true }), 'github');
}

// ---- GitLab Merge ----

function mergeGitLab(
  doc: any,
  categories: ComponentCategory[],
  baseIds: Set<string>,
  allContext: Record<string, any>
): string {
  const { triggers } = findBaseComponents(categories, 'gitlab');
  const triggerBlock = buildTriggerBlock(triggers, allContext, 'gitlab');

  if (!doc.workflow) doc.workflow = {};
  delete doc.workflow.name;
  const rulesParsed = yaml.load(`workflow:\n  rules:\n${triggerBlock}`) as any;
  doc.workflow.rules = rulesParsed?.workflow?.rules;

  const hasLanguage = allContext['use_node'] || allContext['use_python'] || allContext['use_go'] || allContext['use_rust'];
  if (hasLanguage) {
    if (!doc.default) doc.default = {};
    doc.default.image = allContext['runtime_image'] || 'node:18';
    if (allContext['runtime_before_script']) {
      doc.default.before_script = [allContext['runtime_before_script']];
    } else {
      delete doc.default.before_script;
    }
  }

  if (allContext['use_include'] && Array.isArray(allContext['include_paths']) && allContext['include_paths'].length > 0) {
    doc.include = (allContext['include_paths'] as string[]).map(p => ({ local: p }));
  } else {
    delete doc.include;
  }

  categories.forEach(cat => {
    (cat.components as any[]).forEach(comp => {
      if (baseIds.has(comp.id) || isIncludeComponent(comp)) return;

      const active = isComponentActive(comp, allContext);
      const syn = (comp.syntaxes || []).find((s: any) => s.platform === 'gitlab');
      if (!syn?.template) return;

      const selectOpts = getSelectOptions(comp);

      if (active) {
        let rendered = replaceTemplateVars(syn.template, allContext);
        rendered = cleanEmptyLines(rendered);
        try {
          const parsedJob = yaml.load(rendered) as any;
          if (parsedJob && typeof parsedJob === 'object') {
            const newJobKey = Object.keys(parsedJob)[0];
            let targetKey = newJobKey;

            if (!doc[newJobKey]) {
              for (const ek of Object.keys(doc)) {
                if (doc[ek]?.script) {
                  const s = Array.isArray(doc[ek].script) ? doc[ek].script.join('\n') : String(doc[ek].script);
                  if (selectOpts.some(opt => s.includes(opt))) {
                    targetKey = ek;
                    break;
                  }
                }
              }
            }
            doc[targetKey] = parsedJob[newJobKey];
          }
        } catch { }
      } else {
        try {
          const dummy = yaml.load(syn.template.replace(/\{\{.*?\}\}/g, 'DUMMY')) as any;
          const dummyKey = dummy && typeof dummy === 'object' ? Object.keys(dummy)[0] : null;

          if (dummyKey && doc[dummyKey]) {
            delete doc[dummyKey];
          } else {
            for (const ek of Object.keys(doc)) {
              if (doc[ek]?.script) {
                const s = Array.isArray(doc[ek].script) ? doc[ek].script.join('\n') : String(doc[ek].script);
                const matchCount = selectOpts.filter(opt => opt.length > 5 && s.includes(opt)).length;
                if (matchCount >= 2) delete doc[ek];
              }
            }
          }
        } catch { }
      }
    });
  });

  const stageOrder = ['setup', 'test', 'build', 'deploy', '.post'];
  const fixedKeys = new Set(['workflow', 'default', 'cache', 'stages', 'include']);
  
  const sorted: Record<string, any> = {};
  // ใส่ fixed keys ก่อน (workflow, default, cache, stages)
  for (const key of Object.keys(doc)) {
    if (fixedKeys.has(key)) sorted[key] = doc[key];
  }
  // ใส่ jobs เรียงตาม stage
  const jobKeys = Object.keys(doc).filter(k => !fixedKeys.has(k) && doc[k]?.stage);
  jobKeys.sort((a, b) => {
    const idxA = stageOrder.indexOf(doc[a].stage);
    const idxB = stageOrder.indexOf(doc[b].stage);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });
  for (const key of jobKeys) {
    sorted[key] = doc[key];
  }
  // ใส่ที่เหลือ (ถ้ามี)
  for (const key of Object.keys(doc)) {
    if (!sorted[key]) sorted[key] = doc[key];
  }

  let result = beautifyYaml(yaml.dump(sorted, { lineWidth: -1, noRefs: true }), 'gitlab');
  if (allContext['pipeline_name']) {
    result = `# Pipeline: ${allContext['pipeline_name']}\n` + result;
  }
  return result;
}

// =========================================================
// PARSER: YAML -> UI
// =========================================================

/**
 * ดึงค่า input field จาก YAML structure โดยตรง (ไม่ใช้ regex)
 * 
 * GitHub: หา step ที่ชื่อตรงกับ template → อ่าน run value
 * GitLab: หา job ที่ key ตรงกับ template → อ่าน script array
 */
function extractInputFromYaml(
  doc: any,
  comp: any,
  field: any,
  syn: any,
  detected: string,
  selectOpts: string[]
): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined;

  const shellKeywords = new Set(['if', 'fi', 'then', 'else', 'do', 'done', 'case', 'esac']);

  if (detected === 'github' && doc.jobs) {
    // หา step ที่ name ตรงกับ template
    const jobKey = Object.keys(doc.jobs)[0];
    const steps: any[] = doc.jobs?.[jobKey]?.steps || [];

    // ดึงชื่อ step จาก template
    const nameMatch = syn.template.match(/name:\s*([^\n{]+)/);
    const stepName = nameMatch?.[1]?.trim();

    if (stepName) {
      const step = steps.find((s: any) => s.name === stepName);
      if (step?.run) {
        const runVal = String(step.run).trim();
        // ถ้า run เป็น multi-line ดึงบรรทัดสุดท้ายที่ไม่ใช่ if/shell
        const lines = runVal.split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];
          const firstWord = line.split(/\s/)[0];
          if (!shellKeywords.has(firstWord) && !line.startsWith('if ') && !line.startsWith('fi') && line.length > 2) {
            return line;
          }
        }
      }
    }
  } else if (detected === 'gitlab') {
    // หา job key จาก template
    try {
      const parsed = yaml.load(syn.template.replace(/\{\{.*?\}\}/g, 'DUMMY')) as any;
      if (parsed && typeof parsed === 'object') {
        const templateJobKey = Object.keys(parsed)[0];
        const job = doc[templateJobKey];
        if (job?.script && Array.isArray(job.script)) {
          // หา script line ที่เป็นค่าของ field นี้
          // ข้าม install commands และ shell keywords
          for (let i = job.script.length - 1; i >= 0; i--) {
            const line = String(job.script[i]).trim();
            const firstWord = line.split(/\s/)[0];

            if (shellKeywords.has(firstWord)) continue;
            if (line.startsWith('if ') || line.startsWith('fi')) continue;

            // ข้าม install commands (npm ci, yarn install, pip install, etc.)
            if (selectOpts.some(opt => line === opt)) continue;
            if (line.match(/^(npm|yarn|pnpm|bun|pip)\s+(ci|install)/)) continue;

            if (line.length > 2) return line;
          }
        }
      }
    } catch { }
  }

  return undefined;
}

export const parseYamlToUI = (
  fileContent: string,
  categories: ComponentCategory[],
  currentSyntax: string
) => {
  if (!fileContent?.trim()) return { detectedSyntax: currentSyntax, newValues: {} };

  const newValues: ComponentValues = {};

  const commentName = fileContent.match(/#\s*Pipeline(?: Name)?:\s*(.+)/i);
  if (commentName) newValues['pipeline_name'] = commentName[1].trim();
  else {
    const ghName = fileContent.match(/^name:\s*(.+)/m);
    if (ghName) newValues['pipeline_name'] = ghName[1].trim();
  }

  let doc: Record<string, any> | null = null;
  try { doc = yaml.load(fileContent) as Record<string, any>; } catch { }

  let detected = currentSyntax;
  if (doc && typeof doc === 'object') {
    if (doc.workflow || doc.stages || (doc.include && !doc.on)) detected = 'gitlab';
    else if (doc.on || doc.jobs) detected = 'github';

    if (detected === 'github' && doc.on) {
      if (doc.on.push) {
        newValues['enable_push'] = true;
        newValues['push_branches'] = Array.isArray(doc.on.push.branches) ? doc.on.push.branches : [];
      }
      if (doc.on.pull_request) {
        newValues['enable_pr'] = true;
        newValues['pr_branches'] = Array.isArray(doc.on.pull_request.branches) ? doc.on.pull_request.branches : [];
      }
      if (doc.on.schedule?.[0]?.cron) {
        newValues['enable_schedule'] = true;
        newValues['cron_expression'] = doc.on.schedule[0].cron;
      }
    } else if (detected === 'gitlab') {
      if (doc.include) {
        const arr = Array.isArray(doc.include) ? doc.include : [doc.include];
        const paths: string[] = [];
        arr.forEach((inc: any) => {
          if (typeof inc === 'string') paths.push(inc);
          else if (inc?.local) paths.push(inc.local);
        });
        if (paths.length > 0) {
          newValues['use_include'] = true;
          newValues['include_paths'] = paths;
        }
      }
      if (doc.workflow?.rules) {
        const pushB: string[] = [];
        const prB: string[] = [];
        doc.workflow.rules.forEach((r: any) => {
          if (!r.if) return;
          const pm = r.if.match(/\$CI_COMMIT_BRANCH\s*==\s*["']([^"']+)["']/);
          if (pm && !r.if.includes('merge_request_event')) pushB.push(pm[1]);
          const prm = r.if.match(/\$CI_MERGE_REQUEST_TARGET_BRANCH_NAME\s*==\s*["']([^"']+)["']/);
          if (prm && r.if.includes('merge_request_event')) prB.push(prm[1]);
        });
        if (pushB.length) { newValues['enable_push'] = true; newValues['push_branches'] = pushB; }
        if (prB.length) { newValues['enable_pr'] = true; newValues['pr_branches'] = prB; }
      }
    }
  }

  const { baseIds } = findBaseComponents(categories, detected);

  const genericValues = new Set(['latest', 'stable', 'true', 'false', 'v4', 'v3', 'v2']);

  categories.forEach(cat => {
    (cat.components as any[]).forEach(comp => {
      if (baseIds.has(comp.id) || isIncludeComponent(comp)) return;

      const syn = (comp.syntaxes || []).find((s: any) => s.platform === detected);
      const mainSwitch = (comp.uiConfig?.fields || []).find((f: any) => f.type === 'switch');
      if (!syn?.template || !mainSwitch) return;

      const sigs = new Set<string>();

      // Select options เป็น signature (กรองคำทั่วไป)
      const compSelectOpts: string[] = [];
      (comp.uiConfig?.fields || []).forEach((f: any) => {
        if (f.type === 'select' && f.options) {
          f.options.forEach((o: any) => {
            const v = String(o.value).trim();
            compSelectOpts.push(v);
            if (v && !genericValues.has(v.toLowerCase())) sigs.add(v);
          });
        }
      });

      // Template lines เป็น signature
      syn.template.split('\n').forEach((line: string) => {
        const t = line.trim();
        if (!t || t.includes('{{') || t.startsWith('#')) return;

        if (t.includes('uses:')) {
          const action = t.replace(/.*uses:\s*/, '').trim().split('@')[0];
          if (action && action.length > 2) sigs.add(action);
        }
        if (t.includes('before_script:') || t.includes('stage:') || t.includes('image:')) return;
        if (t.includes('name:')) {
          const stepName = t.replace(/.*name:\s*/, '').trim();
          if (stepName && stepName.length > 5 && !stepName.includes('{{')) sigs.add(stepName);
          return;
        }
        if (t.startsWith('- ')) {
          const cmd = t.replace(/^-\s*/, '').replace(/^run:\s*/, '').trim();
          if (cmd && cmd.length > 3 && !cmd.startsWith('|')) sigs.add(cmd);
        }
      });

      // GitLab: job key เป็น signature
      if (detected === 'gitlab' && syn.template) {
        try {
          const parsed = yaml.load(syn.template.replace(/\{\{.*?\}\}/g, 'DUMMY')) as any;
          if (parsed && typeof parsed === 'object') {
            const jk = Object.keys(parsed)[0];
            if (jk && jk.length > 3) sigs.add(jk);
          }
        } catch { }
      }

      const valid = Array.from(sigs).filter(s => {
        const str = s.trim();
        return str.includes(' ') || str.includes(':') || str.includes('@') || str.length > 5;
      });

      const matched = valid.filter(sig => fileContent.includes(sig));
      const isDetected = matched.some(s => s.length > 5) || matched.length >= 2;

      newValues[mainSwitch.id] = isDetected;

      if (isDetected) {
        (comp.uiConfig?.fields || []).forEach((field: any) => {
          if (field.type === 'switch') return;

          if (field.type === 'select' && field.options) {
            const sorted = [...field.options].sort(
              (a: any, b: any) => String(b.value).length - String(a.value).length
            );
            for (const opt of sorted) {
              const v = String(opt.value);
              if (genericValues.has(v.toLowerCase())) continue;
              if (fileContent.includes(v)) {
                newValues[field.id] = v;
                break;
              }
            }
          } else if (field.type === 'input') {
            if (!syn.template.includes(`{{${field.id}}}`)) return;
            let found = false;

            // วิธี 1: regex (แม่นกว่า สำหรับ template ที่เฉพาะเจาะจง)
            const tplLine = syn.template.split('\n').find((l: string) => l.includes(`{{${field.id}}}`));
            if (tplLine) {
              const nonVarPart = tplLine.replace(/\{\{.*?\}\}/g, '').trim();
              if (nonVarPart.length >= 5) {
                let rx = tplLine.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                rx = rx.replace(/ /g, '\\s+');
                rx = rx.replace(`\\{\\{${field.id}\\}\\}`, '([a-zA-Z0-9_\\-\\./]+)');
                rx = rx.replace(/\\\{\\\{.*?\\\}\\\}/g, '[^\\n]{0,100}');
                const m = fileContent.match(new RegExp(rx, 'i'));
                if (m?.[1]) {
                  const val = m[1].replace(/['"]/g, '').trim();
                  const shellKw = ['if', 'fi', 'then', 'else', 'do', 'done', 'case', 'esac'];
                  if (val.length > 2 && !shellKw.includes(val)) {
                    newValues[field.id] = val;
                    found = true;
                  }
                }
              }
            }

            // วิธี 2: structural extraction (fallback สำหรับ template ที่กว้าง เช่น "- {{lint_cmd}}")
            if (!found) {
              const extracted = extractInputFromYaml(doc, comp, field, syn, detected, compSelectOpts);
              if (extracted) {
                newValues[field.id] = extracted;
              }
            }
          }
        });
      }
    });
  });

  return { detectedSyntax: detected, newValues };
};

// =========================================================
// VALIDATOR
// =========================================================

export function validateYaml(content: string): YamlValidationError[] {
  if (!content?.trim()) return [];
  try {
    yaml.load(content);
    return [];
  } catch (e: any) {
    return [{
      line: (e.mark?.line || 0) + 1,
      column: (e.mark?.column || 0) + 1,
      message: e.message || 'YAML error',
    }];
  }
}