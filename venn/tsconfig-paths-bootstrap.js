// Файл для регистрации путей алиасов для ts-node
const tsconfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = './'; // корневая директория проекта
const cleanup = tsConfigPaths.register({
  baseUrl,
  paths: tsconfig.compilerOptions.paths
});

// Если нужно, в будущем можно вызвать cleanup() для отмены регистрации
