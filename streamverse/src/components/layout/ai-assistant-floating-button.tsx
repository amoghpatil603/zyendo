"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { motion, useAnimation } from "motion/react";

export function AiAssistantFloatingButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zynora_ai_assistant_pos");
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        setPosition({ x, y });
        controls.set({ x, y });
      } catch (e) {}
    }
  }, [controls]);

  if (pathname === "/assistant") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        title="AI Assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{ x: position.x, y: position.y }}
          drag
          dragConstraints={containerRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={(event, info) => {
            const newX = position.x + info.offset.x;
            const newY = position.y + info.offset.y;
            setPosition({ x: newX, y: newY });
            localStorage.setItem("zynora_ai_assistant_pos", JSON.stringify({ x: newX, y: newY }));
          }}
          className="fixed bottom-24 right-6 z-50 w-[calc(100vw-2rem)] max-w-[460px] md:cursor-grab"
        >
          {/* Draggable handle inside AssistantChat or just make the whole thing draggable */}
          <div className="cursor-grab active:cursor-grabbing">
            <AssistantChat compact onClose={() => setOpen(false)} />
          </div>
        </motion.div>
      )}
    </>
  );
}
