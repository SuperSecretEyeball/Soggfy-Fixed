import Utils from "./utils";

export const NO_LYRICS_PREFIX = "NO_LYRICS:";

export type LyricsType = "Static" | "Line" | "Syllable";

export interface InternalLyricLine {
    text: string;
    startTimeMs?: number;
    endTimeMs?: number;
    syllables?: {
        text: string;
        startTimeMs?: number;
        endTimeMs?: number;
        romanizedText?: string;
        isPartOfWord?: boolean;
    }[];
}

export interface InternalLyrics {
    type: LyricsType;
    isSynced: boolean;
    text: string;
    lines: InternalLyricLine[];
    rawData: any;
}

function toNumber(value: any): number | undefined {
    if (value == null) return undefined;
    let parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toLrcTimestamp(timeMs: number): string {
    let time = Math.max(0, Math.floor(timeMs));
    let mm = Utils.padInt(time / 1000 / 60, 2);
    let ss = Utils.padInt(time / 1000 % 60, 2);
    let cs = Utils.padInt(time % 1000 / 10, 2);
    return `[${mm}:${ss}.${cs}]`;
}

export function parseSpicyLyricsPayload(lyrics: any): InternalLyrics {
    if (!lyrics || typeof lyrics !== "object") {
        throw Error("Lyrics payload is empty or invalid");
    }

    if (lyrics.Type === "Static") {
        let lines = Array.isArray(lyrics.Lines) ? lyrics.Lines : [];
        let parsedLines = lines
            .map(line => ({ text: String(line?.Text ?? "") }))
            .filter(line => !/^(|♪)$/.test(line.text));

        return {
            type: "Static",
            isSynced: false,
            lines: parsedLines,
            text: parsedLines.map(v => v.text).join('\n') + (parsedLines.length > 0 ? "\n" : ""),
            rawData: lyrics
        };
    }

    if (lyrics.Type === "Line") {
        let content = Array.isArray(lyrics.Content) ? lyrics.Content : [];
        let parsedLines = content.map(line => ({
            text: String(line?.Text ?? ""),
            startTimeMs: toNumber(line?.StartTime),
            endTimeMs: toNumber(line?.EndTime)
        }));

        let text = parsedLines
            .map(line => `${toLrcTimestamp(line.startTimeMs ?? 0)}${line.text}`)
            .join('\n');

        return {
            type: "Line",
            isSynced: true,
            lines: parsedLines,
            text: text + (parsedLines.length > 0 ? "\n" : ""),
            rawData: lyrics
        };
    }

    if (lyrics.Type === "Syllable") {
        let content = Array.isArray(lyrics.Content) ? lyrics.Content : [];
        let parsedLines = content.map(line => {
            let lead = line?.Lead ?? {};
            let syllables = Array.isArray(lead.Syllables) ? lead.Syllables : [];

            return {
                text: syllables.map(v => String(v?.Text ?? "")).join(''),
                startTimeMs: toNumber(lead.StartTime),
                endTimeMs: toNumber(lead.EndTime),
                syllables: syllables.map(v => ({
                    text: String(v?.Text ?? ""),
                    startTimeMs: toNumber(v?.StartTime),
                    endTimeMs: toNumber(v?.EndTime),
                    romanizedText: v?.RomanizedText,
                    isPartOfWord: v?.IsPartOfWord
                }))
            };
        });

        let text = parsedLines
            .map(line => `${toLrcTimestamp(line.startTimeMs ?? 0)}${line.text}`)
            .join('\n');

        return {
            type: "Syllable",
            isSynced: true,
            lines: parsedLines,
            text: text + (parsedLines.length > 0 ? "\n" : ""),
            rawData: lyrics
        };
    }

    throw Error(`Unsupported lyrics type: ${lyrics.Type}`);
}

interface NoLyricsSentinel {
    value: string;
    trackId: string;
}

export function getNoLyricsSentinel(trackId: string): NoLyricsSentinel {
    return {
        value: `${NO_LYRICS_PREFIX}${trackId}`,
        trackId
    };
}

export function isNoLyricsSentinel(value: any, trackId: string): boolean {
    if (typeof value !== "string") return false;
    return value === `${NO_LYRICS_PREFIX}${trackId}`;
}
