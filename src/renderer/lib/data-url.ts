/** An image the window can show from its bytes, with no file for it to be loaded from. */
export function dataUrlOf(mime: string, bytes: Uint8Array): string {
  // The characters are made in pieces: a page is some hundreds of kilobytes, too many for one call.
  const piece = 0x8000;
  let binary = '';
  for (let at = 0; at < bytes.length; at += piece) {
    binary += String.fromCharCode(...bytes.subarray(at, at + piece));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
