export default {
  'gcc c17': {
    compileCommand: 'gcc -std=c17 -O2 main.c -o main',
    executeCommand: './main.exe'
  },
  'gcc c23': {
    compileCommand: 'gcc -std=c23 -O2 main.c -o main',
    executeCommand: './main.exe'
  },
  'g++ c++17': {
    compileCommand: 'g++ -std=c++17 -O2 main.cpp -o main',
    executeCommand: './main.exe'
  },
  'g++ c++23': {
    compileCommand: 'g++ -std=c++23 -O2 main.cpp -o main',
    executeCommand: './main.exe'
  },
  rust: {
    compileCommand: 'rustc -C opt-level=2 main.rs -o main',
    executeCommand: './main.exe'
  },
  'nodejs': {
    compileCommand: '',
    executeCommand: 'node main.js',
  },
  'python3': {
    compileCommand: '',
    executeCommand: 'python3 main.py',
  },
  'bash': {
    compileCommand: '',
    executeCommand: 'bash main.sh',
  },
};
