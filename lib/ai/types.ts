export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachmentName?: string;
  createdAt?: string;
};
