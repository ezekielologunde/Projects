import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES, promptTextSchema, sniffVideoFormat, ticketIdSchema } from "./upload-validation";

// Spec section 11.3: "Server actions: zod rejection of oversize and
// malformed input; error codes never contain SQL." and "the processing
// route rejects non-images by byte sniffing" (the video-prompt pipeline's
// own equivalent: rejects non-video containers the same way).

describe("sniffVideoFormat", () => {
  it("recognizes a real WebM/Matroska EBML header", () => {
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03]);
    expect(sniffVideoFormat(webm)).toBe("webm");
  });

  it("recognizes a real MP4 ftyp box", () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.from([0, 0])]);
    expect(sniffVideoFormat(mp4)).toBe("mp4");
  });

  it("rejects an ordinary image (JPEG magic bytes)", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    expect(sniffVideoFormat(jpeg)).toBeNull();
  });

  it("rejects a buffer too short to contain either signature", () => {
    expect(sniffVideoFormat(Buffer.from([0x1a, 0x45]))).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(sniffVideoFormat(Buffer.alloc(0))).toBeNull();
  });

  it("rejects plain text pretending to be a video", () => {
    expect(sniffVideoFormat(Buffer.from("not a video at all, just text"))).toBeNull();
  });

  it("MAX_VIDEO_BYTES matches the video-incoming bucket's own 25MB ceiling (spec section 0.14)", () => {
    expect(MAX_VIDEO_BYTES).toBe(26_214_400);
  });
});

describe("ticketIdSchema", () => {
  // Generated, not hand-typed: zod v4's .uuid() validates the real RFC 4122
  // version/variant nibbles, which a genuine gen_random_uuid() value always
  // satisfies but an all-same-digit fixture like "1111...1111" (the kind
  // used throughout the pgTAP fixtures, where Postgres's uuid type only
  // checks hex-and-dashes shape, not RFC compliance) does not -- caught by
  // this test actually failing against that fixture before this comment
  // existed.
  const validTicketId = crypto.randomUUID();

  it("accepts a well-formed UUID", () => {
    expect(ticketIdSchema.safeParse(validTicketId).success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(ticketIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects a SQL-injection-shaped string rather than letting it anywhere near a query", () => {
    const result = ticketIdSchema.safeParse("'; DROP TABLE upload_tickets; --");
    expect(result.success).toBe(false);
  });

  it("rejects a storage path passed where a ticket id belongs (spec 11.3: processUpload accepts only a ticket id, never a path)", () => {
    expect(ticketIdSchema.safeParse(`incoming/${validTicketId}/some-file`).success).toBe(false);
  });

  it("rejects null/undefined-shaped input", () => {
    expect(ticketIdSchema.safeParse(null).success).toBe(false);
    expect(ticketIdSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("promptTextSchema", () => {
  it("accepts ordinary text within range", () => {
    expect(promptTextSchema.safeParse("Slow mornings and long walks.").success).toBe(true);
  });

  it("accepts exactly 200 characters", () => {
    expect(promptTextSchema.safeParse("a".repeat(200)).success).toBe(true);
  });

  it("rejects 201 characters (spec: oversize input)", () => {
    expect(promptTextSchema.safeParse("a".repeat(201)).success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(promptTextSchema.safeParse("").success).toBe(false);
  });

  it("rejects a string that is only whitespace, since it trims first", () => {
    expect(promptTextSchema.safeParse("    ").success).toBe(false);
  });

  it("trims surrounding whitespace before validating length", () => {
    const result = promptTextSchema.safeParse("  hello  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("hello");
    }
  });
});
