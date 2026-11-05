import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Todo, type LegalSection } from "@/components/legal/LegalPage";
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/app-config";

// Content reflects what the repository actually does. Anything Isaly must decide or confirm is
// marked with <Todo>. Do not remove a TODO without a legal/business decision behind the
// replacement text. List only subprocessors the code actually uses.

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: `Privacy policy — ${APP_NAME}` },
      { name: "description", content: `How ${APP_NAME} handles personal data.` },
    ],
  }),
});

const sections: LegalSection[] = [
  {
    id: "controller",
    heading: "Data controller",
    body: (
      <>
        <p>
          The data controller is Isaly AB, organisation number 559472-5763, Grimmeredsvägen 45,
          426&nbsp;69 Västra Frölunda.
        </p>
        <p>
          Contact for privacy questions: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> or by post to
          Isaly AB, Grimmeredsvägen 45, 426&nbsp;69 Västra Frölunda.
        </p>
      </>
    ),
  },
  {
    id: "data",
    heading: "What data we process",
    body: (
      <>
        <ul>
          <li>
            Account: your e-mail address and sign-in details (passwords are hashed by Supabase
            Auth).
          </li>
          <li>
            Profile, as you enter it: name, the body areas you want to protect (limitations) with
            your own notes, preferred workout types and your weekly target.
          </li>
          <li>
            Workouts: the sessions generated for you, when you did them, and the feedback you give
            afterwards (difficulty, energy, soreness, mood and a note).
          </li>
          <li>Goals you set for sessions, minutes or streaks.</li>
        </ul>
        <p>
          Limitations, soreness and similar notes relate to your health and can be sensitive
          personal data. <Todo>CONFIRM LEGAL BASIS AND CONSENT FOR HEALTH DATA</Todo>
        </p>
      </>
    ),
  },
  {
    id: "purposes",
    heading: "Purposes and legal basis",
    body: (
      <p>
        We process the data to provide the service (building and adapting your training plan) and to
        troubleshoot and improve it. <Todo>LEGAL BASIS PER PURPOSE — CONFIRM</Todo>
      </p>
    ),
  },
  {
    id: "subprocessors",
    heading: "Sub-processors",
    body: (
      <ul>
        <li>Supabase (database and sign-in), EU region (Stockholm).</li>
        <li>
          Vercel (hosting and delivery of the web app).{" "}
          <Todo>CONFIRM REGION AND TRANSFER MECHANISM</Todo>
        </li>
      </ul>
    ),
  },
  {
    id: "age",
    heading: "Age limit",
    body: (
      <p>
        The service is only for people aged 18 or older, because it handles health-related
        information. We do not create accounts for people under 18, and if we learn that an account
        belongs to someone under 18 we delete it.
      </p>
    ),
  },
  {
    id: "retention",
    heading: "How long we keep data",
    body: (
      <p>
        We keep your data for as long as you have an account.{" "}
        <Todo>CONFIRM RETENTION PERIODS (WORKOUT HISTORY, LOGS)</Todo>
      </p>
    ),
  },
  {
    id: "rights",
    heading: "Your rights",
    body: (
      <p>
        You have the right to access, rectification and, where the law allows, erasure, restriction
        and portability. Contact <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>. We respond without
        undue delay and at the latest within one month.
      </p>
    ),
  },
  {
    id: "deletion",
    heading: "Deleting your account",
    body: (
      <p>
        Your Isaly account is shared with other Isaly apps, so one app must not delete the account
        itself. The app does not yet have a function for deleting your data yourself; contact{" "}
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> and we will help.{" "}
        <Todo>DESCRIBE HOW DELETION OF THE APP DATA AND THE SHARED ISALY ACCOUNT IS HANDLED</Todo>
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes",
    body: (
      <p>
        We may update this policy. The date at the top shows when it last changed. See also our{" "}
        <Link to="/terms">terms of use</Link>.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lastUpdated="2026-11-03"
      intro={<p>This policy describes how {APP_NAME} handles personal data.</p>}
      sections={sections}
    />
  );
}
