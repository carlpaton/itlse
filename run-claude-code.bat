@echo off
setlocal

set "LM_STUDIO_EXE=%LOCALAPPDATA%\Programs\LM Studio\LM Studio.exe"
set "CLAUDE_CMD=%APPDATA%\npm\claude.cmd"

if not exist "%LM_STUDIO_EXE%" (
	echo LM Studio not found at "%LM_STUDIO_EXE%".
	pause
	exit /b 1
)

if not exist "%CLAUDE_CMD%" (
	echo Claude Code is not installed.
	echo Run: npm install -g @anthropic-ai/claude-code
	pause
	exit /b 1
)

REM Start LM Studio server
start "" "%LM_STUDIO_EXE%"

REM Wait a few seconds for LM Studio to start
timeout /t 8 /nobreak >nul

REM Set Claude Code environment variables
set "ANTHROPIC_BASE_URL=http://localhost:1234"
set "ANTHROPIC_AUTH_TOKEN=lmstudio"

REM Start Claude Code using your local model
#call "%CLAUDE_CMD%" --model qwen2.5-coder-7b-instruct
#call "%CLAUDE_CMD%" --model gemma-4-e4b
call "%CLAUDE_CMD%" --model gemma-4-e2b

pause