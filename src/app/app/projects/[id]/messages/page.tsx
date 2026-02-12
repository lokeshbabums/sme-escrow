"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Attachment {
  id: string;
  fileName: string;
  sizeBytes: number | null;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; email: string };
  attachments: Attachment[];
}

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const payload: { body: string; fileName?: string; fileSize?: number } = { body: body.trim() };
      if (fileName.trim()) {
        payload.fileName = fileName.trim();
        payload.fileSize = 0;
      }
      const res = await fetch(`/api/projects/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setBody("");
        setFileName("");
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <Link href={`/app/projects/${id}`}>
          <Button variant="outline">Back to Order</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>Messages between client and service provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={scrollRef} className="h-[300px] sm:h-[400px] overflow-y-auto space-y-3 mb-4 border rounded-2xl p-4">
            {loading && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Loading messages...</div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">No messages yet. Start the conversation.</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{msg.sender.name ?? msg.sender.email}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="text-sm mt-1">{msg.body}</p>
                {msg.attachments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {msg.attachments.map((a) => (
                      <Badge key={a.id} variant="outline" className="text-xs">
                        📎 {a.fileName}
                        {a.sizeBytes ? ` (${(a.sizeBytes / 1024).toFixed(1)} KB)` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Attach file (enter filename)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
              <Button onClick={send} disabled={sending || !body.trim()}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
