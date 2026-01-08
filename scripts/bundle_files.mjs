#!/usr/bin/env node
/**
 * Bundle files into a single text file for review.
 * 
 * Usage:
 *   node bundle_files.mjs --out <path> --root <path> --paths-file <file> [options]
 * 
 * Options:
 *   --out <path>              Output file path (required)
 *   --root <path>             Root directory for path validation (required)
 *   --paths-file <file>       File containing paths to bundle, one per line (required)
 *   --max-file-bytes <num>    Maximum file size in bytes (default: 524288 = 512KB)
 *   --max-total-bytes <num>   Maximum total bundle size in bytes (default: 3145728 = 3MB)
 *   --deny <list>             Comma-separated list of basenames to deny (e.g., ".env,.env.local")
 */

import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { resolve, relative, join, basename, dirname as pathDirname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default deny list for .env files (always applied)
const DEFAULT_DENY_LIST = ['.env', '.env.local', '.env.production', '.env.development', '.env.test'];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    out: null,
    root: null,
    pathsFile: null,
    maxFileBytes: 524288, // 512KB
    maxTotalBytes: 3145728, // 3MB
    deny: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--out' && i + 1 < args.length) {
      config.out = args[++i];
    } else if (arg === '--root' && i + 1 < args.length) {
      config.root = args[++i];
    } else if (arg === '--paths-file' && i + 1 < args.length) {
      config.pathsFile = args[++i];
    } else if (arg === '--max-file-bytes' && i + 1 < args.length) {
      config.maxFileBytes = parseInt(args[++i], 10);
    } else if (arg === '--max-total-bytes' && i + 1 < args.length) {
      config.maxTotalBytes = parseInt(args[++i], 10);
    } else if (arg === '--deny' && i + 1 < args.length) {
      config.deny = args[++i].split(',').map(s => s.trim()).filter(s => s);
    }
  }

  // Validate required args
  if (!config.out || !config.root || !config.pathsFile) {
    console.error('Error: --out, --root, and --paths-file are required');
    process.exit(1);
  }

  // Merge default deny list with user-provided deny list
  config.deny = Array.from(new Set([...DEFAULT_DENY_LIST, ...config.deny]));

  // Resolve paths
  config.out = resolve(config.out);
  config.root = resolve(config.root);
  config.pathsFile = resolve(config.pathsFile);

  return config;
}

// Check if file is binary (contains NUL byte)
function isBinary(filePath) {
  try {
    const content = readFileSync(filePath);
    return content.includes(0);
  } catch (err) {
    return true; // Treat errors as binary to skip
  }
}

// Read paths from file
function readPathsFile(pathsFile) {
  if (!existsSync(pathsFile)) {
    console.error(`Error: Paths file does not exist: ${pathsFile}`);
    process.exit(1);
  }

  const content = readFileSync(pathsFile, 'utf-8');
  const lines = content.split('\n');
  const paths = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (trimmed && !trimmed.startsWith('#')) {
      paths.push(trimmed);
    }
  }

  return paths;
}

// Process files and generate bundle
function bundleFiles(config) {
  const paths = readPathsFile(config.pathsFile);
  const included = [];
  const skipped = [];
  let totalBytes = 0;
  const sections = [];

  // Header
  const header = {
    generatedAt: new Date().toISOString(),
    root: config.root,
    limits: {
      maxFileBytes: config.maxFileBytes,
      maxTotalBytes: config.maxTotalBytes
    },
    denyList: config.deny
  };

  for (const filePath of paths) {
    const resolvedPath = resolve(filePath);
    const relativePath = relative(config.root, resolvedPath);
    const fileName = basename(resolvedPath);

    // Check if path is inside root
    if (relativePath.startsWith('..') || relativePath === filePath) {
      skipped.push({
        path: filePath,
        reason: 'outside root directory'
      });
      continue;
    }

    // Check deny list (exact match or prefix match for .env files)
    const isDenied = config.deny.includes(fileName) || 
                     (fileName.startsWith('.env') && (fileName === '.env' || fileName.startsWith('.env.')));
    if (isDenied) {
      skipped.push({
        path: filePath,
        reason: `denied by basename: ${fileName}`
      });
      continue;
    }

    // Check if file exists
    if (!existsSync(resolvedPath)) {
      skipped.push({
        path: filePath,
        reason: 'file does not exist'
      });
      continue;
    }

    // Check if it's a file (not directory)
    let stats;
    try {
      stats = statSync(resolvedPath);
    } catch (err) {
      skipped.push({
        path: filePath,
        reason: `cannot stat: ${err.message}`
      });
      continue;
    }

    if (!stats.isFile()) {
      skipped.push({
        path: filePath,
        reason: 'not a regular file'
      });
      continue;
    }

    // Check file size
    if (stats.size > config.maxFileBytes) {
      skipped.push({
        path: filePath,
        reason: `file too large: ${stats.size} bytes (max: ${config.maxFileBytes})`
      });
      continue;
    }

    // Check if binary
    if (isBinary(resolvedPath)) {
      skipped.push({
        path: filePath,
        reason: 'binary file (contains NUL byte)'
      });
      continue;
    }

    // Check total size
    if (totalBytes + stats.size > config.maxTotalBytes) {
      skipped.push({
        path: filePath,
        reason: `would exceed total size limit (current: ${totalBytes}, file: ${stats.size}, max: ${config.maxTotalBytes})`
      });
      continue;
    }

    // Read file content
    let content;
    try {
      content = readFileSync(resolvedPath, 'utf-8');
    } catch (err) {
      skipped.push({
        path: filePath,
        reason: `cannot read: ${err.message}`
      });
      continue;
    }

    // Add to bundle
    included.push({
      path: filePath,
      relativePath: relativePath,
      size: stats.size,
      mtime: stats.mtime.toISOString()
    });

    sections.push({
      path: filePath,
      relativePath: relativePath,
      mtime: stats.mtime.toISOString(),
      bytes: stats.size,
      content: content
    });

    totalBytes += stats.size;
  }

  // Generate output
  const lines = [];
  
  // Header
  lines.push('='.repeat(80));
  lines.push('REVIEW BUNDLE');
  lines.push('='.repeat(80));
  lines.push(`Generated at: ${header.generatedAt}`);
  lines.push(`Root: ${header.root}`);
  lines.push(`Max file size: ${header.limits.maxFileBytes} bytes`);
  lines.push(`Max total size: ${header.limits.maxTotalBytes} bytes`);
  lines.push(`Deny list: ${header.denyList.length > 0 ? header.denyList.join(', ') : '(none)'}`);
  lines.push('');
  lines.push('='.repeat(80));
  lines.push('');

  // File sections
  for (const section of sections) {
    lines.push('─'.repeat(80));
    lines.push(`FILE: ${section.relativePath}`);
    lines.push(`Path: ${section.path}`);
    lines.push(`Modified: ${section.mtime}`);
    lines.push(`Size: ${section.bytes} bytes`);
    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  // Manifest
  lines.push('='.repeat(80));
  lines.push('MANIFEST');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Total files included: ${included.length}`);
  lines.push(`Total files skipped: ${skipped.length}`);
  lines.push(`Total bundle size: ${totalBytes} bytes`);
  lines.push('');

  if (included.length > 0) {
    lines.push('INCLUDED FILES:');
    for (const item of included) {
      lines.push(`  ${item.relativePath} (${item.size} bytes, mtime: ${item.mtime})`);
    }
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('SKIPPED FILES:');
    for (const item of skipped) {
      lines.push(`  ${item.path}`);
      lines.push(`    Reason: ${item.reason}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(80));

  // Write output (ensure parent directory exists)
  const output = lines.join('\n');
  const outDir = pathDirname(config.out);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  writeFileSync(config.out, output, 'utf-8');

  // Print summary to stderr (so stdout can be used for other purposes)
  console.error(`Bundled ${included.length} file(s), skipped ${skipped.length} file(s), total size: ${totalBytes} bytes`);
  console.error(`Output written to: ${config.out}`);
}

// Main
try {
  const config = parseArgs();
  bundleFiles(config);
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}

