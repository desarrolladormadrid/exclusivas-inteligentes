const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesPhone, phoneCandidates } = require("../src/phone.cjs");
const { isAudioMessage } = require("../src/ingest.cjs");

test("normaliza teléfonos españoles con y sin prefijo", () => {
  assert.equal(matchesPhone("+34 600 123 456", "600123456"), true);
  assert.equal(matchesPhone("600123456", "34600123456"), true);
  assert.equal(phoneCandidates("00 34 600 123 456").includes("34600123456"), true);
});

test("detecta notas de voz y audios de WhatsApp", () => {
  assert.equal(isAudioMessage({ type: "ptt" }), true);
  assert.equal(isAudioMessage({ mimetype: "audio/ogg; codecs=opus" }), true);
  assert.equal(isAudioMessage({ type: "chat", body: "Hola" }), false);
});
