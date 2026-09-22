export type ChatConnection = {
  /** Opens the connection and calls onChange whenever there may be new data worth reading. */
  connect: (
    conversationId: string,
    senderId: string,
    onChange: () => void,
  ) => { forceSync: () => void; disconnect: () => void };
};
