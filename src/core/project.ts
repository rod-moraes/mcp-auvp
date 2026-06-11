/** Metadados do pacote MCP (espelham package.json / README). */
export const MCP_GITHUB_REPOSITORY = "https://github.com/rod-moraes/mcp-auvp";
export const MCP_GITHUB_NPX_SPEC = "github:rod-moraes/mcp-auvp";
export const MCP_PACKAGE_NAME = "mcp-auvp-financas";
export const MCP_PACKAGE_VERSION = "0.1.0";

export function getMcpProjectInfo(): {
  name: string;
  version: string;
  repository: string;
  npxInstall: string;
} {
  return {
    name: MCP_PACKAGE_NAME,
    version: MCP_PACKAGE_VERSION,
    repository: MCP_GITHUB_REPOSITORY,
    npxInstall: MCP_GITHUB_NPX_SPEC,
  };
}
