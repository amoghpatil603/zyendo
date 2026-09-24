"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Globe, Lock, Film } from "lucide-react";
import { toast } from "sonner";

import { createWatchTogetherRoom } from "@/app/actions/watch-together";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RoomCreator() {
  const router = useRouter();
  const [name, setName] = useState("Tonight's watch party");
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createWatchTogetherRoom({
        name,
        isPublic,
        maxParticipants,
        description: description || null,
      });
      if (!result.ok) {
        toast.error("Couldn't create a room. Please sign in and try again.");
        return;
      }
      router.push(`/watch-together/${result.room.inviteCode}`);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="glass mx-auto flex max-w-xl flex-col gap-4 rounded-2xl p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="room-name">Room Name</Label>
        <Input
          id="room-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Room name"
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="room-description">Description (optional)</Label>
        <Input
          id="room-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-label="Room description"
          maxLength={500}
          placeholder="What are you watching?"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="public-toggle" className="flex items-center gap-2">
            {isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
            {isPublic ? "Public Room" : "Private Room"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? "Anyone can join with the link"
              : "Only invited users can join"}
          </p>
        </div>
        <Switch
          id="public-toggle"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-participants">Max Participants: {maxParticipants}</Label>
        <input
          id="max-participants"
          type="range"
          min={2}
          max={20}
          value={maxParticipants}
          onChange={(event) => setMaxParticipants(parseInt(event.target.value, 10))}
          className="w-full"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Users />
        )}
        Create Room
      </Button>
    </form>
  );
}