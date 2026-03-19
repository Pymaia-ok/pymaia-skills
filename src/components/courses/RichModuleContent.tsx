import { useMemo, type ReactNode } from "react";
import DOMPurify from "dompurify";
import {
  TryItBlock,
  StepBlock,
  CalloutBlock,
  CopyableCode,
  RevealBlock,
  YouTubeEmbed,
  ImageWithCaption,
} from "./InteractiveBlocks";

interface RichModuleContentProps {
  markdown: string;
}

/**
 * Renders markdown with custom interactive blocks:
 * 
 * :::tryit{title="Try this!"}     → TryItBlock
 * :::step{n=1 title="Do X"}      → StepBlock  
 * :::tip / :::warning / :::info   → CalloutBlock
 * :::reveal{label="Show answer"}  → RevealBlock
 * ```prompt                       → CopyableCode with "prompt" label
 * ![alt](url "caption")          → ImageWithCaption
 * ::youtube{id="xxx"}            → YouTubeEmbed
 */
const RichModuleContent = ({ markdown }: RichModuleContentProps) => {
  const elements = useMemo(() => parseBlocks(markdown), [markdown]);

  return <div className="space-y-0">{elements}</div>;
};

function parseBlocks(md: string): ReactNode[] {
  const lines = md.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // :::tryit block
    const tryitMatch = line.match(/^:::tryit(?:\{(.+?)\})?\s*$/);
    if (tryitMatch) {
      const attrs = parseAttrs(tryitMatch[1]);
      const { content, endIdx } = collectBlock(lines, i + 1);
      elements.push(
        <TryItBlock key={key++} title={attrs.title}>
          <RichModuleContent markdown={content} />
        </TryItBlock>
      );
      i = endIdx + 1;
      continue;
    }

    // :::step block
    const stepMatch = line.match(/^:::step(?:\{(.+?)\})?\s*$/);
    if (stepMatch) {
      const attrs = parseAttrs(stepMatch[1]);
      const { content, endIdx } = collectBlock(lines, i + 1);
      elements.push(
        <StepBlock key={key++} number={parseInt(attrs.n || "1")} title={attrs.title || ""}>
          <RichModuleContent markdown={content} />
        </StepBlock>
      );
      i = endIdx + 1;
      continue;
    }

    // :::tip / :::warning / :::info / :::zap block
    const calloutMatch = line.match(/^:::(tip|warning|info|zap)(?:\{(.+?)\})?\s*$/);
    if (calloutMatch) {
      const type = calloutMatch[1] as "tip" | "warning" | "info" | "zap";
      const attrs = parseAttrs(calloutMatch[2]);
      const { content, endIdx } = collectBlock(lines, i + 1);
      elements.push(
        <CalloutBlock key={key++} type={type} title={attrs.title}>
          <RichModuleContent markdown={content} />
        </CalloutBlock>
      );
      i = endIdx + 1;
      continue;
    }

    // :::reveal block
    const revealMatch = line.match(/^:::reveal(?:\{(.+?)\})?\s*$/);
    if (revealMatch) {
      const attrs = parseAttrs(revealMatch[1]);
      const { content, endIdx } = collectBlock(lines, i + 1);
      elements.push(
        <RevealBlock key={key++} label={attrs.label}>
          <RichModuleContent markdown={content} />
        </RevealBlock>
      );
      i = endIdx + 1;
      continue;
    }

    // Code block with language
    const codeMatch = line.match(/^```(\w*)$/);
    if (codeMatch) {
      const lang = codeMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CopyableCode key={key++} code={codeLines.join("\n")} language={lang} />
      );
      i++; // skip closing ```
      continue;
    }

    // ::youtube{id="xxx" title="yyy"}
    const ytMatch = line.match(/^::youtube\{(.+?)\}\s*$/);
    if (ytMatch) {
      const attrs = parseAttrs(ytMatch[1]);
      if (attrs.id) {
        elements.push(<YouTubeEmbed key={key++} videoId={attrs.id} title={attrs.title} />);
      }
      i++;
      continue;
    }

    // Image: ![alt](url) or ![alt](url "caption")
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]+)")?\)\s*$/);
    if (imgMatch) {
      elements.push(
        <ImageWithCaption key={key++} alt={imgMatch[1]} src={imgMatch[2]} caption={imgMatch[3]} />
      );
      i++;
      continue;
    }

    // Regular markdown lines — collect consecutive prose
    const proseLines: string[] = [];
    while (
      i < lines.length &&
      !lines[i].match(/^:::/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^::youtube/) &&
      !lines[i].match(/^!\[/)
    ) {
      proseLines.push(lines[i]);
      i++;
    }
    if (proseLines.length > 0) {
      const html = proseToHtml(proseLines.join("\n"));
      if (html.trim()) {
        elements.push(
          <div
            key={key++}
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    }
  }

  return elements;
}

function collectBlock(lines: string[], startIdx: number): { content: string; endIdx: number } {
  const collected: string[] = [];
  let depth = 1;
  let i = startIdx;
  while (i < lines.length) {
    if (lines[i].match(/^:::(tryit|step|tip|warning|info|zap|reveal)/)) depth++;
    if (lines[i] === ":::") {
      depth--;
      if (depth === 0) return { content: collected.join("\n"), endIdx: i };
    }
    collected.push(lines[i]);
    i++;
  }
  return { content: collected.join("\n"), endIdx: i };
}

function parseAttrs(raw?: string): Record<string, string> {
  if (!raw) return {};
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*?)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  // Also handle n=1 (without quotes)
  const numRe = /(\w+)=(\d+)/g;
  while ((m = numRe.exec(raw)) !== null) {
    if (!attrs[m[1]]) attrs[m[1]] = m[2];
  }
  return attrs;
}

function proseToHtml(md: string): string {
  let html = md;

  // Fallback: if content has no double newlines but is long, insert paragraph breaks
  if (!html.includes("\n\n") && html.length > 500) {
    // Split at sentence boundaries (". " followed by uppercase letter)
    html = html.replace(/(\.\s)([A-ZÁÉÍÓÚÑÜa])/g, "$1\n\n$2");
  }

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />');

  // Tables: detect blocks of lines starting with |
  html = html.replace(
    /(?:^\|.+\|$\n?)+/gm,
    (match) => {
      const rows = match.trim().split("\n").filter(r => r.trim());
      if (rows.length < 2) return match;
      // Check if second row is separator (|---|---|)
      const isSep = (r: string) => /^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(r.trim());
      let headerEnd = isSep(rows[1]) ? 1 : 0;
      
      let table = '<table class="w-full text-sm border-collapse my-4">';
      
      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map(c => c.trim());
      
      if (headerEnd === 1) {
        const headerCells = parseRow(rows[0]);
        table += "<thead><tr>";
        headerCells.forEach(c => {
          table += `<th class="border border-border px-3 py-2 text-left font-semibold bg-muted/50">${c}</th>`;
        });
        table += "</tr></thead>";
      }
      
      table += "<tbody>";
      for (let r = headerEnd + 1; r < rows.length; r++) {
        if (isSep(rows[r])) continue;
        const cells = parseRow(rows[r]);
        table += "<tr>";
        cells.forEach(c => {
          table += `<td class="border border-border px-3 py-2">${c}</td>`;
        });
        table += "</tr>";
      }
      table += "</tbody></table>";
      return table;
    }
  );

  // Ordered list
  html = html.replace(
    /(?:^\d+\.\s+.+$\n?)+/gm,
    (match) => {
      const items = match.trim().split("\n").map(l => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`).join("");
      return `<ol class="list-decimal list-inside space-y-1 my-3">${items}</ol>`;
    }
  );

  // Unordered list
  html = html.replace(
    /(?:^[-*]\s+.+$\n?)+/gm,
    (match) => {
      const items = match.trim().split("\n").map(l => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("");
      return `<ul class="list-disc list-inside space-y-1 my-3">${items}</ul>`;
    }
  );

  // Paragraphs: wrap non-tag lines
  html = html
    .split("\n\n")
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<")) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

export default RichModuleContent;
