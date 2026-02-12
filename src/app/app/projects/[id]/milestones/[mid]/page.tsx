"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText, ImageIcon } from "lucide-react";

const money=(c:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(c/100);

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  FUNDED: "bg-blue-50 text-blue-700 border-blue-300",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-300",
  SUBMITTED: "bg-purple-50 text-purple-700 border-purple-300",
  RELEASED: "bg-green-50 text-green-700 border-green-300",
  DISPUTED: "bg-red-50 text-red-700 border-red-300",
};

export default function Milestone() {
  const params = useParams<{ id:string; mid:string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const action = sp.get("action") ?? "view";
  const [ms,setMs]=useState<any>(null);
  const [note,setNote]=useState("");
  const [files,setFiles]=useState<File[]>([]);
  const [submitting,setSubmitting]=useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(){
    const res = await fetch(`/api/projects/${params.id}/milestones/${params.mid}`);
    setMs((await res.json()).milestone);
  }
  useEffect(()=>{load();},[]);

  if(!ms) return <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</div>;

  const showUpload = action === "submit" || action === "dispute";
  const alreadyFunded = action === "fund" && ms.status === "FUNDED";
  const noteRequired = alreadyFunded;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ms.title}</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{ms.description}</p>
          <div className="mt-2 flex items-center gap-2"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor[ms.status] ?? ""}`}>{ms.status}</span><span className="text-sm text-[hsl(var(--muted-foreground))]">{money(ms.amountCents)}</span></div>
        </div>
        <Button variant="outline" onClick={()=>router.push(`/app/projects/${params.id}`)}>Back</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Service action: {action}</CardTitle><CardDescription>Actions update service stage status and ledger.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {alreadyFunded && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm">
              <p className="font-medium text-yellow-800">This stage is already funded ({money(ms.amountCents)}).</p>
              <p className="text-yellow-700 mt-1">Are you sure you want to fund again? Please provide a reason below.</p>
            </div>
          )}

          <div>
            <Textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Note / service update / dispute reason…" />
            {noteRequired && !note.trim() && (
              <p className="text-xs text-[hsl(var(--destructive))] mt-1">A note is required to proceed.</p>
            )}
          </div>

          {showUpload && (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Attach photo / file
              </Button>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm">
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        className="text-xs text-[hsl(var(--destructive))] hover:underline"
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            disabled={submitting || (noteRequired && !note.trim())}
            onClick={async ()=>{
              if (alreadyFunded && !confirm("This stage is already funded. Are you sure you want to fund it again?")) return;
              setSubmitting(true);
              try {
                const uploadedFiles = [];
                for (const f of files) {
                  const fd = new FormData();
                  fd.append("file", f);
                  const up = await fetch("/api/upload", { method: "POST", body: fd });
                  if (!up.ok) { alert("File upload failed"); setSubmitting(false); return; }
                  uploadedFiles.push(await up.json());
                }
                const res = await fetch(`/api/projects/${params.id}/milestones/${params.mid}/actions`,{method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({action, note, files: uploadedFiles})});
                if(!res.ok) { alert((await res.json()).error ?? "Failed"); setSubmitting(false); return; }
                router.push(`/app/projects/${params.id}`);
              } catch {
                setSubmitting(false);
              }
            }}
          >{submitting ? "Processing…" : alreadyFunded ? "Fund again" : "Run"}</Button>
        </CardContent>
      </Card>

      {ms.attachments && ms.attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Attachments</CardTitle><CardDescription>Files uploaded with status updates.</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {ms.attachments.map((a: any) => {
              const isImage = a.mimeType?.startsWith("image/");
              return (
                <div key={a.id} className="rounded-2xl border overflow-hidden">
                  {isImage && a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <img src={a.url} alt={a.fileName} className="w-full max-h-64 object-contain bg-gray-50" />
                    </a>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2">
                    {isImage ? <ImageIcon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" /> : <FileText className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
                    <span className="truncate flex-1 font-medium">{a.fileName}</span>
                    {a.sizeBytes && <span className="text-xs text-[hsl(var(--muted-foreground))]">{(a.sizeBytes / 1024).toFixed(0)} KB</span>}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(a.createdAt).toLocaleString()}</span>
                    {a.url && (
                      <div className="flex items-center gap-1">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="rounded-full p-1 hover:bg-[hsl(var(--accent))] transition" title="View">
                          <Eye className="h-4 w-4" />
                        </a>
                        <a href={a.url} download={a.fileName} className="rounded-full p-1 hover:bg-[hsl(var(--accent))] transition" title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle><CardDescription>Audit trail.</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ms.escrow.length===0 ? <div className="text-[hsl(var(--muted-foreground))]">No ledger entries.</div> :
            ms.escrow.map((e:any)=>(
              <div key={e.id} className="rounded-2xl border p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium">{e.type}</div>
                  <div className="text-[hsl(var(--muted-foreground))]">{e.note ?? ""}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
                <div className="font-semibold">{money(e.amountCents)}</div>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
