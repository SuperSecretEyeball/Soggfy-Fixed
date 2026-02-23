const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const ts = require('typescript');

function loadTsModule(filePath, cache = new Map()) {
  const abs = path.resolve(filePath);
  if (cache.has(abs)) return cache.get(abs).exports;

  const source = fs.readFileSync(abs, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: abs,
  }).outputText;

  const module = { exports: {} };
  cache.set(abs, module);

  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const next = path.resolve(path.dirname(abs), specifier + (specifier.endsWith('.ts') ? '' : '.ts'));
      return loadTsModule(next, cache);
    }
    return require(specifier);
  };

  const context = vm.createContext({
    module,
    exports: module.exports,
    require: localRequire,
    __filename: abs,
    __dirname: path.dirname(abs),
    console,
  });

  new vm.Script(compiled, { filename: abs }).runInContext(context);
  return module.exports;
}

const { parseSpicyLyricsPayload } = loadTsModule(path.join(__dirname, '..', 'src', 'lyrics-utils.ts'));

const syllable = parseSpicyLyricsPayload({
  Type: 'Syllable',
  Content: [{
    Lead: {
      StartTime: 1000,
      EndTime: 3000,
      Syllables: [
        { Text: 'Hel', StartTime: 1000, EndTime: 1400 },
        { Text: 'lo', StartTime: 1400, EndTime: 1800 },
      ],
    },
  }],
});
assert.equal(syllable.type, 'Syllable');
assert.equal(syllable.isSynced, true);
assert.equal(syllable.lines[0].syllables.length, 2);
assert.ok(syllable.text.includes('[00:01.00]<00:01.00>Hel<00:01.40>lo'));

const line = parseSpicyLyricsPayload({
  Type: 'Line',
  Content: [{ Text: 'line one', StartTime: 5000, EndTime: 7000 }],
});
assert.equal(line.type, 'Line');
assert.equal(line.isSynced, true);
assert.ok(line.text.startsWith('[00:05.00]line one'));

const stat = parseSpicyLyricsPayload({
  Type: 'Static',
  Lines: [{ Text: 'plain' }, { Text: 'text' }],
});
assert.equal(stat.type, 'Static');
assert.equal(stat.isSynced, false);
assert.equal(stat.text, 'plain\ntext\n');

const malformed = parseSpicyLyricsPayload({ Type: 'Other' });
assert.equal(malformed, null);

console.log('lyrics-utils tests passed');
