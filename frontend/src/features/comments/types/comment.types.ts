export interface TicketCommentData {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    roleId: number;
  };
}

export interface CreateCommentInput {
  content: string;
}

export interface AddCommentResponse {
  message: string;
  data: TicketCommentData;
}
