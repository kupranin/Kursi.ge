"use client";

import { RegistrationWheelModal } from "@/components/rewards/RegistrationWheelModal";

export default function RegistrationSuccessPage() {
  return (
    <main className="page-shell">
      <h1>რეგისტრაცია წარმატებით დასრულდა</h1>
      <p>თქვენი ანგარიში მზად არის კონვერტაციის დასაწყებად.</p>
      <RegistrationWheelModal onDone={() => {}} forceOpen />
    </main>
  );
}
