import { describe, expect, it } from "vitest";
import {
  insertMention,
  serializeMentions,
  tokenAtCursor,
} from "./mention-serialize";

// The mobile half of the shared boundary rule. The rule's own matrix lives in
// packages/core/markdown/mention-boundary.test.ts; this covers the wiring — that
// `tokenAtCursor` consults it, and that the sentinel guard still wins.

/** Cursor sits at the end of `text`. */
function at(text: string) {
  return tokenAtCursor(text, text.length);
}

describe("tokenAtCursor boundary", () => {
  it.each([
    ["an empty box", "@Mi"],
    ["after a half-width space", "hello @Mi"],
    ["a full-width space", "你好　@Mi"],
    ["after CJK with no separator", "你好@Mi"],
    ["after katakana", "テレビ@Mi"],
    ["after the prolonged sound mark", "コーヒー@Mi"],
    ["after punctuation", "hello(@Mi"],
  ])("opens %s", (_name, text) => {
    expect(at(text)).toEqual({ start: text.indexOf("@"), query: "Mi" });
  });

  it.each([
    ["an ASCII word", "hello@Mi"],
    ["a digit", "2024@Mi"],
    ["an address", "user@example.com"],
    ["an accented address", "josé@example.com"],
    ["a cyrillic address", "почта@mail.ru"],
    ["a greek address", "αλφα@example.com"],
  ])("stays shut inside %s", (_name, text) => {
    expect(at(text)).toBeNull();
  });

  it("stays shut over a completed mention", () => {
    // The bar inserts `⁣@Name `; a cursor inside the inserted text, or at the
    // space after it, must not re-open the bar.
    expect(tokenAtCursor("⁣@Mika", 6)).toBeNull();
    expect(tokenAtCursor("⁣@Mika", 4)).toBeNull();
    expect(tokenAtCursor("⁣@Mika ", 7)).toBeNull();
  });

  it("still returns the query when the cursor is mid-token", () => {
    expect(tokenAtCursor("你好@Mi", 5)).toEqual({ start: 2, query: "Mi" });
  });
});

describe("serializeMentions", () => {
  it("links a mention whose display name contains a space", () => {
    const first = insertMention(
      "ping @jo",
      { start: 5, queryLength: 2 },
      { type: "member", id: "u1", name: "Johnny Silverhand" },
    );
    const text = `${first.newText}about @MU`;
    const second = insertMention(
      text,
      { start: text.length - 3, queryLength: 2 },
      { type: "issue", id: "i1", name: "MUL-1" },
    );
    expect(
      serializeMentions(second.newText, [first.marker, second.marker]),
    ).toBe(
      "ping [@Johnny Silverhand](mention://member/u1) about [MUL-1](mention://issue/i1) ",
    );
  });
});
