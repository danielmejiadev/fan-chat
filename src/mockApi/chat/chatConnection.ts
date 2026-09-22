export type ChatConnection = {
  /**
   * Opens the connection and calls onChange whenever there may be new data
   * worth reading. Event-driven, like a real socket/channel subscription:
   * the backend notifies onChange when something actually changes (a
   * message gets confirmed, an incoming message arrives) instead of the
   * caller having to poll on a timer to find out.
   */
  connect: (
    conversationId: string,
    senderId: string,
    onChange: () => void,
  ) => {
    disconnect: () => void;
  };
};
