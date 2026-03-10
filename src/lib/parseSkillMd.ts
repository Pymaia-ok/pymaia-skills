export interface ParsedSkillMd {
  prerequisites: string[];
  tools: { name: string; description: string }[];
  workflows: { title: string; steps: string[] }[];
  pitfalls: string[];
  quickReference: { key: string; value: string }[];
  rawSections: { title: string; content: string }[];
}

const SECTION_REGEX = /^#{1,3}\s+(.+)$/gm;

function extractSection(md: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `^#{1,3}\\s+${escapedHeading}[\\s\\S]*?\\n([\\s\\S]*?)(?=^#{1,3}\\s|$)`,
    "mi"
  );
  const match = regex.exec(md);
  return match ? match[1].trim() : "";
}

function extractListItems(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

function extractTools(content: string): { name: string; description: string }[] {
  const tools: { name: string; description: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    // Pattern: - **tool_name**: description
    const m = line.match(/^\s*[-*]\s+\*\*([^*]+)\*\*[:\s-]*(.*)$/);
    if (m) {
      tools.push({ name: m[1].trim(), description: m[2].trim() });
      continue;
    }
    // Pattern: - `tool_name` — description
    const m2 = line.match(/^\s*[-*]\s+`([^`]+)`[:\s—-]*(.*)$/);
    if (m2) {
      tools.push({ name: m2[1].trim(), description: m2[2].trim() });
    }
  }
  return tools;
}

function extractWorkflows(content: string): { title: string; steps: string[] }[] {
  const workflows: { title: string; steps: string[] }[] = [];
  // Split by sub-headings or numbered items
  const blocks = content.split(/^#{3,4}\s+/m).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    const title = lines[0]?.trim() || "";
    const steps = lines
      .slice(1)
      .filter((l) => /^\s*\d+\.\s+/.test(l) || /^\s*[-*]\s+/.test(l))
      .map((l) => l.replace(/^\s*(\d+\.\s+|[-*]\s+)/, "").trim())
      .filter(Boolean);
    if (title && steps.length > 0) {
      workflows.push({ title, steps });
    }
  }
  return workflows;
}

function extractQuickReference(content: string): { key: string; value: string }[] {
  const refs: { key: string; value: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    // Table row: | key | value |
    const m = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$/);
    if (m && !m[1].includes("---")) {
      refs.push({ key: m[1].trim(), value: m[2].trim() });
    }
  }
  return refs;
}

export function parseSkillMd(markdown: string): ParsedSkillMd {
  if (!markdown || markdown.length < 10) {
    return { prerequisites: [], tools: [], workflows: [], pitfalls: [], quickReference: [], rawSections: [] };
  }

  const prereqContent =
    extractSection(markdown, "Prerequisites") ||
    extractSection(markdown, "Requirements") ||
    extractSection(markdown, "Setup") ||
    extractSection(markdown, "Requisitos");

  const toolsContent =
    extractSection(markdown, "Tools") ||
    extractSection(markdown, "Available Tools") ||
    extractSection(markdown, "Herramientas");

  const workflowContent =
    extractSection(markdown, "Workflows") ||
    extractSection(markdown, "Common Patterns") ||
    extractSection(markdown, "Usage") ||
    extractSection(markdown, "Examples");

  const pitfallsContent =
    extractSection(markdown, "Known Pitfalls") ||
    extractSection(markdown, "Pitfalls") ||
    extractSection(markdown, "Warnings") ||
    extractSection(markdown, "Caveats") ||
    extractSection(markdown, "Limitations");

  const quickRefContent =
    extractSection(markdown, "Quick Reference") ||
    extractSection(markdown, "Reference") ||
    extractSection(markdown, "Cheat Sheet");

  // Extract all sections for raw display
  const rawSections: { title: string; content: string }[] = [];
  let match: RegExpExecArray | null;
  const sectionRegex = /^(#{1,3})\s+(.+)$/gm;
  const sectionStarts: { title: string; level: number; start: number }[] = [];
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sectionStarts.push({
      title: match[2].trim(),
      level: match[1].length,
      start: match.index + match[0].length,
    });
  }
  for (let i = 0; i < sectionStarts.length; i++) {
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].start - (sectionStarts[i + 1].title.length + sectionStarts[i + 1].level + 2) : markdown.length;
    const content = markdown.slice(sectionStarts[i].start, end).trim();
    if (content.length > 5) {
      rawSections.push({ title: sectionStarts[i].title, content });
    }
  }

  return {
    prerequisites: extractListItems(prereqContent),
    tools: extractTools(toolsContent),
    workflows: extractWorkflows(workflowContent),
    pitfalls: extractListItems(pitfallsContent),
    quickReference: extractQuickReference(quickRefContent),
    rawSections,
  };
}
