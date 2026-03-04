// packages/lib/pipelineEngine.ts

import yaml from 'js-yaml';
import type { ComponentCategory, ComponentValues } from '../types/pipeline';

// =========================================================
// 1. GENERATOR: UI -> Code (Smart Merge Engine 🧠)
// =========================================================
export const generateYamlFromValues = (categories: ComponentCategory[], values: ComponentValues, targetSyntax: string, currentYaml: string) => {
  if (!categories || categories.length === 0) return currentYaml;

  const allContext: Record<string, string | number | boolean | string[] | undefined> = {};

  categories.forEach(cat => {
    cat.components.forEach((comp) => {
      comp.uiConfig?.fields?.forEach((field) => {
        let val = field.defaultValue;
        if (field.platformDefaults && field.platformDefaults[targetSyntax]) {
          val = field.platformDefaults[targetSyntax];
        }
        if (val !== undefined) allContext[field.id] = val;
      });
    });
  });

  Object.keys(values).forEach(key => {
    const val = values[key];
    if (typeof val === 'boolean') {
      allContext[key] = val;
    } else if (val !== "" && val !== null && val !== undefined) {
      allContext[key] = val;
    }
  });

  try {
    if (currentYaml && currentYaml.trim() && !currentYaml.startsWith("# Error")) {
      const doc = yaml.load(currentYaml) as any;
      
      if (doc && typeof doc === 'object') {
        
        if (targetSyntax === 'github') {
          if (allContext['pipeline_name']) doc.name = allContext['pipeline_name'];

          if (!doc.on) doc.on = {};
          if (typeof doc.on === 'string') doc.on = { [doc.on]: null };
          else if (Array.isArray(doc.on)) {
            const newOn: any = {};
            doc.on.forEach((e: string) => newOn[e] = null);
            doc.on = newOn;
          }

          if (allContext['enable_push']) {
            doc.on.push = doc.on.push || {};
            doc.on.push.branches = allContext['push_branches'] || ['main'];
          } else { delete doc.on.push; }

          if (allContext['enable_pr']) {
            doc.on.pull_request = doc.on.pull_request || {};
            doc.on.pull_request.branches = allContext['pr_branches'] || ['main'];
          } else { delete doc.on.pull_request; }

          if (allContext['enable_schedule'] && allContext['cron_expression']) {
            doc.on.schedule = [{ cron: String(allContext['cron_expression']).trim() }];
          } else { delete doc.on.schedule; }

          if (doc.jobs) {
            const jobKeys = Object.keys(doc.jobs);
            if (jobKeys.length > 0) {
              const targetJob = doc.jobs[jobKeys[0]];
              if (!targetJob.steps) targetJob.steps = [];

              categories.forEach(cat => {
                cat.components.forEach(comp => {
                  if (comp.name.includes("Trigger") || comp.name.includes("Project Info") || comp.name.includes("General Settings") || comp.name.includes("System & Runner")) return;

                  const switchField = comp.uiConfig?.fields?.find(f => f.type === 'switch');
                  const isActive = comp.type === 'group' ? (switchField ? allContext[switchField.id] === true : true) : allContext[comp.id] === true;

                  const syntax = comp.syntaxes?.find(s => s.platform === 'github');
                  if (!syntax || !syntax.template) return;

                  // 🟢 อัปเกรด: หาว่าสเตปนี้อยู่ตรงไหนในโค้ดผู้ใช้ โดยกวาดหาเป็น "บล็อก" (Block)
                  let tplAstRaw: any[] = [];
                  try {
                    tplAstRaw = yaml.load(syntax.template) as any[];
                  } catch(e) {}

                  let startIndex = -1;
                  let deleteCount = 0;

                  if (Array.isArray(tplAstRaw)) {
                    for (let i = 0; i < targetJob.steps.length; i++) {
                      const userStep = targetJob.steps[i];
                      const isMatch = tplAstRaw.some((tplStep: any) => {
                        // เช็กด้วย uses (แม่นสุด) หรือ name ตรงเป๊ะ
                        if (tplStep.uses && userStep.uses && userStep.uses.split('@')[0] === tplStep.uses.split('@')[0]) return true;
                        if (tplStep.name && userStep.name && userStep.name === tplStep.name) return true;
                        return false;
                      });

                      if (isMatch) {
                        if (startIndex === -1) {
                          startIndex = i; // เจอสเตปแรกของบล็อกแล้ว!
                          deleteCount = 1;
                        } else if (i === startIndex + deleteCount) {
                          deleteCount++; // ถ้าติดกันก็นับรวบยอดไปเลย (เช่น เจอ Setup Node แล้วต่อด้วย Install)
                        }
                      }
                    }
                  }

                  if (isActive) {
                    let template = syntax.template.replace(/{{([^}]+)}}/g, (match: string, variableName: string) => {
                      const val = allContext[variableName];
                      return val !== undefined ? String(val) : match;
                    });

                    const parsedSteps = yaml.load(template) as any[];
                    if (parsedSteps && parsedSteps.length > 0) {
                      if (startIndex >= 0) {
                        // 🔥 แทนที่บล็อกเดิมทั้งหมดด้วยบล็อกใหม่
                        targetJob.steps.splice(startIndex, deleteCount, ...parsedSteps);
                      } else {
                        // ถ้าไม่เคยมีเลย ถึงจะเอาไปต่อท้ายสุด
                        targetJob.steps.push(...parsedSteps);
                      }
                    }
                  } else {
                    if (startIndex >= 0) {
                      // 🔥 ถ้าผู้ใช้ปิดสวิตช์ ให้ลบเกลี้ยงทั้งบล็อก
                      targetJob.steps.splice(startIndex, deleteCount);
                    }
                  }
                });
              });
            }
          }
          return yaml.dump(doc, { lineWidth: -1, noRefs: true });

        } else {
          // GitLab Merge
          if (!doc.workflow) doc.workflow = {};
          doc.workflow.rules = [];
          const pushBranches: string[] = Array.isArray(allContext['push_branches']) ? allContext['push_branches'] : ['main'];
          const prBranches: string[] = Array.isArray(allContext['pr_branches']) ? allContext['pr_branches'] : ['main'];

          if (allContext['enable_push']) pushBranches.forEach(b => doc.workflow.rules.push({ if: `$CI_COMMIT_BRANCH == "${b}"` }));
          if (allContext['enable_pr']) prBranches.forEach(b => doc.workflow.rules.push({ if: `$CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "${b}"` }));
          if (doc.workflow.rules.length === 0) doc.workflow.rules.push({ when: 'manual' });

          if (allContext['use_include'] && Array.isArray(allContext['include_paths']) && allContext['include_paths'].length > 0) {
            doc.include = allContext['include_paths'].map((p: string) => ({ local: p }));
          } else { delete doc.include; }

          categories.forEach(cat => {
            cat.components.forEach(comp => {
              if (comp.name.includes("Trigger") || comp.name.includes("Project Info") || comp.name.includes("General Settings") || comp.name.includes("System & Runner")) return;

              const switchField = comp.uiConfig?.fields?.find(f => f.type === 'switch');
              const isActive = comp.type === 'group' ? (switchField ? allContext[switchField.id] === true : true) : allContext[comp.id] === true;

              const syntax = comp.syntaxes?.find(s => s.platform === 'gitlab');
              if (!syntax || !syntax.template) return;

              let template = syntax.template.replace(/{{([^}]+)}}/g, (match: string, variableName: string) => {
                const val = allContext[variableName];
                return val !== undefined ? String(val) : match;
              });

              try {
                const parsedJob = yaml.load(template) as Record<string, any>;
                if (!parsedJob) return;
                const jobKeys = Object.keys(parsedJob);

                if (isActive) {
                  jobKeys.forEach(k => doc[k] = parsedJob[k]);
                } else {
                  jobKeys.forEach(k => delete doc[k]);
                }
              } catch(e) {}
            });
          });

          return yaml.dump(doc, { lineWidth: -1, noRefs: true });
        }
      }
    }
  } catch (e) {
    console.warn("Smart merge failed, falling back to scratch generation");
  }

  // Fallback Generation
  const pipelineName = allContext['pipeline_name'] || "My-Pipeline";
  const runnerOS = allContext['runner_os'] || "ubuntu-latest";
  const checkoutVer = allContext['checkout_ver'] || "v4";

  let baseYaml = targetSyntax === 'github' 
    ? `name: ${pipelineName}\non:\n{{TRIGGER_BLOCK}}\njobs:\n  build-and-deploy:\n    runs-on: ${runnerOS}\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@${checkoutVer}`
    : `# Pipeline: ${pipelineName}\nworkflow:\n  rules:\n{{TRIGGER_BLOCK}}\ncache:\n  key: "$CI_COMMIT_REF_SLUG"\n  paths:\n    - node_modules/\n  policy: pull-push\n\nstages:\n  - setup\n  - test\n  - build\n  - deploy\n`;

  let triggerBlock = "";
  if (targetSyntax === 'github') {
    if (allContext['enable_push']) triggerBlock += `  push:\n    branches: ${JSON.stringify(allContext['push_branches'] || ['main'])}\n`;
    if (allContext['enable_pr']) triggerBlock += `  pull_request:\n    branches: ${JSON.stringify(allContext['pr_branches'] || ['main'])}\n`;
    if (allContext['enable_schedule'] && allContext['cron_expression']) {
      const cron = String(allContext['cron_expression']).trim();
      if (cron) triggerBlock += `  schedule:\n  - cron: '${cron}'\n`;
    }
    if (!triggerBlock) triggerBlock = "  workflow_dispatch:";
  } else {
    const pushBranches: string[] = Array.isArray(allContext['push_branches']) ? allContext['push_branches'] : ['main'];
    const prBranches: string[] = Array.isArray(allContext['pr_branches']) ? allContext['pr_branches'] : ['main'];
    if (allContext['enable_push']) pushBranches.forEach((b) => triggerBlock += `    - if: $CI_COMMIT_BRANCH == "${b}"\n`);
    if (allContext['enable_pr']) prBranches.forEach((b) => triggerBlock += `    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "${b}"\n`);
    if (!triggerBlock) triggerBlock = "    - when: manual";
  }

  baseYaml = baseYaml.replace("{{TRIGGER_BLOCK}}", triggerBlock);

  let additionalCode = "";
  categories.forEach(cat => {
    cat.components.forEach((comp) => {
      if (comp.name.includes("Trigger") || comp.name.includes("Project Info") || comp.name.includes("General Settings") || comp.name.includes("System & Runner")) return;

      const switchField = comp.uiConfig?.fields?.find((f) => f.type === 'switch');
      let isActive = comp.type === 'group' ? (switchField ? allContext[switchField.id] === true : true) : allContext[comp.id] === true;

      if (isActive && comp.syntaxes) {
        const syntax = comp.syntaxes.find((s) => s.platform === targetSyntax);
        if (syntax && syntax.template) {
          let template = syntax.template.replace(/{{([^}]+)}}/g, (match: string, variableName: string) => {
            const val = allContext[variableName];
            if (val !== undefined) {
              if (Array.isArray(val) && variableName === 'include_paths') {
                return val.length === 0 ? '' : val.map(p => `\n  - local: '${p}'`).join('');
              }
              return String(val);
            }
            return match;
          });
          if (template.trim() !== 'include:') additionalCode += "\n" + template;
        }
      }
    });
  });

  return baseYaml + additionalCode;
};

// =========================================================
// 2. PARSER: Code -> UI (AST Recursive Diffing 🧠)
// =========================================================

const extractVarsFromAST = (templateObj: any, actualObj: any): Record<string, string> => {
  let extracted: Record<string, string> = {};
  
  if (typeof templateObj === 'string' && actualObj !== undefined && actualObj !== null) {
    const strActual = String(actualObj);
    const regexVar = /{{(.*?)}}/g;
    const varNames: string[] = [];
    let m;
    while ((m = regexVar.exec(templateObj)) !== null) varNames.push(m[1]);

    if (varNames.length > 0) {
      let pattern = templateObj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      varNames.forEach(v => { pattern = pattern.replace(`\\{\\{${v}\\}\\}`, '(.*)'); });
      
      const match = strActual.match(new RegExp(`^${pattern}$`));
      if (match) {
        varNames.forEach((v, i) => { extracted[v] = match[i + 1]; });
      }
    }
  } else if (Array.isArray(templateObj) && Array.isArray(actualObj)) {
    for (let i = 0; i < Math.min(templateObj.length, actualObj.length); i++) {
      extracted = { ...extracted, ...extractVarsFromAST(templateObj[i], actualObj[i]) };
    }
  } else if (typeof templateObj === 'object' && templateObj !== null && typeof actualObj === 'object' && actualObj !== null) {
    for (const k of Object.keys(templateObj)) {
      if (actualObj[k] !== undefined) {
        extracted = { ...extracted, ...extractVarsFromAST(templateObj[k], actualObj[k]) };
      }
    }
  }
  return extracted;
};

export const parseYamlToUI = (fileContent: string, categories: ComponentCategory[], currentSyntax: string) => {
  if (!fileContent || !fileContent.trim()) return { detectedSyntax: currentSyntax, newValues: {} };

  try {
    const doc = yaml.load(fileContent) as Record<string, any>;
    if (!doc || typeof doc !== 'object') return { detectedSyntax: currentSyntax, newValues: {} };

    let detected = currentSyntax;
    if (doc.workflow || doc.stages || (doc.include && !doc.on)) detected = 'gitlab';
    else if (doc.on || doc.jobs) detected = 'github';

    const newValues: ComponentValues = {};

    categories.forEach(cat => {
      cat.components.forEach((comp) => {
        const syntax = comp.syntaxes?.find((s) => s.platform === detected);
        const mainSwitch = comp.uiConfig?.fields?.find((f) => f.type === 'switch');
        
        if (comp.name.includes("Project Info") || comp.name.includes("Trigger") || comp.name.includes("General Settings") || comp.name.includes("System & Runner")) return;

        if (syntax && syntax.template) {
          let isDetected = false;
          let extractedVars: Record<string, string> = {};

          try {
            const tplAst = yaml.load(syntax.template) as any;

            if (detected === 'github' && doc.jobs) {
              const jobKeys = Object.keys(doc.jobs);
              if (jobKeys.length > 0 && Array.isArray(tplAst) && tplAst.length > 0) {
                const userSteps = doc.jobs[jobKeys[0]].steps || [];
                
                tplAst.forEach((tplStep: any) => {
                  const targetStep = userSteps.find((s: any) => {
                    if (tplStep.uses && s.uses && s.uses.startsWith(tplStep.uses.split('@')[0])) return true;
                    if (tplStep.run && s.run && s.run.includes(tplStep.run.split(' ')[0])) return true;
                    if (tplStep.name && s.name === tplStep.name) return true;
                    return false;
                  });

                  if (targetStep) {
                    isDetected = true;
                    extractedVars = { ...extractedVars, ...extractVarsFromAST(tplStep, targetStep) };
                  }
                });
              }
            } else if (detected === 'gitlab' && tplAst && typeof tplAst === 'object') {
              const tplJobName = Object.keys(tplAst)[0];
              if (tplJobName && doc[tplJobName]) {
                isDetected = true;
                extractedVars = extractVarsFromAST(tplAst[tplJobName], doc[tplJobName]); 
              }
            }
          } catch (e) {
            const lines = syntax.template.split('\n');
            const signature = lines.find((l: string) => l.trim().length > 5 && !l.includes('{{'))?.trim();
            if (signature && fileContent.includes(signature)) isDetected = true;
          }

          if (isDetected) {
            if (mainSwitch) newValues[mainSwitch.id] = true;
            
            Object.keys(extractedVars).forEach(k => {
              const field = comp.uiConfig?.fields?.find(f => f.id === k);
              const val = extractedVars[k].replace(/^['"]|['"]$/g, '').trim();
              if (field && field.type === 'select' && field.options) {
                const isValid = field.options.some((o: any) => o.value === val);
                if (isValid) newValues[k] = val;
              } else {
                newValues[k] = val;
              }
            });
          } else {
            if (mainSwitch) newValues[mainSwitch.id] = false;
          }
        }
      });
    });

    if (doc.name) newValues['pipeline_name'] = doc.name;

    if (detected === 'github') {
      const on = doc.on;
      if (on) {
        if (on.push) {
          newValues['enable_push'] = true;
          newValues['push_branches'] = Array.isArray(on.push.branches) ? on.push.branches : [];
        } else { newValues['enable_push'] = false; }

        if (on.pull_request) {
          newValues['enable_pr'] = true;
          newValues['pr_branches'] = Array.isArray(on.pull_request.branches) ? on.pull_request.branches : [];
        } else { newValues['enable_pr'] = false; }

        if (on.schedule && Array.isArray(on.schedule) && on.schedule.length > 0 && on.schedule[0].cron) {
          newValues['enable_schedule'] = true;
          newValues['cron_expression'] = on.schedule[0].cron;
        } else { newValues['enable_schedule'] = false; }
      }
    } else if (detected === 'gitlab') {
      if (doc.include) {
        const incArray = Array.isArray(doc.include) ? doc.include : [doc.include];
        const paths: string[] = [];
        incArray.forEach((inc: any) => {
          if (typeof inc === 'string') paths.push(inc);
          else if (inc && inc.local) paths.push(inc.local);
        });
        if (paths.length > 0) {
          newValues['use_include'] = true;
          newValues['include_paths'] = paths;
        }
      }
      if (doc.workflow && doc.workflow.rules) {
        const pushBranches: string[] = [];
        const prBranches: string[] = [];
        doc.workflow.rules.forEach((r: any) => {
          if (r.if) {
            const pushMatch = r.if.match(/\$CI_COMMIT_BRANCH\s*==\s*["']([^"']+)["']/);
            if (pushMatch && !r.if.includes('merge_request_event')) pushBranches.push(pushMatch[1]);
            const prMatch = r.if.match(/\$CI_MERGE_REQUEST_TARGET_BRANCH_NAME\s*==\s*["']([^"']+)["']/);
            if (prMatch && r.if.includes('merge_request_event')) prBranches.push(prMatch[1]);
          }
        });
        if (pushBranches.length > 0) { newValues['enable_push'] = true; newValues['push_branches'] = pushBranches; }
        if (prBranches.length > 0) { newValues['enable_pr'] = true; newValues['pr_branches'] = prBranches; }
      }
    }

    return { detectedSyntax: detected, newValues };
  } catch (e) {
    return { detectedSyntax: currentSyntax, newValues: {} };
  }
};

export interface YamlValidationError {
  line: number;
  column: number;
  message: string;
}

export function validateYaml(content: string): YamlValidationError[] {
  if (!content || !content.trim()) return [];
  try {
    yaml.load(content);
    return [];
  } catch (e: unknown) {
    const err = e as { mark?: { line?: number; column?: number }; message?: string; reason?: string };
    const line = (err.mark?.line ?? 0) + 1;
    const column = (err.mark?.column ?? 0) + 1;
    const message = err.message || err.reason || "YAML syntax error";
    return [{ line, column, message }];
  }
}