#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/kanji.js'), 'utf8'), context, { filename: 'js/kanji.js' });

const clean = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const cell = (value) => {
  // admin.html intentionally uses a lightweight comma parser without quoted
  // fields, so keep generated templates compatible by using a visual separator.
  return clean(value).replace(/\s*,\s*/g, ' / ');
};
const encodeParts = (parts) => (parts || []).map((part) =>
  [part.text, part.reading, part.romaji, part.meaning, part.role || 'support'].map(cell).join('~')).join('|');

const db = context.KANJI_DB;
const kanjiRows = Object.entries(db.KANJI).map(([key, info]) => [
  key, info.char, info.meaning, (info.on || []).join('; '), (info.kun || []).join('; '), info.monId, info.jlpt || 'BONUS',
].map(cell).join(','));
const questionRows = db.QUESTIONS.map((question) => [
  question.word, question.mean, question.target, question.answer, question.romaji, question.type,
  question.wordReading || '', question.wordRomaji || '', encodeParts(question.parts),
].map(cell).join(','));

fs.writeFileSync(path.join(root, 'data/kanji-template.csv'), `key,char,meaning,on,kun,monId,jlpt\n${kanjiRows.join('\n')}\n`);
fs.writeFileSync(path.join(root, 'data/questions-template.csv'), `word,mean,target,answer,romaji,type,wordReading,wordRomaji,parts\n${questionRows.join('\n')}\n`);
console.log(`Synced ${kanjiRows.length} Kanji and ${questionRows.length} questions.`);
