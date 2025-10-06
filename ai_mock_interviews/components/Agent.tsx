"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

/** Minimal Message shape expected from vapi events — adjust to match your SDK */
type VapiMessage = {
  type?: string;
  transcriptType?: string;
  transcript?: string;
  role?: "user" | "assistant" | "system";
  // other fields...
};

type AgentProps = {
  userName?: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type?: "generate" | "feedback";
  questions?: string[];
};

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  // build-time env var (NEXT_PUBLIC_ is safe to access in client builds)
  const WORKFLOW_ID = process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID ?? "";

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: VapiMessage) => {
      // Only persist unique final transcripts; ignore duplicate finals that some providers resend
      if (
        message?.type === "transcript" &&
        message?.transcriptType === "final" &&
        typeof message?.transcript === "string"
      ) {
        const trimmed = message.transcript.trim();
        setMessages((prev) => {
          const last = prev[prev.length - 1]?.content?.trim();
          if (last && last === trimmed) return prev;
          return [
            ...prev,
            { role: (message.role as SavedMessage["role"]) ?? "assistant", content: trimmed },
          ];
        });
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = async (error: any) => {
      console.error("Vapi error event:", error);
      // if the SDK provided a Response object, try to read it
      try {
        if (error && error instanceof Response) {
          const text = await error.text();
          console.error("Vapi response body:", text);
        } else if (error && error.error && error.error instanceof Response) {
          const text = await error.error.text();
          console.error("Vapi response body (nested):", text);
        }
      } catch (ex) {
        console.error("Error reading Vapi error body:", ex);
      }
      // ensure UI updates
      setCallStatus(CallStatus.INACTIVE);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      try {
        const { success, feedbackId: id } = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages,
          feedbackId,
        });

        if (success && id) {
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          console.log("Error saving feedback");
          router.push("/");
        }
      } catch (err) {
        console.error("createFeedback error:", err);
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    // validate workflow id(s) before starting
    setCallStatus(CallStatus.CONNECTING);

    // choose workflow id - ensure it's non-empty
    const flowId = type === "generate" ? WORKFLOW_ID : interviewer;
    if (!flowId) {
      console.error("No workflow/assistant id provided. Check NEXT_PUBLIC_VAPI_WORKFLOW_ID or interviewer constant.");
      setCallStatus(CallStatus.INACTIVE);
      return;
    }

    try {
      if (type === "generate") {
        await vapi.start(flowId, {
          variableValues: {
            username: userName ?? "",
            userid: userId ?? "",
          },
        });
      } else {
        const formattedQuestions = (questions || []).map((q) => `- ${q}`).join("\n");
        await vapi.start(flowId, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      }
      // if start resolves, callStatus will be set via onCallStart event
    } catch (e: any) {
      console.error("vapi.start threw:", e);
      // try to read any Response body inside the thrown error
      try {
        if (e && e instanceof Response) {
          const text = await e.text();
          console.error("Server response:", text);
        } else if (e && e.error && e.error instanceof Response) {
          const text = await e.error.text();
          console.error("Server response (nested):", text);
        }
      } catch (ex) {
        console.error("Failed reading thrown error body:", ex);
      }
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    try {
      vapi.stop();
    } catch (err) {
      console.error("Error stopping vapi:", err);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={120}
              height={120}
              className="rounded-full object-cover w-[120px] h-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            {(() => {
              const last = messages[messages.length - 1];
              return (
                <p key={`${last.content}-${messages.length - 1}`} className={cn("transition-opacity duration-500", "animate-fadeIn")}>
                  {last.content}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED ? "Call" : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
