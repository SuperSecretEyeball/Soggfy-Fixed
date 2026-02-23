import Utils from "./utils";

export const NO_LYRICS_PREFIX = "NO_LYRICS:";

export type LyricsFormatType = "Static" | "Line" | "Syllable";

export interface LyricsLineSyllable {
    Text: string;
    RomanizedText?: string;
    StartTime?: number;
    EndTime?: number;
    IsPartOfWord?: boolean;
}

export interface InternalLyricsLine {
    text: string;
    startTimeMs?: number;
    endTimeMs?: number;
    syllables?: LyricsLineSyllable[];
    oppositeAligned?: boolean;
}

export interface InternalLyrics {
    type: LyricsFormatType;
    isSynced: boolean;
    text: string;
    lines: InternalLyricsLine[];
    rawData: any;
}

function asNumber(v: any): number | undefined {
    if (v == null || v === "") return undefined;
    let n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function formatLrcTimestamp(timeMs: number) {
    let mm = Utils.padInt(timeMs / 1000 / 60, 2);
    let ss = Utils.padInt(timeMs / 1000 % 60, 2);
    let cs = Utils.padInt(timeMs % 1000 / 10, 2);
    return `${mm}:${ss}.${cs}`;
}

function buildSyllableText(syllables: any[]) {
    let text = "";
    for (let syllable of syllables ?? []) {
        let sTime = asNumber(syllable?.StartTime);
        if (sTime != null) {
            text += `<${formatLrcTimestamp(sTime)}>`;
        }
        text += syllable?.Text ?? "";
    }
    return text;
}

export function parseSpicyLyricsPayload(payload: any): InternalLyrics | null {
    if (!payload || typeof payload !== "object") return null;

    if (payload.Type === "Static") {
        let lines: InternalLyricsLine[] = (payload.Lines ?? [])
            .map(v => ({ text: String(v?.Text ?? "") }))
            .filter(v => v.text.length > 0);
        let text = lines.map(v => v.text).join("\n");
        if (text.length > 0) text += "\n";
        return { type: "Static", isSynced: false, lines, text, rawData: payload };
    }

    if (payload.Type === "Line") {
        let lines: InternalLyricsLine[] = [];
        let text = "";
        for (let line of payload.Content ?? []) {
            let lineText = String(line?.Text ?? "");
            let start = asNumber(line?.StartTime);
            let end = asNumber(line?.EndTime);
            if (!lineText) continue;

            lines.push({
                text: lineText,
                startTimeMs: start,
                endTimeMs: end,
                oppositeAligned: Boolean(line?.OppositeAligned)
            });

            if (start != null) {
                text += `[${formatLrcTimestamp(start)}]`;
            }
            text += `${lineText}\n`;
        }
        return { type: "Line", isSynced: true, lines, text, rawData: payload };
    }

    if (payload.Type === "Syllable") {
        let lines: InternalLyricsLine[] = [];
        let text = "";

        for (let line of payload.Content ?? []) {
            let leadSyllables = Array.isArray(line?.Lead?.Syllables) ? line.Lead.Syllables : [];
            let lineStart = asNumber(line?.Lead?.StartTime);
            let lineEnd = asNumber(line?.Lead?.EndTime);
            let lineText = leadSyllables.map(v => String(v?.Text ?? "")).join("");

            if (!lineText) continue;

            let normalizedSyllables = leadSyllables.map(v => ({
                Text: String(v?.Text ?? ""),
                RomanizedText: v?.RomanizedText,
                StartTime: asNumber(v?.StartTime),
                EndTime: asNumber(v?.EndTime),
                IsPartOfWord: v?.IsPartOfWord
            }));

            lines.push({
                text: lineText,
                startTimeMs: lineStart,
                endTimeMs: lineEnd,
                oppositeAligned: Boolean(line?.OppositeAligned),
                syllables: normalizedSyllables
            });

            if (lineStart != null) {
                text += `[${formatLrcTimestamp(lineStart)}]`;
            }
            text += `${buildSyllableText(normalizedSyllables)}\n`;
        }

        return { type: "Syllable", isSynced: true, lines, text, rawData: payload };
    }

    return null;
}

export function isTransientLyricsError(status: number | undefined) {
    return status === 408 || status === 425 || status === 429 || (status != null && status >= 500);
}
