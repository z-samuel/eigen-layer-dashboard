const { exec } = require('child_process');

// Start the backend
console.log('Starting backend...');
const backend = exec('node dist/main.js');

backend.stdout.on('data', (data) => {
  console.log('Backend output:', data);
});

backend.stderr.on('data', (data) => {
  console.error('Backend error:', data);
});

// Wait for backend to start, then test GraphQL
setTimeout(() => {
  console.log('Testing GraphQL endpoint...');
  
  const { exec: execTest } = require('child_process');
  execTest('curl -s "http://localhost:3001/graphql" -H "Content-Type: application/json" -d \'{"query":"{ health { status timestamp service } }"}\'', (error, stdout, stderr) => {
    if (error) {
      console.error('Test error:', error);
    } else {
      console.log('GraphQL response:', stdout);
    }
    
    // Clean up
    backend.kill();
    process.exit(0);
  });
}, 5000);
