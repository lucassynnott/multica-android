// @vitest-environment node
import { describe, expect, it } from "vitest";
import { preprocessMobileMarkdown } from "./preprocess";

describe("preprocessMobileMarkdown HTML stripping", () => {
  it("strips tags from prose", () => {
    expect(preprocessMobileMarkdown("H<sub>2</sub>O and <b>bold</b>")).toBe(
      "H2O and bold",
    );
  });

  it("keeps tag-shaped text inside inline code", () => {
    expect(
      preprocessMobileMarkdown("a `Map<string, number>` b <i>c</i>"),
    ).toBe("a `Map<string, number>` b c");
    expect(preprocessMobileMarkdown("``a<b>c`` and <i>x</i>")).toBe(
      "``a<b>c`` and x",
    );
  });

  it("keeps JSX inside a fenced block", () => {
    const input =
      "t\n```tsx\nreturn <View><Text>hi</Text></View>;\n```\nafter <b>bold</b>";
    expect(preprocessMobileMarkdown(input)).toBe(
      "t\n```tsx\nreturn <View><Text>hi</Text></View>;\n```\nafter bold",
    );
  });

  it("treats an unterminated fence as code to the end", () => {
    const input = "streaming\n```ts\nconst a: Array<string> = [];";
    expect(preprocessMobileMarkdown(input)).toBe(input);
  });
});
