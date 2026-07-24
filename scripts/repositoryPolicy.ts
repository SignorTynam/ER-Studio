import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface RepositoryPolicy {
  policyVersion: string;
  canonicalIndex: string;
  permanentBranch: string;
  branch: {
    allowedPrefixes: string[];
    pattern: string;
    releasePattern: string;
  };
  commit: {
    allowedTypes: string[];
    pattern: string;
    subjectMustStartLowercase: boolean;
    forbidFinalPeriod: boolean;
  };
  requiredViewports: Array<{ name: string; width: number; height: number }>;
  requiredLocales: string[];
  minimumVerificationScripts: string[];
  agentDocuments: {
    entrypoints: string[];
    required: string[];
    allowedInstructionFiles: string[];
    requiredTriggers: string[];
  };
  semver: {
    breaking: "major";
    feature: "minor";
    compatible: "patch";
    internalOnly: "none";
    breakingMarkers: string[];
    featureTypes: string[];
    compatibleTypes: string[];
    internalTypes: string[];
  };
  repositoryHygiene: {
    forbiddenTrackedPatterns: string[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);
}

function requireString(record: Record<string, unknown>, key: string, errors: string[], prefix = ""): string | null {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${prefix}${key} must be a non-empty string.`);
    return null;
  }
  return value;
}

function requireStringArray(record: Record<string, unknown>, key: string, errors: string[], prefix = ""): string[] | null {
  const value = record[key];
  if (!stringArray(value)) {
    errors.push(`${prefix}${key} must be a non-empty string array.`);
    return null;
  }
  if (new Set(value).size !== value.length) errors.push(`${prefix}${key} must not contain duplicates.`);
  return value;
}

export function validateRepositoryPolicy(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["repository policy must be a JSON object."];

  const policyVersion = requireString(value, "policyVersion", errors);
  if (policyVersion && !/^\d+\.\d+\.\d+$/.test(policyVersion)) {
    errors.push("policyVersion must use full SemVer.");
  }
  requireString(value, "canonicalIndex", errors);
  requireString(value, "permanentBranch", errors);

  const branch = value.branch;
  if (!isRecord(branch)) {
    errors.push("branch must be an object.");
  } else {
    const prefixes = requireStringArray(branch, "allowedPrefixes", errors, "branch.");
    const pattern = requireString(branch, "pattern", errors, "branch.");
    const releasePattern = requireString(branch, "releasePattern", errors, "branch.");
    for (const [name, source] of [["branch.pattern", pattern], ["branch.releasePattern", releasePattern]] as const) {
      if (source) {
        try {
          new RegExp(source);
        } catch {
          errors.push(`${name} is not a valid regular expression.`);
        }
      }
    }
    if (prefixes && !prefixes.includes("release")) errors.push("branch.allowedPrefixes must include release.");
  }

  const commit = value.commit;
  if (!isRecord(commit)) {
    errors.push("commit must be an object.");
  } else {
    const types = requireStringArray(commit, "allowedTypes", errors, "commit.");
    const pattern = requireString(commit, "pattern", errors, "commit.");
    if (pattern) {
      try {
        const regex = new RegExp(pattern);
        for (const type of types ?? []) {
          if (!regex.test(`${type}: validate repository policy`)) {
            errors.push(`commit.pattern does not accept allowed type "${type}".`);
          }
        }
      } catch {
        errors.push("commit.pattern is not a valid regular expression.");
      }
    }
    if (typeof commit.subjectMustStartLowercase !== "boolean") {
      errors.push("commit.subjectMustStartLowercase must be boolean.");
    }
    if (typeof commit.forbidFinalPeriod !== "boolean") errors.push("commit.forbidFinalPeriod must be boolean.");
  }

  if (!Array.isArray(value.requiredViewports) || value.requiredViewports.length === 0) {
    errors.push("requiredViewports must be a non-empty array.");
  } else {
    value.requiredViewports.forEach((viewport, index) => {
      if (
        !isRecord(viewport) ||
        typeof viewport.name !== "string" ||
        typeof viewport.width !== "number" ||
        viewport.width <= 0 ||
        typeof viewport.height !== "number" ||
        viewport.height <= 0
      ) {
        errors.push(`requiredViewports[${index}] must contain a name and positive width/height.`);
      }
    });
  }

  requireStringArray(value, "requiredLocales", errors);
  requireStringArray(value, "minimumVerificationScripts", errors);

  const documents = value.agentDocuments;
  if (!isRecord(documents)) {
    errors.push("agentDocuments must be an object.");
  } else {
    requireStringArray(documents, "entrypoints", errors, "agentDocuments.");
    requireStringArray(documents, "required", errors, "agentDocuments.");
    requireStringArray(documents, "allowedInstructionFiles", errors, "agentDocuments.");
    requireStringArray(documents, "requiredTriggers", errors, "agentDocuments.");
  }

  const semver = value.semver;
  if (!isRecord(semver)) {
    errors.push("semver must be an object.");
  } else {
    if (semver.breaking !== "major") errors.push('semver.breaking must be "major".');
    if (semver.feature !== "minor") errors.push('semver.feature must be "minor".');
    if (semver.compatible !== "patch") errors.push('semver.compatible must be "patch".');
    if (semver.internalOnly !== "none") errors.push('semver.internalOnly must be "none".');
    requireStringArray(semver, "breakingMarkers", errors, "semver.");
    requireStringArray(semver, "featureTypes", errors, "semver.");
    requireStringArray(semver, "compatibleTypes", errors, "semver.");
    requireStringArray(semver, "internalTypes", errors, "semver.");
  }

  const hygiene = value.repositoryHygiene;
  if (!isRecord(hygiene)) {
    errors.push("repositoryHygiene must be an object.");
  } else {
    requireStringArray(hygiene, "forbiddenTrackedPatterns", errors, "repositoryHygiene.");
  }

  return errors;
}

export function loadRepositoryPolicy(root = process.cwd()): RepositoryPolicy {
  const path = resolve(root, "config/repository-policy.json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path}: invalid or unreadable JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = validateRepositoryPolicy(parsed);
  if (errors.length > 0) throw new Error(`Repository policy is invalid:\n- ${errors.join("\n- ")}`);
  return parsed as RepositoryPolicy;
}
