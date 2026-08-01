import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PROFILE_COLUMNS,
  ORGANIZATION_AFFILIATION_COLUMNS,
  PERSONAL_EXPORT_DATASETS,
} from "./account-export";

describe("account export contract", () => {
  it("exports only datasets tied directly to the authenticated account", () => {
    const keys = PERSONAL_EXPORT_DATASETS.map((dataset) => dataset.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "contacts",
        "deals",
        "tasks",
        "interactions",
        "assistant_messages",
        "voice_usage",
        "consent_history",
      ]),
    );
    expect(
      PERSONAL_EXPORT_DATASETS.every(
        (dataset) =>
          dataset.userColumn === "owner_id" ||
          dataset.userColumn === "user_id",
      ),
    ).toBe(true);
    expect(keys).not.toEqual(
      expect.arrayContaining([
        "whatsapp_messages",
        "legal_cases",
        "real_estate_properties",
        "seller_orders",
      ]),
    );
  });

  it("uses explicit columns and never exports credentials or billing identifiers", () => {
    const selections = PERSONAL_EXPORT_DATASETS.map(
      (dataset) => dataset.select,
    ).join(",");
    expect(PERSONAL_EXPORT_DATASETS.every((dataset) => dataset.select !== "*")).toBe(
      true,
    );
    expect(selections).not.toContain("token");
    expect(selections).not.toContain("endpoint");
    expect(selections).not.toContain("p256dh");
    expect(selections).not.toMatch(/(^|,)auth(,|$)/);
    expect(ACCOUNT_PROFILE_COLUMNS).not.toContain("stripe_");
    expect(ACCOUNT_PROFILE_COLUMNS).not.toContain("calendar_ics_token");
    expect(ORGANIZATION_AFFILIATION_COLUMNS).toBe("id,name,created_at");
  });
});
