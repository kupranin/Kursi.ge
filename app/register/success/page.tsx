"use client";

import { useState } from "react";

import { RegistrationWheelModal } from "@/components/rewards/RegistrationWheelModal";

export default function RegistrationSuccessPage() {
  const [registeredId, setRegisteredId] = useState("");
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [flowDone, setFlowDone] = useState(false);
  const [idError, setIdError] = useState("");
  const [checkingId, setCheckingId] = useState(false);

  async function handleContinue() {
    const normalizedId = registeredId.trim();
    setIdError("");

    if (!/^\d{11}$/.test(normalizedId)) {
      setIdError("ID უნდა შედგებოდეს ზუსტად 11 ციფრისგან.");
      return;
    }

    setCheckingId(true);
    try {
      const response = await fetch("/api/wheel/id-eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: normalizedId })
      });
      const payload = (await response.json()) as { eligible?: boolean; message?: string };
      if (!response.ok || !payload.eligible) {
        setIdError(
          payload.message ??
            "მადლობა ინტერესისთვის. ამ ID-ით ბორბლის შეთავაზება ვერ აქტიურდება. გთხოვთ გადაამოწმოთ მონაცემები."
        );
        return;
      }
      setConfirmedId(normalizedId);
    } catch {
      setIdError("ID-ს გადამოწმება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.");
    } finally {
      setCheckingId(false);
    }
  }

  return (
    <main className="page-shell">
      <h1>რეგისტრაცია წარმატებით დასრულდა</h1>
      <p>შეიყვანეთ ის ID, რომლითაც დარეგისტრირდით და დაატრიალეთ ბორბალი.</p>

      {confirmedId === null ? (
        <section style={{ maxWidth: 420, marginTop: 18 }}>
          <input
            value={registeredId}
            onChange={(event) => {
              setRegisteredId(event.target.value.replace(/\D/g, "").slice(0, 11));
              setIdError("");
            }}
            placeholder="შეიყვანეთ რეგისტრაციის ID"
            inputMode="numeric"
            maxLength={11}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "1px solid #d2c6dc",
              padding: "0 12px",
              fontSize: 15
            }}
          />
          <button
            className="wheel-primary"
            style={{ marginTop: 12 }}
            onClick={handleContinue}
            disabled={checkingId}
          >
            {checkingId ? "ვამოწმებთ..." : "გაგრძელება ბორბალზე"}
          </button>
          <p style={{ marginTop: 10, color: "#5f4f77", fontSize: 13 }}>
            გადაამოწმეთ, რომ ID ნომერი სწორად შეიყვანეთ, წინააღმდეგ შემთხვევაში შეღავათებით
            სარგებლობას ვერ შეძლებთ.
          </p>
          {idError ? (
            <p style={{ marginTop: 8, color: "#9f2b52", fontSize: 13 }}>{idError}</p>
          ) : null}
        </section>
      ) : null}

      {flowDone ? (
        <p style={{ marginTop: 16, color: "#4b4171" }}>
          პრიზი წარმატებით დაემატა თქვენს პირად კაბინეტს.
        </p>
      ) : null}

      {confirmedId ? (
        <RegistrationWheelModal
          onDone={() => {
            setFlowDone(true);
          }}
          forceOpen
          registeredUserId={confirmedId}
        />
      ) : null}
    </main>
  );
}
