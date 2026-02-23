// src/lib/pipelineEngine.ts

import yaml from 'js-yaml';
import type { ComponentCategory, ComponentValues } from '../types/pipeline';

// =========================================================
// 1. GENERATOR: เปลี่ยน UI (Values) ให้กลายเป็น YAML Code
// =========================================================
export const generateYamlFromValues = (categories: ComponentCategory[], values: ComponentValues, targetSyntax: string, currentYaml: string) => {
  if (!categories || categories.length === 0) return currentYaml;

  const allContext: Record<string, string | number | boolean | string[] | undefined> = {};

  // 1. โหลด Default Values ก่อนเสมอ
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

  // 2. 🔥 แก้จุดนี้: เอาค่าจาก UI (values) มาทับเฉพาะ "ตอนที่มันมีค่าจริงๆ" เท่านั้น!
  Object.keys(values).forEach(key => {
    const val = values[key];
    if (typeof val === 'boolean') {
      allContext[key] = val; // Switch (true/false) ให้ทับได้เลย
    } else if (val !== "" && val !== null && val !== undefined) {
      allContext[key] = val; // Input/Dropdown ต้องมีค่า (ไม่ใช่ช่องว่าง) ถึงจะให้ทับ Default
    }
  });

  const pipelineName = allContext['pipeline_name'] || "My-Pipeline";
  const runnerOS = allContext['runner_os'] || "ubuntu-latest";
  const checkoutVer = allContext['checkout_ver'] || "v4";

  let baseYaml = "";
  if (targetSyntax === 'github') {
    baseYaml = `name: ${pipelineName}\non:\n{{TRIGGER_BLOCK}}\njobs:\n  build-and-deploy:\n    runs-on: ${runnerOS}\n    steps:\n      - name: Checkout Code\n        uses: actions/checkout@${checkoutVer}`;
  } else {
    baseYaml = `# Pipeline: ${pipelineName}\nworkflow:\n  rules:\n{{TRIGGER_BLOCK}}\ncache:\n  key: "$CI_COMMIT_REF_SLUG"\n  paths:\n    - node_modules/\n  policy: pull-push\n\nstages:\n  - setup\n  - test\n  - build\n  - deploy\n`;
  }

  let triggerBlock = "";
  if (targetSyntax === 'github') {
    if (allContext['enable_push']) triggerBlock += `  push:\n    branches: ${JSON.stringify(allContext['push_branches'] || ['main'])}\n`;
    if (allContext['enable_pr']) triggerBlock += `  pull_request:\n    branches: ${JSON.stringify(allContext['pr_branches'] || ['main'])}\n`;
    if (!triggerBlock) triggerBlock = "  workflow_dispatch:";
  } else {
    const pushBranches: string[] = Array.isArray(allContext['push_branches']) ? allContext['push_branches'] : ['main'];
    const prBranches: string[] = Array.isArray(allContext['pr_branches']) ? allContext['pr_branches'] : ['main'];
    if (allContext['enable_push']) pushBranches.forEach((b) => triggerBlock += `    - if: $CI_COMMIT_BRANCH == "${b}"\n`);
    if (allContext['enable_pr']) prBranches.forEach((b) => triggerBlock += `    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "${b}"\n`);
    if (!triggerBlock) triggerBlock = "    - when: manual";
  }

  baseYaml = baseYaml.replace("{{TRIGGER_BLOCK}}", triggerBlock);

  let stepsCode = "";
  let jobsCode = "";

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
            return val !== undefined ? String(val) : match;
          });
          targetSyntax === 'github' ? stepsCode += "\n" + template : jobsCode += "\n" + template;
        }
      }
    });
  });

  return targetSyntax === 'github' ? baseYaml + stepsCode : baseYaml + jobsCode;
};

// =========================================================
// 2. PARSER: อ่าน YAML Code กลับมาเป็น UI (Values) แบบอัจฉริยะ 🧠
// =========================================================
export const parseYamlToUI = (fileContent: string, categories: ComponentCategory[], currentSyntax: string) => {
  if (!fileContent || !fileContent.trim()) return { detectedSyntax: currentSyntax, newValues: {} };

  try {
    const doc = yaml.load(fileContent) as Record<string, unknown> | null;
    if (!doc || typeof doc !== 'object') return { detectedSyntax: currentSyntax, newValues: {} };

    let detected = currentSyntax;
    const docAny = doc as Record<string, unknown>;
    if (docAny.workflow || docAny.stages || (docAny.include && !docAny.on)) detected = 'gitlab';
    else if (docAny.on) detected = 'github';

    const newValues: ComponentValues = {};

    categories.forEach(cat => {
      cat.components.forEach((comp) => {
        const syntax = comp.syntaxes?.find((s) => s.platform === detected);
        const mainSwitch = comp.uiConfig?.fields?.find((f) => f.type === 'switch');

        if (syntax && syntax.template) {
          const lines = syntax.template.split('\n');
          const signatureLine = lines.find((l: string) => l.trim().length > 5 && !l.includes('{{') && !l.includes('}}'));
          
          let isDetected = false;
          if (signatureLine && fileContent.includes(signatureLine.trim())) {
            isDetected = true;
          } else if (comp.name.includes("Project Info") && docAny.name) {
            isDetected = true;
          }

          if (isDetected) {
            if (mainSwitch) newValues[mainSwitch.id] = true;

            lines.forEach((templateLine: string) => {
              const regexVar = /{{(.*?)}}/g;
              const varsInLine: string[] = [];
              let m;
              while ((m = regexVar.exec(templateLine)) !== null) {
                varsInLine.push(m[1]);
              }

              if (varsInLine.length > 0) {
                const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let patternStr = escapeRegExp(templateLine.trim());
                
                varsInLine.forEach(v => {
                  const escapedVar = `\\{\\{${v}\\}\\}`;
                  patternStr = patternStr.replace(`'${escapedVar}'`, `['"]?(.*)['"]?`);
                  patternStr = patternStr.replace(`"${escapedVar}"`, `['"]?(.*)['"]?`);
                  patternStr = patternStr.replace(escapedVar, `(.*)`); 
                });

                patternStr = patternStr.replace(/\\ /g, '\\s+');
                const finalRegex = new RegExp(`^\\s*${patternStr}`, 'gm');
                const contentMatches = [...fileContent.matchAll(finalRegex)];

                if (contentMatches.length > 0) {
                  varsInLine.forEach((v, vIdx) => {
                    const field = comp.uiConfig?.fields?.find((f) => f.id === v);
                    let matchedValue = "";

                    for (const match of contentMatches) {
                      if (match[vIdx + 1] !== undefined) {
                        let val = match[vIdx + 1].trim();
                        val = val.replace(/^['"]|['"]$/g, '');

                        if (val === "|" || val === ">" || val === "") continue;

                        if (field && field.type === 'select' && field.options) {
                          // Accept value even if not in options so editor edits sync to form
                          matchedValue = val;
                          break;
                        } else {
                          matchedValue = val;
                          break;
                        }
                      }
                    }

                    if (matchedValue !== "") {
                      // 🔥 แก้บั๊กตรงนี้: ถ้าเคยดึงค่าของตัวแปรนี้ได้แล้ว (จากบรรทัดบน)
                      // ห้ามให้บรรทัดล่างมาเขียนทับเด็ดขาด! (First come, first serve)
                      if (newValues[v] === undefined) {
                        newValues[v] = matchedValue;
                      }
                    }
                  });
                }
              }
            });

            if (comp.name.includes("Project Info") && docAny.name) {
              newValues['pipeline_name'] = String(docAny.name);
            }

          } else {
            if (mainSwitch) newValues[mainSwitch.id] = false;
          }
        } else {
          if (mainSwitch) newValues[mainSwitch.id] = false;
        }
      });
    });

if (detected === 'github') {
      const on = docAny.on as { push?: { branches?: string[] }; pull_request?: { branches?: string[] } } | undefined;
      if (on?.push?.branches) {
        newValues['enable_push'] = true;
        newValues['push_branches'] = on.push.branches;
      } else { newValues['enable_push'] = false; }

      if (on?.pull_request?.branches) {
        newValues['enable_pr'] = true;
        newValues['pr_branches'] = on.pull_request.branches;
      } else { newValues['enable_pr'] = false; }
    }

    return { detectedSyntax: detected, newValues };
  } catch (e) {
    return { detectedSyntax: currentSyntax, newValues: {} };
  }
};

// =========================================================
// 3. VALIDATE: YAML syntax errors for editor error list
// =========================================================
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