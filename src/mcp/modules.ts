export const ALL_AUVP_MODULES = [
  "financas",
  "analitica",
  "comunidade",
  "carteira",
  "dicionario",
] as const;

export type AuvpModule = (typeof ALL_AUVP_MODULES)[number];

const MODULE_SET = new Set<string>(ALL_AUVP_MODULES);

export function parseAuvpModules(value: string | undefined): AuvpModule[] {
  if (!value?.trim()) {
    return [...ALL_AUVP_MODULES];
  }

  const requested = value
    .split(",")
    .map((moduleName) => moduleName.trim().toLowerCase())
    .filter(Boolean);

  if (requested.length === 0) {
    return [...ALL_AUVP_MODULES];
  }

  const invalid = [...new Set(requested.filter((name) => !MODULE_SET.has(name)))];
  if (invalid.length > 0) {
    throw new Error(
      `Módulos AUVP desconhecidos: ${invalid.join(", ")}. Valores aceitos: ${ALL_AUVP_MODULES.join(", ")}.`,
    );
  }

  const selected = new Set(requested as AuvpModule[]);
  return ALL_AUVP_MODULES.filter((moduleName) => selected.has(moduleName));
}

export function getModulesFlagValue(args: readonly string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--modules") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `--modules exige uma lista separada por vírgulas. Valores aceitos: ${ALL_AUVP_MODULES.join(", ")}.`,
        );
      }
      return value;
    }

    if (arg?.startsWith("--modules=")) {
      return arg.slice("--modules=".length);
    }
  }

  return undefined;
}

export function resolveEnabledModules(
  args: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): AuvpModule[] {
  const flagValue = getModulesFlagValue(args);
  return parseAuvpModules(flagValue ?? env.AUVP_MODULES);
}

