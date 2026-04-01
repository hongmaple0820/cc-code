@echo off
echo Starting Claude Code with Pet Mode...
echo.

REM Enable BUDDY feature flag
set CLAUDE_INTERNAL_FC_OVERRIDES={"BUDDY":true}

REM Start the CLI
bun run ./src/dev-entry.ts

pause
