import { describe, expect, it } from "vitest";
import {
  extensionForImageType,
  legacyWhatsappStoragePath,
  whatsappAttachmentExpiresAt,
  whatsappAttachmentUrl,
} from "./whatsapp-attachments";

describe("whatsapp attachments", () => {
  it("uses an authenticated application route instead of a public object URL", () => {
    expect(whatsappAttachmentUrl("message-id")).toBe(
      "/api/whatsapp/media/message-id",
    );
  });

  it("extracts only legacy WhatsApp objects from deal-photos", () => {
    expect(
      legacyWhatsappStoragePath(
        "https://example.supabase.co/storage/v1/object/public/deal-photos/org/whatsapp/user/photo.png",
      ),
    ).toBe("org/whatsapp/user/photo.png");
    expect(
      legacyWhatsappStoragePath(
        "https://example.supabase.co/storage/v1/object/public/deal-photos/org/deal/photo.png",
      ),
    ).toBeNull();
    expect(legacyWhatsappStoragePath("not-a-url")).toBeNull();
  });

  it("keeps media for thirty days", () => {
    expect(
      whatsappAttachmentExpiresAt(new Date("2026-07-01T00:00:00.000Z")).toISOString(),
    ).toBe("2026-07-31T00:00:00.000Z");
  });

  it("uses a safe extension derived from the accepted content type", () => {
    expect(extensionForImageType("image/jpeg")).toBe("jpg");
    expect(extensionForImageType("image/png")).toBe("png");
    expect(extensionForImageType("application/octet-stream")).toBe("jpg");
  });
});
