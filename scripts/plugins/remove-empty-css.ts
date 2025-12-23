/**
 * Vite Plugin: Remove Empty CSS
 * 
 * Post-processes the bundled CSS to remove:
 * 1. Rules with no declarations (empty selectors or comment-only)
 * 2. Orphaned file header comments when file had no rules
 * 3. Empty @media blocks
 * 
 * This allows by-css-anchor placeholder files to be completely
 * stripped from the final bundle.
 */

import type { Plugin } from 'vite';
import postcss, { Comment, Node, Rule } from 'postcss';

export function removeEmptyCssPlugin(): Plugin {
  return {
    name: 'remove-empty-css',
    enforce: 'post',
    
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          const source = typeof chunk.source === 'string' 
            ? chunk.source 
            : new TextDecoder().decode(chunk.source);
          
          chunk.source = cleanCss(source);
        }
      }
    }
  };
}

/**
 * Check if a comment is a file header (multi-line doc comment with CSS Anchor)
 */
function isFileHeader(node: Node): node is Comment {
  if (node.type !== 'comment') return false;
  const comment = node as Comment;
  return comment.text.includes('\n') && comment.text.includes('CSS Anchor:');
}

/**
 * Extract anchor name from file header comment
 */
function getHeaderAnchor(comment: Comment): string | null {
  const match = comment.text.match(/CSS Anchor:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Extract anchor from a rule selector
 */
function getRuleAnchor(rule: Rule): string | null {
  const match = rule.selector.match(/data-css-anchor="([^"]+)"/);
  return match ? match[1] : null;
}

function cleanCss(css: string): string {
  const root = postcss.parse(css);
  
  // First pass: remove empty rules (no declarations)
  root.walkRules(rule => {
    const hasDeclarations = rule.nodes?.some(node => node.type === 'decl');
    if (!hasDeclarations) {
      rule.remove();
    }
  });
  
  // Second pass: remove empty at-rules
  root.walkAtRules(atRule => {
    if (atRule.name === 'import' || atRule.name === 'charset') return;
    
    const hasContent = atRule.nodes?.some(node => 
      node.type === 'rule' || node.type === 'atrule' || node.type === 'decl'
    );
    if (!hasContent) {
      atRule.remove();
    }
  });
  
  // Third pass: remove orphaned/mismatched file headers
  const nodes = [...(root.nodes || [])];
  
  for (const node of nodes) {
    if (!isFileHeader(node)) continue;
    
    const headerAnchor = getHeaderAnchor(node);
    if (!headerAnchor) {
      node.remove();
      continue;
    }
    
    // Find the next rule after this header
    let nextRule: Rule | null = null;
    let sibling = node.next();
    while (sibling) {
      if (sibling.type === 'rule') {
        nextRule = sibling;
        break;
      }
      if (isFileHeader(sibling)) {
        // Hit another header, no rules for this one
        break;
      }
      sibling = sibling.next();
    }
    
    // Remove header if no matching rule follows
    if (!nextRule) {
      node.remove();
    } else {
      const ruleAnchor = getRuleAnchor(nextRule);
      if (ruleAnchor !== headerAnchor) {
        node.remove();
      }
    }
  }
  
  // Fourth pass: remove inline comments
  root.walkComments(comment => {
    if (!comment.text.includes('\n')) {
      comment.remove();
    }
  });
  
  return root.toString();
}
