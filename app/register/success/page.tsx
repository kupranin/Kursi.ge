"use client";

import { useState } from "react";

import { RegistrationWheelModal } from "@/components/rewards/RegistrationWheelModal";

export default function RegistrationSuccessPage() {
  const [registeredId, setRegisteredId] = useState("");
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [flowDone, setFlowDone] = useState(false);

  return (
    <main className="page-shell">
      <h1>რეგისტრაცია წარმატებით დასრულდა</h1>
      <p>შეიყვანეთ ის ID, რომლითაც დარეგისტრირდით და დაატრიალეთ ბორბალი.</p>

      {confirmedId === null ? (
        <section style={{ maxWidth: 420, marginTop: 18 }}>
          <input
            value={registeredId}
            onChange={(event) => setRegisteredId(event.target.value)}
            placeholder="შეიყვანეთ რეგისტრაციის ID"
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
            onClick={() => {
              if (!registeredId.trim()) return;
              setConfirmedId(registeredId.trim());
            }}
          >
            გაგრძელება ბორბალზე
          </button>
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
