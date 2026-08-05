const { exec } = require('child_process');
const path = require('path');

console.log('Starting Browser AI Bridge Dashboard...');
console.log('');

// Start the API server
const apiProcess = exec('npm run dev -w @bab/cli', {
  cwd: path.join(__dirname, '..'),
});

apiProcess.stdout?.on('data', (data) => {
  console.log('[API]', data.toString().trim());
});

apiProcess.stderr?.on('data', (data) => {
  console.error('[API Error]', data.toString().trim());
});

// Wait a bit for API to start, then start dashboard
setTimeout(() => {
  const dashboardProcess = exec('npm run dev -w @bab/dashboard', {
    cwd: path.join(__dirname, '..'),
  });

  dashboardProcess.stdout?.on('data', (data) => {
    console.log('[Dashboard]', data.toString().trim());
  });

  dashboardProcess.stderr?.on('data', (data) => {
    console.error('[Dashboard Error]', data.toString().trim());
  });

  console.log('');
  console.log('Dashboard: http://localhost:5173');
  console.log('API: http://localhost:3000');
  console.log('');
  console.log('Press Ctrl+C to stop');
}, 2000);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  apiProcess.kill();
  process.exit(0);
});
