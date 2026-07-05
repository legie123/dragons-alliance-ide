// Drive — the document operations center: Google Cloud config, Drive folders,
// Sheets, Forms, Gmail, Proton Mail, Candidates, Activity. All Google calls run
// in the main process on the user's own OAuth client; every panel gates honestly
// on sign-in / API enablement — nothing here fakes a connection or data.
// Tabs live in views/drive/ (GoogleTabs, OpsTabs) — mechanical split, <500 rule.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGDriveStatus } from "../api";
import { IcCloud, IcLock } from "../components/icons";
import { ConfigTab, FoldersTab, SheetsTab, FormsTab } from "./drive/GoogleTabs";
import { MailTab, ProtonTab, CandidatesTab, ActivityTab } from "./drive/OpsTabs";

const TABS = ["Config", "Folders", "Sheets", "Forms", "Mail", "Proton", "Candidates", "Activity"] as const;
type Tab = typeof TABS[number];

/** Honest gate shown by every Google-backed tab when signed out. */
function Gate({ what }: { what: string }) {
  return <div className="drv-gate"><IcLock size={12} /> {what} needs Google — go to <b>Config</b>, save your OAuth client and sign in. Nothing is simulated.</div>;
}

export function DriveView() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["gdrive"], queryFn: fetchGDriveStatus, refetchInterval: 5000 });
  const [tab, setTab] = useState<Tab>("Config");
  const signedIn = !!status?.signedIn;
  const refreshStatus = () => qc.invalidateQueries({ queryKey: ["gdrive"] });

  // land on Folders once signed in (first time only)
  useEffect(() => { if (signedIn) setTab((t) => (t === "Config" ? "Folders" : t)); /* eslint-disable-line */ }, [signedIn]);

  return (
    <div className="drv-view">
      <div className="drv-bar">
        <span className="drv-title"><IcCloud size={14} /> DRIVE OPS</span>
        <span className={`drv-status ${signedIn ? "live" : status?.configured ? "ready" : "needs"}`}>
          ● {signedIn ? (status?.email || "signed in") : status?.configured ? "configured — sign in" : "needs setup"}
        </span>
        <div className="drv-tabs">
          {TABS.map((t) => (
            <button key={t} className={`drv-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {tab === "Config" && <ConfigTab status={status} refresh={refreshStatus} />}
      {tab === "Folders" && (signedIn ? <FoldersTab /> : <Gate what="Drive folders" />)}
      {tab === "Sheets" && (signedIn ? <SheetsTab /> : <Gate what="Sheets" />)}
      {tab === "Forms" && (signedIn ? <FormsTab /> : <Gate what="Forms" />)}
      {tab === "Mail" && (signedIn ? <MailTab /> : <Gate what="Gmail" />)}
      {tab === "Proton" && <ProtonTab />}
      {tab === "Candidates" && <CandidatesTab signedIn={signedIn} />}
      {tab === "Activity" && <ActivityTab />}
    </div>
  );
}
