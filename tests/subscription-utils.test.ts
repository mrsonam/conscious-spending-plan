import assert from "node:assert/strict"

import {
  collectUpcomingEvents,
  monthlyEquivalent,
  nextChargeDate,
} from "../lib/subscription-utils"

void (async () => {
  {
    const monthly = monthlyEquivalent(140, "fortnightly")
    assert.equal(monthly, (140 * 26) / 12)
  }

  {
    const next = nextChargeDate(
      new Date("2026-07-01T00:00:00.000Z"),
      "fortnightly",
      new Date("2026-07-10T12:00:00.000Z"),
    )
    assert.equal(next.getFullYear(), 2026)
    assert.equal(next.getMonth(), 6)
    assert.equal(next.getDate(), 15)
  }

  {
    const monthlyCustom = monthlyEquivalent(100, "custom", 10)
    assert.equal(monthlyCustom, (100 * 365.25) / 10 / 12)
  }

  {
    const nextCustom = nextChargeDate(
      new Date("2026-07-01T00:00:00.000Z"),
      "custom",
      new Date("2026-07-05T12:00:00.000Z"),
      10,
    )
    assert.equal(nextCustom.getFullYear(), 2026)
    assert.equal(nextCustom.getMonth(), 6)
    assert.equal(nextCustom.getDate(), 11)
  }

  {
    const events = collectUpcomingEvents(
      [
        {
          id: "sub-1",
          label: "Gym",
          provider: "Fit Club",
          status: "active",
          trialEndsAt: null,
          nextRenewalAt: null,
          reminderDaysBefore: 3,
          recurringExpense: {
            amount: 28,
            frequency: "fortnightly",
            startDate: new Date("2026-07-01T00:00:00.000Z"),
            isActive: true,
            description: "Gym membership",
          },
        },
      ],
      20,
      new Date("2026-07-10T00:00:00.000Z"),
    )

    assert.equal(events.length, 1)
    assert.equal(events[0]?.kind, "renewal")
    const nextDate = new Date(events[0]?.date ?? "")
    assert.equal(nextDate.getFullYear(), 2026)
    assert.equal(nextDate.getMonth(), 6)
    assert.equal(nextDate.getDate(), 15)
  }

  {
    const events = collectUpcomingEvents(
      [
        {
          id: "sub-2",
          label: "Rent",
          provider: null,
          status: "active",
          trialEndsAt: null,
          nextRenewalAt: null,
          reminderDaysBefore: 0,
          recurringExpense: {
            amount: 500,
            frequency: "custom",
            intervalDays: 10,
            startDate: new Date("2026-07-01T00:00:00.000Z"),
            isActive: true,
            description: "Board",
          },
        },
      ],
      20,
      new Date("2026-07-05T00:00:00.000Z"),
    )

    assert.equal(events.length, 1)
    const nextDate = new Date(events[0]?.date ?? "")
    assert.equal(nextDate.getDate(), 11)
  }

  console.log("subscription-utils.test.ts: all passed")
})()
