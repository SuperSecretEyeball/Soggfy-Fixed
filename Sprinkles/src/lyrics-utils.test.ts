import { parseSpicyLyricsPayload, isNoLyricsSentinel, getNoLyricsSentinel } from "./lyrics-utils";

function assert(condition: any, message: string) {
    if (!condition) throw Error(message);
}

(function testStaticLyrics() {
    const parsed = parseSpicyLyricsPayload({
        Type: "Static",
        Lines: [
            { Text: "Hello" },
            { Text: "♪" },
            { Text: "World" }
        ]
    });

    assert(parsed.type === "Static", "Expected static type");
    assert(parsed.isSynced === false, "Static lyrics should be unsynced");
    assert(parsed.lines.length === 2, "Static lyrics should drop filler lines");
    assert(parsed.text === "Hello\nWorld\n", "Static lyrics text output mismatch");
})();

(function testLineLyrics() {
    const parsed = parseSpicyLyricsPayload({
        Type: "Line",
        Content: [
            { Text: "Line 1", StartTime: 1234, EndTime: 2000 },
            { Text: "Line 2", StartTime: 61500, EndTime: 63000 }
        ]
    });

    assert(parsed.type === "Line", "Expected line type");
    assert(parsed.isSynced === true, "Line lyrics should be synced");
    assert(parsed.lines[0].startTimeMs === 1234, "Line start time mismatch");
    assert(parsed.text.includes("[00:01.23]Line 1"), "Line LRC timing mismatch");
    assert(parsed.text.includes("[01:01.50]Line 2"), "Line LRC minute conversion mismatch");
})();

(function testSyllableLyrics() {
    const parsed = parseSpicyLyricsPayload({
        Type: "Syllable",
        Content: [{
            Lead: {
                StartTime: 5000,
                EndTime: 7000,
                Syllables: [
                    { Text: "Hel", StartTime: 5000, EndTime: 5400 },
                    { Text: "lo", StartTime: 5400, EndTime: 5800 }
                ]
            }
        }]
    });

    assert(parsed.type === "Syllable", "Expected syllable type");
    assert(parsed.isSynced === true, "Syllable lyrics should be synced");
    assert(parsed.lines[0].syllables.length === 2, "Syllable list should be preserved");
    assert(parsed.text === "[00:05.00]Hello\n", "Syllable LRC text mismatch");
})();

(function testNoLyricsSentinel() {
    const sentinel = getNoLyricsSentinel("abc123").value;
    assert(isNoLyricsSentinel(sentinel, "abc123"), "Sentinel check should pass");
    assert(!isNoLyricsSentinel(sentinel, "different"), "Sentinel should be track-specific");
})();

console.log("lyrics-utils tests passed");
