import { execSync } from 'child_process';

export const killPort = (port = 5000) => {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne ${process.pid} -and $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore', timeout: 5000 }
      );
    } else {
      execSync(`lsof -ti:${port} | grep -v "^${process.pid}$" | xargs -r kill -9`, { stdio: 'ignore', timeout: 5000 });
    }
    console.log(`[SHADO] Port ${port} is ready.`);
  } catch (e) {
    // Port was already free or no process found
  }
};

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('cleanPort.js') || process.argv[1].includes('cleanPort'));

if (isDirectExecution) {
  killPort(5000);
}
