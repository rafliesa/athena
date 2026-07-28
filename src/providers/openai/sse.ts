export class SseDecoder {
  private buffer = '';

  push(chunk: string): string[] {
    this.buffer += chunk;
    const data: string[] = [];

    for (;;) {
      const boundary = /\r?\n\r?\n/.exec(this.buffer);
      if (!boundary) break;

      const block = this.buffer.slice(0, boundary.index);
      this.buffer = this.buffer.slice(boundary.index + boundary[0].length);
      const payload = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (payload) data.push(payload);
    }

    return data;
  }

  finish(): string[] {
    if (!this.buffer) return [];
    const data = this.push(this.buffer.endsWith('\n') ? '\n' : '\n\n');
    this.buffer = '';
    return data;
  }
}
