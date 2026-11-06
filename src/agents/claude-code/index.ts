import { existsSync } from 'node:fs';
import type { Deps } from '../../application';
import { settingsPath, updateSettingsFile } from './claude-settings-file';
import { CLAUDE_CODE_AGENT_ID, handleClaudeHook } from './hook-handler';
import { installHooks, uninstallHooks } from './settings-hooks';

export interface AgentAdapter {
  readonly id: string;
  install(
    home: string,
    command: string,
    stamp: string,
  ): { backupPath?: string };
  uninstall(home: string, stamp: string): { backupPath?: string };
  handleHook(raw: unknown, deps: Deps): { systemMessage: string } | undefined;
}

export const claudeCodeAgent: AgentAdapter = {
  id: CLAUDE_CODE_AGENT_ID,

  install(home, command, stamp) {
    return updateSettingsFile(
      settingsPath(home),
      (settings) => installHooks(settings, command),
      stamp,
    );
  },

  uninstall(home, stamp) {
    const path = settingsPath(home);

    if (!existsSync(path)) {
      return {};
    }

    return updateSettingsFile(path, uninstallHooks, stamp);
  },

  handleHook(raw, deps) {
    return handleClaudeHook(raw, deps);
  },
};
