export default {
    'gcc c11': {
        compileCommand: 'gcc -std=c11 ./user-solutions/main.c -o ./user-solutions/main',
        executeCommand: './main',
    },
    'g++ c++14': {
        compileCommand: 'g++ -std=c++14 ./user-solutions/main.cpp -o ./user-solutions/main',
        executeCommand: './main',
    },
    'g++ c++17': {
        compileCommand: 'g++ -std=c++17 ./user-solutions/main.cpp -o ./user-solutions/main',
        executeCommand: './main',
    },
    'rust': {
        compileCommand: 'rustc main.rs -o main',
        executeCommand: './main',
    },
    'pseudo': {
        compileCommand: '',
        executeCommand: '/usr/bin/pseudo main.ps'
    }
    // 'nodejs': {
    //     compileCommand: '',
    //     executeCommand: 'node main.js',
    // },
    // 'python3': {
    //     compileCommand: '',
    //     executeCommand: 'python3 main.py',
    // },
    // 'bash': {
    //     compileCommand: '',
    //     executeCommand: 'bash main.sh',
    // },
}