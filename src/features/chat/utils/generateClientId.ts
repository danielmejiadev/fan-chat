export function generateClientId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (placeholder) => {
    const random = (Math.random() * 16) | 0;
    const value = placeholder === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
