export default {
  'gcc c17': {
    compileCommand: 'gcc -std=c17 main.c -o main',
    executeCommand: './main.exe'
  },
  'gcc c23': {
    compileCommand: 'gcc -std=c23 main.c -o main',
    executeCommand: './main.exe'
  },
  'g++ c++17': {
    compileCommand: 'g++ -std=c++17 main.cpp -o main',
    executeCommand: './main.exe'
  },
  'g++ c++23': {
    compileCommand: 'g++ -std=c++23 main.cpp -o main',
    executeCommand: './main.exe'
  },
  rust: {
    compileCommand: 'rustc main.rs -o main',
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
